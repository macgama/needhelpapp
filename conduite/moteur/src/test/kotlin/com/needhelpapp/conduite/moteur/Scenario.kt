package com.needhelpapp.conduite.moteur

/**
 * De quoi rejouer un trajet en quelques lignes.
 *
 * Le temps y est une variable comme une autre : un arrêt de deux minutes
 * s'écrit `attendre(120_000)` et coûte une fraction de milliseconde. Sans
 * cela, éprouver le délai de fin de trajet demanderait deux minutes de
 * test réel, et personne ne le referait après une modification.
 */
class Scenario(reglages: ReglagesDetection = ReglagesDetection()) {

    private val moteur = MoteurDecision(reglages)
    private var t = 0L

    val evenements = mutableListOf<MoteurDecision.EvenementTrajet>()

    /** A-t-on bloqué ne serait-ce qu'un instant depuis le début ? */
    var blocageObserve = false
        private set

    var derniere: MoteurDecision.Decision = moteur.traiter(Signal.Battement(0))
        private set

    val bloque: Boolean get() = derniere.blocageActif
    val etat: MoteurDecision.Etat get() = derniere.etat
    val motif: MoteurDecision.Motif get() = derniere.motif

    private fun envoyer(signal: Signal): MoteurDecision.Decision {
        val decision = moteur.traiter(signal)
        decision.evenementTrajet?.let { evenements += it }
        if (decision.blocageActif) blocageObserve = true
        derniere = decision
        return decision
    }

    /** Un relevé de position. `kmh` nul = le capteur n'a pas su dire. */
    fun position(kmh: Float?, precisionM: Float = 8f) =
        envoyer(Signal.Position(t, kmh?.let { it / 3.6f }, precisionM))

    fun activite(genre: GenreActivite, confiance: Int) =
        envoyer(Signal.Activite(t, genre, confiance))

    /** La liaison Bluetooth du véhicule déclaré s'établit ou se rompt. */
    fun vehicule(present: Boolean) = envoyer(Signal.Vehicule(t, present))

    fun declarerPassager() = envoyer(Signal.DeclarationPassager(t))

    fun annulerPassager() = envoyer(Signal.AnnulationPassager(t))

    /**
     * Fait passer [dureeMs], en émettant un signal tous les [pasMs].
     * Avec [positionKmh], ce signal est un point GPS ; sans lui, un simple
     * battement — c'est ainsi qu'on simule un tunnel.
     */
    fun attendre(dureeMs: Long, pasMs: Long = 5_000, positionKmh: Float? = null) {
        val fin = t + dureeMs
        while (t < fin) {
            t = minOf(t + pasMs, fin)
            if (positionKmh != null) position(positionKmh) else envoyer(Signal.Battement(t))
        }
    }

    /** Amène le scénario en conduite confirmée, par le chemin normal. */
    fun demarrerUnTrajet(vitesseKmh: Float = 50f) {
        position(vitesseKmh)
        attendre(25_000, positionKmh = vitesseKmh)
    }
}
