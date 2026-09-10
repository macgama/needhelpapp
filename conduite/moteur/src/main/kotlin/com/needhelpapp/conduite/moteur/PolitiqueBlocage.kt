package com.needhelpapp.conduite.moteur

/**
 * Qui a le droit de s'afficher pendant que l'on conduit.
 *
 * Séparé du moteur de détection, et pour une bonne raison : ce sont deux
 * questions indépendantes. « Est-ce que je conduis ? » se règle avec des
 * capteurs ; « est-ce que cette application a le droit d'être là ? » se
 * règle avec une liste. Les mêler rendrait les deux intestables.
 *
 * LA LISTE INCOMPRESSIBLE
 *
 * Certaines applications ne peuvent JAMAIS être bloquées, quel que soit
 * le réglage. Le téléphone et les urgences en font partie : une
 * application qui empêcherait d'appeler les secours depuis le bord de la
 * route serait pire que le problème qu'elle résout. Les réglages du
 * système aussi, sinon un faux positif enfermerait l'utilisateur sans
 * moyen de désactiver quoi que ce soit.
 */
enum class ModeBlocage {
    /**
     * On ne bloque que les applications explicitement désignées.
     * Le réglage par défaut : il ne surprend jamais, et il suffit pour
     * la grande majorité des cas — le danger a un nom, et c'est le fil
     * d'actualité, pas le lecteur de podcasts.
     */
    SOUPLE,

    /**
     * On bloque tout sauf ce qui est explicitement autorisé.
     * Pour qui veut une contrainte réelle, ou pour un parent qui règle
     * le téléphone d'un conducteur débutant.
     */
    STRICT,
}

data class ReglagesBlocage(
    val mode: ModeBlocage = ModeBlocage.SOUPLE,
    /** Utilisée en mode souple : ce que l'on veut voir disparaître au volant. */
    val paquetsSurveilles: Set<String> = emptySet(),
    /** Utilisée en mode strict : navigation, musique, ce qui a sa place en voiture. */
    val paquetsAutorises: Set<String> = emptySet(),
)

class PolitiqueBlocage(
    private val reglages: ReglagesBlocage,
    /**
     * Ce que l'appelant sait être intouchable sur cet appareil : le
     * composeur téléphonique, l'interface système, les réglages, et
     * l'application elle-même. La liste vient d'Android, elle n'est donc
     * pas écrite en dur ici.
     */
    private val paquetsIncompressibles: Set<String>,
) {
    enum class Verdict {
        /** Intouchable : téléphone, urgences, réglages système, nous-mêmes. */
        AUTORISE_TOUJOURS,

        /** L'utilisateur a explicitement autorisé cette application. */
        AUTORISE_PAR_REGLAGE,

        /** Mode souple : cette application n'est pas dans la liste surveillée. */
        AUTORISE_NON_SURVEILLE,

        BLOQUE,
    }

    fun juger(paquet: String): Verdict {
        if (paquet.isBlank()) return Verdict.AUTORISE_TOUJOURS
        if (paquet in paquetsIncompressibles) return Verdict.AUTORISE_TOUJOURS

        return when (reglages.mode) {
            ModeBlocage.SOUPLE ->
                if (paquet in reglages.paquetsSurveilles) Verdict.BLOQUE
                else Verdict.AUTORISE_NON_SURVEILLE

            ModeBlocage.STRICT ->
                if (paquet in reglages.paquetsAutorises) Verdict.AUTORISE_PAR_REGLAGE
                else Verdict.BLOQUE
        }
    }

    fun doitBloquer(paquet: String): Boolean = juger(paquet) == Verdict.BLOQUE
}
