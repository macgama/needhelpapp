package com.needhelpapp.conduite.surveillance

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flow

/**
 * « Quelle application est devant ? », par les statistiques d'usage.
 *
 * UN SEUL CHEMIN, ET C'EST UN CHOIX
 *
 * Une première version proposait aussi un service d'accessibilité :
 * instantané là où le sondage attend jusqu'à 700 ms. Il a été retiré, et
 * pas pour des raisons techniques — le Play Store traite comme suspecte
 * toute application qui réclame l'accessibilité hors de son objet, et
 * c'est un motif de refus classique pour ce genre d'outil. Sept cents
 * millisecondes sur un écran de blocage ne se voient pas ; un refus au
 * dépôt, si.
 *
 * L'autorisation d'accès aux données d'usage reste, elle, une
 * autorisation spéciale — mais bien mieux comprise, et qui ne donne
 * accès à rien d'autre qu'à des noms de paquets.
 */
class SurveillantAvantPlan(contexte: Context) {

    private val statistiques =
        contexte.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    /** Le flux des applications qui passent devant. */
    fun flux(): Flow<String> = flow {
        while (true) {
            paquetParStatistiques()?.let { emit(it) }
            delay(PERIODE_SONDAGE_MS)
        }
    }.distinctUntilChanged()

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
