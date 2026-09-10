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
                instant - debutSuspicion >= reglages.delaiConfirmationMs -> {
                    etat = Etat.CONDUITE
                    dernierSignalUtile = maxOf(dernierSignalUtile, instant)
                    evenement = EvenementTrajet.DEBUT
                    dernierMotif = declencheur(instant) ?: Motif.VITESSE
                }
                else -> dernierMotif = Motif.CONFIRMATION_EN_COURS
            }

            Etat.CONDUITE -> when {
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

        // Une déclaration de passager ne vaut que pour le trajet en cours.
        // La reconduire d'un trajet à l'autre transformerait un aveu
        // ponctuel en désactivation permanente, ce que personne ne
        // choisirait consciemment.
        if (etat == Etat.ARRET) passagerDeclare = false

        val motif = if (passagerDeclare && etat.enTrajet) Motif.PASSAGER else dernierMotif
        return Decision(etat, passagerDeclare, motif, evenement)
    }

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
