package com.needhelpapp.conduite.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Les trois briques qui reviennent partout. Elles sont ici plutôt que
 * recopiées dans chaque écran, ce qui évite qu'un écran finisse par
 * dessiner ses cartes autrement que les autres.
 */

@Composable
fun Carte(
    modifier: Modifier = Modifier,
    contenu: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(20.dp), content = contenu)
    }
}

@Composable
fun TitreSection(texte: String, modifier: Modifier = Modifier) {
    Text(
        text = texte,
        style = MaterialTheme.typography.titleLarge,
        modifier = modifier.padding(top = 24.dp, bottom = 8.dp),
    )
}

/** Une pastille d'état. Verte, ambre ou rouge, et rien d'autre. */
@Composable
fun Pastille(couleur: Color, libelle: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(couleur),
        )
        Text(libelle, style = MaterialTheme.typography.bodyMedium)
    }
}
