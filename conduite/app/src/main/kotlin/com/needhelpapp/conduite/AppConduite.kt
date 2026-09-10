package com.needhelpapp.conduite

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import com.needhelpapp.conduite.donnees.DepotLicence
import com.needhelpapp.conduite.donnees.DepotReglages
import com.needhelpapp.conduite.facturation.Facturation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.needhelpapp.conduite.donnees.base.BaseConduite
import com.needhelpapp.conduite.donnees.DepotTrajets

/**
 * Le point de départ, et le seul endroit où l'on assemble les pièces.
 *
 * Pas d'injection de dépendances : l'application a trois objets partagés
 * et une seule façon de les construire. Une bibliothèque d'injection
 * ajouterait ici plus de code qu'elle n'en économiserait.
 */
class AppConduite : Application() {

    /**
     * Une portée qui vit aussi longtemps que le processus.
     *
     * Elle sert à la facturation, dont les réponses arrivent par rappel
     * bien après que l'écran qui a lancé l'achat a disparu. Les rattacher
     * à un ViewModel perdrait l'acquittement d'un achat fait juste avant
     * que l'utilisateur ne ferme l'application — et Google rembourserait
     * au bout de trois jours.
     */
    val portee = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val reglages: DepotReglages by lazy { DepotReglages(this) }
    val licence: DepotLicence by lazy { DepotLicence(this) }
    val facturation: Facturation by lazy { Facturation(this, licence, portee) }
    val trajets: DepotTrajets by lazy { DepotTrajets(BaseConduite.obtenir(this).trajets()) }

    override fun onCreate() {
        super.onCreate()
        creerLesCanaux()

        portee.launch {
            // La date qui fait courir l'essai. Écrite une seule fois, au
            // tout premier démarrage.
            licence.noterPremierLancement()
        }

        // Le magasin est interrogé au lancement, et pas seulement quand
        // l'utilisateur ouvre l'écran d'achat : c'est ainsi qu'un achat
        // fait sur un autre téléphone est déjà restauré quand il arrive.
        facturation.demarrer()
    }

    /**
     * Les canaux doivent exister avant la première notification, et la
     * première notification arrive dans `startForeground` — c'est-à-dire
     * potentiellement quelques millisecondes après un redémarrage du
     * téléphone. Les créer ici, et pas dans le service, évite la course.
     */
    private fun creerLesCanaux() {
        val gestionnaire = getSystemService(NotificationManager::class.java)

        gestionnaire.createNotificationChannel(
            NotificationChannel(
                CANAL_SURVEILLANCE,
                getString(R.string.canal_surveillance),
                // BASSE et non MINIMALE : Android masque les canaux
                // d'importance minimale sur certains lanceurs, et une
                // notification de service qu'on ne voit pas est une
                // application qu'on croit éteinte.
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = getString(R.string.canal_surveillance_description)
                setShowBadge(false)
            },
        )

        gestionnaire.createNotificationChannel(
            NotificationChannel(
                CANAL_TRAJET,
                getString(R.string.canal_trajet),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = getString(R.string.canal_trajet_description)
            },
        )
    }

    companion object {
        const val CANAL_SURVEILLANCE = "surveillance"
        const val CANAL_TRAJET = "trajet"
    }
}
