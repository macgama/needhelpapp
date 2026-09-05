<?php
/**
 * Webhook Stripe — point d'entrée UNIQUE pour toutes les applications.
 *
 * À déclarer dans Stripe → Développeurs → Webhooks :
 *   https://needhelpapp.com/api/stripe.php
 *
 * Événements à cocher :
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.paid
 *   invoice.payment_failed
 *
 * Aucune session, aucun jeton CSRF : l'authenticité vient de la signature.
 * Répond toujours 200 quand le message est compris, même si le traitement
 * échoue, pour que Stripe ne réessaie pas indéfiniment un cas insoluble.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../includes/stripe.php';

$corps  = file_get_contents('php://input') ?: '';
$secret = (string)nha_config('stripe_webhook_secret', '');

if (!stripe_signature_valide($corps, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '', $secret)) {
    http_response_code(401);
    error_log('[NeedHelpApp] webhook Stripe : signature invalide');
    exit('signature invalide');
}

$ev = json_decode($corps, true);
if (!is_array($ev) || empty($ev['id'])) { http_response_code(400); exit('corps invalide'); }

$db = nha_db();

/* --- Journaliser d'abord. L'index unique rend l'appel idempotent : un
       événement rejoué par Stripe ne produit rien de plus. --- */
try {
    $db->prepare(
        'INSERT INTO billing_events (provider, provider_event_id, type, payload)
         VALUES ("stripe", ?, ?, ?)'
    )->execute([$ev['id'], $ev['type'] ?? 'inconnu', $corps]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') { http_response_code(200); exit('déjà traité'); }
    throw $e;
}

function terminer(string $message, ?string $erreur = null): never {
    global $db, $ev;
    $db->prepare('UPDATE billing_events SET processed_at = NOW(), error = ? WHERE provider_event_id = ?')
       ->execute([$erreur, $ev['id']]);
    if ($erreur !== null) { error_log('[NeedHelpApp] webhook ' . $ev['id'] . ' : ' . $erreur); }
    http_response_code(200);
    exit($message);
}

/**
 * Retrouve le compte concerné, dans cet ordre de fiabilité :
 *   1. les métadonnées posées au départ du paiement ;
 *   2. l'identifiant de payeur déjà connu chez nous ;
 *   3. l'adresse e-mail, en dernier recours.
 */
function trouver_compte(array $objet): ?int {
    global $db;

    $id = $objet['metadata']['account_id'] ?? null;
    if ($id) {
        $st = $db->prepare('SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL');
        $st->execute([(int)$id]);
        if ($v = $st->fetchColumn()) { return (int)$v; }
    }

    $client = is_array($objet['customer'] ?? null) ? ($objet['customer']['id'] ?? null) : ($objet['customer'] ?? null);
    if ($client) {
        $st = $db->prepare(
            'SELECT payer_account_id FROM subscriptions
             WHERE provider = "stripe" AND provider_customer_id = ? ORDER BY updated_at DESC LIMIT 1'
        );
        $st->execute([$client]);
        if ($v = $st->fetchColumn()) { return (int)$v; }
    }

    foreach ([$objet['customer_email'] ?? null,
              $objet['customer_details']['email'] ?? null] as $mail) {
        if (!$mail) { continue; }
        $st = $db->prepare('SELECT id FROM accounts WHERE email = ? AND deleted_at IS NULL');
        $st->execute([nha_normalise_email((string)$mail)]);
        if ($v = $st->fetchColumn()) { return (int)$v; }
    }
    return null;
}

$objet = $ev['data']['object'] ?? [];
$type  = (string)($ev['type'] ?? '');

switch ($type) {

    case 'checkout.session.completed':
        $abonnementId = $objet['subscription'] ?? null;
        if (!$abonnementId) { terminer('paiement ponctuel, ignoré'); }
        $compteId = trouver_compte($objet);
        if (!$compteId) { terminer('compte introuvable', 'aucun compte pour la session ' . ($objet['id'] ?? '?')); }

        // On relit l'abonnement plutôt que de se fier à la session : c'est
        // lui qui porte le statut, la période et le tarif réellement souscrit.
        $abo = stripe_api('GET', 'subscriptions/' . $abonnementId, ['expand' => ['items.data.price']]);
        stripe_enregistrer_abonnement($abo, $compteId, (string)($objet['metadata']['app'] ?? 'portail'));
        nha_log($compteId, 'plan_change', 'checkout terminé');
        terminer('abonnement enregistré');

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
        $compteId = trouver_compte($objet);
        if (!$compteId) { terminer('compte introuvable', 'abonnement ' . ($objet['id'] ?? '?')); }
        stripe_enregistrer_abonnement($objet, $compteId, (string)($objet['metadata']['app'] ?? 'portail'));
        nha_log($compteId, 'plan_change', $type . ' → ' . stripe_statut((string)($objet['status'] ?? '')));
        terminer('abonnement mis à jour');

    case 'invoice.paid':
    case 'invoice.payment_failed':
        // La facture ne porte pas l'état de l'abonnement : on le relit.
        $abonnementId = $objet['subscription']
            ?? ($objet['parent']['subscription_details']['subscription'] ?? null);
        if (!$abonnementId) { terminer('facture sans abonnement, ignorée'); }
        $abo = stripe_api('GET', 'subscriptions/' . $abonnementId, ['expand' => ['items.data.price']]);
        $compteId = trouver_compte($abo) ?? trouver_compte($objet);
        if (!$compteId) { terminer('compte introuvable', 'facture ' . ($objet['id'] ?? '?')); }
        stripe_enregistrer_abonnement($abo, $compteId);
        nha_log($compteId, 'plan_change', $type);
        terminer('facture traitée');

    default:
        terminer('événement ignoré');
}
