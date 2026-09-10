package com.needhelpapp.conduite.moteur

/**
 * Qui a le droit de se faire protéger, et jusqu'à quand.
 *
 * Ici comme pour la détection, la règle est du calcul pur : des entrées,
 * une sortie, aucune horloge lue en douce, aucune référence à Android.
 * C'est ce qui permet d'éprouver « quinze jours et dix trajets » en une
 * milliseconde plutôt qu'en quinze jours.
 *
 * DEUX CONDITIONS, ET IL FAUT LES DEUX
 *
 * Une période d'essai en jours seuls punit celui qui ne prend pas la
 * voiture de la semaine : il paierait sans avoir rien vu. Une période en
 * trajets seuls punit le livreur, qui aurait épuisé son essai le premier
 * après-midi. L'essai dure donc quinze jours ET au moins dix trajets —
 * il faut avoir eu le temps ET l'occasion.
 *
 * CE QUI SE PASSE ENSUITE N'EST PAS ANODIN
 *
 * À l'expiration, la protection s'arrête. Une application de sécurité
 * qui cesse de protéger doit le DIRE, fort : afficher « en veille » en
 * silence pendant que rien ne tourne serait pire que de ne pas exister,
 * parce que l'utilisateur, lui, croirait être couvert. C'est la raison
 * de [EtatLicence.protectionActive] : le service refuse de démarrer dans
 * cet état plutôt que de tourner à vide.
 */
enum class Acces {
    /** La période d'essai court. Tout fonctionne. */
    ESSAI,

    /** L'essai est fini et rien n'a été acheté. La protection est à l'arrêt. */
    ESSAI_TERMINE,

    /** Acheté une fois, pour toujours. */
    ACHETE,
}

data class ConditionsEssai(
    val dureeJours: Int = 15,
    val trajetsMinimum: Int = 10,
) {
    init {
        require(dureeJours > 0 && trajetsMinimum > 0)
    }
}

data class EtatLicence(
    val acces: Acces,
    val joursRestants: Int,
    val trajetsRestants: Int,
) {
    val protectionActive: Boolean get() = acces != Acces.ESSAI_TERMINE
}

object Licence {

    private const val JOUR_MS = 24L * 60 * 60 * 1000

    /**
     * @param achete ce que le magasin a répondu, ou ce qu'on en avait gardé.
     * @param premierLancementMs heure murale du tout premier démarrage.
     * @param trajetsAccomplis nombre de trajets terminés depuis l'installation.
     */
    fun evaluer(
        achete: Boolean,
        premierLancementMs: Long,
        maintenantMs: Long,
        trajetsAccomplis: Int,
        conditions: ConditionsEssai = ConditionsEssai(),
    ): EtatLicence {
        if (achete) {
            return EtatLicence(Acces.ACHETE, joursRestants = 0, trajetsRestants = 0)
        }

        // L'heure murale peut reculer : changement de fuseau, correction
        // manuelle, resynchronisation. On ne compte jamais un nombre de
        // jours négatif — cela rendrait « il vous reste 18 jours sur 15 ».
        val ecoulesMs = (maintenantMs - premierLancementMs).coerceAtLeast(0L)
        val joursEcoules = (ecoulesMs / JOUR_MS).toInt()

        val joursRestants = (conditions.dureeJours - joursEcoules).coerceAtLeast(0)
        val trajetsRestants = (conditions.trajetsMinimum - trajetsAccomplis).coerceAtLeast(0)

        val termine = joursRestants == 0 && trajetsRestants == 0
        return EtatLicence(
            acces = if (termine) Acces.ESSAI_TERMINE else Acces.ESSAI,
            joursRestants = joursRestants,
            trajetsRestants = trajetsRestants,
        )
    }
}
