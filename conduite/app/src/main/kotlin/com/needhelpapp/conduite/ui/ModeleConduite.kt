package com.needhelpapp.conduite.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.needhelpapp.conduite.AppConduite
import com.needhelpapp.conduite.donnees.ApplicationInstallee
import com.needhelpapp.conduite.donnees.ApplicationsInstallees
import com.needhelpapp.conduite.donnees.ReglagesComplets
import com.needhelpapp.conduite.donnees.base.Trajet
import com.needhelpapp.conduite.moteur.ModeBlocage
import com.needhelpapp.conduite.permissions.Permissions
import com.needhelpapp.conduite.service.EtatPublic
import com.needhelpapp.conduite.service.ServiceConduite
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Ce que l'écran voit, et ce qu'il peut demander.
 *
 * L'état des permissions ne peut pas être un flux : Android n'en publie
 * aucun. On le relit donc à chaque retour à l'écran — c'est le seul
 * moment où il a pu changer, puisque le changer suppose d'être passé par
 * les réglages du système.
 */
class ModeleConduite(application: Application) : AndroidViewModel(application) {

    // Les actions ci-dessous renvoient Unit, et non le Job de la
    // coroutine : elles sont passées aux écrans comme des rappels
    // `(T) -> Unit`, et un type de retour qui traîne se paierait en
    // erreurs de compilation à chaque nouvel écran.
    private val app get() = getApplication<AppConduite>()

    data class EtatPermissions(
        val position: Boolean = false,
        val positionArrierePlan: Boolean = false,
        val activite: Boolean = false,
        val notifications: Boolean = false,
        val superposition: Boolean = false,
        val statistiques: Boolean = false,
        val nePasDeranger: Boolean = false,
        val accessibilite: Boolean = false,
    ) {
        /**
         * Le minimum sans lequel l'application ne peut RIEN faire :
         * savoir qu'on roule, et dessiner par-dessus. Le reste améliore.
         */
        val suffisantPourFonctionner: Boolean
            get() = position && superposition && (statistiques || accessibilite)

        val toutesLesRecommandees: Boolean
            get() = suffisantPourFonctionner && positionArrierePlan && activite && notifications
    }

    val reglages: StateFlow<ReglagesComplets> = app.reglages.flux
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ReglagesComplets())

    val trajets: StateFlow<List<Trajet>> = app.trajets.derniers
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val etat: StateFlow<EtatPublic.Vue> = EtatPublic.vue

    private val _permissions = MutableStateFlow(EtatPermissions())
    val permissions: StateFlow<EtatPermissions> = _permissions

    private val _applications = MutableStateFlow<List<ApplicationInstallee>>(emptyList())
    val applications: StateFlow<List<ApplicationInstallee>> = _applications

    fun rafraichirPermissions() {
        _permissions.value = EtatPermissions(
            position = Permissions.positionAccordee(app),
            positionArrierePlan = Permissions.positionArrierePlanAccordee(app),
            activite = Permissions.activiteAccordee(app),
            notifications = Permissions.notificationsAccordees(app),
            superposition = Permissions.superpositionAccordee(app),
            statistiques = Permissions.statistiquesAccordees(app),
            nePasDeranger = Permissions.nePasDerangerAccorde(app),
            accessibilite = Permissions.accessibiliteActive(app),
        )
    }

    fun chargerApplications() {
        viewModelScope.launch {
            _applications.value = ApplicationsInstallees.lister(app)
        }
    }

    /**
     * Le grand interrupteur.
     *
     * On écrit la préférence AVANT de démarrer le service : c'est elle
     * que le receveur de démarrage relira après un redémarrage du
     * téléphone. Dans l'autre ordre, une application allumée puis un
     * redémarrage donneraient une application éteinte sans que personne
     * ne l'ait demandé.
     */
    fun basculerSurveillance(active: Boolean) {
        viewModelScope.launch {
            app.reglages.definirSurveillance(active)
            if (active) ServiceConduite.demarrer(app) else ServiceConduite.arreter(app)
        }
    }

    fun definirMode(mode: ModeBlocage) {
        viewModelScope.launch { app.reglages.definirMode(mode) }
    }

    fun basculerSurveille(paquet: String) {
        viewModelScope.launch { app.reglages.basculerSurveille(paquet) }
    }

    fun basculerAutorise(paquet: String) {
        viewModelScope.launch { app.reglages.basculerAutorise(paquet) }
    }

    fun definirNePasDeranger(actif: Boolean) {
        viewModelScope.launch { app.reglages.definirNePasDeranger(actif) }
    }

    fun definirAccessibilite(preferee: Boolean) {
        viewModelScope.launch { app.reglages.definirAccessibilite(preferee) }
    }

    fun definirSeuils(entreeKmh: Float, sortieKmh: Float) {
        viewModelScope.launch { app.reglages.definirSeuils(entreeKmh, sortieKmh) }
    }

    fun definirDelaiFinTrajet(secondes: Int) {
        viewModelScope.launch { app.reglages.definirDelaiFinTrajet(secondes) }
    }

    fun effacerHistorique() {
        viewModelScope.launch { app.trajets.toutEffacer() }
    }
}
