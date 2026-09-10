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
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.donnees.ReglagesComplets
import com.needhelpapp.conduite.moteur.MoteurDecision
import com.needhelpapp.conduite.service.EtatPublic
import com.needhelpapp.conduite.ui.Carte
import com.needhelpapp.conduite.ui.ModeleConduite
import com.needhelpapp.conduite.ui.Pastille
import com.needhelpapp.conduite.ui.TitreSection
import kotlin.math.roundToInt

@Composable
fun EcranAccueil(
    etat: EtatPublic.Vue,
    reglages: ReglagesComplets,
    permissions: ModeleConduite.EtatPermissions,
    surBascule: (Boolean) -> Unit,
    versPermissions: () -> Unit,
    versApplications: () -> Unit,
    versReglages: () -> Unit,
    versHistorique: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Conduite", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Le téléphone se tait pendant que vous roulez.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(24.dp))

        // L'ÉTAT EN PREMIER, ET EN GRAND. C'est la seule question que
        // l'utilisateur se pose en ouvrant cette application : est-ce que
        // ça tourne, oui ou non ?
        Carte {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        titreEtat(etat, reglages.surveillanceActive),
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        detailEtat(etat, reglages.surveillanceActive),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = reglages.surveillanceActive,
                    onCheckedChange = surBascule,
                    enabled = permissions.suffisantPourFonctionner || reglages.surveillanceActive,
                )
            }

            val vitesse = etat.vitesseKmh
            if (reglages.surveillanceActive && vitesse != null) {
                Spacer(Modifier.height(16.dp))
                Text(
                    "${vitesse.roundToInt()} km/h",
                    style = MaterialTheme.typography.headlineMedium,
                )
            }
        }

        if (!permissions.suffisantPourFonctionner) {
            Spacer(Modifier.height(12.dp))
            Carte {
                Pastille(Color(0xFF8E2A2A), "Il manque des autorisations")
                Spacer(Modifier.height(8.dp))
                Text(
                    "Sans la position et le droit de dessiner par-dessus les autres " +
                        "applications, rien ne peut se déclencher. Trois écrans à " +
                        "parcourir, une fois.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                Button(onClick = versPermissions) { Text("Régler les autorisations") }
            }
        } else if (!permissions.toutesLesRecommandees) {
            Spacer(Modifier.height(12.dp))
            Carte {
                Pastille(Color(0xFFB4552A), "La détection fonctionnera au ralenti")
                Spacer(Modifier.height(8.dp))
                Text(
                    "Il manque des autorisations qui ne sont pas indispensables mais " +
                        "qui changent beaucoup : la position en arrière-plan, la " +
                        "reconnaissance d'activité.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = versPermissions) { Text("Voir le détail") }
            }
        }

        TitreSection("Réglages")

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = versApplications, modifier = Modifier.fillMaxWidth()) {
                Text(resumeApplications(reglages))
            }
            OutlinedButton(onClick = versReglages, modifier = Modifier.fillMaxWidth()) {
                Text("Véhicules, mode, silence")
            }
            OutlinedButton(onClick = versHistorique, modifier = Modifier.fillMaxWidth()) {
                Text("Historique des trajets")
            }
        }

        Spacer(Modifier.height(24.dp))
        Text(
            "L'application ne retient jamais où vous allez : la position est lue " +
                "pour en tirer une vitesse, puis jetée. L'historique ne contient " +
                "qu'une durée et une distance, et il ne quitte pas ce téléphone.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun titreEtat(etat: EtatPublic.Vue, active: Boolean): String = when {
    !active -> "Éteint"
    !etat.serviceActif -> "Démarrage…"
    etat.passagerDeclare && etat.etat.enTrajet -> "Passager"
    etat.etat == MoteurDecision.Etat.SUSPICION -> "Vérification"
    etat.etat.enTrajet -> "Trajet en cours"
    else -> "En veille"
}

private fun detailEtat(etat: EtatPublic.Vue, active: Boolean): String = when {
    !active -> "Rien n'est surveillé."
    !etat.serviceActif -> "Le service se met en place."
    etat.passagerDeclare && etat.etat.enTrajet -> "Le blocage est levé pour ce trajet."
    etat.etat == MoteurDecision.Etat.SUSPICION -> "Un mouvement de véhicule a été repéré."
    etat.etat == MoteurDecision.Etat.PAUSE -> "À l'arrêt — le blocage reste actif."
    etat.etat.enTrajet -> "Les applications choisies sont recouvertes."
    else -> "Le blocage s'activera de lui-même."
}

private fun resumeApplications(reglages: ReglagesComplets): String {
    val blocage = reglages.blocage
    return when (blocage.mode) {
        com.needhelpapp.conduite.moteur.ModeBlocage.SOUPLE ->
            "Applications bloquées — ${blocage.paquetsSurveilles.size}"

        com.needhelpapp.conduite.moteur.ModeBlocage.STRICT ->
            "Tout est bloqué sauf ${blocage.paquetsAutorises.size} application(s)"
    }
}
