package com.needhelpapp.conduite.moteur

/**
 * Les seuils de la détection, et les raisons de chaque valeur.
 *
 * Ils sont réunis ici parce qu'ils sont le vrai réglage du produit : un
 * seuil de sortie trop haut débloque le téléphone à chaque feu rouge, un
 * délai de confirmation trop court le bloque dans le tram. Aucun de ces
 * nombres n'est écrit en dur ailleurs dans le code.
 */
data class ReglagesDetection(
    /**
     * Au-dessus, on considère qu'un véhicule roule. 15 km/h est
     * au-dessus d'un pas de course soutenu et d'un vélo de ville
     * tranquille, en dessous de la vitesse d'un véhicule en circulation.
     */
    val seuilEntreeKmh: Float = 15f,

    /**
     * En dessous, le véhicule est à l'arrêt — feu rouge compris. C'est
     * volontairement bas : passer sous 5 km/h n'ouvre pas le téléphone,
     * cela ouvre seulement un compte à rebours (voir [delaiFinTrajetMs]).
     */
    val seuilSortieKmh: Float = 5f,

    /**
     * Combien de temps la condition doit tenir avant de bloquer.
     *
     * C'est le prix de la tranquillité : sans lui, un seul point GPS
     * aberrant — ils existent, en ville, entre deux immeubles — bloque
     * le téléphone d'un piéton. Vingt secondes coûtent quelques centaines
     * de mètres de route non couverts au début du trajet, ce qui est
     * acceptable, alors qu'un blocage intempestif fait désinstaller
     * l'application.
     */
    val delaiConfirmationMs: Long = 20_000,

    /**
     * Combien de temps à l'arrêt avant de déclarer le trajet fini.
     *
     * DEUX MINUTES, ET C'EST LE RÉGLAGE LE PLUS IMPORTANT DU FICHIER.
     * Un feu rouge dure jusqu'à 90 secondes ; un bouchon, davantage, mais
     * il n'y reste pas immobile deux minutes pleines sans jamais repasser
     * au-dessus du seuil d'entrée. Descendre à trente secondes rendrait
     * l'application inutile précisément là où l'on est le plus tenté de
     * regarder son téléphone : à l'arrêt, dans le trafic.
     */
    val delaiFinTrajetMs: Long = 120_000,

    /** Au-delà, le point GPS est trop flou pour qu'on en tire une vitesse. */
    val precisionMaximaleM: Float = 50f,

    /** En dessous, la reconnaissance d'activité ne prouve rien. */
    val confianceActiviteMinimale: Int = 75,

    /**
     * Durée de validité d'un point GPS. Passé ce délai, la dernière
     * vitesse connue n'est plus une information sur le présent.
     */
    val fraicheurPositionMs: Long = 30_000,

    /**
     * Durée de validité d'une reconnaissance d'activité. Plus longue que
     * celle d'un point GPS : le système ne la publie que lors des
     * transitions, parfois à plusieurs minutes d'intervalle.
     */
    val fraicheurActiviteMs: Long = 180_000,

    /**
     * Perte totale de signal en cours de conduite : au bout de combien
     * de temps rend-on la main ?
     *
     * ON NE DÉBLOQUE PAS PARCE QU'ON NE SAIT PLUS. Un tunnel, un parking
     * souterrain, un GPS que le système a coupé pour économiser la
     * batterie : dans les trois cas le véhicule roule toujours. Le
     * blocage est donc maintenu — mais pas indéfiniment, sinon un
     * téléphone qui perd durablement sa position reste muré. Cinq
     * minutes est le compromis : plus long que n'importe quel tunnel
     * routier européen, assez court pour qu'une panne de capteur ne
     * confisque pas le téléphone de la soirée.
     */
    val delaiPerteSignalMs: Long = 300_000,
) {
    val seuilEntreeMs: Float get() = seuilEntreeKmh / 3.6f
    val seuilSortieMs: Float get() = seuilSortieKmh / 3.6f

    init {
        require(seuilSortieKmh < seuilEntreeKmh) {
            // Sans cet écart, la moindre oscillation de vitesse autour du
            // seuil unique ferait clignoter le blocage.
            "Le seuil de sortie doit être strictement sous le seuil d'entrée"
        }
        require(delaiConfirmationMs >= 0 && delaiFinTrajetMs >= 0)
        require(confianceActiviteMinimale in 0..100)
    }
}
