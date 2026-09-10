package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.moteur.Acces
import com.needhelpapp.conduite.moteur.EtatLicence
import com.needhelpapp.conduite.ui.Carte
import com.needhelpapp.conduite.ui.TitreSection

@Composable
fun EcranAchat(
    licence: EtatLicence,
    prix: String?,
    magasinJoignable: Boolean,
    surAcheter: () -> Unit,
    surRestaurer: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            when (licence.acces) {
                Acces.ACHETE -> "C'est à vous"
                Acces.ESSAI_TERMINE -> "L'essai est terminé"
                Acces.ESSAI -> "Débloquer Conduite"
            },
            style = MaterialTheme.typography.headlineMedium,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            when (licence.acces) {
                Acces.ACHETE ->
                    "Conduite est débloqué sur ce compte Google, définitivement. " +
                        "Changer de téléphone n'y change rien : il n'y a rien à " +
                        "réactiver, rien à se rappeler."

                Acces.ESSAI_TERMINE ->
                    "Le blocage est à l'arrêt. Nous préférons vous le dire " +
                        "franchement plutôt que de laisser tourner une application " +
                        "qui ne protège plus rien."

                Acces.ESSAI -> resumeEssai(licence)
            },
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (licence.acces != Acces.ACHETE) {
            Spacer(Modifier.height(24.dp))

            Carte {
                Text("Un achat, une fois", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                Point("Pas d'abonnement, pas de reconduction.")
                Point("Pas de compte à créer : l'achat est rattaché à votre compte Google.")
                Point("Aucune publicité, aucun suivi — l'application ne déclare même pas d'accès à Internet.")
                Point("Les mises à jour sont comprises.")

                Spacer(Modifier.height(20.dp))

                Button(
                    onClick = surAcheter,
                    enabled = magasinJoignable && prix != null,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (prix != null) "Débloquer — $prix" else "Débloquer")
                }

                if (!magasinJoignable || prix == null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Le magasin Play ne répond pas pour l'instant. Réessayez " +
                            "dans un moment — votre essai n'en est pas raccourci.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        TitreSection("Déjà acheté ?")
        Text(
            "Sur un nouveau téléphone, l'achat revient de lui-même. Ce bouton ne " +
                "fait que le redemander tout de suite.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = surRestaurer) { Text("Restaurer mes achats") }

        Spacer(Modifier.height(32.dp))
    }
}

private fun resumeEssai(licence: EtatLicence): String {
    val jours = licence.joursRestants
    val trajets = licence.trajetsRestants
    val restant = when {
        jours > 0 && trajets > 0 -> "Il vous reste $jours jour(s) et $trajets trajet(s) d'essai."
        jours > 0 -> "Il vous reste $jours jour(s) d'essai."
        else -> "Il vous reste $trajets trajet(s) d'essai."
    }
    return "$restant L'essai dure quinze jours ET au moins dix trajets : il faut " +
        "avoir eu le temps de l'utiliser, et l'occasion de rouler."
}

@Composable
private fun Point(texte: String) {
    Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), verticalAlignment = Alignment.Top) {
        Text("·", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.width(10.dp))
        Text(
            texte,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
