package com.needhelpapp.conduite.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.needhelpapp.conduite.ActivitePrincipale
import com.needhelpapp.conduite.AppConduite
import com.needhelpapp.conduite.R
import com.needhelpapp.conduite.moteur.MoteurDecision

/**
 * La notification permanente : la contrepartie qu'Android exige pour
 * laisser un service tourner.
 *
 * Autant s'en servir. Elle dit dans quel état on est, et porte le bouton
 * « je suis passager » — celui qu'on cherche justement quand
 * l'application est recouverte et qu'on n'a pas envie de tenir trois
 * secondes sur un bouton.
 */
object Notifications {

    const val ID_SURVEILLANCE = 1

    fun surveillance(
        contexte: Context,
        etat: MoteurDecision.Etat,
        passager: Boolean,
    ): Notification {
        val (titre, texte) = when {
            passager && etat.enTrajet ->
                R.string.notification_passager_titre to R.string.notification_passager_texte

            etat == MoteurDecision.Etat.ARRET ->
                R.string.notification_veille_titre to R.string.notification_veille_texte

            etat == MoteurDecision.Etat.SUSPICION ->
                R.string.notification_suspicion_titre to R.string.notification_suspicion_texte

            else ->
                R.string.notification_conduite_titre to R.string.notification_conduite_texte
        }

        val ouvrir = PendingIntent.getActivity(
            contexte,
            0,
            Intent(contexte, ActivitePrincipale::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val constructeur = NotificationCompat.Builder(contexte, AppConduite.CANAL_SURVEILLANCE)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(contexte.getString(titre))
            .setContentText(contexte.getString(texte))
            .setContentIntent(ouvrir)
            .setOngoing(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        // Le bouton n'apparaît que quand il sert : proposer « je suis
        // passager » à l'arrêt, c'est inviter à désarmer l'application
        // avant même de partir.
        if (etat.enTrajet && !passager) {
            val passagerIntention = PendingIntent.getService(
                contexte,
                1,
                Intent(contexte, ServiceConduite::class.java)
                    .setAction(ServiceConduite.ACTION_PASSAGER),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            constructeur.addAction(
                0,
                contexte.getString(R.string.notification_action_passager),
                passagerIntention,
            )
        }

        return constructeur.build()
    }
}
