package com.needhelpapp.conduite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.needhelpapp.conduite.ui.ModeleConduite
import com.needhelpapp.conduite.ui.ecrans.EcranAccueil
import com.needhelpapp.conduite.ui.ecrans.EcranApplications
import com.needhelpapp.conduite.ui.ecrans.EcranHistorique
import com.needhelpapp.conduite.ui.ecrans.EcranPermissions
import com.needhelpapp.conduite.ui.ecrans.EcranReglages
import com.needhelpapp.conduite.ui.theme.ThemeConduite

/**
 * La seule activité de l'application.
 *
 * Elle ne pilote rien : le service tourne, qu'elle soit ouverte ou non,
 * et l'utilisateur peut la fermer sans conséquence. C'est le contraire
 * de l'habitude, et c'est voulu — une application de blocage dont il
 * faudrait garder l'écran ouvert ne bloquerait rien.
 */
class ActivitePrincipale : ComponentActivity() {

    override fun onCreate(etatSauvegarde: Bundle?) {
        super.onCreate(etatSauvegarde)
        enableEdgeToEdge()
        setContent {
            ThemeConduite {
                Application()
            }
        }
    }
}

private object Destinations {
    const val ACCUEIL = "accueil"
    const val PERMISSIONS = "permissions"
    const val APPLICATIONS = "applications"
    const val REGLAGES = "reglages"
    const val HISTORIQUE = "historique"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Application(modele: ModeleConduite = viewModel()) {
    val navigation = rememberNavController()
    val reglages by modele.reglages.collectAsStateWithLifecycle()
    val etat by modele.etat.collectAsStateWithLifecycle()
    val permissions by modele.permissions.collectAsStateWithLifecycle()
    val applications by modele.applications.collectAsStateWithLifecycle()
    val trajets by modele.trajets.collectAsStateWithLifecycle()

    // Android ne publie aucun flux sur l'état des permissions. Le seul
    // moment où il a pu changer est un aller-retour dans les réglages du
    // système : on relit donc à chaque retour à l'écran, ce qui couvre
    // exactement ce cas.
    val proprietaire = LocalLifecycleOwner.current
    DisposableEffect(proprietaire) {
        val observateur = LifecycleEventObserver { _, evenement ->
            if (evenement == Lifecycle.Event.ON_RESUME) modele.rafraichirPermissions()
        }
        proprietaire.lifecycle.addObserver(observateur)
        onDispose { proprietaire.lifecycle.removeObserver(observateur) }
    }

    val entree by navigation.currentBackStackEntryAsState()
    val destination = entree?.destination?.route ?: Destinations.ACCUEIL

    Scaffold(
        topBar = {
            if (destination != Destinations.ACCUEIL) {
                TopAppBar(
                    title = { Text(titreDe(destination)) },
                    navigationIcon = {
                        IconButton(onClick = { navigation.popBackStack() }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Retour",
                            )
                        }
                    },
                )
            }
        },
    ) { marges ->
        NavHost(
            navController = navigation,
            startDestination = Destinations.ACCUEIL,
            modifier = Modifier.padding(marges),
        ) {
            composable(Destinations.ACCUEIL) {
                EcranAccueil(
                    etat = etat,
                    reglages = reglages,
                    permissions = permissions,
                    surBascule = modele::basculerSurveillance,
                    versPermissions = { navigation.aller(Destinations.PERMISSIONS) },
                    versApplications = {
                        modele.chargerApplications()
                        navigation.aller(Destinations.APPLICATIONS)
                    },
                    versReglages = { navigation.aller(Destinations.REGLAGES) },
                    versHistorique = { navigation.aller(Destinations.HISTORIQUE) },
                )
            }

            composable(Destinations.PERMISSIONS) {
                EcranPermissions(
                    permissions = permissions,
                    surRafraichir = modele::rafraichirPermissions,
                )
            }

            composable(Destinations.APPLICATIONS) {
                EcranApplications(
                    applications = applications,
                    reglages = reglages,
                    surBascule = { paquet ->
                        if (reglages.blocage.mode ==
                            com.needhelpapp.conduite.moteur.ModeBlocage.STRICT
                        ) {
                            modele.basculerAutorise(paquet)
                        } else {
                            modele.basculerSurveille(paquet)
                        }
                    },
                )
            }

            composable(Destinations.REGLAGES) {
                EcranReglages(
                    reglages = reglages,
                    permissions = permissions,
                    surMode = modele::definirMode,
                    surNePasDeranger = modele::definirNePasDeranger,
                    surAccessibilite = modele::definirAccessibilite,
                    surSeuils = modele::definirSeuils,
                    surDelaiFin = modele::definirDelaiFinTrajet,
                )
            }

            composable(Destinations.HISTORIQUE) {
                EcranHistorique(trajets = trajets, surEffacer = modele::effacerHistorique)
            }
        }
    }
}

private fun NavHostController.aller(route: String) {
    // launchSingleTop : un double appui sur un bouton ne doit pas
    // empiler deux fois le même écran.
    navigate(route) { launchSingleTop = true }
}

private fun titreDe(destination: String): String = when (destination) {
    Destinations.PERMISSIONS -> "Autorisations"
    Destinations.APPLICATIONS -> "Applications"
    Destinations.REGLAGES -> "Réglages"
    Destinations.HISTORIQUE -> "Trajets"
    else -> "Conduite"
}
