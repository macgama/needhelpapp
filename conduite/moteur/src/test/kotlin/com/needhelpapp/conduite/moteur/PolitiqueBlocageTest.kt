package com.needhelpapp.conduite.moteur

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PolitiqueBlocageTest {

    private val incompressibles = setOf(
        "com.android.dialer",
        "com.android.settings",
        "com.needhelpapp.conduite",
    )

    private fun politique(reglages: ReglagesBlocage) =
        PolitiqueBlocage(reglages, incompressibles)

    @Test
    fun `le composeur telephonique n'est jamais bloque`() {
        // Une application qui empêcherait d'appeler les secours depuis
        // le bord de la route serait pire que le problème qu'elle résout.
        val stricte = politique(ReglagesBlocage(mode = ModeBlocage.STRICT))
        assertEquals(PolitiqueBlocage.Verdict.AUTORISE_TOUJOURS, stricte.juger("com.android.dialer"))
    }

    @Test
    fun `les reglages du systeme ne sont jamais bloques`() {
        // Sinon un faux positif enferme l'utilisateur : plus moyen de
        // désactiver quoi que ce soit.
        val stricte = politique(ReglagesBlocage(mode = ModeBlocage.STRICT))
        assertFalse(stricte.doitBloquer("com.android.settings"))
    }

    @Test
    fun `en mode souple, seules les applications designees tombent`() {
        val p = politique(
            ReglagesBlocage(
                mode = ModeBlocage.SOUPLE,
                paquetsSurveilles = setOf("com.reseau.social", "com.video.courte"),
            ),
        )
        assertTrue(p.doitBloquer("com.reseau.social"))
        assertEquals(
            PolitiqueBlocage.Verdict.AUTORISE_NON_SURVEILLE,
            p.juger("com.podcast.lecteur"),
        )
    }

    @Test
    fun `en mode strict, tout tombe sauf la liste d'exceptions`() {
        val p = politique(
            ReglagesBlocage(
                mode = ModeBlocage.STRICT,
                paquetsAutorises = setOf("com.navigation.cartes"),
            ),
        )
        assertEquals(
            PolitiqueBlocage.Verdict.AUTORISE_PAR_REGLAGE,
            p.juger("com.navigation.cartes"),
        )
        assertTrue(p.doitBloquer("com.podcast.lecteur"))
    }

    @Test
    fun `un paquet inconnu du systeme ne fait pas planter la politique`() {
        // Le service d'avant-plan rend parfois une chaîne vide entre deux
        // écrans. Bloquer là-dessus afficherait la superposition sur le
        // vide, pendant que l'utilisateur ne fait rien.
        val p = politique(ReglagesBlocage(mode = ModeBlocage.STRICT))
        assertEquals(PolitiqueBlocage.Verdict.AUTORISE_TOUJOURS, p.juger(""))
    }
}
