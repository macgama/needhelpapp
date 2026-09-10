package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.BuildConfig
import com.needhelpapp.conduite.donnees.ReglagesComplets
import com.needhelpapp.conduite.moteur.ModeBlocage
import com.needhelpapp.conduite.ui.Carte
import com.needhelpapp.conduite.ui.ModeleConduite
import com.needhelpapp.conduite.ui.TitreSection
import kotlin.math.roundToInt

@Composable
fun EcranReglages(
    reglages: ReglagesComplets,
    permissions: ModeleConduite.EtatPermissions,
    surMode: (ModeBlocage) -> Unit,
    surNePasDeranger: (Boolean) -> Unit,
    versVehicules: () -> Unit,
    versBanc: () -> Unit,
    surSeuils: (Float, Float) -> Unit,
    surDelaiFin: (Int) -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Réglages", style = MaterialTheme.typography.headlineMedium)

        TitreSection("Ce qui est bloqué")
        Carte {
            Column(Modifier.selectableGroup()) {
                ChoixMode(
                    titre = "Souple",
                    detail = "Seules les applications que vous désignez sont recouvertes.",
                    choisi = reglages.blocage.mode == ModeBlocage.SOUPLE,
                    surChoix = { surMode(ModeBlocage.SOUPLE) },
                )
                ChoixMode(
                    titre = "Strict",
                    detail = "Tout est recouvert, sauf la liste d'exceptions. " +
                        "L'écran d'accueil, le téléphone et les réglages restent " +
                        "toujours accessibles.",
                    choisi = reglages.blocage.mode == ModeBlocage.STRICT,
                    surChoix = { surMode(ModeBlocage.STRICT) },
                )
            }
        }

        TitreSection("Pendant le trajet")
        Carte {
            Interrupteur(
                titre = "Ne pas déranger",
                detail = if (permissions.nePasDeranger) {
                    "Les notifications se taisent le temps du trajet, selon vos " +
                        "propres règles de priorité. L'état d'origine est rétabli à " +
                        "l'arrivée."
                } else {
                    "Autorisation manquante — voir l'écran des autorisations."
                },
                actif = reglages.nePasDeranger,
                activable = permissions.nePasDeranger,
                surChangement = surNePasDeranger,
            )

        }

        TitreSection("Votre véhicule")
        Carte {
            Text(
                "Quand le téléphone est connecté à l'autoradio d'une voiture que " +
                    "vous avez désignée, la détection sait qu'il ne s'agit ni d'un " +
                    "bus, ni d'un tram, ni d'un vélo : elle se déclenche en huit " +
                    "secondes au lieu de vingt, et la coupure du contact termine le " +
                    "trajet sur-le-champ au lieu d'attendre deux minutes.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = versVehicules, modifier = Modifier.fillMaxWidth()) {
                Text(
                    when (val n = reglages.adressesVehicule.size) {
                        0 -> "Désigner un véhicule"
                        1 -> "1 véhicule désigné"
                        else -> "$n véhicules désignés"
                    },
                )
            }
        }

        TitreSection("Seuils de détection")
        Carte {
            Text(
                "À ne toucher qu'en connaissance de cause. Les valeurs par défaut " +
                    "sont le résultat d'un compromis : assez lentes pour ne pas " +
                    "bloquer un piéton, assez patientes pour ne pas rendre la main " +
                    "au feu rouge.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(16.dp))

            val entree = reglages.detection.seuilEntreeKmh
            Text("Se déclenche au-dessus de ${entree.roundToInt()} km/h")
            Slider(
                value = entree,
                onValueChange = { surSeuils(it, reglages.detection.seuilSortieKmh) },
                valueRange = 8f..40f,
                steps = 31,
            )

            val sortie = reglages.detection.seuilSortieKmh
            Text("Considère le véhicule arrêté sous ${sortie.roundToInt()} km/h")
            Slider(
                value = sortie,
                onValueChange = { surSeuils(reglages.detection.seuilEntreeKmh, it) },
                valueRange = 1f..20f,
                steps = 18,
            )

            val delaiS = (reglages.detection.delaiFinTrajetMs / 1000).toInt()
            Text("Fin du trajet après ${delaiS} s à l'arrêt")
            Slider(
                value = delaiS.toFloat(),
                onValueChange = { surDelaiFin(it.roundToInt()) },
                valueRange = 30f..600f,
                steps = 18,
            )
            Text(
                "Descendre ce délai sous une minute rend l'application inutile là " +
                    "où elle sert le plus : à l'arrêt, dans le trafic.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        if (BuildConfig.DEBUG) {
            TitreSection("Développement")
            Carte {
                Text(
                    "Rejoue un feu rouge, un tunnel ou une descente de véhicule sur " +
                        "ce téléphone, à l'arrêt. Absent de la version publiée.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = versBanc, modifier = Modifier.fillMaxWidth()) {
                    Text("Banc d'essai")
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun ChoixMode(
    titre: String,
    detail: String,
    choisi: Boolean,
    surChoix: () -> Unit,
) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        RadioButton(selected = choisi, onClick = surChoix)
        Column(Modifier.padding(start = 8.dp)) {
            Text(titre, style = MaterialTheme.typography.bodyLarge)
            Text(
                detail,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun Interrupteur(
    titre: String,
    detail: String,
    actif: Boolean,
    activable: Boolean,
    surChangement: (Boolean) -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(titre, style = MaterialTheme.typography.bodyLarge)
            Text(
                detail,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(
            checked = actif && activable,
            onCheckedChange = surChangement,
            enabled = activable,
        )
    }
}
