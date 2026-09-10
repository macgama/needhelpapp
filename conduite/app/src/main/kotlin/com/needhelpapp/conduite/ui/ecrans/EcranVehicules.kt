package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.detection.AppareilAppaire
import com.needhelpapp.conduite.ui.Carte

@Composable
fun EcranVehicules(
    appareils: List<AppareilAppaire>,
    designes: Set<String>,
    bluetoothAccorde: Boolean,
    surBascule: (String) -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text("Votre véhicule", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Désignez l'appareil Bluetooth de votre véhicule : l'autoradio " +
                    "d'une voiture, l'intercom d'un casque, l'électronique d'un vélo " +
                    "électrique. C'est le seul signal de toute la détection qui sache " +
                    "de quel véhicule il s'agit — ni un bus, ni un tram, ni celui d'un " +
                    "autre. La confirmation tombe alors à huit secondes, et la " +
                    "déconnexion termine le trajet sur-le-champ.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
        }

        if (!bluetoothAccorde) {
            item {
                Carte {
                    Text(
                        "L'autorisation Bluetooth n'est pas accordée. Elle ne sert " +
                            "qu'à lire cette liste : l'application ne cherche aucun " +
                            "appareil autour de vous et n'échange rien par Bluetooth.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else if (appareils.isEmpty()) {
            item {
                Text(
                    "Aucun appareil appairé. Associez d'abord votre téléphone à " +
                        "l'autoradio depuis les réglages Bluetooth d'Android, puis " +
                        "revenez ici.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        items(appareils, key = { it.adresse }) { appareil ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { surBascule(appareil.adresse) }
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(appareil.nom, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        appareil.adresse,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Checkbox(
                    checked = appareil.adresse in designes,
                    onCheckedChange = { surBascule(appareil.adresse) },
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}
