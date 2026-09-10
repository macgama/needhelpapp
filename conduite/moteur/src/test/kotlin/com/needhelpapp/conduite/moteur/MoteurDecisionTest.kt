package com.needhelpapp.conduite.moteur

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Ce que le moteur doit faire, écrit comme on le raconterait.
 *
 * Chaque test porte le nom d'une situation réelle plutôt que celui d'une
 * méthode : c'est la situation qui est la spécification, pas le code. Si
 * l'implémentation change et que « le feu rouge » passe encore, elle a
 * le droit de changer.
 */
class MoteurDecisionTest {

    // ------------------------------------------------------------------
    // Ne pas bloquer ceux qui ne conduisent pas
    // ------------------------------------------------------------------

    @Test
    fun `un telephone pose sur une table ne bloque jamais`() {
        val s = Scenario()
        s.attendre(600_000, positionKmh = 0f)
        assertFalse(s.blocageObserve)
        assertEquals(MoteurDecision.Etat.ARRET, s.etat)
    }

    @Test
    fun `un point GPS aberrant ne suffit pas a bloquer`() {
        // Le cas de la rue étroite entre deux immeubles : un relevé à
        // 60 km/h, puis le GPS retrouve ses esprits.
        val s = Scenario()
        s.position(60f)
        assertEquals(MoteurDecision.Etat.SUSPICION, s.etat)
        assertFalse(s.bloque)

        s.attendre(60_000, positionKmh = 1f)
        assertFalse(s.blocageObserve)
        assertEquals(MoteurDecision.Etat.ARRET, s.etat)
    }

    @Test
    fun `un point trop imprecis est ignore`() {
        val s = Scenario()
        s.position(80f, precisionM = 250f)
        assertEquals(MoteurDecision.Etat.ARRET, s.etat)
    }

    @Test
    fun `un cycliste rapide que le systeme reconnait n'est pas bloque`() {
        // 20 km/h passe le seuil d'entrée : seule la reconnaissance
        // d'activité sauve le cycliste. C'est la raison d'être du démenti.
        val s = Scenario()
        repeat(5) {
            // Le système republie l'activité régulièrement ; on la rejoue
            // au même rythme, sans quoi le test éprouverait la péremption
            // du signal plutôt que le démenti.
            s.activite(GenreActivite.A_VELO, confiance = 90)
            s.attendre(60_000, positionKmh = 20f)
        }
        assertFalse(s.blocageObserve)
    }

    // ------------------------------------------------------------------
    // Bloquer ceux qui conduisent
    // ------------------------------------------------------------------

    @Test
    fun `une acceleration soutenue bloque, mais pas avant le delai de confirmation`() {
        val s = Scenario(ReglagesDetection(delaiConfirmationMs = 20_000))
        s.position(50f)
        s.attendre(15_000, positionKmh = 50f)
        assertFalse(s.bloque, "bloqué avant la fin de la confirmation")

        s.attendre(10_000, positionKmh = 50f)
        assertTrue(s.bloque)
        assertEquals(listOf(MoteurDecision.EvenementTrajet.DEBUT), s.evenements)
    }

    @Test
    fun `la reconnaissance d'activite seule suffit a demarrer, sans GPS`() {
        // Utile en ville, où la position met parfois une minute à
        // arriver, et en tunnel dès le départ d'un parking souterrain.
        val s = Scenario()
        s.activite(GenreActivite.EN_VEHICULE, confiance = 95)
        s.attendre(25_000)
        assertTrue(s.bloque)
        assertEquals(MoteurDecision.Motif.ACTIVITE, s.motif)
    }

    @Test
    fun `une activite peu sure ne demarre rien`() {
        val s = Scenario()
        s.activite(GenreActivite.EN_VEHICULE, confiance = 40)
        s.attendre(60_000)
        assertFalse(s.blocageObserve)
    }

    // ------------------------------------------------------------------
    // Le feu rouge : le cas qui fait tout l'intérêt de l'état PAUSE
    // ------------------------------------------------------------------

    @Test
    fun `le feu rouge ne debloque pas le telephone`() {
        val s = Scenario()
        s.demarrerUnTrajet()
        assertTrue(s.bloque)

        s.attendre(90_000, positionKmh = 0f)
        assertTrue(s.bloque, "débloqué au feu rouge — c'est exactement ce qu'il ne faut pas")
        assertEquals(MoteurDecision.Etat.PAUSE, s.etat)

        s.attendre(30_000, positionKmh = 50f)
        assertTrue(s.bloque)
        assertEquals(
            listOf(MoteurDecision.EvenementTrajet.DEBUT), s.evenements,
            "le feu rouge a coupé le trajet en deux",
        )
    }

    @Test
    fun `un arret prolonge termine le trajet`() {
        val s = Scenario(ReglagesDetection(delaiFinTrajetMs = 120_000))
        s.demarrerUnTrajet()

        s.attendre(119_000, positionKmh = 0f)
        assertTrue(s.bloque)

        s.attendre(6_000, positionKmh = 0f)
        assertFalse(s.bloque)
        assertEquals(MoteurDecision.Etat.ARRET, s.etat)
        assertEquals(MoteurDecision.Motif.ARRET_PROLONGE, s.motif)
        assertEquals(
            listOf(MoteurDecision.EvenementTrajet.DEBUT, MoteurDecision.EvenementTrajet.FIN),
            s.evenements,
        )
    }

    @Test
    fun `descendre du vehicule rend la main tout de suite`() {
        // On n'attend pas deux minutes quand on a la preuve que la
        // personne marche : elle est arrivée.
        val s = Scenario()
        s.demarrerUnTrajet()
        s.position(0f)
        s.activite(GenreActivite.A_PIED, confiance = 92)
        assertFalse(s.bloque)
        assertEquals(MoteurDecision.Motif.SORTI_DU_VEHICULE, s.motif)
    }

    // ------------------------------------------------------------------
    // Le doute maintient le blocage — mais pas éternellement
    // ------------------------------------------------------------------

    @Test
    fun `le tunnel ne debloque pas le telephone`() {
        val s = Scenario(ReglagesDetection(delaiPerteSignalMs = 300_000))
        s.demarrerUnTrajet()

        s.attendre(240_000) // plus aucun signal : ni GPS, ni activité
        assertTrue(s.bloque, "débloqué faute de signal — le véhicule roule toujours")
    }

    @Test
    fun `une perte de signal durable finit par rendre la main`() {
        val s = Scenario(ReglagesDetection(delaiPerteSignalMs = 300_000))
        s.demarrerUnTrajet()

        s.attendre(320_000)
        assertFalse(s.bloque)
        assertEquals(MoteurDecision.Motif.PERTE_DE_SIGNAL, s.motif)
        assertEquals(
            listOf(MoteurDecision.EvenementTrajet.DEBUT, MoteurDecision.EvenementTrajet.FIN),
            s.evenements,
        )
    }

    @Test
    fun `une vitesse absente n'est pas une vitesse nulle`() {
        // Le premier point d'un capteur, et tous ceux d'un GPS qui a
        // perdu ses satellites, n'ont pas de vitesse. Les lire comme des
        // zéros déverrouillerait le téléphone en pleine autoroute.
        val s = Scenario()
        s.demarrerUnTrajet()
        s.attendre(150_000, positionKmh = null)
        assertTrue(s.bloque)
    }

    // ------------------------------------------------------------------
    // Le passager
    // ------------------------------------------------------------------

    @Test
    fun `le passager leve le blocage sans interrompre le trajet`() {
        val s = Scenario()
        s.demarrerUnTrajet()
        assertTrue(s.bloque)

        s.declarerPassager()
        assertFalse(s.bloque)
        assertTrue(s.etat.enTrajet, "le trajet doit continuer d'être enregistré")
        assertEquals(MoteurDecision.Motif.PASSAGER, s.motif)
    }

    @Test
    fun `la declaration de passager ne vaut que pour le trajet en cours`() {
        // Sinon un aveu ponctuel deviendrait une désactivation
        // permanente, que personne ne choisirait consciemment.
        val s = Scenario()
        s.demarrerUnTrajet()
        s.declarerPassager()
        assertFalse(s.bloque)

        s.attendre(130_000, positionKmh = 0f) // fin du trajet
        assertEquals(MoteurDecision.Etat.ARRET, s.etat)

        s.demarrerUnTrajet()
        assertTrue(s.bloque, "la déclaration a survécu au trajet")
    }

    @Test
    fun `le passager peut se raviser`() {
        val s = Scenario()
        s.demarrerUnTrajet()
        s.declarerPassager()
        s.annulerPassager()
        assertTrue(s.bloque)
    }

    // ------------------------------------------------------------------
    // Trois trajets d'affilée
    // ------------------------------------------------------------------

    @Test
    fun `chaque trajet produit exactement un debut et une fin`() {
        val s = Scenario()
        repeat(3) {
            s.demarrerUnTrajet()
            s.attendre(130_000, positionKmh = 0f)
        }
        assertEquals(6, s.evenements.size)
        assertEquals(
            List(3) { listOf(MoteurDecision.EvenementTrajet.DEBUT, MoteurDecision.EvenementTrajet.FIN) }.flatten(),
            s.evenements,
        )
    }

    // ------------------------------------------------------------------
    // Les réglages eux-mêmes
    // ------------------------------------------------------------------

    @Test
    fun `un seuil de sortie au-dessus du seuil d'entree est refuse`() {
        // Sans écart entre les deux, le blocage clignoterait au rythme du
        // bruit de mesure. Autant l'interdire à la construction.
        val erreur = runCatching { ReglagesDetection(seuilEntreeKmh = 10f, seuilSortieKmh = 20f) }
        assertTrue(erreur.isFailure)
    }
}
