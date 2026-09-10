package com.needhelpapp.conduite.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * La palette du portail needhelpapp.com, reprise telle quelle.
 *
 * Pas de couleurs dynamiques Material You : une application de la
 * famille qui change de couleur avec le fond d'écran cesse de
 * ressembler aux autres. Le portail, teaching, familyshop et budget
 * partagent ces valeurs ; celle-ci aussi.
 */
private val Encre = Color(0xFF1C1A24)
private val EncreDoux = Color(0xFF5C5668)
private val Papier = Color(0xFFF7F5F0)
private val PapierCreux = Color(0xFFEFEBE3)
private val Panneau = Color(0xFFFFFEFC)
private val Trait = Color(0xFFE2DCD1)
private val Indigo = Color(0xFF2E2A5C)
private val IndigoFonce = Color(0xFF22203F)
private val IndigoClair = Color(0xFFE8E5F2)
private val Rouge = Color(0xFF8E2A2A)
private val Vert = Color(0xFF1B6547)

private val ClairSchema = lightColorScheme(
    primary = Indigo,
    onPrimary = Papier,
    primaryContainer = IndigoClair,
    onPrimaryContainer = IndigoFonce,
    secondary = Vert,
    onSecondary = Papier,
    error = Rouge,
    onError = Papier,
    background = Papier,
    onBackground = Encre,
    surface = Panneau,
    onSurface = Encre,
    surfaceVariant = PapierCreux,
    onSurfaceVariant = EncreDoux,
    outline = Trait,
)

private val SombreSchema = darkColorScheme(
    primary = IndigoClair,
    onPrimary = IndigoFonce,
    primaryContainer = IndigoFonce,
    onPrimaryContainer = IndigoClair,
    secondary = Vert,
    error = Color(0xFFE0908F),
    background = Encre,
    onBackground = Papier,
    surface = IndigoFonce,
    onSurface = Papier,
    surfaceVariant = Color(0xFF2A2833),
    onSurfaceVariant = Color(0xFFB9B4C4),
    outline = Color(0xFF44404F),
)

private val TypographieConduite = Typography(
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold),
    titleLarge = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
)

@Composable
fun ThemeConduite(sombre: Boolean = isSystemInDarkTheme(), contenu: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (sombre) SombreSchema else ClairSchema,
        typography = TypographieConduite,
        content = contenu,
    )
}
