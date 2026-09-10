package com.needhelpapp.conduite.permissions

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Les six portes qu'il faut ouvrir, et comment savoir si elles le sont.
 *
 * C'EST LE VRAI OBSTACLE DU PRODUIT, pas la détection. Une application
 * qui surveille la position en arrière-plan et dessine par-dessus les
 * autres touche à peu près tout ce qu'Android a passé dix versions à
 * verrouiller. Aucune de ces autorisations ne s'obtient d'un seul
 * dialogue, et trois d'entre elles n'ont même pas de dialogue : elles
 * exigent un détour par les réglages du système.
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            add(Manifest.permission.BLUETOOTH_CONNECT)
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
     * Lire la liste des appareils Bluetooth appairés, pour y désigner sa
     * voiture. Facultative : sans elle, la détection perd son signal le
     * plus sûr mais continue de fonctionner sur la vitesse.
     */
    fun bluetoothAccorde(contexte: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            accordee(contexte, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            true
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
