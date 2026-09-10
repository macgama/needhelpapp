package com.needhelpapp.conduite.service

import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.needhelpapp.conduite.AppConduite
import com.needhelpapp.conduite.blocage.GestionnaireSuperposition
import com.needhelpapp.conduite.blocage.NePasDeranger
import com.needhelpapp.conduite.blocage.PaquetsSysteme
import com.needhelpapp.conduite.detection.CanalSignaux
import com.needhelpapp.conduite.detection.SourceActivite
import com.needhelpapp.conduite.detection.SourcePositionSysteme
import com.needhelpapp.conduite.donnees.ReglagesComplets
import com.needhelpapp.conduite.moteur.MoteurDecision
import com.needhelpapp.conduite.moteur.PolitiqueBlocage
import com.needhelpapp.conduite.moteur.ReglagesDetection
import com.needhelpapp.conduite.moteur.Signal
import com.needhelpapp.conduite.permissions.Permissions
import com.needhelpapp.conduite.surveillance.SurveillantAvantPlan
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Le service qui tient tout, et le seul endroit où l'état vit.
 *
 * UN SEUL CONSOMMATEUR, UN SEUL FIL
 *
 * Les signaux arrivent de partout : le GPS sur le fil principal, la
 * reconnaissance d'activité depuis un receveur créé par le système, le
 * bouton « je suis passager » depuis une superposition, le battement
 * depuis une coroutine. Le moteur de décision, lui, n'est pas
 * thread-safe et ne doit pas l'être — un automate protégé par des verrous
 * est un automate dont on ne sait plus raisonner sur l'ordre des
 * transitions.
 *
 * Tout passe donc par un canal, et une seule coroutine le vide. Le
 * moteur ne voit qu'une file ordonnée, comme dans les tests.
 *
 * CE QUI N'EST PAS ICI
 *
 * La décision (moteur/), la politique de blocage (moteur/), le dessin de
 * la superposition (blocage/), la lecture des capteurs (detection/).
 * Ce fichier orchestre ; il ne calcule rien.
 */
class ServiceConduite : LifecycleService() {

    // Nommé `appli` et non `application` : une propriété Kotlin nommée
    // ainsi produirait un `getApplication()` qui entre en collision avec
    // celui de Service, hérité de Java.
    private val appli get() = applicationContext as AppConduite

    private lateinit var position: SourcePositionSysteme
    private lateinit var activite: SourceActivite
    private lateinit var superposition: GestionnaireSuperposition
    private lateinit var nePasDeranger: NePasDeranger
    private lateinit var surveillant: SurveillantAvantPlan

    private val signaux = Channel<Signal>(capacity = 64)

    private var moteur = MoteurDecision()
    private var reglages = ReglagesComplets()

    /**
     * Des réglages de détection modifiés pendant un trajet.
     *
     * On ne reconstruit pas le moteur en pleine route : il perdrait son
     * état, donc son trajet, donc son blocage — au moment précis où
     * l'utilisateur bidouille les seuils, c'est-à-dire souvent au volant
     * en tant que passager. On attend l'arrêt.
     */
    private var detectionEnAttente: ReglagesDetection? = null

    private var travailSurveillance: Job? = null

    // Les compteurs du trajet en cours. En mémoire, écrits une seule
    // fois à la clôture : une écriture par seconde pendant une heure de
    // route userait la mémoire flash pour rien.
    private var trajetId: Long? = null
    private var distanceM = 0f
    private var vitesseMaxMs = 0f
    private var interceptions = 0
    private var passagerDuTrajet = false
    private var instantVitessePrecedente = 0L
    private var vitessePrecedenteMs = 0f

    private var etatAffiche: MoteurDecision.Etat? = null
    private var passagerAffiche = false

    override fun onCreate() {
        super.onCreate()

        position = SourcePositionSysteme(this)
        activite = SourceActivite(this)
        superposition = GestionnaireSuperposition(this)
        nePasDeranger = NePasDeranger(this)
        surveillant = SurveillantAvantPlan(this)

        superposition.surDeclarationPassager = {
            signaux.trySend(Signal.DeclarationPassager(SystemClock.elapsedRealtime()))
        }

        lifecycleScope.launch {
            // Un trajet laissé ouvert par un service tué en route. On le
            // referme au démarrage plutôt que de le laisser béant.
            appli.trajets.refermerCeQuiTraine(System.currentTimeMillis())
        }

        lifecycleScope.launch {
            appli.reglages.flux.collect { nouveaux ->
                val ancienneDetection = reglages.detection
                val ancienBlocage = reglages.blocage
                reglages = nouveaux

                if (nouveaux.detection != ancienneDetection) {
                    detectionEnAttente = nouveaux.detection
                    appliquerDetectionEnAttente()
                }

                // La liste des applications bloquées peut changer EN
                // PLEIN TRAJET — c'est même le moment le plus probable,
                // quand un passager s'aperçoit qu'il a oublié une
                // application. La politique est figée à l'ouverture de la
                // surveillance : il faut donc la relancer, sans quoi le
                // réglage ne prendrait effet qu'au trajet suivant.
                if (nouveaux.blocage != ancienBlocage && travailSurveillance != null) {
                    travailSurveillance?.cancel()
                    travailSurveillance = lancerLaSurveillance()
                }
            }
        }

        lifecycleScope.launch { position.flux.collect { signaux.send(it) } }
        lifecycleScope.launch { CanalSignaux.flux.collect { signaux.send(it) } }

        // Le battement. La fin d'un trajet n'est pas un événement, c'est
        // une absence d'événement : sans lui, un téléphone posé sur le
        // siège d'une voiture garée resterait bloqué jusqu'au prochain
        // point GPS, c'est-à-dire indéfiniment une fois le GPS coupé.
        lifecycleScope.launch {
            while (isActive) {
                delay(PERIODE_BATTEMENT_MS)
                signaux.send(Signal.Battement(SystemClock.elapsedRealtime()))
            }
        }

        lifecycleScope.launch {
            for (signal in signaux) traiter(signal)
        }
    }

    override fun onStartCommand(intention: Intent?, drapeaux: Int, identifiant: Int): Int {
        super.onStartCommand(intention, drapeaux, identifiant)

        when (intention?.action) {
            ACTION_ARRETER -> {
                arreterProprement()
                return START_NOT_STICKY
            }

            // Pas de `return` ici : on laisse la suite remettre le
            // service en avant-plan. Le système peut relivrer cette
            // intention à un service qu'il vient de recréer, et un
            // service démarré sans `startForeground` est tué au bout de
            // cinq secondes.
            ACTION_PASSAGER ->
                signaux.trySend(Signal.DeclarationPassager(SystemClock.elapsedRealtime()))
        }

        // Depuis Android 14, un service d'avant-plan de type « location »
        // dont la permission de position manque lève une exception au
        // démarrage. Mieux vaut ne pas démarrer et le dire que crasher au
        // premier trajet.
        if (!Permissions.positionAccordee(this)) {
            Log.w(ETIQUETTE, "Démarrage refusé : permission de position absente")
            stopSelf()
            return START_NOT_STICKY
        }

        passerEnAvantPlan()

        // La cadence dépend de ce qui se passe, pas du fait qu'on
        // (re)démarre : cette méthode est rappelée par le bouton
        // « je suis passager », et par le système quand il recrée un
        // service tué. Remettre la veille sans regarder ferait retomber
        // le GPS à un point toutes les vingt secondes en pleine route.
        position.cadence(
            if (trajetId != null) SourcePositionSysteme.CADENCE_TRAJET_MS
            else SourcePositionSysteme.CADENCE_VEILLE_MS,
        )
        activite.demarrer()
        EtatPublic.maj { it.copy(serviceActif = true) }

        // STICKY : si le système nous tue faute de mémoire, il nous
        // relance. Sans cela, la surveillance s'arrête en silence et
        // l'utilisateur croit être protégé.
        return START_STICKY
    }

    // ------------------------------------------------------------------
    // Le fil unique
    // ------------------------------------------------------------------

    private suspend fun traiter(signal: Signal) {
        if (signal is Signal.Position) cumulerLeTrajet(signal)

        val decision = moteur.traiter(signal)

        when (decision.evenementTrajet) {
            MoteurDecision.EvenementTrajet.DEBUT -> ouvrirTrajet()
            MoteurDecision.EvenementTrajet.FIN -> cloturerTrajet()
            null -> Unit
        }

        if (decision.passagerDeclare) passagerDuTrajet = true

        reglerLeBlocage(decision.blocageActif)
        publier(decision)
    }

    /**
     * Distance et vitesse maximale, par intégration de la vitesse.
     *
     * On n'additionne pas des distances entre points, parce qu'on ne
     * garde aucun point : la source jette la coordonnée dès qu'elle en a
     * tiré la vitesse. Intégrer donne une distance à quelques pour cent
     * près, ce qui suffit largement pour un résumé de trajet, et
     * l'application ne sait toujours pas où vous êtes allé.
     *
     * L'intervalle est plafonné : après un tunnel de dix minutes, croire
     * que la dernière vitesse connue a tenu tout du long ajouterait
     * quinze kilomètres imaginaires.
     */
    private fun cumulerLeTrajet(signal: Signal.Position) {
        val vitesse = signal.vitesseMs ?: return
        if (vitesse < 0f) return

        if (trajetId != null && instantVitessePrecedente != 0L) {
            val intervalle = (signal.instant - instantVitessePrecedente)
                .coerceIn(0L, INTERVALLE_MAX_CUMUL_MS)
            // Trapèze : la moyenne des deux vitesses encadrantes, plus
            // juste qu'un simple palier quand on accélère.
            distanceM += (vitessePrecedenteMs + vitesse) / 2f * (intervalle / 1000f)
        }

        instantVitessePrecedente = signal.instant
        vitessePrecedenteMs = vitesse
        if (vitesse > vitesseMaxMs) vitesseMaxMs = vitesse
    }

    // ------------------------------------------------------------------
    // Trajets
    // ------------------------------------------------------------------

    private suspend fun ouvrirTrajet() {
        distanceM = 0f
        vitesseMaxMs = 0f
        interceptions = 0
        passagerDuTrajet = false
        instantVitessePrecedente = 0L
        vitessePrecedenteMs = 0f

        trajetId = appli.trajets.ouvrir(System.currentTimeMillis())

        position.cadence(SourcePositionSysteme.CADENCE_TRAJET_MS)
        if (reglages.nePasDeranger) nePasDeranger.activer()
    }

    private suspend fun cloturerTrajet() {
        val identifiant = trajetId
        trajetId = null

        if (identifiant != null) {
            appli.trajets.cloturer(
                id = identifiant,
                finMs = System.currentTimeMillis(),
                distanceM = distanceM,
                vitesseMaxMs = vitesseMaxMs,
                interceptions = interceptions,
                passagerDeclare = passagerDuTrajet,
            )
        }

        position.cadence(SourcePositionSysteme.CADENCE_VEILLE_MS)
        nePasDeranger.retablir()
        appliquerDetectionEnAttente()
    }

    // ------------------------------------------------------------------
    // Blocage
    // ------------------------------------------------------------------

    private fun reglerLeBlocage(actif: Boolean) {
        if (actif && travailSurveillance == null) {
            travailSurveillance = lancerLaSurveillance()
        } else if (!actif && travailSurveillance != null) {
            travailSurveillance?.cancel()
            travailSurveillance = null
            superposition.masquer()
        }
    }

    private fun lancerLaSurveillance(): Job {
        val politique = PolitiqueBlocage(
            reglages = reglages.blocage,
            paquetsIncompressibles = PaquetsSysteme.incompressibles(this),
        )

        // L'état RÉEL du service d'accessibilité, pas la préférence :
        // une case cochée dont le service a été coupé par Android
        // donnerait un flux muet, donc un blocage qui ne bloque rien.
        val viaAccessibilite = reglages.accessibilitePreferee &&
            Permissions.accessibiliteActive(this)

        return lifecycleScope.launch {
            surveillant.flux(viaAccessibilite).collect { paquet ->
                if (politique.doitBloquer(paquet)) {
                    if (!superposition.affichee) interceptions++
                    superposition.afficher()
                    superposition.majVitesse(vitesseCouranteKmh())
                    EtatPublic.maj { it.copy(dernierPaquetBloque = paquet) }
                } else {
                    superposition.masquer()
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Le reste
    // ------------------------------------------------------------------

    private fun publier(decision: MoteurDecision.Decision) {
        EtatPublic.maj {
            it.copy(
                serviceActif = true,
                etat = decision.etat,
                motif = decision.motif,
                blocageActif = decision.blocageActif,
                passagerDeclare = decision.passagerDeclare,
                vitesseKmh = vitesseCouranteKmh(),
            )
        }

        superposition.majVitesse(vitesseCouranteKmh())

        // On ne repousse la notification que si son contenu change :
        // la réémettre à chaque point GPS ferait clignoter la barre
        // d'état pendant tout le trajet.
        if (decision.etat != etatAffiche || decision.passagerDeclare != passagerAffiche) {
            etatAffiche = decision.etat
            passagerAffiche = decision.passagerDeclare
            runCatching {
                NotificationManagerCompat.from(this).notify(
                    Notifications.ID_SURVEILLANCE,
                    Notifications.surveillance(this, decision.etat, decision.passagerDeclare),
                )
            }
        }
    }

    private fun vitesseCouranteKmh(): Float? {
        if (instantVitessePrecedente == 0L) return null
        val age = SystemClock.elapsedRealtime() - instantVitessePrecedente
        if (age > AGE_MAX_VITESSE_AFFICHEE_MS) return null
        return vitessePrecedenteMs * 3.6f
    }

    private fun appliquerDetectionEnAttente() {
        val enAttente = detectionEnAttente ?: return
        if (trajetId != null) return // jamais en pleine route
        moteur = MoteurDecision(enAttente)
        detectionEnAttente = null
    }

    private fun passerEnAvantPlan() {
        val notification = Notifications.surveillance(
            this,
            MoteurDecision.Etat.ARRET,
            passager = false,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                Notifications.ID_SURVEILLANCE,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            )
        } else {
            startForeground(Notifications.ID_SURVEILLANCE, notification)
        }
    }

    private fun arreterProprement() {
        travailSurveillance?.cancel()
        travailSurveillance = null
        superposition.masquer()
        nePasDeranger.retablir()
        position.arreter()
        activite.arreter()
        EtatPublic.reinitialiser()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        travailSurveillance?.cancel()
        superposition.masquer()
        nePasDeranger.retablir()
        position.arreter()
        activite.arreter()
        signaux.close()
        EtatPublic.reinitialiser()
        // Le trajet éventuellement ouvert n'est PAS refermé ici : une
        // écriture en base depuis onDestroy n'a aucune garantie
        // d'aboutir. C'est le prochain démarrage qui s'en charge, par
        // `refermerCeQuiTraine`.
        super.onDestroy()
    }

    companion object {
        private const val ETIQUETTE = "ServiceConduite"

        const val ACTION_ARRETER = "com.needhelpapp.conduite.ARRETER"
        const val ACTION_PASSAGER = "com.needhelpapp.conduite.PASSAGER"

        /**
         * Cinq secondes. C'est la granularité de la fin de trajet : avec
         * un délai de deux minutes, cinq secondes d'imprécision ne se
         * voient pas, et un battement plus rapide réveillerait le
         * processeur pour rien.
         */
        private const val PERIODE_BATTEMENT_MS = 5_000L

        private const val INTERVALLE_MAX_CUMUL_MS = 10_000L
        private const val AGE_MAX_VITESSE_AFFICHEE_MS = 15_000L

        fun demarrer(contexte: Context) {
            val intention = Intent(contexte, ServiceConduite::class.java)
            contexte.startForegroundService(intention)
        }

        fun arreter(contexte: Context) {
            val intention = Intent(contexte, ServiceConduite::class.java)
                .setAction(ACTION_ARRETER)
            contexte.startService(intention)
        }
    }
}
