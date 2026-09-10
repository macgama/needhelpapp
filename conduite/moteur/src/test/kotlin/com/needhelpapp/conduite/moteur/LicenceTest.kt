package com.needhelpapp.conduite.moteur

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LicenceTest {

    private val jour = 24L * 60 * 60 * 1000
    private val debut = 1_700_000_000_000L

    private fun evaluer(achete: Boolean = false, jours: Int = 0, trajets: Int = 0) =
        Licence.evaluer(
            achete = achete,
            premierLancementMs = debut,
            maintenantMs = debut + jours * jour,
            trajetsAccomplis = trajets,
        )

    @Test
    fun `au premier lancement, l'essai court`() {
        val etat = evaluer()
        assertEquals(Acces.ESSAI, etat.acces)
        assertEquals(15, etat.joursRestants)
        assertEquals(10, etat.trajetsRestants)
        assertTrue(etat.protectionActive)
    }

    @Test
    fun `celui qui ne prend pas la voiture ne perd pas son essai`() {
        // Vingt jours, trois trajets : il a eu le temps, pas l'occasion.
        // Le faire payer sans qu'il ait rien vu serait malhonnête.
        val etat = evaluer(jours = 20, trajets = 3)
        assertEquals(Acces.ESSAI, etat.acces)
        assertEquals(0, etat.joursRestants)
        assertEquals(7, etat.trajetsRestants)
    }

    @Test
    fun `le livreur non plus`() {
        // Trente trajets en deux jours : il a eu l'occasion, pas le temps.
        val etat = evaluer(jours = 2, trajets = 30)
        assertEquals(Acces.ESSAI, etat.acces)
        assertEquals(13, etat.joursRestants)
        assertEquals(0, etat.trajetsRestants)
    }

    @Test
    fun `les deux conditions remplies terminent l'essai`() {
        val etat = evaluer(jours = 20, trajets = 12)
        assertEquals(Acces.ESSAI_TERMINE, etat.acces)
        assertFalse(etat.protectionActive)
    }

    @Test
    fun `le compte est juste au jour et au trajet pres`() {
        assertEquals(Acces.ESSAI, evaluer(jours = 14, trajets = 10).acces)
        assertEquals(Acces.ESSAI, evaluer(jours = 15, trajets = 9).acces)
        assertEquals(Acces.ESSAI_TERMINE, evaluer(jours = 15, trajets = 10).acces)
    }

    @Test
    fun `l'achat rend l'acces complet, quoi qu'il arrive par ailleurs`() {
        val etat = evaluer(achete = true, jours = 400, trajets = 900)
        assertEquals(Acces.ACHETE, etat.acces)
        assertTrue(etat.protectionActive)
    }

    @Test
    fun `reculer l'horloge ne fabrique pas des jours en trop`() {
        // Changement de fuseau, correction manuelle, resynchronisation :
        // sans garde-fou, on afficherait « il vous reste 18 jours sur 15 ».
        val etat = Licence.evaluer(
            achete = false,
            premierLancementMs = debut,
            maintenantMs = debut - 3 * jour,
            trajetsAccomplis = 0,
        )
        assertEquals(15, etat.joursRestants)
        assertEquals(Acces.ESSAI, etat.acces)
    }

    @Test
    fun `des conditions d'essai vides sont refusees`() {
        assertTrue(runCatching { ConditionsEssai(dureeJours = 0) }.isFailure)
        assertTrue(runCatching { ConditionsEssai(trajetsMinimum = 0) }.isFailure)
    }
}
