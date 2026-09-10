package com.needhelpapp.conduite.donnees

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class ApplicationInstallee(
    val paquet: String,
    val libelle: String,
    val icone: Bitmap?,
)

/**
 * La liste des applications que l'utilisateur peut choisir de bloquer.
 *
 * On demande CELLES QUI ONT UNE ICÔNE DE LANCEMENT, et pas « tous les
 * paquets ». La différence n'est pas cosmétique : `QUERY_ALL_PACKAGES`
 * est une permission sensible qui demande sa propre justification au
 * Play Store, alors que le filtre déclaré au manifeste suffit
 * exactement. Au passage, la liste obtenue est celle que l'utilisateur
 * reconnaît — sans les cent paquets système qu'il n'a jamais vus.
 */
object ApplicationsInstallees {

    suspend fun lister(contexte: Context): List<ApplicationInstallee> =
        withContext(Dispatchers.IO) {
            val gestionnaire = contexte.packageManager
            val intention = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

            gestionnaire.queryIntentActivities(intention, PackageManager.MATCH_ALL)
                .asSequence()
                .map { it.activityInfo.applicationInfo }
                .filter { it.packageName != contexte.packageName }
                .distinctBy { it.packageName }
                .map { info ->
                    ApplicationInstallee(
                        paquet = info.packageName,
                        libelle = gestionnaire.getApplicationLabel(info).toString(),
                        icone = runCatching {
                            gestionnaire.getApplicationIcon(info).toBitmap(96, 96)
                        }.getOrNull(),
                    )
                }
                .sortedBy { it.libelle.lowercase() }
                .toList()
        }
}
