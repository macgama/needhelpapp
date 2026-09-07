<?php
/**
 * Pourquoi TWINT n'apparaît-il pas ?
 *
 * Trois conditions doivent être réunies, et aucune ne se signale quand
 * elle manque : la page de paiement se contente de ne pas le proposer.
 * Cette page les vérifie une par une.
 *
 *   https://needhelpapp.com/api/stripe-test.php?jeton=…
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../includes/stripe.php';

header('Content-Type: text/plain; charset=utf-8');

$attendu = (string) nha_config('diagnostic_jeton', '');
$compte = nha_current_account();
$admin = $compte && ($compte['role'] ?? '') === 'admin';
if (!$admin && ($attendu === '' || ($_GET['jeton'] ?? '') !== $attendu)) {
    http_response_code(403);
    echo "Réservé aux administrateurs, ou au jeton de diagnostic.\n";
    exit;
}

$echecs = 0;
function ligne(string $etat, string $texte): void {
    global $echecs;
    if ($etat === 'ÉCHEC') { $echecs++; }
    echo str_pad($etat, 9) . $texte . "\n";
}
function aide(string $t): void {
    foreach (explode("\n", wordwrap($t, 68)) as $l) { echo '         ' . $l . "\n"; }
}

echo "TWINT et les moyens de paiement\n===============================\n\n";

/* ---------- 1. la version de l'API ---------- */
$version = stripe_version();
$assezRecent = strcmp(substr($version, 0, 10), '2026-05-27') >= 0;
ligne($assezRecent ? 'OK' : 'ÉCHEC', 'version de l\'API : ' . $version);
if (!$assezRecent) {
    aide('TWINT en paiement RÉCURRENT n\'existe qu\'à partir de '
       . '« 2026-05-27.dahlia ». Avec une version antérieure, Stripe ne le '
       . 'propose pas, et rien ne dit pourquoi. Mettez dans config/nha.php :');
    aide('');
    aide("    'stripe_version' => '2026-05-27.dahlia',");
}

/* ---------- 2. la clé ---------- */
$cle = (string) nha_config('stripe_secret', '');
ligne($cle !== '' ? 'OK' : 'ÉCHEC', 'clé secrète : '
    . ($cle === '' ? 'absente' : substr($cle, 0, 8) . '… (' . (str_starts_with($cle, 'sk_live') ? 'production' : 'test') . ')'));

/* ---------- 3. la devise du tarif ---------- */
foreach (['mensuel' => 'stripe_prix_mensuel', 'annuel' => 'stripe_prix_annuel'] as $nom => $cle_cfg) {
    $prix = (string) nha_config($cle_cfg, '');
    if ($prix === '') { ligne('ATTENTION', 'tarif ' . $nom . ' : non configuré'); continue; }
    try {
        $p = stripe_api('GET', 'prices/' . $prix);
        $devise = strtoupper((string) ($p['currency'] ?? ''));
        $recurrent = isset($p['recurring']);
        $ok = ($devise === 'CHF') && $recurrent;
        ligne($ok ? 'OK' : 'ÉCHEC', 'tarif ' . $nom . ' : ' . $devise
            . ($recurrent ? ' · récurrent ' . ($p['recurring']['interval'] ?? '?') : ' · PONCTUEL'));
        if ($devise !== 'CHF') {
            aide('TWINT n\'accepte que le franc suisse. Un tarif en euros ne '
               . 'le fera jamais apparaître.');
        }
    } catch (Throwable $e) {
        ligne('ÉCHEC', 'tarif ' . $nom . ' : ' . $e->getMessage());
    }
}

/* ---------- 4. ce que le compte Stripe autorise ---------- */
try {
    $conf = stripe_api('GET', 'payment_method_configurations');
    $trouve = false;
    foreach (($conf['data'] ?? []) as $c) {
        $twint = $c['twint'] ?? null;
        if ($twint) {
            $trouve = true;
            $actif = ($twint['display_preference']['value'] ?? 'off') !== 'off';
            ligne($actif ? 'OK' : 'ÉCHEC',
                'TWINT dans « ' . ($c['name'] ?? 'configuration') . ' » : '
                . ($actif ? 'activé' : 'DÉSACTIVÉ'));
            if (!$actif) {
                aide('Activez-le dans Stripe → Paramètres → Moyens de paiement.');
            }
        }
    }
    if (!$trouve) {
        ligne('ÉCHEC', 'TWINT n\'apparaît dans aucune configuration de moyens de paiement');
        aide('Stripe → Paramètres → Moyens de paiement → TWINT. Il n\'est '
           . 'proposé qu\'aux comptes dont l\'entreprise est en Suisse ou au '
           . 'Liechtenstein.');
    }
} catch (Throwable $e) {
    ligne('ATTENTION', 'moyens de paiement illisibles : ' . $e->getMessage());
    aide('Ce n\'est pas forcément grave : certaines clés n\'ont pas le droit '
       . 'de lire cette ressource. Vérifiez à la main dans le tableau de bord.');
}

/* ---------- 5. les mentions légales ---------- */
$pages = ['mentions-legales.php', 'conditions.php'];
foreach ($pages as $p) {
    $chemin = __DIR__ . '/../' . $p;

    /* Un fichier absent donnait un contenu vide, donc zéro crochet, donc
       « complète » : le contrôle passait au vert précisément dans le cas
       le plus grave. L'absence se dit maintenant avant tout le reste. */
    if (!is_file($chemin)) {
        ligne('ÉCHEC', $p . ' : la page est absente du serveur');
        aide('Elle est pourtant liée depuis le pied de page de chaque page '
           . 'et depuis la case à cocher de l\'inscription : le visiteur '
           . 'tombe sur une erreur 404 au moment où il accepte les '
           . 'conditions. Déposez le fichier, puis rappelez cette page.');
        continue;
    }

    $contenu  = (string) file_get_contents($chemin);
    $crochets = preg_match_all('/\[[^\]]{3,60}\]/', $contenu);
    ligne($crochets === 0 ? 'OK' : 'ÉCHEC', $p . ' : '
        . ($crochets === 0 ? 'complète' : $crochets . ' champ(s) encore entre crochets'));
    if ($crochets > 0) {
        aide('Stripe refuse TWINT tant que les mentions légales sont '
           . 'incomplètes : raison sociale, adresse, contact, TVA.');
    }
}

echo "\n";
echo $echecs === 0
    ? "Tout est en place. Si TWINT n'apparaît toujours pas, vérifiez que le\n"
    . "navigateur d'essai n'est pas hors de Suisse : Stripe adapte la liste\n"
    . "des moyens de paiement au pays de l'acheteur.\n"
    : $echecs . " point(s) à corriger. Reprenez le premier ÉCHEC.\n";
echo "\nSupprimez ce fichier une fois le problème résolu.\n";
