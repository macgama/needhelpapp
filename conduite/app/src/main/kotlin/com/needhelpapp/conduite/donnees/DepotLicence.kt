package com.needhelpapp.conduite.donnees

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.needhelpapp.conduite.moteur.EtatLicence
import com.needhelpapp.conduite.moteur.Licence
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.stockageLicence: DataStore<Preferences> by preferencesDataStore(name = "licence")

/**
 * L'état de l'achat et de la période d'essai, sur le téléphone.
 *
 * Un fichier de préférences À PART de celui des réglages, et pas par
 * goût de la séparation : l'utilisateur peut vouloir effacer ses
 * réglages, jamais son achat. Les mélanger, c'est prendre le risque
 * qu'une remise à zéro fasse repayer quelqu'un.
 *
 * LA RÈGLE DU CACHE
 *
 * Ce que dit le magasin fait foi, mais seulement quand il parle. Une
 * panne de réseau, un Play Store en cours de mise à jour, un avion :
 * dans tous ces cas le magasin ne répond pas, et il ne faut SURTOUT PAS
 * en conclure que l'achat n'existe pas. Voir Facturation : on n'écrit
 * `false` que sur une réponse explicite du magasin, jamais sur un échec.
 */
class DepotLicence(private val contexte: Context) {

    val flux: Flow<EtatLicence> = contexte.stockageLicence.data.map { p ->
        val maintenant = System.currentTimeMillis()
        Licence.evaluer(
            achete = p[ACHETE] ?: false,
            // Absent : c'est le tout premier démarrage, et l'essai
            // commence donc maintenant. Prendre 0 par défaut donnerait
            // cinquante ans écoulés et un essai fini avant d'exister.
            premierLancementMs = p[PREMIER_LANCEMENT] ?: maintenant,
            maintenantMs = maintenant,
            trajetsAccomplis = p[TRAJETS] ?: 0,
        )
    }

    suspend fun etatActuel(): EtatLicence = flux.first()

    /** Idempotent : la date du premier lancement ne se réécrit jamais. */
    suspend fun noterPremierLancement() = contexte.stockageLicence.edit { p ->
        if (p[PREMIER_LANCEMENT] == null) p[PREMIER_LANCEMENT] = System.currentTimeMillis()
    }

    suspend fun definirAchete(achete: Boolean) = contexte.stockageLicence.edit {
        it[ACHETE] = achete
    }

    suspend fun incrementerTrajets() = contexte.stockageLicence.edit { p ->
        // Borné : au-delà du seuil d'essai, ce compteur ne sert plus à
        // rien, et le laisser croître pendant des années sans raison est
        // une invitation au dépassement.
        val actuel = p[TRAJETS] ?: 0
        if (actuel < PLAFOND_TRAJETS) p[TRAJETS] = actuel + 1
    }

    private companion object {
        val ACHETE = booleanPreferencesKey("achete")
        val PREMIER_LANCEMENT = longPreferencesKey("premier_lancement_ms")
        val TRAJETS = intPreferencesKey("trajets_accomplis")
        const val PLAFOND_TRAJETS = 1_000
    }
}
