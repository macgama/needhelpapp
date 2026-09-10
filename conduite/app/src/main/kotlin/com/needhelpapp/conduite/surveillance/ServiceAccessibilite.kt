package com.needhelpapp.conduite.surveillance

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/**
 * Le chemin instantané pour savoir quelle application est affichée.
 *
 * FACULTATIF, ET ASSUMÉ COMME TEL. L'application fonctionne sans lui, en
 * sondant les statistiques d'usage — moins réactif d'une demi-seconde,
 * ce qui est sans conséquence sur un écran de blocage.
 *
 * Il est proposé et jamais imposé, pour trois raisons qui vont dans le
 * même sens : le Play Store refuse les applications qui exigent
 * l'accessibilité hors de son objet, un utilisateur a raison de se
 * méfier d'un service qui « voit l'écran », et notre déclaration XML
 * réclame le strict minimum — `canRetrieveWindowContent` est à false,
 * donc ce service ne PEUT PAS lire ce qui s'affiche, même s'il le
 * voulait.
 */
class ServiceAccessibilite : AccessibilityService() {

    override fun onAccessibilityEvent(evenement: AccessibilityEvent?) {
        if (evenement?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val paquet = evenement.packageName?.toString() ?: return
        AvantPlan.signaler(paquet)
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        // Sans cet oubli, le service qui décide continuerait de croire
        // que la dernière application vue est encore à l'écran.
        AvantPlan.signaler(null)
        super.onDestroy()
    }
}
