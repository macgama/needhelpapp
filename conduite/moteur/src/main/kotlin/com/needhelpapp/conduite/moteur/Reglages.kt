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
     * Les véhicules que l'utilisateur conduit.
     *
     * Plusieurs à la fois : la même personne prend sa voiture en semaine
     * et son vélo le samedi. Ils s'additionnent au lieu de s'exclure —
     * voir [ProfilVehicule] pour ce que le moteur en tire.
     */
    val profils: Set<ProfilVehicule> = setOf(ProfilVehicule.VOITURE),

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

    /**
     * Le même délai, quand la liaison Bluetooth du véhicule déclaré est
     * établie.
     *
     * Beaucoup plus court, et c'est justifié : les vingt secondes ne
     * servent qu'à écarter le bus, le tram, le vélo et le point GPS
     * aberrant. Quand le téléphone est connecté à VOTRE autoradio, cette
     * ambiguïté n'existe plus — il ne reste qu'à vérifier que le
     * véhicule roule vraiment, ce qu'un ou deux points suffisent à dire.
     */
    val delaiConfirmationVehiculeMs: Long = 8_000,

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
    /**
     * LE SEUIL LE PLUS BAS DE TOUS LES PROFILS ACTIFS. Il suffit qu'un
     * seul profil s'applique pour qu'il y ait un danger : prendre le
     * seuil le plus haut laisserait passer précisément le véhicule le
     * plus lent, c'est-à-dire celui qu'on venait d'ajouter.
     */
    val seuilEntreeMs: Float get() = profils.minOf { it.seuilEntreeMs }

    val seuilSortieMs: Float get() = profils.minOf { it.seuilSortieMs }

    /**
     * L'INTERSECTION des démentis, et non leur réunion.
     *
     * Une activité ne disculpe que si elle disculpe pour TOUS les profils
     * actifs à la fois. C'est ce qui règle la contradiction du départ :
     * avec « voiture » et « vélo » cochés ensemble, « à vélo » cesse de
     * démentir quoi que ce soit — puisque le vélo est justement l'un des
     * véhicules surveillés.
     */
    val activitesDementies: Set<GenreActivite>
        get() = profils.map { it.activitesDementies }.reduce { a, b -> a intersect b }

    /**
     * Le délai de confirmation dépend de la VITESSE, pas seulement des
     * profils cochés.
     *
     * Le risque de faux positif vient d'en bas : à 12 km/h on ne
     * distingue pas une trottinette d'un coureur, à 60 km/h la question
     * ne se pose plus. On prend donc le délai le plus court parmi les
     * profils que cette vitesse peut expliquer — ce qui donne trente
     * secondes de patience dans la zone ambiguë, et vingt seulement
     * au-dessus.
     */
    fun delaiConfirmationPour(vitesseMs: Float?): Long {
        val compatibles = profils.filter { vitesseMs != null && vitesseMs >= it.seuilEntreeMs }
        // Aucune vitesse fraîche : le déclencheur était la reconnaissance
        // d'activité « en véhicule », qui n'a rien d'ambigu.
        if (compatibles.isEmpty()) return profils.minOf { it.delaiConfirmationMs }
        return compatibles.minOf { it.delaiConfirmationMs }
    }

    init {
        require(profils.isNotEmpty()) {
            // Sans profil, il n'y a plus de seuil du tout, donc plus de
            // détection : mieux vaut refuser que se taire.
            "Au moins un profil de véhicule est nécessaire"
        }
        require(delaiFinTrajetMs >= 0)
        require(confianceActiviteMinimale in 0..100)
    }
}
