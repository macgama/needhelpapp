package com.needhelpapp.conduite.donnees

import com.needhelpapp.conduite.donnees.base.Trajet
import com.needhelpapp.conduite.donnees.base.TrajetDao
import kotlinx.coroutines.flow.Flow

/**
 * L'écriture d'un trajet, vue du service.
 *
 * Le service tient les compteurs en mémoire pendant le trajet et n'écrit
 * qu'à l'ouverture et à la clôture : une écriture par seconde pendant
 * une heure de route userait la mémoire flash pour rien.
 */
class DepotTrajets(private val dao: TrajetDao) {

    val derniers: Flow<List<Trajet>> = dao.derniers()

    suspend fun ouvrir(debutMs: Long): Long = dao.inserer(Trajet(debutMs = debutMs))

    suspend fun cloturer(
        id: Long,
        finMs: Long,
        distanceM: Float,
        vitesseMaxMs: Float,
        interceptions: Int,
        passagerDeclare: Boolean,
    ) = dao.cloturer(id, finMs, distanceM, vitesseMaxMs, interceptions, passagerDeclare)

    /**
     * Referme un trajet laissé ouvert par un service tué en route. On ne
     * sait pas quand il s'est vraiment terminé : on prend l'heure du
     * constat, ce qui est faux mais borné, plutôt que de laisser une
     * ligne sans fin qui fausserait tous les cumuls.
     */
    suspend fun refermerCeQuiTraine(maintenantMs: Long) {
        val ouvert = dao.trajetOuvert() ?: return
        dao.cloturer(
            id = ouvert.id,
            finMs = maxOf(maintenantMs, ouvert.debutMs),
            distanceM = ouvert.distanceM,
            vitesseMaxMs = ouvert.vitesseMaxMs,
            interceptions = ouvert.interceptions,
            passager = ouvert.passagerDeclare,
        )
    }

    suspend fun toutEffacer() = dao.toutEffacer()
}
