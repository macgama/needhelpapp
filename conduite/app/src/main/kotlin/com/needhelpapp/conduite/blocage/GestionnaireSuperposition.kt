package com.needhelpapp.conduite.blocage

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import com.needhelpapp.conduite.R
import kotlin.math.roundToInt

/**
 * L'écran qui recouvre l'application interdite.
 *
 * CE QU'IL PEUT, ET CE QU'IL NE PEUT PAS
 *
 * Android ne permet à AUCUNE application tierce de confisquer le
 * téléphone. Le bouton d'accueil, le bouton des applications récentes et
 * le volet des notifications restent hors d'atteinte, et c'est très bien
 * ainsi : une application capable de les neutraliser serait un
 * rançongiciel. Ce que fait cette superposition est donc précis —
 * l'application interdite est recouverte tant qu'elle est devant, elle
 * se découvre dès qu'on la quitte, et elle se recouvre si on y revient.
 *
 * C'est suffisant, parce que le mécanisme n'est pas la prison mais la
 * friction : le geste réflexe échoue, et le réflexe s'éteint.
 *
 * ELLE NE PARLE PAS, ELLE N'ANIME RIEN
 *
 * Pas d'animation, pas de couleur vive, pas de son. Un écran de blocage
 * spectaculaire est un écran qu'on regarde — soit exactement ce qu'on
 * cherchait à éviter.
 */
class GestionnaireSuperposition(private val contexte: Context) {

    private val fenetres = contexte.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var vue: View? = null
    private var vitesse: TextView? = null
    private var progression: ProgressBar? = null
    private var indice: TextView? = null

    /** Appelé quand l'utilisateur a tenu le bouton assez longtemps. */
    var surDeclarationPassager: (() -> Unit)? = null

    val affichee: Boolean get() = vue != null

    @SuppressLint("ClickableViewAccessibility", "InflateParams")
    fun afficher() {
        if (vue != null) return
        if (!Settings.canDrawOverlays(contexte)) {
            // La permission a pu être retirée depuis le dernier trajet.
            // Mieux vaut ne rien afficher que planter le service qui
            // tient toute la détection.
            Log.w(ETIQUETTE, "Superposition refusée : permission absente")
            return
        }

        val racine = LayoutInflater.from(contexte)
            .inflate(R.layout.superposition_blocage, null)

        vitesse = racine.findViewById(R.id.vitesse)
        progression = racine.findViewById(R.id.progression_appui)
        indice = racine.findViewById(R.id.indice_appui)

        racine.findViewById<Button>(R.id.bouton_accueil).setOnClickListener {
            // On ne ferme pas la superposition : on renvoie à l'accueil.
            // Elle disparaîtra d'elle-même parce que l'application
            // interdite ne sera plus devant.
            contexte.startActivity(
                Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_HOME)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }

        installerAppuiMaintenu(racine.findViewById(R.id.bouton_passager))

        // Avaler le bouton « retour » : sans cela, il rendrait la main à
        // l'application recouverte le temps d'un battement de cil, ce qui
        // suffit à lire une notification.
        racine.setOnKeyListener { _, code, _ -> code == KeyEvent.KEYCODE_BACK }

        runCatching { fenetres.addView(racine, parametres()) }
            .onSuccess { vue = racine }
            .onFailure { Log.w(ETIQUETTE, "Impossible d'ajouter la superposition", it) }
    }

    fun masquer() {
        val actuelle = vue ?: return
        runCatching { fenetres.removeView(actuelle) }
        vue = null
        vitesse = null
        progression = null
        indice = null
    }

    /** Affiche la vitesse, ou rien si on ne la connaît pas. */
    fun majVitesse(kmh: Float?) {
        val champ = vitesse ?: return
        if (kmh == null) {
            champ.visibility = View.GONE
        } else {
            champ.visibility = View.VISIBLE
            champ.text = contexte.getString(R.string.vitesse_format, kmh.roundToInt())
        }
    }

    /**
     * Trois secondes de doigt posé pour se déclarer passager.
     *
     * La friction EST le mécanisme. Un conducteur ne tient pas trois
     * secondes sur un bouton sans quitter la route des yeux, et il le
     * sent physiquement ; un passager, lui, ne remarque même pas
     * l'attente. Un simple appui, lui, se donne au feu rouge sans y
     * penser — et l'application ne servirait plus à rien.
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun installerAppuiMaintenu(bouton: Button) {
        var debutAppui = 0L
        val barre = progression
        val texteIndice = indice

        val rafraichir = object : Runnable {
            override fun run() {
                val ecoule = SystemClock.elapsedRealtime() - debutAppui
                if (debutAppui == 0L) return
                if (ecoule >= DUREE_APPUI_MS) {
                    barre?.progress = 1000
                    surDeclarationPassager?.invoke()
                    return
                }
                barre?.progress = (ecoule * 1000 / DUREE_APPUI_MS).toInt()
                bouton.postDelayed(this, 16)
            }
        }

        bouton.setOnTouchListener { _, evenement ->
            when (evenement.action) {
                MotionEvent.ACTION_DOWN -> {
                    debutAppui = SystemClock.elapsedRealtime()
                    barre?.visibility = View.VISIBLE
                    texteIndice?.visibility = View.VISIBLE
                    bouton.post(rafraichir)
                    true
                }

                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    debutAppui = 0L
                    bouton.removeCallbacks(rafraichir)
                    barre?.progress = 0
                    barre?.visibility = View.INVISIBLE
                    texteIndice?.visibility = View.INVISIBLE
                    true
                }

                else -> false
            }
        }
    }

    private fun parametres(): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            // La fenêtre reste FOCALISABLE, à dessein : c'est ce qui
            // permet d'intercepter le bouton « retour ». Elle n'est pas
            // NOT_TOUCH_MODAL non plus — les touchers ne doivent pas
            // traverser jusqu'à l'application recouverte.
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }
    }

    private companion object {
        const val ETIQUETTE = "Superposition"
        const val DUREE_APPUI_MS = 3_000L
    }
}
