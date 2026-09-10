package com.needhelpapp.conduite.moteur

/**
 * Ce qui entre dans le moteur de décision, et rien d'autre.
 *
 * Aucune classe de ce fichier ne connaît Android. C'est la condition
 * pour que la partie risquée du produit — décider si l'on conduit —
 * s'éprouve sur une machine de bureau, en quelques millisecondes, sans
 * téléphone, sans voiture et sans attendre un feu rouge.
 *
 * Le temps est TOUJOURS passé en paramètre, jamais lu depuis une
 * horloge. Un moteur qui appelle `System.currentTimeMillis()` ne se
 * teste qu'en temps réel : il faudrait deux minutes de test pour
 * éprouver un délai de fin de trajet de deux minutes.
 */

/** Ce que le téléphone croit être en train de faire. */
enum class GenreActivite {
    EN_VEHICULE,
    A_VELO,
    A_PIED,
    IMMOBILE,
    INCONNU,
}

/**
 * Un signal daté. `instant` est un temps monotone en millisecondes
 * (`SystemClock.elapsedRealtime()` côté Android), pas une heure murale :
 * un changement de fuseau ou une resynchronisation NTP ne doit pas
 * pouvoir rallonger ou raccourcir un délai de sécurité.
 */
sealed interface Signal {
    val instant: Long

    /**
     * Un relevé de position.
     *
     * `vitesseMs` est nulle quand le capteur n'a pas su la calculer —
     * ce qui arrive au premier point, et sous un tunnel. Nulle ne veut
     * pas dire zéro, et les confondre déverrouillerait le téléphone en
     * pleine autoroute.
     *
     * `precisionM` est le rayon d'incertitude en mètres. Un point à
     * 300 m près donne une vitesse fantaisiste : on l'écarte.
     */
    data class Position(
        override val instant: Long,
        val vitesseMs: Float?,
        val precisionM: Float,
    ) : Signal

    /** Une reconnaissance d'activité, avec sa confiance de 0 à 100. */
    data class Activite(
        override val instant: Long,
        val genre: GenreActivite,
        val confiance: Int,
    ) : Signal

    /**
     * Le temps qui passe, sans rien d'autre.
     *
     * Indispensable : la fin d'un trajet n'est pas un événement, c'est
     * une absence d'événement. Sans battement régulier, un téléphone
     * posé sur le siège d'une voiture garée resterait bloqué jusqu'au
     * prochain point GPS.
     */
    data class Battement(override val instant: Long) : Signal

    /**
     * La liaison Bluetooth avec le véhicule déclaré s'est établie ou
     * rompue.
     *
     * C'est le signal le plus sûr de tous, et le seul qui sache de QUEL
     * véhicule il s'agit : ni un bus, ni un tram, ni la voiture d'un
     * autre — la vôtre, celle dont vous avez appairé l'autoradio. Un
     * capteur ne peut pas déduire cela, un appairage si.
     *
     * Il ne dit pas pour autant qu'on roule : une voiture à l'arrêt,
     * contact mis, reste connectée. Le moteur s'en sert donc pour lever
     * un doute, jamais pour bloquer à lui seul.
     */
    data class Vehicule(
        override val instant: Long,
        val present: Boolean,
    ) : Signal

    /** « Je suis passager. » */
    data class DeclarationPassager(override val instant: Long) : Signal

    /** Retour en arrière sur la déclaration ci-dessus. */
    data class AnnulationPassager(override val instant: Long) : Signal
}
