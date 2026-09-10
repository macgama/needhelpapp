package com.needhelpapp.conduite.moteur

/**
 * Ce que l'utilisateur conduit — et ce n'est pas un détail cosmétique.
 *
 * POURQUOI UN SEUL JEU DE SEUILS NE PEUT PAS MARCHER
 *
 * La première version ne connaissait que la voiture, et deux de ses
 * choix se retournent complètement dès qu'on descend en vitesse :
 *
 *   1. Le seuil d'entrée est à 15 km/h, choisi précisément pour être
 *      au-dessus d'un vélo de ville. Une trottinette à 20 km/h passe
 *      juste, un vélo tranquille à 14 km/h ne déclenche rien du tout —
 *      alors que regarder son téléphone y est tout aussi dangereux.
 *
 *   2. « À vélo » sert de DÉMENTI : la reconnaissance d'activité l'utilise
 *      pour annuler un blocage, puisqu'un cycliste ne tient pas de
 *      volant. Pour qui veut justement protéger les cyclistes, c'est le
 *      signal exactement à l'envers.
 *
 * D'où ces profils. Chacun porte ses seuils ET la liste des activités
 * qui le démentent, parce que les deux vont ensemble : on ne peut pas
 * baisser le seuil sans revoir ce qui prouve qu'on ne conduit pas.
 *
 * PLUSIEURS PROFILS À LA FOIS, ET C'EST LE CAS NORMAL
 *
 * La même personne prend sa voiture en semaine et son vélo le samedi.
 * Les profils s'additionnent donc au lieu de s'exclure, et le moteur en
 * tire :
 *
 *   — le seuil d'entrée LE PLUS BAS (il suffit qu'un profil s'applique
 *     pour qu'il y ait un danger) ;
 *   — l'INTERSECTION des démentis (une activité ne disculpe que si elle
 *     disculpe pour tous les profils actifs à la fois).
 *
 * C'est ce second point qui règle la contradiction : avec « voiture » et
 * « vélo » cochés ensemble, « à vélo » ne dément plus rien, puisque le
 * vélo est justement l'un des véhicules surveillés.
 */
enum class ProfilVehicule(
    val seuilEntreeKmh: Float,
    val seuilSortieKmh: Float,
    val delaiConfirmationMs: Long,
    /** Les activités qui prouvent qu'on n'est PAS sur ce véhicule-là. */
    val activitesDementies: Set<GenreActivite>,
) {
    /**
     * Voiture, camionnette, camping-car.
     *
     * « À vélo » dément : personne ne pédale au volant. C'est ce qui
     * épargne le cycliste rapide quand seul ce profil est actif.
     */
    VOITURE(
        seuilEntreeKmh = 15f,
        seuilSortieKmh = 5f,
        delaiConfirmationMs = 20_000,
        activitesDementies = setOf(GenreActivite.A_PIED, GenreActivite.A_VELO),
    ),

    /**
     * Moto, scooter, vélomoteur.
     *
     * Mêmes vitesses qu'une voiture, mais « à vélo » ne dément PLUS :
     * la reconnaissance d'activité confond volontiers un scooter en
     * ville avec un vélo — même allure, mêmes accélérations, même
     * absence de carrosserie autour du téléphone. Garder ce démenti
     * ouvrirait un trou béant dans le profil.
     */
    MOTO(
        seuilEntreeKmh = 15f,
        seuilSortieKmh = 5f,
        delaiConfirmationMs = 20_000,
        activitesDementies = setOf(GenreActivite.A_PIED),
    ),

    /**
     * Vélo, vélo électrique, trottinette, monoroue.
     *
     * SEUIL À 10 KM/H, et c'est le nombre délicat de tout ce fichier.
     * Il faut descendre pour attraper un vélo de ville — mais on entre
     * alors dans le domaine de la course à pied soutenue, qui tient
     * 12 à 15 km/h sans peine. Deux garde-fous, et seulement deux :
     * « à pied » reste un démenti (la course y est rangée), et la
     * confirmation passe à trente secondes pour laisser au système le
     * temps de le dire.
     *
     * Un coureur peut donc être bloqué quelques dizaines de secondes
     * avant d'être disculpé. C'est le prix assumé pour couvrir les
     * deux-roues légers, et le bouton « je ne conduis pas » est là pour
     * les cas où le système se tait.
     */
    VELO(
        seuilEntreeKmh = 10f,
        seuilSortieKmh = 4f,
        delaiConfirmationMs = 30_000,
        activitesDementies = setOf(GenreActivite.A_PIED),
    ),
    ;

    init {
        require(seuilSortieKmh < seuilEntreeKmh) {
            "Sans écart entre les deux seuils, le blocage clignoterait au " +
                "rythme du bruit de mesure"
        }
    }

    val seuilEntreeMs: Float get() = seuilEntreeKmh / 3.6f
    val seuilSortieMs: Float get() = seuilSortieKmh / 3.6f
}
