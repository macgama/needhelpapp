package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.banc.BancEssai
import com.needhelpapp.conduite.service.EtatPublic
import com.needhelpapp.conduite.ui.Carte
import com.needhelpapp.conduite.ui.Pastille
import com.needhelpapp.conduite.ui.TitreSection
import kotlin.math.roundToInt

/**
 * L'écran qui rend l'application testable sans prendre la voiture.
 *
 * Il n'existe que dans la variante de développement : l'entrée qui y mène
 * est conditionnée à `BuildConfig.DEBUG`.
 */
@Composable
fun EcranBanc(
    etat: EtatPublic.Vue,
    surveillanceActive: Boolean,
    scenarioEnCours: String?,
    etapeEnCours: String?,
    surJouer: (BancEssai.Scenario) -> Unit,
    surArreter: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Banc d'essai", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Des signaux fabriqués, injectés dans le canal que le service écoute " +
                "déjà. Il ne voit pas la différence avec un vrai point GPS — c'est " +
                "ce qui rend l'essai honnête. Tout se joue en temps réel : un feu " +
                "rouge dure ses deux minutes.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(20.dp))

        Carte {
            if (!surveillanceActive) {
                Pastille(Color(0xFF8E2A2A), "La surveillance est éteinte")
                Spacer(Modifier.height(8.dp))
                Text(
                    "Allumez-la sur l'écran d'accueil, sans quoi le service n'écoute " +
                        "rien et le banc parle dans le vide.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            "${etat.etat} · ${etat.motif}",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Text(
                            etat.vitesseKmh?.let { "${it.roundToInt()} km/h" } ?: "pas de vitesse",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Pastille(
                        couleur = if (etat.blocageActif) Color(0xFF8E2A2A) else Color(0xFF1B6547),
                        libelle = if (etat.blocageActif) "Bloqué" else "Libre",
                    )
                }
            }

            if (scenarioEnCours != null) {
                Spacer(Modifier.height(16.dp))
                Text(scenarioEnCours, style = MaterialTheme.typography.titleLarge)
                Text(
                    etapeEnCours ?: "…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = surArreter) { Text("Arrêter") }
            }
        }

        TitreSection("Scénarios")

        BancEssai.scenarios.forEach { scenario ->
            Carte(Modifier.padding(bottom = 8.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(scenario.nom, style = MaterialTheme.typography.titleLarge)
                        Text(
                            "${scenario.dureeMs / 1000} s",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Button(
                        onClick = { surJouer(scenario) },
                        enabled = surveillanceActive && scenarioEnCours == null,
                    ) {
                        Text("Jouer")
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    scenario.attendu,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}
