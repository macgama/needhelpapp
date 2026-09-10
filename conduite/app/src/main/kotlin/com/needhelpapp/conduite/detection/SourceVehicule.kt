package com.needhelpapp.conduite.detection

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import com.needhelpapp.conduite.moteur.Signal
import com.needhelpapp.conduite.permissions.Permissions

/** Un appareil appairé, tel que l'écran de choix le présente. */
data class AppareilAppaire(
    val adresse: String,
    val nom: String,
)

/**
 * La liaison Bluetooth avec le véhicule de l'utilisateur.
 *
 * C'EST LE MEILLEUR SIGNAL DE TOUTE LA DÉTECTION, et le seul qui ne
 * vienne pas d'un capteur. Un GPS dit qu'on va à 50 km/h ; il ne sait
 * pas si c'est en voiture, en bus, en tram ou en car postal. Un
 * appairage, lui, sait de QUEL véhicule il s'agit — celui dont
 * l'utilisateur a désigné l'autoradio, une fois, dans une liste.
 *
 * D'où les deux usages, et seulement ces deux-là :
 *
 *   — la confirmation passe de vingt à huit secondes, puisqu'il n'y a
 *     plus ni bus, ni tram, ni vélo à écarter ;
 *   — la coupure de liaison termine le trajet sur-le-champ. L'autoradio
 *     s'éteint avec le contact : c'est un signal de fin plus net que
 *     n'importe quelle absence de mouvement.
 *
 * Ce qu'elle ne fait PAS : déclencher un blocage à elle seule. Une
 * voiture garée, contact mis, reste connectée — devant une école, dans
 * un embouteillage, ou dans un garage.
 *
 * L'application ne cherche aucun appareil autour d'elle (pas de
 * `startDiscovery`, pas de balayage), n'échange aucune donnée par
 * Bluetooth, et ne lit la liste des appareils appairés qu'au moment où
 * l'utilisateur ouvre l'écran de choix.
 */
class SourceVehicule(private val contexte: Context) {

    private val adaptateur: BluetoothAdapter? =
        (contexte.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    /** Mise à jour par le service à chaque changement de réglages. */
    @Volatile
    var adressesSurveillees: Set<String> = emptySet()

    val disponible: Boolean get() = adaptateur != null

    private var enMarche = false

    private val recepteur = object : BroadcastReceiver() {
        override fun onReceive(contexte: Context, intention: Intent) {
            val appareil = IntentCompat.getParcelableExtra(
                intention,
                BluetoothDevice.EXTRA_DEVICE,
                BluetoothDevice::class.java,
            ) ?: return

            // On ne réagit qu'aux véhicules désignés. Une montre, un
            // casque ou une enceinte se connectent et se déconnectent
            // toute la journée : les écouter reviendrait à terminer des
            // trajets au hasard.
            if (appareil.address !in adressesSurveillees) return

            when (intention.action) {
                BluetoothDevice.ACTION_ACL_CONNECTED -> publier(true)
                BluetoothDevice.ACTION_ACL_DISCONNECTED -> publier(false)
            }
        }
    }

    fun demarrer() {
        if (enMarche || adaptateur == null) return
        val filtre = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_ACL_CONNECTED)
            addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED)
        }
        // NOT_EXPORTED : ces intentions ne viennent que du système, et
        // Android 14 refuse un enregistrement qui ne le dit pas.
        ContextCompat.registerReceiver(
            contexte,
            recepteur,
            filtre,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        enMarche = true
        interrogerEtatCourant()
    }

    fun arreter() {
        if (!enMarche) return
        runCatching { contexte.unregisterReceiver(recepteur) }
        enMarche = false
        // Le moteur ne doit pas rester avec une liaison qu'on ne surveille
        // plus : sans cela, la mémoire du trajet en cours resterait vraie
        // et la prochaine déconnexion manquée ne terminerait rien.
        publier(false)
    }

    /**
     * La liste des appareils appairés, pour l'écran de choix.
     *
     * Appairés, pas découverts : on lit ce que l'utilisateur a déjà
     * associé à son téléphone, on ne va rien chercher alentour.
     */
    @SuppressLint("MissingPermission")
    fun appairés(): List<AppareilAppaire> {
        if (!Permissions.bluetoothAccorde(contexte)) return emptyList()
        val adaptateur = adaptateur ?: return emptyList()
        return runCatching {
            adaptateur.bondedDevices.orEmpty()
                .map { AppareilAppaire(it.address, it.name ?: it.address) }
                .sortedBy { it.nom.lowercase() }
        }.getOrElse { emptyList() }
    }

    /**
     * L'état au démarrage du service.
     *
     * Indispensable : le service peut démarrer alors que la voiture roule
     * déjà — après un redémarrage du téléphone, ou une mise à jour de
     * l'application. Sans cette interrogation, la liaison n'existerait
     * pour nous qu'à partir de la PROCHAINE connexion, et la coupure du
     * contact ne terminerait pas le trajet en cours.
     *
     * Il n'existe pas d'API synchrone pour savoir QUEL appareil est
     * connecté : il faut passer par un mandataire de profil, qui arrive
     * par rappel. On publie donc quand la réponse vient.
     */
    @SuppressLint("MissingPermission")
    private fun interrogerEtatCourant() {
        if (!Permissions.bluetoothAccorde(contexte)) return
        val adaptateur = adaptateur ?: return

        val ecouteur = object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profil: Int, mandataire: BluetoothProfile) {
                val connecte = runCatching {
                    mandataire.connectedDevices.any { it.address in adressesSurveillees }
                }.getOrDefault(false)
                if (connecte) publier(true)
                runCatching { adaptateur.closeProfileProxy(profil, mandataire) }
            }

            override fun onServiceDisconnected(profil: Int) = Unit
        }

        // A2DP pour la musique, HEADSET pour le mains-libres : un
        // autoradio annonce l'un, l'autre, ou les deux selon le modèle.
        listOf(BluetoothProfile.A2DP, BluetoothProfile.HEADSET).forEach { profil ->
            runCatching { adaptateur.getProfileProxy(contexte, ecouteur, profil) }
                .onFailure { Log.w(ETIQUETTE, "Profil $profil inaccessible", it) }
        }
    }

    private fun publier(present: Boolean) {
        CanalSignaux.publier(Signal.Vehicule(SystemClock.elapsedRealtime(), present))
    }

    private companion object {
        const val ETIQUETTE = "SourceVehicule"
    }
}
