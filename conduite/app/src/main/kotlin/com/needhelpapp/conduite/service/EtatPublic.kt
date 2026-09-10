package com.needhelpapp.conduite.service

import com.needhelpapp.conduite.moteur.MoteurDecision
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Ce que le service veut bien montrer à l'interface.
 *
 * L'interface n'est PAS liée au service : elle le regarde. Une liaison
 * (`bindService`) donnerait un objet qui disparaît quand l'écran se
 * ferme, et ferait de chaque écran une raison de garder le service en
 * vie. Ici, l'application peut être entièrement fermée sans que rien ne
 * change à la surveillance — ce qui est bien le but.
 */
object EtatPublic {

    data class Vue(
        val serviceActif: Boolean = false,
        val etat: MoteurDecision.Etat = MoteurDecision.Etat.ARRET,
        val motif: MoteurDecision.Motif = MoteurDecision.Motif.AUCUN,
        val blocageActif: Boolean = false,
        val passagerDeclare: Boolean = false,
        val vitesseKmh: Float? = null,
        /** Dernière application recouverte, pour l'afficher dans le journal. */
        val dernierPaquetBloque: String? = null,
    )

    private val _vue = MutableStateFlow(Vue())
    val vue: StateFlow<Vue> = _vue

    internal fun maj(transformation: (Vue) -> Vue) {
        _vue.value = transformation(_vue.value)
    }

    internal fun reinitialiser() {
        _vue.value = Vue()
    }
}
