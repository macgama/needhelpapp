package com.needhelpapp.conduite.permissions

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.needhelpapp.conduite.surveillance.ServiceAccessibilite

/**
 * Les sept portes qu'il faut ouvrir, et comment savoir si elles le sont.
 *
 * C'EST LE VRAI OBSTACLE DU PRODUIT, pas la détection. Une application
 * qui surveille la position en arrière-plan et dessine par-dessus les
 * autres touche à peu près tout ce qu'Android a passé dix versions à
 * verrouiller. Aucune de ces autorisations ne s'obtient d'un seul
 * dialogue, trois d'entre elles n'ont même pas de dialogue et exigent un
 * détour par les réglages du système.
 *
 * D'où ce fichier : un seul endroit qui sait, pour chaque porte, si elle
 * est ouverte et quel écran l'ouvre. L'assistant du premier lancement se
 * contente de le dérouler.
 *
 * L'ORDRE COMPTE. Android refuse la position en arrière-plan tant que la
 * position au premier plan n'est pas accordée, et le dialogue système ne
 * l'explique pas : il rend simplement « refusé », ce qui donne
 * l'impression que l'utilisateur a dit non alors qu'on n'a rien demandé
 * de compréhensible.
 */
object Permissions {

    /** Ce que l'on demande par le dialogue système standard, dans l'ordre. */
    fun demandesStandard(): List<String> = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            add(Manifest.permission.ACTIVITY_RECOGNITION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun positionAccordee(contexte: Context): Boolean =
        accordee(contexte, Manifest.permission.ACCESS_FINE_LOCATION)

    /**
     * À demander SÉPARÉMENT, et seulement après la position au premier
     * plan. Depuis Android 11, le dialogue n'apparaît même plus : il faut
     * renvoyer l'utilisateur vers les réglages de l'application, où il
     * choisit « Toujours autoriser ». D'où l'écran d'explication : sans
     * lui, personne ne trouve.
     */
    fun positionArrierePlanAccordee(contexte: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            accordee(contexte, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            positionAccordee(contexte)
        }

    fun activiteAccordee(contexte: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            accordee(contexte, Manifest.permission.ACTIVITY_RECOGNITION)
        } else {
            true
        }

    fun notificationsAccordees(contexte: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            accordee(contexte, Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true
        }

    /** Sans elle, rien ne peut s'afficher par-dessus une autre application. */
    fun superpositionAccordee(contexte: Context): Boolean =
        Settings.canDrawOverlays(contexte)

    /**
     * L'accès aux statistiques d'usage n'est pas une permission au sens
     * habituel : c'est une « app op » qui ne s'accorde que depuis un
     * écran caché des réglages, et qu'aucun dialogue ne peut demander.
     */
    fun statistiquesAccordees(contexte: Context): Boolean {
        val gestionnaire = contexte.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            gestionnaire.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                contexte.packageName,
            )
        } else {
            @Suppress("DEPRECATION")
            gestionnaire.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                contexte.packageName,
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun nePasDerangerAccorde(contexte: Context): Boolean =
        contexte.getSystemService(NotificationManager::class.java)
            .isNotificationPolicyAccessGranted

    /**
     * L'état RÉEL du service d'accessibilité, lu dans les réglages
     * sécurisés — et non un booléen que nous aurions stocké de notre
     * côté. L'utilisateur peut le désactiver depuis Android sans jamais
     * rouvrir notre application, et certaines surcouches le coupent
     * d'elles-mêmes après quelques jours. Croire notre propre mémoire
     * ici, c'est croire un blocage qui ne bloque plus.
     */
    fun accessibiliteActive(contexte: Context): Boolean {
        val attendu = ComponentName(contexte, ServiceAccessibilite::class.java).flattenToString()
        val actifs = Settings.Secure.getString(
            contexte.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        return actifs.split(':').any { it.equals(attendu, ignoreCase = true) }
    }

    // ------------------------------------------------------------------
    // Les écrans qui ouvrent chaque porte
    // ------------------------------------------------------------------

    fun intentionSuperposition(contexte: Context) = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${contexte.packageName}"),
    )

    fun intentionStatistiques() = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)

    fun intentionNePasDeranger() = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)

    fun intentionAccessibilite() = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)

    fun intentionReglagesApplication(contexte: Context) = Intent(
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:${contexte.packageName}"),
    )

    /**
     * L'écran des optimisations de batterie.
     *
     * Il n'y a rien à « accorder » ici au sens strict, mais sans ce
     * détour, plusieurs constructeurs — les surcouches chinoises en
     * tête — tuent le service au bout de quelques minutes d'écran
     * éteint. C'est la panne la plus signalée de ce genre d'application,
     * et elle ne vient pas du code.
     */
    fun intentionBatterie() = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)

    private fun accordee(contexte: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(contexte, permission) == PackageManager.PERMISSION_GRANTED
}
