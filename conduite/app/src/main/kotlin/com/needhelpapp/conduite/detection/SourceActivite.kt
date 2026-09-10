package com.needhelpapp.conduite.detection

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.ActivityRecognition

/**
 * La reconnaissance d'activité : « en véhicule », « à pied », « à vélo ».
 *
 * C'est la SEULE dépendance aux services Google de l'application, et
 * elle est facultative par construction : sans elle, la détection
 * fonctionne à la vitesse seule. On y perd deux choses, et il faut les
 * connaître —
 *
 *   1. le démarrage sans GPS (parking souterrain, ville dense) ;
 *   2. le démenti qui épargne le cycliste rapide, que la seule vitesse
 *      ferait bloquer à tort au-delà de 15 km/h.
 *
 * Il n'existe pas d'équivalent AOSP. Sur un appareil dégooglisé,
 * [disponible] rend false et l'application le dit clairement plutôt que
 * de faire semblant.
 */
class SourceActivite(private val contexte: Context) {

    val disponible: Boolean
        get() = GoogleApiAvailability.getInstance()
            .isGooglePlayServicesAvailable(contexte) == ConnectionResult.SUCCESS

    private val intentionEnAttente: PendingIntent by lazy {
        PendingIntent.getBroadcast(
            contexte,
            0,
            Intent(contexte, RecepteurActivite::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    @SuppressLint("MissingPermission")
    fun demarrer(intervalleMs: Long = INTERVALLE_MS) {
        if (!disponible || !autorisee()) return
        runCatching {
            ActivityRecognition.getClient(contexte)
                .requestActivityUpdates(intervalleMs, intentionEnAttente)
        }.onFailure { Log.w(ETIQUETTE, "Reconnaissance d'activité indisponible", it) }
    }

    @SuppressLint("MissingPermission")
    fun arreter() {
        if (!disponible || !autorisee()) return
        runCatching {
            ActivityRecognition.getClient(contexte).removeActivityUpdates(intentionEnAttente)
        }
    }

    private fun autorisee(): Boolean =
        ContextCompat.checkSelfPermission(contexte, Manifest.permission.ACTIVITY_RECOGNITION) ==
            PackageManager.PERMISSION_GRANTED

    companion object {
        private const val ETIQUETTE = "SourceActivite"

        /**
         * Une minute. Le système republie l'activité à ce rythme, ce qui
         * doit rester nettement sous la péremption du signal côté moteur
         * (trois minutes) : sinon un cycliste verrait son démenti expirer
         * et se retrouverait bloqué en pleine descente.
         */
        const val INTERVALLE_MS = 60_000L
    }
}
