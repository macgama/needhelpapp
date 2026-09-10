package com.needhelpapp.conduite.moteur

/**
 * L'automate qui décide si l'on conduit.
 *
 * C'est le seul endroit du produit où cette question est tranchée, et
 * c'est le morceau où les erreurs coûtent cher dans les deux sens : ne
 * pas bloquer un conducteur rate la raison d'être de l'application ;
 * bloquer un piéton, un passager de tram ou un téléphone posé sur une
 * table la fait désinstaller dans la journée.
 *
 * QUATRE ÉTATS, ET POURQUOI PAS DEUX
 *
 * « Roule / ne roule pas » ne suffit pas, à cause des deux moments où la
 * mesure et la réalité divergent :
 *
 *   ARRET      Rien ne se passe. Aucun capteur n'est sollicité en continu.
 *
 *   SUSPICION  Un signal dit « véhicule », mais on ne bloque pas encore.
 *              Cet état existe pour absorber les points GPS aberrants,
 *              qui sont fréquents en ville et durent une seconde ou deux.
 *
 *   CONDUITE   On roule. Le blocage est actif.
 *
 *   PAUSE      Le véhicule est immobile mais le trajet n'est pas fini.
 *              LE BLOCAGE RESTE ACTIF. C'est l'état du feu rouge, et
 *              c'est précisément là que la tentation de saisir son
 *              téléphone est la plus forte. Sans cet état, l'application
 *              rendrait la main exactement quand elle ne doit pas.
 *
 * L'ASYMÉTRIE EST VOULUE
 *
 * Il faut un signal franc et soutenu pour bloquer, et un signal franc
 * pour débloquer — mais entre les deux, le doute maintient le blocage.
 * Un capteur qui se tait n'est pas un capteur qui dit « à l'arrêt » :
 * sous un tunnel, le véhicule roule toujours.
 *
 * Le moteur ne lit aucune horloge et ne connaît pas Android : on lui
 * donne des signaux datés, il rend une décision. C'est ce qui permet de
 * rejouer un trajet de vingt minutes en une milliseconde de test.
 */
class MoteurDecision(
    private val reglages: ReglagesDetection = ReglagesDetection(),
) {

    enum class Etat {
        ARRET,
        SUSPICION,
        CONDUITE,
        PAUSE,
        ;

        /** CONDUITE et PAUSE sont un même trajet, vu de l'extérieur. */
        val enTrajet: Boolean get() = this == CONDUITE || this == PAUSE
    }

    /** Pourquoi la décision actuelle est ce qu'elle est. Sert au journal et à l'écran. */
    enum class Motif {
        AUCUN,
        VITESSE,
        ACTIVITE,
        CONFIRMATION_EN_COURS,
        VEHICULE_IMMOBILE,
        ARRET_PROLONGE,
        SORTI_DU_VEHICULE,
        VEHICULE_QUITTE,
        PERTE_DE_SIGNAL,
        PASSAGER,
    }

    /** Ce qu'il faut écrire dans le journal des trajets, s'il y a lieu. */
    enum class EvenementTrajet { DEBUT, FIN }

    data class Decision(
        val etat: Etat,
        val passagerDeclare: Boolean,
        val motif: Motif,
        val evenementTrajet: EvenementTrajet? = null,
    ) {
        /**
         * La seule sortie qui compte pour le reste de l'application.
         *
         * Un passager déclaré est en trajet sans être bloqué : le trajet
         * continue d'être enregistré, seule la contrainte tombe.
         */
        val blocageActif: Boolean get() = etat.enTrajet && !passagerDeclare
    }

    var etat: Etat = Etat.ARRET
        private set

    var passagerDeclare: Boolean = false
        private set

    /**
     * La liaison Bluetooth du véhicule déclaré est-elle établie ?
     *
     * Pas de péremption ici, contrairement aux capteurs : ce n'est pas
     * une mesure mais un état, et il ne change que sur événement. C'est
     * à l'appelant de publier l'état réel au démarrage, faute de quoi un
     * « connecté » manqué resterait vrai indéfiniment.
     */
    private var vehiculePresent: Boolean = false

    /**
     * A-t-on été connecté au véhicule à un moment de CE trajet ?
     *
     * Sans cette mémoire, une déconnexion ne voudrait rien dire : un
     * téléphone qui n'a jamais été connecté à quoi que ce soit publie
     * lui aussi « non connecté », et terminerait tous les trajets à pied
     * ou en bus dès le premier signal.
     */
    private var vehiculeVuDansLeTrajet: Boolean = false

    private var dernierePosition: Signal.Position? = null
    private var derniereActivite: Signal.Activite? = null
    private var debutSuspicion: Long = 0
    private var debutPause: Long = 0

    /**
     * Dernier instant où un capteur a dit quelque chose d'exploitable.
     * Un point GPS valide, ou une activité « en véhicule » : c'est ce
     * qui distingue « le véhicule est à l'arrêt » de « on ne sait plus ».
     */
    private var dernierSignalUtile: Long = 0

    private var dernierMotif: Motif = Motif.AUCUN

    fun traiter(signal: Signal): Decision {
        when (signal) {
            is Signal.Position -> memoriserPosition(signal)
            is Signal.Activite -> memoriserActivite(signal)
            is Signal.Vehicule -> {
                vehiculePresent = signal.present
                // La liaison peut s'établir APRÈS le départ — on démarre
                // souvent avant que l'autoradio ait fini de s'appairer.
                if (signal.present && etat.enTrajet) vehiculeVuDansLeTrajet = true
            }
            is Signal.Battement -> Unit
            is Signal.DeclarationPassager -> passagerDeclare = true
            is Signal.AnnulationPassager -> passagerDeclare = false
        }
        return avancer(signal.instant)
    }

    private fun memoriserPosition(position: Signal.Position) {
        // Un point sans vitesse ou trop imprécis n'est pas une mesure :
        // le garder reviendrait à croire qu'on sait, alors qu'on ne sait pas.
        val vitesse = position.vitesseMs ?: return
        if (vitesse < 0f) return
        if (position.precisionM > reglages.precisionMaximaleM) return
        dernierePosition = position
        dernierSignalUtile = maxOf(dernierSignalUtile, position.instant)
    }

    private fun memoriserActivite(activite: Signal.Activite) {
        derniereActivite = activite
        if (activite.genre == GenreActivite.EN_VEHICULE &&
            activite.confiance >= reglages.confianceActiviteMinimale
        ) {
            dernierSignalUtile = maxOf(dernierSignalUtile, activite.instant)
        }
    }

    private fun avancer(instant: Long): Decision {
        var evenement: EvenementTrajet? = null

        when (etat) {
            Etat.ARRET -> {
                val declencheur = declencheur(instant)
                if (declencheur != null) {
                    etat = Etat.SUSPICION
                    debutSuspicion = instant
                    dernierMotif = declencheur
                }
            }

            Etat.SUSPICION -> when {
                // Un démenti franc annule la suspicion sans attendre.
                infirme(instant) -> {
                    etat = Etat.ARRET
                    dernierMotif = Motif.AUCUN
                }
                instant - debutSuspicion >= delaiDeConfirmation() -> {
                    etat = Etat.CONDUITE
                    dernierSignalUtile = maxOf(dernierSignalUtile, instant)
                    vehiculeVuDansLeTrajet = vehiculePresent
                    evenement = EvenementTrajet.DEBUT
                    dernierMotif = declencheur(instant) ?: Motif.VITESSE
                }
                else -> dernierMotif = Motif.CONFIRMATION_EN_COURS
            }

            Etat.CONDUITE -> when {
                vehiculeQuitte() -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.VEHICULE_QUITTE
                }
                sortiDuVehicule(instant) -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.SORTI_DU_VEHICULE
                }
                vehiculeImmobile(instant) -> {
                    etat = Etat.PAUSE
                    debutPause = instant
                    dernierMotif = Motif.VEHICULE_IMMOBILE
                }
                instant - dernierSignalUtile >= reglages.delaiPerteSignalMs -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.PERTE_DE_SIGNAL
                }
                // Le blocage continue ; on note seulement ce qui, à cet
                // instant, en apporte la preuve. Faute de signal frais —
                // un tunnel — on garde le motif précédent plutôt que
                // d'inventer une certitude qu'on n'a plus.
                else -> dernierMotif = declencheur(instant) ?: dernierMotif
            }

            Etat.PAUSE -> when {
                vehiculeQuitte() -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.VEHICULE_QUITTE
                }
                sortiDuVehicule(instant) -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.SORTI_DU_VEHICULE
                }
                // Le feu passe au vert : on repart, sans nouveau trajet.
                roule(instant) -> {
                    etat = Etat.CONDUITE
                    dernierMotif = Motif.VITESSE
                }
                instant - debutPause >= reglages.delaiFinTrajetMs -> {
                    etat = Etat.ARRET
                    evenement = EvenementTrajet.FIN
                    dernierMotif = Motif.ARRET_PROLONGE
                }
                else -> dernierMotif = Motif.VEHICULE_IMMOBILE
            }
        }

        if (etat == Etat.ARRET) vehiculeVuDansLeTrajet = false

        // Une déclaration de passager ne vaut que pour le trajet en cours.
        // La reconduire d'un trajet à l'autre transformerait un aveu
        // ponctuel en désactivation permanente, ce que personne ne
        // choisirait consciemment.
        if (etat == Etat.ARRET) passagerDeclare = false

        val motif = if (passagerDeclare && etat.enTrajet) Motif.PASSAGER else dernierMotif
        return Decision(etat, passagerDeclare, motif, evenement)
    }

    /**
     * Connecté à VOTRE autoradio, il n'y a plus de bus, plus de tram,
     * plus de vélo et plus de piéton à écarter : la longue confirmation
     * n'a plus d'objet. Il reste à vérifier que le véhicule roule, ce
     * qu'un ou deux points de vitesse suffisent à dire.
     */
    private fun delaiDeConfirmation(): Long =
        if (vehiculePresent) reglages.delaiConfirmationVehiculeMs
        else reglages.delaiConfirmationMs

    /**
     * La liaison s'est rompue APRÈS avoir existé pendant ce trajet.
     *
     * L'autoradio s'éteint avec le contact : c'est le signal de fin de
     * trajet le plus sûr dont on dispose, et il arrive à la seconde,
     * là où l'attente de deux minutes tâtonne. Il ne vaut évidemment que
     * pour un trajet où la liaison a réellement existé — d'où la
     * mémoire, et non le simple `!vehiculePresent`.
     */
    private fun vehiculeQuitte(): Boolean = vehiculeVuDansLeTrajet && !vehiculePresent

    /** Le signal franc qui ouvre une suspicion, et lequel c'était. */
    private fun declencheur(instant: Long): Motif? {
        if (roule(instant)) return Motif.VITESSE
        val activite = activiteFraiche(instant)
        if (activite != null &&
            activite.genre == GenreActivite.EN_VEHICULE &&
            activite.confiance >= reglages.confianceActiviteMinimale
        ) {
            return Motif.ACTIVITE
        }
        return null
    }

    /**
     * Le démenti franc.
     *
     * Volontairement plus exigeant que « le déclencheur n'est plus vrai » :
     * une voiture qui ralentit à 10 km/h pendant la confirmation ne doit
     * pas remettre le compteur à zéro, sans quoi une rue encombrée ne
     * déclencherait jamais le blocage.
     */
    private fun infirme(instant: Long): Boolean {
        if (sortiDuVehicule(instant)) return true
        val position = positionFraiche(instant) ?: return false
        return position.vitesseMs!! < reglages.seuilSortieMs
    }

    private fun roule(instant: Long): Boolean {
        val position = positionFraiche(instant) ?: return false
        return position.vitesseMs!! >= reglages.seuilEntreeMs
    }

    private fun vehiculeImmobile(instant: Long): Boolean {
        val position = positionFraiche(instant) ?: return false
        return position.vitesseMs!! < reglages.seuilSortieMs
    }

    /**
     * À pied ou à vélo, avec une bonne confiance : quoi qu'en dise le
     * GPS, on ne tient pas un volant. C'est aussi la porte de sortie du
     * cycliste rapide, que la seule vitesse ferait bloquer à tort.
     */
    private fun sortiDuVehicule(instant: Long): Boolean {
        val activite = activiteFraiche(instant) ?: return false
        val aPied = activite.genre == GenreActivite.A_PIED || activite.genre == GenreActivite.A_VELO
        return aPied && activite.confiance >= reglages.confianceActiviteMinimale
    }

    private fun positionFraiche(instant: Long): Signal.Position? =
        dernierePosition?.takeIf { instant - it.instant <= reglages.fraicheurPositionMs }

    private fun activiteFraiche(instant: Long): Signal.Activite? =
        derniereActivite?.takeIf { instant - it.instant <= reglages.fraicheurActiviteMs }
}
