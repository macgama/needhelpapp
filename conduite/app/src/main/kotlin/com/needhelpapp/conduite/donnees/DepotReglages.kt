package com.needhelpapp.conduite.donnees

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.needhelpapp.conduite.moteur.ModeBlocage
import com.needhelpapp.conduite.moteur.ReglagesBlocage
import com.needhelpapp.conduite.moteur.ReglagesDetection
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.stockage: DataStore<Preferences> by preferencesDataStore(name = "reglages")

/**
 * Tout ce que l'utilisateur a choisi, et rien d'autre.
 *
 * Les seuils de détection sont persistés séparément et rassemblés à la
 * lecture dans le [ReglagesDetection] du moteur : le moteur ignore
 * DataStore, et DataStore ignore le moteur.
 */
data class ReglagesComplets(
    val surveillanceActive: Boolean = false,
    val detection: ReglagesDetection = ReglagesDetection(),
    val blocage: ReglagesBlocage = ReglagesBlocage(),
    val nePasDeranger: Boolean = false,
    /**
     * Les adresses Bluetooth des véhicules de l'utilisateur.
     *
     * Des adresses matérielles, pas des noms : un autoradio peut
     * s'annoncer « BT-Audio » comme dix mille autres, mais son adresse
     * est unique.
     */
    val adressesVehicule: Set<String> = emptySet(),
)

class DepotReglages(private val contexte: Context) {

    val flux: Flow<ReglagesComplets> = contexte.stockage.data.map { p ->
        // Les seuils sont bornés À LA LECTURE aussi, pas seulement à
        // l'écriture. `ReglagesDetection` refuse de se construire avec un
        // seuil de sortie au-dessus du seuil d'entrée : une préférence
        // écrite par une version future, ou simplement abîmée, ferait
        // alors échouer ce flux — c'est-à-dire planter l'application au
        // lancement, sans aucun moyen de revenir en arrière.
        val entree = (p[SEUIL_ENTREE] ?: 15f).coerceIn(8f, 40f)
        val sortie = (p[SEUIL_SORTIE] ?: 5f).coerceIn(1f, entree - 1f)

        ReglagesComplets(
            surveillanceActive = p[SURVEILLANCE] ?: false,
            detection = ReglagesDetection(
                seuilEntreeKmh = entree,
                seuilSortieKmh = sortie,
                delaiFinTrajetMs = p[DELAI_FIN] ?: 120_000L,
            ),
            blocage = ReglagesBlocage(
                mode = p[MODE]?.let { runCatching { ModeBlocage.valueOf(it) }.getOrNull() }
                    ?: ModeBlocage.SOUPLE,
                paquetsSurveilles = p[SURVEILLES] ?: emptySet(),
                paquetsAutorises = p[AUTORISES] ?: emptySet(),
            ),
            nePasDeranger = p[NE_PAS_DERANGER] ?: false,
            adressesVehicule = p[VEHICULES] ?: emptySet(),
        )
    }

    suspend fun definirSurveillance(active: Boolean) = ecrire { it[SURVEILLANCE] = active }

    suspend fun definirMode(mode: ModeBlocage) = ecrire { it[MODE] = mode.name }

    suspend fun basculerSurveille(paquet: String) = ecrire { p ->
        val liste = p[SURVEILLES].orEmpty()
        p[SURVEILLES] = if (paquet in liste) liste - paquet else liste + paquet
    }

    suspend fun basculerAutorise(paquet: String) = ecrire { p ->
        val liste = p[AUTORISES].orEmpty()
        p[AUTORISES] = if (paquet in liste) liste - paquet else liste + paquet
    }

    suspend fun definirNePasDeranger(actif: Boolean) = ecrire { it[NE_PAS_DERANGER] = actif }

    suspend fun basculerVehicule(adresse: String) = ecrire { p ->
        val liste = p[VEHICULES].orEmpty()
        p[VEHICULES] = if (adresse in liste) liste - adresse else liste + adresse
    }

    /**
     * Les seuils sont bornés à l'écriture, pas seulement à l'affichage.
     * Un curseur d'interface se remplace ; une préférence corrompue par
     * une version future, non — et le moteur refuse de se construire avec
     * un seuil de sortie au-dessus du seuil d'entrée.
     */
    suspend fun definirSeuils(entreeKmh: Float, sortieKmh: Float) = ecrire { p ->
        val entree = entreeKmh.coerceIn(8f, 40f)
        p[SEUIL_ENTREE] = entree
        p[SEUIL_SORTIE] = sortieKmh.coerceIn(1f, entree - 2f)
    }

    suspend fun definirDelaiFinTrajet(secondes: Int) = ecrire {
        it[DELAI_FIN] = secondes.coerceIn(30, 600) * 1000L
    }

    private suspend fun ecrire(
        bloc: suspend (androidx.datastore.preferences.core.MutablePreferences) -> Unit,
    ) {
        contexte.stockage.edit(bloc)
    }

    private companion object {
        val SURVEILLANCE = booleanPreferencesKey("surveillance_active")
        val MODE = stringPreferencesKey("mode_blocage")
        val SURVEILLES = stringSetPreferencesKey("paquets_surveilles")
        val AUTORISES = stringSetPreferencesKey("paquets_autorises")
        val NE_PAS_DERANGER = booleanPreferencesKey("ne_pas_deranger")
        val VEHICULES = stringSetPreferencesKey("adresses_vehicule")
        val SEUIL_ENTREE = floatPreferencesKey("seuil_entree_kmh")
        val SEUIL_SORTIE = floatPreferencesKey("seuil_sortie_kmh")
        val DELAI_FIN = longPreferencesKey("delai_fin_trajet_ms")
    }
}
