package com.needhelpapp.conduite.detection

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import com.needhelpapp.conduite.moteur.Signal
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

/**
 * D'où vient la vitesse.
 *
 * `LocationManager` du système, et non le client fusionné des services
 * Play : la vitesse d'un GPS brut est exactement ce dont nous avons
 * besoin, elle ne demande aucune dépendance, et l'application continue
 * de fonctionner sur un appareil sans services Google. La reconnaissance
 * d'activité, elle, n'a pas d'équivalent AOSP — c'est la seule pièce
 * qu'on accepte de leur devoir, et elle est facultative.
 *
 * LA CADENCE CHANGE AVEC L'ÉTAT
 *
 * Un GPS interrogé chaque seconde vide une batterie en une demi-journée.
 * En veille, on se contente d'un point toutes les vingt secondes : c'est
 * assez pour repérer un départ, et le délai de confirmation absorbe le
 * reste. En trajet, on passe à la seconde, parce que c'est là que la
 * précision compte — et le véhicule, lui, alimente le téléphone.
 */
class SourcePositionSysteme(private val contexte: Context) {

    private val gestionnaire =
        contexte.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    private val _flux = MutableSharedFlow<Signal.Position>(
        replay = 0,
        extraBufferCapacity = 16,
    )
    val flux: SharedFlow<Signal.Position> = _flux

    private var cadenceCourante: Long = 0

    /**
     * ON NE GARDE JAMAIS LA COORDONNÉE. Le point est lu, sa vitesse et
     * sa précision en sont extraites, et l'objet est jeté. Rien dans
     * l'application ne sait où vous êtes allé — l'historique des trajets
     * ne contient qu'une durée et une distance, cette dernière obtenue
     * en intégrant la vitesse. C'est une contrainte que le code s'impose
     * ici, à la source, et non une promesse écrite dans une politique de
     * confidentialité.
     */
    private val ecouteur = LocationListener { position ->
        _flux.tryEmit(
            Signal.Position(
                // Temps monotone, jamais l'heure murale : une
                // resynchronisation d'horloge ne doit pas pouvoir
                // rallonger un délai de sécurité.
                instant = SystemClock.elapsedRealtime(),
                vitesseMs = if (position.hasSpeed()) position.speed else null,
                precisionM = if (position.hasAccuracy()) position.accuracy else Float.MAX_VALUE,
            ),
        )
    }

    /**
     * (Re)demande des points à [intervalleMs]. Idempotent : appeler deux
     * fois avec la même cadence ne fait rien, ce qui permet au service de
     * l'appeler à chaque décision sans y réfléchir.
     */
    @SuppressLint("MissingPermission")
    fun cadence(intervalleMs: Long) {
        if (intervalleMs == cadenceCourante) return
        if (!positionAutorisee()) return

        val fournisseur = fournisseurUtilisable() ?: run {
            Log.w(ETIQUETTE, "Aucun fournisseur de position actif")
            return
        }

        try {
            gestionnaire.removeUpdates(ecouteur)
            gestionnaire.requestLocationUpdates(
                fournisseur,
                intervalleMs,
                0f, // aucune distance minimale : à l'arrêt aussi, on veut savoir
                ecouteur,
                Looper.getMainLooper(),
            )
            cadenceCourante = intervalleMs
        } catch (e: SecurityException) {
            // La permission a pu être retirée pendant que le service
            // tournait. On ne plante pas : l'utilisateur en sera informé
            // par l'écran des permissions.
            Log.w(ETIQUETTE, "Position refusée en cours de route", e)
        }
    }

    fun arreter() {
        gestionnaire.removeUpdates(ecouteur)
        cadenceCourante = 0
    }

    /**
     * FUSED quand il existe (Android 12+) : c'est le fournisseur que le
     * système alimente déjà pour d'autres applications, donc le moins
     * coûteux. Sinon le GPS, qui est le seul à donner une vitesse fiable.
     */
    private fun fournisseurUtilisable(): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            gestionnaire.isProviderEnabled(LocationManager.FUSED_PROVIDER)
        ) {
            return LocationManager.FUSED_PROVIDER
        }
        if (gestionnaire.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            return LocationManager.GPS_PROVIDER
        }
        return null
    }

    private fun positionAutorisee(): Boolean =
        ContextCompat.checkSelfPermission(contexte, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    companion object {
        private const val ETIQUETTE = "SourcePosition"

        /** En veille : assez pour repérer un départ, pas assez pour peser. */
        const val CADENCE_VEILLE_MS = 20_000L

        /** En trajet : le téléphone est branché, et la précision compte. */
        const val CADENCE_TRAJET_MS = 1_000L
    }
}
