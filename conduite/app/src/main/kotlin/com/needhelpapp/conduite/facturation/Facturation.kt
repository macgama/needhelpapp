package com.needhelpapp.conduite.facturation

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.needhelpapp.conduite.donnees.DepotLicence
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * L'achat unique, par le magasin de Google et par lui seul.
 *
 * TROIS RÈGLES QUI VALENT DE L'ARGENT
 *
 * 1. ACQUITTER SOUS TROIS JOURS. Un achat non acquitté est
 *    automatiquement remboursé par Google au bout de soixante-douze
 *    heures — l'utilisateur a payé, l'application est débloquée, et
 *    l'argent repart tout seul. C'est l'erreur classique de la première
 *    intégration, et elle ne se voit qu'au relevé du mois suivant. D'où
 *    l'acquittement systématique dans [traiter].
 *
 * 2. NE JAMAIS RÉVOQUER SUR UN SILENCE. Réseau coupé, Play Store en
 *    cours de mise à jour, mode avion, tunnel : dans tous ces cas le
 *    magasin ne répond pas. En conclure que l'achat n'existe pas
 *    reviendrait à couper la protection d'un client qui a payé, au
 *    moment précis où il roule. On n'écrit `false` que sur une réponse
 *    EXPLICITE du magasin.
 *
 * 3. NE JAMAIS ÉCRIRE LE PRIX DANS LE CODE. Il vient de Play, déjà
 *    formaté dans la monnaie et la langue de l'acheteur. Un prix en dur
 *    est faux dès le premier utilisateur étranger, et faux pour tout le
 *    monde au premier changement de tarif.
 *
 * CE QUE CETTE VÉRIFICATION NE FAIT PAS
 *
 * Elle est purement locale : pas de serveur, donc pas de validation
 * côté serveur du jeton d'achat. Un téléphone déverrouillé peut la
 * contourner. C'est un choix assumé — l'alternative demanderait un
 * serveur, un compte, et la permission réseau, c'est-à-dire de renoncer
 * à tout ce qui fait la valeur de cette application.
 */
class Facturation(
    contexte: Context,
    private val depot: DepotLicence,
    private val portee: CoroutineScope,
) {

    private val _prix = MutableStateFlow<String?>(null)

    /** Le prix formaté par Play, ou null tant qu'on ne l'a pas. */
    val prix: StateFlow<String?> = _prix

    private val _magasinJoignable = MutableStateFlow(false)
    val magasinJoignable: StateFlow<Boolean> = _magasinJoignable

    private var details: ProductDetails? = null

    private val ecouteur = PurchasesUpdatedListener { resultat, achats ->
        when (resultat.responseCode) {
            BillingClient.BillingResponseCode.OK ->
                achats.orEmpty().forEach { traiter(it) }

            BillingClient.BillingResponseCode.USER_CANCELED ->
                Unit // L'utilisateur a fermé la feuille de paiement. Rien à dire.

            else -> Log.w(ETIQUETTE, "Achat refusé : ${resultat.debugMessage}")
        }
    }

    private val client = BillingClient.newBuilder(contexte)
        .setListener(ecouteur)
        .enablePendingPurchases(
            // Les achats en attente existent : paiement en espèces chez un
            // buraliste, autorisation parentale à distance. Les ignorer
            // ferait perdre les ventes de ceux qui n'ont pas de carte.
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    fun demarrer() = connecter()

    private fun connecter() {
        if (client.isReady) {
            rafraichir()
            return
        }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(resultat: BillingResult) {
                val joignable = resultat.responseCode == BillingClient.BillingResponseCode.OK
                _magasinJoignable.value = joignable
                if (joignable) {
                    interrogerLeProduit()
                    rafraichir()
                } else {
                    Log.w(ETIQUETTE, "Magasin injoignable : ${resultat.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                _magasinJoignable.value = false
            }
        })
    }

    /**
     * Ouvre la feuille de paiement. Demande une Activity : Google impose
     * que l'achat parte d'un écran que l'utilisateur regarde, et c'est
     * une bonne chose.
     */
    fun acheter(activite: Activity) {
        val produit = details ?: run {
            // Le produit n'a pas encore été chargé : on retente la
            // connexion plutôt que de ne rien faire en silence.
            connecter()
            return
        }
        val parametres = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(produit)
                        .build(),
                ),
            )
            .build()
        client.launchBillingFlow(activite, parametres)
    }

    /**
     * Redemande au magasin ce que possède cet utilisateur.
     *
     * C'est aussi la fonction « restaurer mes achats » : sur un nouveau
     * téléphone, l'achat est rattaché au compte Google et revient de
     * lui-même — il n'y a rien à saisir, rien à retrouver.
     */
    fun rafraichir() {
        if (!client.isReady) {
            connecter()
            return
        }
        val parametres = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()

        client.queryPurchasesAsync(parametres) { resultat, achats ->
            if (resultat.responseCode != BillingClient.BillingResponseCode.OK) {
                // Règle n° 2 : le magasin n'a pas répondu. On garde ce
                // qu'on avait, on ne révoque rien.
                Log.w(ETIQUETTE, "Inventaire indisponible : ${resultat.debugMessage}")
                return@queryPurchasesAsync
            }

            achats.forEach { traiter(it) }

            val possede = achats.any {
                PRODUIT in it.products && it.purchaseState == Purchase.PurchaseState.PURCHASED
            }
            portee.launch { depot.definirAchete(possede) }
        }
    }

    private fun traiter(achat: Purchase) {
        if (achat.purchaseState != Purchase.PurchaseState.PURCHASED) return
        if (PRODUIT !in achat.products) return

        portee.launch { depot.definirAchete(true) }

        // Règle n° 1 : sans cet acquittement, Google rembourse tout seul
        // au bout de trois jours.
        if (!achat.isAcknowledged) {
            val parametres = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(achat.purchaseToken)
                .build()
            client.acknowledgePurchase(parametres) { resultat ->
                if (resultat.responseCode != BillingClient.BillingResponseCode.OK) {
                    Log.e(ETIQUETTE, "Acquittement refusé : ${resultat.debugMessage}")
                }
            }
        }
    }

    private fun interrogerLeProduit() {
        val parametres = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUIT)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build(),
                ),
            )
            .build()

        client.queryProductDetailsAsync(parametres) { resultat, liste ->
            if (resultat.responseCode != BillingClient.BillingResponseCode.OK) {
                Log.w(ETIQUETTE, "Produit introuvable : ${resultat.debugMessage}")
                return@queryProductDetailsAsync
            }
            details = liste.firstOrNull()
            _prix.value = details?.oneTimePurchaseOfferDetails?.formattedPrice
        }
    }

    companion object {
        private const val ETIQUETTE = "Facturation"

        /**
         * L'identifiant du produit, à créer à l'identique dans la Play
         * Console (Produits → Produits intégrés à l'application). Type
         * « achat unique », et non abonnement.
         */
        const val PRODUIT = "conduite_complet"
    }
}
