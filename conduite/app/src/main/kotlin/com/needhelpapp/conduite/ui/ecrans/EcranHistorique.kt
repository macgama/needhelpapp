package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.donnees.base.Trajet
import com.needhelpapp.conduite.donnees.base.dureeMs
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun EcranHistorique(
    trajets: List<Trajet>,
    surEffacer: () -> Unit,
) {
    val format = remember { SimpleDateFormat("EEEE d MMMM, HH:mm", Locale.FRENCH) }

    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Trajets", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Une durée, une distance, un nombre d'ouvertures interceptées. " +
                    "Aucun itinéraire, aucune coordonnée : elles ne sont jamais " +
                    "enregistrées. Rien de tout cela ne quitte ce téléphone.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
        }

        if (trajets.isEmpty()) {
            item {
                Text(
                    "Aucun trajet enregistré pour l'instant.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        items(trajets, key = { it.id }) { trajet ->
            Column(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                Text(
                    format.format(Date(trajet.debutMs)).replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    resume(trajet),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        }

        if (trajets.isNotEmpty()) {
            item {
                Spacer(Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth()) {
                    TextButton(onClick = surEffacer) { Text("Tout effacer") }
                }
            }
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}

private fun resume(trajet: Trajet): String {
    val morceaux = mutableListOf<String>()

    trajet.dureeMs?.let { duree ->
        val minutes = (duree / 60_000).toInt()
        morceaux += if (minutes < 1) "moins d'une minute" else "$minutes min"
    } ?: run { morceaux += "en cours" }

    val km = trajet.distanceM / 1000f
    morceaux += if (km < 1f) "${trajet.distanceM.roundToInt()} m" else "%.1f km".format(km)

    morceaux += "max ${(trajet.vitesseMaxMs * 3.6f).roundToInt()} km/h"

    if (trajet.interceptions > 0) {
        morceaux += "${trajet.interceptions} ouverture(s) interceptée(s)"
    }
    if (trajet.passagerDeclare) morceaux += "passager"

    return morceaux.joinToString(" · ")
}
