<?php
/**
 * Départ vers Stripe.
 *
 *   /api/paiement.php?formule=mensuel   → page de paiement Stripe
 *   /api/paiement.php?formule=annuel
 *   /api/paiement.php?action=portail    → portail client (facture, résiliation, carte)
 *
 * Redirige, ne répond pas en JSON : le navigateur doit quitter le site.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../includes/stripe.php';

function repartir(string $message): never {
    header('Location: /abonnement.php?erreur=' . urlencode($message));
    exit;
}

$compte = nha_current_account();
if (!$compte) {
    header('Location: /connexion.php?suite=' . urlencode('/abonnement.php'));
    exit;
}
if (!stripe_configure()) {
    repartir('Le paiement n\'est pas encore ouvert. Écrivez-nous, nous vous préviendrons.');
}

$db = nha_db();

/* ---------- Portail client : facture, moyen de paiement, résiliation ---------- */
if (($_GET['action'] ?? '') === 'portail') {
    $st = $db->prepare(
        'SELECT provider_customer_id FROM subscriptions
         WHERE payer_account_id = ? AND provider = "stripe" AND provider_customer_id IS NOT NULL
         ORDER BY updated_at DESC LIMIT 1'
    );
    $st->execute([$compte['id']]);
    $client = $st->fetchColumn();

    if ($client) {
        try {
            $s = stripe_api('POST', 'billing_portal/sessions', [
                'customer'   => $client,
                'return_url' => url_absolue('/abonnement.php'),
            ]);
            header('Location: ' . $s['url']); exit;
        } catch (Throwable $e) {
            error_log('[NeedHelpApp] portail Stripe : ' . $e->getMessage());
        }
    }
    // Secours : le portail public de Stripe demande son adresse au client
    // et lui envoie un code de connexion. Utile tant qu'aucun paiement n'a
    // encore créé d'identifiant de payeur chez nous.
    $secours = (string)nha_config('stripe_portail_url', '');
    if ($secours !== '') { header('Location: ' . $secours); exit; }
    repartir('Aucun abonnement à gérer pour l\'instant.');
}

/* ---------- Page de paiement ---------- */
$formule = $_GET['formule'] ?? 'mensuel';
$prix = match ($formule) {
    'annuel'  => (string)nha_config('stripe_prix_annuel', ''),
    'mensuel' => (string)nha_config('stripe_prix_mensuel', ''),
    default   => '',
};
if (!str_starts_with($prix, 'price_')) {
    repartir('Cette formule n\'existe pas.');
}

// Réutiliser le même identifiant de payeur évite les doublons de clients
// chez Stripe quand quelqu'un se réabonne.
$st = $db->prepare(
    'SELECT provider_customer_id FROM subscriptions
     WHERE payer_account_id = ? AND provider = "stripe" AND provider_customer_id IS NOT NULL
     ORDER BY updated_at DESC LIMIT 1'
);
$st->execute([$compte['id']]);
$client = $st->fetchColumn();

$params = [
    'mode'                 => 'subscription',
    'line_items'           => [['price' => $prix, 'quantity' => 1]],
    'success_url'          => url_absolue('/abonnement.php?paiement=ok&session={CHECKOUT_SESSION_ID}'),
    'cancel_url'           => url_absolue('/abonnement.php?paiement=annule'),
    'locale'               => 'fr',
    'allow_promotion_codes' => 'true',
    'client_reference_id'  => $compte['uuid'],
    // Ces métadonnées permettent au webhook de retrouver le compte même si
    // l'utilisateur paie avec une autre adresse que celle de son compte.
    'metadata'             => ['account_id' => (string)$compte['id'], 'app' => nha_app_code()],
    'subscription_data'    => ['metadata' => ['account_id' => (string)$compte['id'], 'app' => nha_app_code()]],
];
if ($client) { $params['customer'] = $client; }
else         { $params['customer_email'] = $compte['email']; }

try {
    $session = stripe_api('POST', 'checkout/sessions', $params);
} catch (Throwable $e) {
    error_log('[NeedHelpApp] création session Stripe : ' . $e->getMessage());
    repartir('Le service de paiement ne répond pas. Réessayez dans un instant.');
}

nha_log((int)$compte['id'], 'checkout_started', $formule);
header('Location: ' . $session['url']);
exit;
