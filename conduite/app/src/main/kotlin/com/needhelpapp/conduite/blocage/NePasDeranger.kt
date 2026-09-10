package com.needhelpapp.conduite.blocage

import android.app.NotificationManager
import android.content.Context
import android.util.Log

/**
 * Le silence pendant le trajet.
 *
 * Recouvrir une application n'empêche pas une notification de vibrer, et
 * une vibration suffit à faire tourner la tête. Le mode « priorité
 * seulement » laisse passer les appels et les contacts favoris selon les
 * règles que l'utilisateur a lui-même définies dans Android : on ne
 * décide pas à sa place de ce qui est urgent, on se contente de
 * réutiliser sa décision.
 *
 * ON REMET TOUJOURS LES CHOSES COMME ON LES A TROUVÉES. Le filtre
 * d'origine est mémorisé au début du trajet et rétabli à la fin. Une
 * application qui laisserait un téléphone en silence après coup se ferait
 * désinstaller le lendemain matin, après un réveil manqué.
 */
class NePasDeranger(contexte: Context) {

    private val gestionnaire = contexte.getSystemService(NotificationManager::class.java)
    private var filtreDOrigine: Int? = null

    val autorise: Boolean get() = gestionnaire.isNotificationPolicyAccessGranted

    fun activer() {
        if (!autorise || filtreDOrigine != null) return
        runCatching {
            filtreDOrigine = gestionnaire.currentInterruptionFilter
            gestionnaire.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
        }.onFailure {
            Log.w(ETIQUETTE, "Ne pas déranger refusé", it)
            filtreDOrigine = null
        }
    }

    fun retablir() {
        val origine = filtreDOrigine ?: return
        filtreDOrigine = null
        if (!autorise) return
        runCatching { gestionnaire.setInterruptionFilter(origine) }
    }

    private companion object {
        const val ETIQUETTE = "NePasDeranger"
    }
}
