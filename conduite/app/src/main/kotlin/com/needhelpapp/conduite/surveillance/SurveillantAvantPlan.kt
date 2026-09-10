package com.needhelpapp.conduite.surveillance

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.flow

/**
 * « Quelle application est devant ? », par les deux chemins possibles.
 *
 * DEUX CHEMINS, ET C'EST DÉLIBÉRÉ
 *
 * Le service d'accessibilité répond en quelques millisecondes mais
 * demande un réglage manuel que beaucoup refuseront, à juste titre. Les
 * statistiques d'usage demandent une autorisation elle aussi spéciale,
 * mais mieux comprise, et coûtent un sondage régulier.
 *
 * Les deux existent parce qu'aucun ne suffit : imposer l'accessibilité
 * ferait refuser l'application au dépôt, n'offrir que le sondage ferait
 * clignoter l'écran de blocage d'une demi-seconde à chaque ouverture.
 * L'utilisateur choisit ; le service qui décide ne voit qu'un flux de
 * noms de paquets.
 */
class SurveillantAvantPlan(private val contexte: Context) {

    private val statistiques =
        contexte.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    /**
     * Le flux des applications qui passent devant.
     *
     * [viaAccessibilite] doit refléter l'état réel du service, pas le
     * souhait de l'utilisateur : un réglage coché mais un service
     * désactivé dans Android donnerait un flux définitivement muet, donc
     * un blocage qui ne bloque rien.
     */
    fun flux(viaAccessibilite: Boolean): Flow<String> =
        if (viaAccessibilite) {
            AvantPlan.paquet.filterNotNull().distinctUntilChanged()
        } else {
            flow {
                while (true) {
                    paquetParStatistiques()?.let { emit(it) }
                    delay(PERIODE_SONDAGE_MS)
                }
            }.distinctUntilChanged()
        }

    /**
     * Le dernier passage au premier plan dans la minute écoulée.
     *
     * Une minute, et non deux secondes : le système regroupe les
     * événements par paquets et les livre avec du retard. Une fenêtre
     * trop courte rend régulièrement une liste vide, et l'écran de
     * blocage se mettrait à clignoter.
     */
    fun paquetParStatistiques(): String? {
        val fin = System.currentTimeMillis()
        val evenements = runCatching {
            statistiques.queryEvents(fin - FENETRE_MS, fin)
        }.getOrNull() ?: return null

        val evenement = UsageEvents.Event()
        var dernier: String? = null
        var instantDernier = 0L

        while (evenements.hasNextEvent()) {
            evenements.getNextEvent(evenement)
            val estUnPassageDevant = evenement.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                evenement.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            if (estUnPassageDevant && evenement.timeStamp >= instantDernier) {
                instantDernier = evenement.timeStamp
                dernier = evenement.packageName
            }
        }
        return dernier
    }

    private companion object {
        /**
         * 700 ms : sous le seuil où l'on perçoit un délai, au-dessus de
         * ce qui ferait tourner le processeur pour rien. Le sondage ne
         * tourne QUE pendant un trajet, jamais en veille.
         */
        const val PERIODE_SONDAGE_MS = 700L
        const val FENETRE_MS = 60_000L
    }
}
