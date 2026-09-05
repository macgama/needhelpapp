<?php
declare(strict_types=1);

/**
 * Notifications du prestataire de paiement.
 *
 * C'est le SEUL endroit où un abonnement s'ouvre ou se ferme. Le retour de
 * l'utilisateur sur la page « merci » ne prouve rien : il peut être fabriqué,
 * rejoué, ou ne jamais arriver si le navigateur est fermé au mauvais moment.
 * Seul ce message signé par le prestataire fait foi.
 *
 * À déclarer chez Stripe : https://votre-site/api/stripe.php
 * Évènements utiles : checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.payment_failed.
 */

require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$secret = (string) (config()['stripe_webhook_secret'] ?? '');
if ($secret === '') {
    error_log('[dictee] stripe_webhook_secret absent de config.php');
    http_response_code(500);
    echo 'non configuré';
    exit;
}

$corps  = (string) file_get_contents('php://input');
$entete = (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

if (!stripeSignatureValide($corps, $entete, $secret)) {
    error_log('[dictee] notification de paiement rejetée : signature invalide');
    http_response_code(400);
    echo 'signature invalide';
    exit;
}

$evenement = json_decode($corps, true);
if (!is_array($evenement) || empty($evenement['id']) || empty($evenement['type'])) {
    http_response_code(400);
    echo 'message illisible';
    exit;
}

$objet = $evenement['data']['object'] ?? [];
$type  = (string) $evenement['type'];

/** Retrouve le compte concerné, par l'identifiant transmis puis par le payeur. */
function trouverCompte(array $objet): ?array
{
    $id = $objet['client_reference_id']
        ?? ($objet['metadata']['user_id'] ?? null);
    if ($id) {
        $st = db()->prepare('SELECT id, email, name FROM users WHERE id = ?');
        $st->execute([(int) $id]);
        $u = $st->fetch();
        if ($u) {
            return $u;
        }
    }
    $payeur = $objet['customer'] ?? null;
    if ($payeur) {
        $st = db()->prepare('SELECT id, email, name FROM users WHERE payeur_id = ?');
        $st->execute([(string) $payeur]);
        $u = $st->fetch();
        if ($u) {
            return $u;
        }
    }
    return null;
}

function planDepuisPrix(array $objet): string
{
    $c = config();
    $prix = $objet['items']['data'][0]['price']['id'] ?? null;
    if ($prix && $prix === ($c['stripe_prix_annuel'] ?? null)) {
        return 'annuel';
    }
    if ($prix && $prix === ($c['stripe_prix_mensuel'] ?? null)) {
        return 'mensuel';
    }
    return 'mensuel';
}

try {
    // un même message rejoué ne doit être traité qu'une fois
    $st = db()->prepare('INSERT INTO billing_events (event_id, type, resume) VALUES (?, ?, ?)');
    try {
        $st->execute([(string) $evenement['id'], $type, '']);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            echo 'déjà traité';
            exit;
        }
        throw $e;
    }

    $compte = trouverCompte(is_array($objet) ? $objet : []);
    $resume = '';

    if ($type === 'checkout.session.completed') {
        if ($compte) {
            $payeur = (string) ($objet['customer'] ?? '');
            $abo    = (string) ($objet['subscription'] ?? '');
            db()->prepare('UPDATE users SET payeur_id = ?, abonnement_id = ? WHERE id = ?')
                ->execute([$payeur ?: null, $abo ?: null, $compte['id']]);
            // on ouvre l'accès sans attendre le message suivant
            appliquerAbonnement((int) $compte['id'], $payeur, $abo);
            $resume = 'paiement accepté';
        }
    } elseif ($type === 'customer.subscription.updated' || $type === 'customer.subscription.created') {
        if ($compte) {
            $statutStripe = (string) ($objet['status'] ?? '');
            $fin = finDePeriode(is_array($objet) ? $objet : []);
            $resilie = !empty($objet['cancel_at_period_end']);

            $statut = 'aucun';
            if ($statutStripe === 'active' || $statutStripe === 'trialing') {
                $statut = $resilie ? 'resilie' : 'actif';
            } elseif ($statutStripe === 'past_due' || $statutStripe === 'unpaid') {
                $statut = 'impaye';
            }

            db()->prepare('UPDATE users SET plan = ?, plan_statut = ?, plan_fin = ?, abonnement_id = ?, payeur_id = COALESCE(payeur_id, ?) WHERE id = ?')
                ->execute([
                    planDepuisPrix(is_array($objet) ? $objet : []),
                    $statut,
                    $fin ? date('Y-m-d H:i:s', $fin) : null,
                    (string) ($objet['id'] ?? '') ?: null,
                    (string) ($objet['customer'] ?? '') ?: null,
                    $compte['id'],
                ]);
            $resume = 'abonnement ' . $statut;
        }
    } elseif ($type === 'customer.subscription.deleted') {
        if ($compte) {
            $st = db()->prepare('SELECT plan_statut, plan_fin, name FROM users WHERE id = ?');
            $st->execute([$compte['id']]);
            $avant = $st->fetch() ?: [];
            db()->prepare("UPDATE users SET plan = 'gratuit', plan_statut = 'aucun', plan_fin = NULL WHERE id = ?")
                ->execute([$compte['id']]);
            // arrêt sans résiliation préalable : la personne n'a rien reçu, on l'informe
            if (($avant['plan_statut'] ?? '') === 'actif') {
                mailResiliation((string) $compte['email'], (string) ($avant['name'] ?? ''), $avant['plan_fin'] ?? null);
            }
            $resume = 'abonnement terminé';
        }
    } elseif ($type === 'invoice.payment_failed') {
        if ($compte) {
            db()->prepare("UPDATE users SET plan_statut = 'impaye' WHERE id = ?")->execute([$compte['id']]);
            $resume = 'paiement refusé';
        }
    } else {
        $resume = 'ignoré';
    }

    db()->prepare('UPDATE billing_events SET user_id = ?, resume = ? WHERE event_id = ?')
        ->execute([$compte['id'] ?? null, u_cut($resume, 255), (string) $evenement['id']]);

    echo 'ok';
} catch (Throwable $e) {
    error_log('[dictee] notification de paiement : ' . $e->getMessage());
    http_response_code(500);   // le prestataire réessaiera
    echo 'erreur interne';
}
