package com.needhelpapp.conduite.detection

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.DetectedActivity
import com.needhelpapp.conduite.moteur.GenreActivite
import com.needhelpapp.conduite.moteur.Signal

/**
 * Traduit ce que disent les services Play dans le vocabulaire du moteur.
 *
 * La traduction est ici, et pas dans le moteur : celui-ci ne doit
 * connaître ni Google, ni Android. Le jour où la source change, ce
 * fichier change, et rien d'autre.
 */
class RecepteurActivite : BroadcastReceiver() {

    override fun onReceive(contexte: Context, intention: Intent) {
        if (!ActivityRecognitionResult.hasResult(intention)) return
        val resultat = ActivityRecognitionResult.extractResult(intention) ?: return
        val probable = resultat.mostProbableActivity

        CanalSignaux.publier(
            Signal.Activite(
                instant = SystemClock.elapsedRealtime(),
                genre = traduire(probable.type),
                confiance = probable.confidence,
            ),
        )
    }

    private fun traduire(type: Int): GenreActivite = when (type) {
        DetectedActivity.IN_VEHICLE -> GenreActivite.EN_VEHICULE
        DetectedActivity.ON_BICYCLE -> GenreActivite.A_VELO
        // COURSE et MARCHE sont deux façons d'être à pied. Les
        // distinguer n'apporterait rien : dans les deux cas, on ne tient
        // pas un volant.
        DetectedActivity.ON_FOOT, DetectedActivity.WALKING, DetectedActivity.RUNNING ->
            GenreActivite.A_PIED
        DetectedActivity.STILL -> GenreActivite.IMMOBILE
        else -> GenreActivite.INCONNU
    }
}
