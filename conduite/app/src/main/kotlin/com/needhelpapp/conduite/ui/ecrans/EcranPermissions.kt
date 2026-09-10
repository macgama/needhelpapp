package com.needhelpapp.conduite.ui.ecrans

import android.content.Context
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.permissions.Permissions
import com.needhelpapp.conduite.ui.Carte
import com.needhelpapp.conduite.ui.ModeleConduite
import com.needhelpapp.conduite.ui.Pastille
import com.needhelpapp.conduite.ui.TitreSection

/**
 * L'écran le plus important de l'application, et le moins gratifiant à
 * écrire.
 *
 * Sept autorisations, dont trois qui n'ont aucun dialogue et se règlent
 * dans des écrans différents des réglages Android. Personne ne trouve
 * seul le chemin de « Accès aux données d'usage ». La seule façon
 * honnête de traiter ce mur est de le montrer en entier, de dire pour
 * chaque ligne à quoi elle sert et ce qu'on perd sans elle, et d'ouvrir
 * le bon écran d'un bouton.
 *
 * On distingue ce qui est indispensable de ce qui améliore. Une
 * application qui présente sept autorisations comme également
 * obligatoires se fait refuser les sept.
 */
@Composable
fun EcranPermissions(
    permissions: ModeleConduite.EtatPermissions,
    surRafraichir: () -> Unit,
) {
    val contexte = LocalContext.current

    val demandeStandard = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { surRafraichir() }

    val ouvrirReglage = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { surRafraichir() }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Autorisations", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Une fois pour toutes. Chaque ligne dit ce qui s'arrête sans elle.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        TitreSection("Indispensable")

        Ligne(
            titre = "Position",
            explication = "La vitesse vient de là. Sans elle, aucune détection : " +
                "l'application ne peut rien faire du tout.",
            accordee = permissions.position,
            action = { demandeStandard.launch(Permissions.demandesStandard().toTypedArray()) },
        )

        Ligne(
            titre = "Affichage par-dessus les autres applications",
            explication = "C'est ce qui permet de recouvrir l'application interdite. " +
                "Sans elle, la détection marche mais rien ne se passe à l'écran.",
            accordee = permissions.superposition,
            action = { ouvrirReglage.lance(contexte, Permissions.intentionSuperposition(contexte)) },
        )

        Ligne(
            titre = "Accès aux données d'usage",
            explication = "Pour savoir quelle application est affichée. Cet écran est " +
                "caché dans les réglages d'Android — le bouton vous y emmène " +
                "directement. Le service d'accessibilité, plus bas, peut le remplacer.",
            accordee = permissions.statistiques,
            action = { ouvrirReglage.lance(contexte, Permissions.intentionStatistiques()) },
        )

        TitreSection("Fortement recommandé")

        Ligne(
            titre = "Position en arrière-plan",
            explication = "Un conducteur n'a pas cette application à l'écran — c'est " +
                "tout l'objet du produit. Sans « Toujours autoriser », la " +
                "détection s'arrête dès que l'écran s'éteint. Le dialogue " +
                "n'existe plus depuis Android 11 : il faut choisir « Toujours » " +
                "dans les réglages de l'application.",
            accordee = permissions.positionArrierePlan,
            action = {
                ouvrirReglage.lance(contexte, Permissions.intentionReglagesApplication(contexte))
            },
        )

        Ligne(
            titre = "Reconnaissance d'activité",
            explication = "Elle distingue la voiture du vélo et de la marche. Sans " +
                "elle, un cycliste à 20 km/h finit par être bloqué à tort, et le " +
                "démarrage depuis un parking souterrain ne se voit pas.",
            accordee = permissions.activite,
            action = { demandeStandard.launch(Permissions.demandesStandard().toTypedArray()) },
        )

        Ligne(
            titre = "Notifications",
            explication = "Android exige une notification permanente pour laisser le " +
                "service tourner. C'est aussi là que se trouve le bouton " +
                "« je suis passager ».",
            accordee = permissions.notifications,
            action = { demandeStandard.launch(Permissions.demandesStandard().toTypedArray()) },
        )

        TitreSection("Facultatif")

        Ligne(
            titre = "Ne pas déranger",
            explication = "Pour faire taire les notifications pendant le trajet. " +
                "Recouvrir une application n'empêche pas une vibration, et une " +
                "vibration suffit à faire tourner la tête.",
            accordee = permissions.nePasDeranger,
            action = { ouvrirReglage.lance(contexte, Permissions.intentionNePasDeranger()) },
        )

        Ligne(
            titre = "Service d'accessibilité",
            explication = "Remplace le sondage des données d'usage par une détection " +
                "instantanée. Notre service ne peut PAS lire le contenu de vos " +
                "écrans : il ne demande que le nom de l'application affichée. " +
                "Vous pouvez très bien vous en passer.",
            accordee = permissions.accessibilite,
            action = { ouvrirReglage.lance(contexte, Permissions.intentionAccessibilite()) },
        )

        Spacer(Modifier.height(24.dp))

        Carte {
            Text("Si le blocage s'arrête tout seul", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            Text(
                "Plusieurs constructeurs — Xiaomi, Huawei, Oppo, Samsung dans une " +
                    "moindre mesure — coupent les services d'arrière-plan au bout de " +
                    "quelques minutes d'écran éteint, quelles que soient les " +
                    "autorisations. C'est la panne la plus fréquente de ce genre " +
                    "d'application, et elle ne vient pas du code. Le remède est de " +
                    "retirer Conduite des optimisations de batterie.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            TextButton(
                onClick = { ouvrirReglage.lance(contexte, Permissions.intentionBatterie()) },
            ) {
                Text("Ouvrir les optimisations de batterie")
            }
        }
    }
}

@Composable
private fun Ligne(
    titre: String,
    explication: String,
    accordee: Boolean,
    action: () -> Unit,
) {
    Carte(Modifier.padding(bottom = 8.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(titre, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(4.dp))
                Pastille(
                    couleur = if (accordee) Color(0xFF1B6547) else Color(0xFFB4552A),
                    libelle = if (accordee) "Accordée" else "À accorder",
                )
            }
            if (!accordee) {
                OutlinedButton(onClick = action) { Text("Accorder") }
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            explication,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/**
 * Certains écrans de réglages n'existent pas sur toutes les surcouches.
 * Y envoyer l'utilisateur sans filet ferait planter l'application au
 * moment précis où elle lui demande de lui faire confiance.
 */
private fun androidx.activity.result.ActivityResultLauncher<Intent>.lance(
    contexte: Context,
    intention: Intent,
) {
    runCatching { launch(intention) }.onFailure {
        runCatching { launch(Permissions.intentionReglagesApplication(contexte)) }
    }
}
