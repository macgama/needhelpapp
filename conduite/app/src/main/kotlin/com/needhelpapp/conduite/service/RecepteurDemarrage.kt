package com.needhelpapp.conduite.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.needhelpapp.conduite.AppConduite
import com.needhelpapp.conduite.permissions.Permissions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Relance la surveillance après un redémarrage, et après une mise à jour
 * de l'application.
 *
 * Sans lui, l'application se tait le jour où le téléphone redémarre — et
 * personne ne rouvre une application de blocage pour vérifier qu'elle
 * tourne encore. C'est le genre de panne qu'on ne découvre qu'après
 * l'accident.
 *
 * MY_PACKAGE_REPLACED compte autant que BOOT_COMPLETED : une mise à jour
 * arrête le service, et rien ne le relance de lui-même.
 */
class RecepteurDemarrage : BroadcastReceiver() {

    override fun onReceive(contexte: Context, intention: Intent) {
        val pertinent = intention.action == Intent.ACTION_BOOT_COMPLETED ||
            intention.action == Intent.ACTION_MY_PACKAGE_REPLACED
        if (!pertinent) return
        if (!Permissions.positionAccordee(contexte)) return

        val application = contexte.applicationContext as? AppConduite ?: return
        val resultat = goAsync()

        CoroutineScope(Dispatchers.Default).launch {
            try {
                if (application.reglages.flux.first().surveillanceActive) {
                    ServiceConduite.demarrer(contexte)
                }
            } finally {
                resultat.finish()
            }
        }
    }
}
