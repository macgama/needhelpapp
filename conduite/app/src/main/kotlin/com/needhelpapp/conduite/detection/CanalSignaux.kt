package com.needhelpapp.conduite.detection

import com.needhelpapp.conduite.moteur.Signal
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/**
 * Le seul point de rendez-vous entre les composants qu'Android instancie
 * lui-même et le service qui décide.
 *
 * Un `BroadcastReceiver` déclaré au manifeste est créé par le système,
 * appelé une fois, puis jeté : il n'a aucun moyen de parler au service
 * autrement que par un objet partagé au niveau du processus. C'est ce
 * qu'est ce fichier, et c'est pourquoi il est aussi court — un tel objet
 * global se justifie une fois, pas dix.
 */
object CanalSignaux {

    private val _flux = MutableSharedFlow<Signal>(replay = 0, extraBufferCapacity = 16)
    val flux: SharedFlow<Signal> = _flux

    fun publier(signal: Signal) {
        _flux.tryEmit(signal)
    }
}
