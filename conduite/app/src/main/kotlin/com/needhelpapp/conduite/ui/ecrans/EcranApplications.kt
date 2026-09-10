package com.needhelpapp.conduite.ui.ecrans

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import com.needhelpapp.conduite.donnees.ApplicationInstallee
import com.needhelpapp.conduite.donnees.ReglagesComplets
import com.needhelpapp.conduite.moteur.ModeBlocage

@Composable
fun EcranApplications(
    applications: List<ApplicationInstallee>,
    reglages: ReglagesComplets,
    surBascule: (String) -> Unit,
) {
    val strict = reglages.blocage.mode == ModeBlocage.STRICT
    val cochees = if (strict) reglages.blocage.paquetsAutorises else reglages.blocage.paquetsSurveilles

    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(20.dp))
            Text(
                if (strict) "Applications autorisées" else "Applications bloquées",
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                if (strict) {
                    "En mode strict, tout est recouvert pendant un trajet sauf ce que " +
                        "vous cochez ici. Pensez à la navigation et à la musique. " +
                        "L'écran d'accueil, le téléphone et les réglages restent " +
                        "toujours accessibles, quoi qu'il arrive."
                } else {
                    "Cochez ce qui doit disparaître au volant. Le fil d'actualité et " +
                        "les messageries suffisent en général : bloquer ce qui ne " +
                        "distrait pas ne protège de rien et agace."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
        }

        items(applications, key = { it.paquet }) { application ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { surBascule(application.paquet) }
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                application.icone?.let {
                    Image(
                        bitmap = it.asImageBitmap(),
                        contentDescription = null,
                        modifier = Modifier.size(36.dp),
                    )
                }
                Column(
                    Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
                ) {
                    Text(application.libelle, style = MaterialTheme.typography.bodyLarge)
                }
                Checkbox(
                    checked = application.paquet in cochees,
                    onCheckedChange = { surBascule(application.paquet) },
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}
