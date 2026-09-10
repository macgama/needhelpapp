package com.needhelpapp.conduite.surveillance

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Le nom du paquet actuellement à l'écran, quand le service
 * d'accessibilité est actif.
 *
 * Comme [com.needhelpapp.conduite.detection.CanalSignaux], c'est un
 * objet partagé au niveau du processus, et pour la même raison : un
 * service d'accessibilité est instancié par le système, pas par nous.
 *
 * On n'y met QUE le nom du paquet. Jamais le titre de la fenêtre, jamais
 * le contenu de l'écran.
 */
object AvantPlan {
    private val _paquet = MutableStateFlow<String?>(null)
    val paquet: StateFlow<String?> = _paquet

    fun signaler(nom: String?) {
        _paquet.value = nom
    }
}
