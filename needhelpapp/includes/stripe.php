<?php
/**
 * Client Stripe minimal, en cURL.
 *
 * Pas de Composer : l'hébergement mutualisé Infomaniak n'en a pas besoin ici,
 * et trois appels d'API ne justifient pas une bibliothèque de 3 Mo. Si le
 * projet grossit, la bascule vers stripe/stripe-php ne touchera que ce fichier.
 */

declare(strict_types=1);
require_once __DIR__ . '/nha-core.php';

/**
 * Version d'API épinglée.
 *
 * Épingler évite qu'une mise à jour du compte Stripe change la forme des
 * réponses sous vos pieds. Depuis la version basil du 31 mars 2025,
 * current_period_end n'est plus sur l'abonnement mais sur chacun de ses
 * items : le code ci-dessous lit les deux emplacements, mais l'épinglage
 * reste la protection principale.
 */
/**
 * La version de l'API Stripe.
 *
 * Elle décide de ce qui est possible, et pas seulement de la forme des
 * réponses. TWINT en paiement RÉCURRENT n'existe qu'à partir de
 * « 2026-05-27.dahlia » : avec une version antérieure, il n'apparaît
 * simplement pas dans la page de paiement, sans le moindre message.
 *
 * Elle se règle dans config/nha.php, pour pouvoir la relever sans
 * toucher au code.
 */
const STRIPE_VERSION_DEFAUT = '2026-05-27.dahlia';

function stripe_version(): string {
    $v = (string) nha_config('stripe_version', '');
    return $v !== '' ? $v : STRIPE_VERSION_DEFAUT;
}

function stripe_configure(): bool {
    return nha_config('stripe_secret', '') !== ''
        && nha_config('stripe_prix_mensuel', '') !== ''
        && nha_config('stripe_prix_annuel', '') !== '';
}

/**
 * Appel de l'API Stripe. $params est encodé en form-urlencoded, comme
 * l'attend Stripe (les tableaux imbriqués deviennent a[b][c]=valeur).
 *
 * @throws RuntimeException si Stripe renvoie une erreur ou si le réseau lâche.
 */
function stripe_api(string $methode, string $chemin, array $params = []): array {
    $cle = (string)nha_config('stripe_secret', '');
    if ($cle === '') { throw new RuntimeException('Aucune clé Stripe configurée.'); }

    $url = 'https://api.stripe.com/v1/' . ltrim($chemin, '/');
    $corps = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    if ($methode === 'GET' && $corps !== '') { $url .= '?' . $corps; }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $methode,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $cle,
            'Stripe-Version: ' . stripe_version(),
            'Content-Type: application/x-www-form-urlencoded',
        ],
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($methode !== 'GET') { curl_setopt($ch, CURLOPT_POSTFIELDS, $corps); }

    $reponse = curl_exec($ch);
    $code    = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erreur  = curl_error($ch);
    curl_close($ch);

    if ($reponse === false) {
        throw new RuntimeException('Stripe injoignable : ' . $erreur);
    }
    $data = json_decode((string)$reponse, true);
    if (!is_array($data)) {
        throw new RuntimeException('Réponse Stripe illisible (HTTP ' . $code . ').');
    }
    if ($code >= 400) {
        $m = $data['error']['message'] ?? 'erreur inconnue';
        throw new RuntimeException('Stripe (' . $code . ') : ' . $m);
    }
    return $data;
}

/**
 * Vérifie l'en-tête Stripe-Signature.
 *
 * Sans cette vérification, n'importe qui pourrait appeler votre webhook et
 * s'offrir un abonnement à vie. Le contrôle de fraîcheur (5 minutes) empêche
 * de rejouer un appel intercepté.
 */
function stripe_signature_valide(string $corps, string $entete, string $secret, int $tolerance = 300): bool {
    if ($secret === '' || $entete === '') { return false; }

    $horodatage = null; $signatures = [];
    foreach (explode(',', $entete) as $partie) {
        [$k, $v] = array_pad(explode('=', trim($partie), 2), 2, '');
        if ($k === 't') { $horodatage = $v; }
        if ($k === 'v1') { $signatures[] = $v; }
    }
    if ($horodatage === null || !$signatures) { return false; }
    if (abs(time() - (int)$horodatage) > $tolerance) { return false; }

    $attendue = hash_hmac('sha256', $horodatage . '.' . $corps, $secret);
    foreach ($signatures as $s) {
        if (hash_equals($attendue, $s)) { return true; }
    }
    return false;
}

/**
 * Date de fin de période d'un abonnement Stripe, quelle que soit la version
 * d'API. Depuis basil (mars 2025) l'information est portée par les items.
 */
function stripe_fin_periode(array $abonnement): ?string {
    $ts = $abonnement['items']['data'][0]['current_period_end']
       ?? $abonnement['current_period_end']
       ?? null;
    return $ts ? date('Y-m-d H:i:s', (int)$ts) : null;
}

/** Périodicité déduite du tarif : 'mensuel' ou 'annuel'. */
function stripe_periodicite(array $abonnement): string {
    $prix = $abonnement['items']['data'][0]['price']['id'] ?? '';
    if ($prix !== '' && $prix === nha_config('stripe_prix_annuel', '')) { return 'annuel'; }
    $intervalle = $abonnement['items']['data'][0]['price']['recurring']['interval'] ?? 'month';
    return $intervalle === 'year' ? 'annuel' : 'mensuel';
}

/** Traduit un statut Stripe en statut de la table subscriptions. */
function stripe_statut(string $statut): string {
    return match ($statut) {
        'trialing'           => 'essai',
        'active'             => 'actif',
        'past_due', 'unpaid' => 'impaye',
        'canceled'           => 'resilie',
        default              => 'expire',
    };
}

/**
 * Enregistre ou met à jour un abonnement Stripe dans la base centrale,
 * puis rafraîchit le cache de droits de tous ses bénéficiaires.
 *
 * C'est le point unique par lequel passe TOUTE modification d'abonnement,
 * quelle que soit l'application où l'achat a eu lieu.
 */
function stripe_enregistrer_abonnement(array $abo, int $accountId, string $venduPar = 'portail'): int {
    $db = nha_db();

    $db->prepare(
        'INSERT INTO subscriptions
           (payer_account_id, scope, sold_by_app_id, plan, period, status, seats,
            started_at, current_period_end, cancel_at, ended_at,
            provider, provider_customer_id, provider_subscription_id)
         VALUES (?, "all", (SELECT id FROM apps WHERE code = ?), ?, ?, ?, ?,
                 FROM_UNIXTIME(?), ?, ?, ?, "stripe", ?, ?)
         ON DUPLICATE KEY UPDATE
           plan = VALUES(plan), period = VALUES(period), status = VALUES(status),
           seats = VALUES(seats), current_period_end = VALUES(current_period_end),
           cancel_at = VALUES(cancel_at), ended_at = VALUES(ended_at),
           provider_customer_id = VALUES(provider_customer_id)'
    )->execute([
        $accountId,
        $venduPar,
        (string)nha_config('plan_paye', 'complet'),
        stripe_periodicite($abo),
        stripe_statut((string)($abo['status'] ?? '')),
        /* Le nombre de places.
           La quantité Stripe vaut 1 pour un abonnement ordinaire, ce qui
           ne laisserait aucune place à partager. Le foyer est pourtant
           l'unité qui compte : un abonnement paie un service, pas une
           personne. On prend donc le plus grand des deux — la quantité
           facturée, ou les places incluses dans la formule. */
        max((int)($abo['items']['data'][0]['quantity'] ?? 1),
            (int)nha_config('places_incluses', 5)),
        (int)($abo['start_date'] ?? time()),
        stripe_fin_periode($abo),
        !empty($abo['cancel_at']) ? date('Y-m-d H:i:s', (int)$abo['cancel_at'])
            : (!empty($abo['cancel_at_period_end']) ? stripe_fin_periode($abo) : null),
        !empty($abo['ended_at']) ? date('Y-m-d H:i:s', (int)$abo['ended_at']) : null,
        is_array($abo['customer'] ?? null) ? ($abo['customer']['id'] ?? null) : ($abo['customer'] ?? null),
        $abo['id'] ?? null,
    ]);

    $st = $db->prepare('SELECT id FROM subscriptions WHERE provider = "stripe" AND provider_subscription_id = ?');
    $st->execute([$abo['id'] ?? null]);
    $subId = (int)$st->fetchColumn();

    // Le payeur est toujours bénéficiaire de son propre abonnement.
    $db->prepare(
        'INSERT INTO subscription_seats (subscription_id, account_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE removed_at = NULL'
    )->execute([$subId, $accountId]);

    $st = $db->prepare('SELECT account_id FROM subscription_seats WHERE subscription_id = ? AND removed_at IS NULL');
    $st->execute([$subId]);
    foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $benef) {
        nha_refresh_cache((int)$benef);
    }
    return $subId;
}
