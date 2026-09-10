package com.needhelpapp.conduite.blocage

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.telecom.TelecomManager

/**
 * Ce qu'on ne bloque jamais, quel que soit le réglage.
 *
 * La liste n'est pas écrite en dur : elle est demandée à Android, parce
 * que le nom du composeur téléphonique ou du lanceur change d'un
 * constructeur à l'autre, et qu'une liste figée serait fausse sur la
 * moitié du parc.
 *
 * POURQUOI LE LANCEUR EN FAIT PARTIE
 *
 * C'est le point qui ne saute pas aux yeux. En mode strict, « tout sauf
 * la liste » inclurait l'écran d'accueil — et un écran d'accueil
 * recouvert, c'est un téléphone d'où l'on ne peut plus rien lancer, pas
 * même l'application de navigation qu'on vient d'autoriser, pas même le
 * téléphone. Le blocage se retournerait contre son propre but. Le
 * lanceur reste donc accessible ; ce qu'on y ouvre, en revanche, tombe
 * sous la règle.
 */
object PaquetsSysteme {

    fun incompressibles(contexte: Context): Set<String> = buildSet {
        add(contexte.packageName)
        add("com.android.systemui")

        composeurParDefaut(contexte)?.let { add(it) }
        lanceurParDefaut(contexte)?.let { add(it) }
        reglagesSysteme(contexte)?.let { add(it) }
    }

    private fun composeurParDefaut(contexte: Context): String? = runCatching {
        (contexte.getSystemService(Context.TELECOM_SERVICE) as TelecomManager).defaultDialerPackage
    }.getOrNull()

    private fun lanceurParDefaut(contexte: Context): String? = runCatching {
        val intention = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        contexte.packageManager
            .resolveActivity(intention, PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName
    }.getOrNull()

    private fun reglagesSysteme(contexte: Context): String? = runCatching {
        contexte.packageManager
            .resolveActivity(Intent(Settings.ACTION_SETTINGS), PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName
    }.getOrNull()
}
