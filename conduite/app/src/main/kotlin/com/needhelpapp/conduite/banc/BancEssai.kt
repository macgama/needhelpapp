package com.needhelpapp.conduite.banc

import android.os.SystemClock
import com.needhelpapp.conduite.detection.CanalSignaux
import com.needhelpapp.conduite.moteur.GenreActivite
import com.needhelpapp.conduite.moteur.Signal
import kotlinx.coroutines.delay

/**
 * De quoi éprouver l'application sur un vrai téléphone, sans voiture.
 *
 * POURQUOI CE FICHIER EXISTE
 *
 * Le moteur de décision s'éprouve en quelques millisecondes dans
 * `moteur/`, sans Android. Mais tout ce qui l'entoure — la superposition
 * qui recouvre vraiment une application, le Ne pas déranger qui coupe
 * vraiment les notifications, le service qui survit vraiment à l'écran
 * éteint, la surcouche du constructeur qui le tue quand même — ne se
 * vérifie que sur l'appareil. Et jusqu'ici, la seule façon de le faire
 * était de prendre la voiture.
 *
 * Ce banc injecte des signaux fabriqués dans le canal que le service
 * écoute déjà. Aucune ligne du service n'a été modifiée pour lui : il ne
 * voit pas la différence entre un point GPS et un point du banc, ce qui
 * est précisément la propriété qui rend le test honnête.
 *
 * EN TEMPS RÉEL, ET C'EST VOULU
 *
 * On pourrait accélérer en fabriquant des instants dans le futur. Ce
 * serait une erreur : le service émet ses propres battements à l'heure
 * réelle, et deux horloges qui se contredisent donneraient des délais
 * négatifs. Un scénario de feu rouge dure donc ses deux minutes et
 * demie. C'est le prix d'un banc qui éprouve le vrai chemin.
 */
object BancEssai {

    sealed interface Instruction {
        val libelle: String

        /** Émet un point de position par seconde, comme le ferait le GPS. */
        data class Rouler(val vitesseKmh: Float, val dureeMs: Long) : Instruction {
            override val libelle: String
                get() = if (vitesseKmh == 0f) "À l'arrêt (${dureeMs / 1000} s)"
                else "${vitesseKmh.toInt()} km/h (${dureeMs / 1000} s)"
        }

        /** N'émet rien du tout : le tunnel, le parking, le GPS coupé. */
        data class Silence(val dureeMs: Long) : Instruction {
            override val libelle: String get() = "Aucun signal (${dureeMs / 1000} s)"
        }

        data class Activite(val genre: GenreActivite, val confiance: Int) : Instruction {
            override val libelle: String get() = "Activité : $genre ($confiance %)"
        }

        data class Vehicule(val present: Boolean) : Instruction {
            override val libelle: String
                get() = if (present) "Liaison véhicule établie" else "Liaison véhicule coupée"
        }
    }

    data class Scenario(
        val nom: String,
        val attendu: String,
        val instructions: List<Instruction>,
    ) {
        val dureeMs: Long
            get() = instructions.sumOf {
                when (it) {
                    is Instruction.Rouler -> it.dureeMs
                    is Instruction.Silence -> it.dureeMs
                    else -> 0L
                }
            }
    }

    /**
     * Les scénarios sont ceux des tests du moteur, repris un à un — mais
     * joués ici sur le vrai service, avec la vraie superposition. Ce que
     * `moteur/` prouve en logique, le banc le montre à l'écran.
     */
    val scenarios: List<Scenario> = listOf(
        Scenario(
            nom = "Départ",
            attendu = "La superposition apparaît au bout de 20 s.",
            instructions = listOf(Instruction.Rouler(50f, 40_000)),
        ),
        Scenario(
            nom = "Feu rouge",
            attendu = "La superposition NE disparaît PAS pendant l'arrêt.",
            instructions = listOf(
                Instruction.Rouler(50f, 30_000),
                Instruction.Rouler(0f, 90_000),
                Instruction.Rouler(50f, 20_000),
            ),
        ),
        Scenario(
            nom = "Arrêt prolongé",
            attendu = "La superposition disparaît après 2 min d'immobilité.",
            instructions = listOf(
                Instruction.Rouler(50f, 30_000),
                Instruction.Rouler(0f, 135_000),
            ),
        ),
        Scenario(
            nom = "Tunnel",
            attendu = "Plus aucun signal, et la superposition reste.",
            instructions = listOf(
                Instruction.Rouler(50f, 30_000),
                Instruction.Silence(120_000),
            ),
        ),
        Scenario(
            nom = "Descente du véhicule",
            attendu = "La superposition disparaît aussitôt, sans attendre.",
            instructions = listOf(
                Instruction.Rouler(50f, 30_000),
                Instruction.Rouler(0f, 5_000),
                Instruction.Activite(GenreActivite.A_PIED, 92),
            ),
        ),
        Scenario(
            nom = "Voiture reconnue",
            attendu = "Blocage en 8 s, et fin immédiate à la coupure du contact.",
            instructions = listOf(
                Instruction.Vehicule(present = true),
                Instruction.Rouler(50f, 20_000),
                Instruction.Vehicule(present = false),
                Instruction.Rouler(50f, 5_000),
            ),
        ),
        Scenario(
            nom = "Cycliste",
            attendu = "20 km/h, et rien ne se bloque.",
            instructions = listOf(
                Instruction.Activite(GenreActivite.A_VELO, 90),
                Instruction.Rouler(20f, 55_000),
                Instruction.Activite(GenreActivite.A_VELO, 90),
                Instruction.Rouler(20f, 55_000),
            ),
        ),
    )

    /**
     * Joue un scénario, en publiant dans le canal que le service écoute.
     * [surEtape] sert uniquement à afficher où l'on en est.
     */
    suspend fun jouer(scenario: Scenario, surEtape: (String) -> Unit) {
        for (instruction in scenario.instructions) {
            surEtape(instruction.libelle)
            when (instruction) {
                is Instruction.Rouler -> {
                    val fin = SystemClock.elapsedRealtime() + instruction.dureeMs
                    while (SystemClock.elapsedRealtime() < fin) {
                        CanalSignaux.publier(
                            Signal.Position(
                                instant = SystemClock.elapsedRealtime(),
                                vitesseMs = instruction.vitesseKmh / 3.6f,
                                precisionM = 8f,
                            ),
                        )
                        delay(CADENCE_MS)
                    }
                }

                is Instruction.Silence -> delay(instruction.dureeMs)

                is Instruction.Activite -> CanalSignaux.publier(
                    Signal.Activite(
                        SystemClock.elapsedRealtime(),
                        instruction.genre,
                        instruction.confiance,
                    ),
                )

                is Instruction.Vehicule -> CanalSignaux.publier(
                    Signal.Vehicule(SystemClock.elapsedRealtime(), instruction.present),
                )
            }
        }
        surEtape("Terminé")
    }

    /** La même cadence que le GPS en trajet : le service ne doit rien voir. */
    private const val CADENCE_MS = 1_000L
}
