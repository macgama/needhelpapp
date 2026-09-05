<?php
/**
 * Diagnostic d'installation. Protégé par le jeton défini dans config/nha.php.
 *
 *   https://needhelpapp.com/diagnostic.php?jeton=VOTRE_JETON
 *
 * Vide 'diagnostic_jeton' dans la configuration = page désactivée.
 * Supprimez ce fichier une fois la mise en ligne stabilisée.
 */
declare(strict_types=1);
require __DIR__ . '/includes/http.php';
require_once __DIR__ . '/includes/mailer.php';

$attendu = (string)nha_config('diagnostic_jeton', '');
if ($attendu === '' || !hash_equals($attendu, (string)($_GET['jeton'] ?? ''))) {
    http_response_code(404);
    exit('Introuvable.');
}

$tests = [];
function verif(string $nom, callable $f): void {
    global $tests;
    try {
        [$etat, $detail] = $f();
    } catch (Throwable $e) {
        [$etat, $detail] = ['echec', get_class($e) . ' : ' . $e->getMessage()];
    }
    $tests[] = ['nom' => $nom, 'etat' => $etat, 'detail' => $detail];
}

verif('Version de PHP', function () {
    $ok = version_compare(PHP_VERSION, '8.1', '>=');
    return [$ok ? 'ok' : 'echec', PHP_VERSION . ($ok ? '' : ' — il faut au moins 8.1')];
});

verif('Extensions requises', function () {
    $manquantes = array_values(array_filter(['pdo_mysql', 'mbstring', 'curl', 'openssl', 'json'],
        fn($e) => !extension_loaded($e)));
    return [$manquantes ? 'echec' : 'ok',
            $manquantes ? 'manquantes : ' . implode(', ', $manquantes) : 'toutes présentes'];
});

verif('Connexion à la base', function () {
    $v = nha_db()->query('SELECT VERSION()')->fetchColumn();
    return ['ok', nha_config('db_core') . ' sur ' . nha_config('db_host') . ' — MySQL ' . $v];
});

verif('Tables du socle', function () {
    $attendues = ['accounts', 'identities', 'sessions', 'action_tokens', 'login_attempts',
                  'apps', 'app_users', 'subscriptions', 'subscription_seats',
                  'billing_events', 'ideas', 'audit_log'];
    $presentes = nha_db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $manquantes = array_values(array_diff($attendues, $presentes));
    return [$manquantes ? 'echec' : 'ok',
            $manquantes ? 'manquantes : ' . implode(', ', $manquantes)
                        : count($attendues) . ' tables présentes'];
});

verif('Comptes migrés', function () {
    $n = nha_db()->query('SELECT COUNT(*) FROM accounts')->fetchColumn();
    $detail_apps = [];
    $a = nha_db()->query('SELECT COUNT(*) FROM apps')->fetchColumn();
    // le détail compte : une application absente empêche ses utilisateurs
    // d'ouvrir une session depuis son sous-domaine
    foreach (nha_db()->query('SELECT code, name FROM apps ORDER BY position') as $ap) {
        $detail_apps[] = $ap['code'];
    }
    return [$n > 0 ? 'ok' : 'attention',
            "$n compte(s) · applications déclarées : "
            . (count($detail_apps) ? implode(', ', $detail_apps) : 'AUCUNE')];
});

/* Une application absente de la table « apps » empêche ses utilisateurs
   d'ouvrir une session depuis son sous-domaine : nha_start_session() y
   inscrit created_app_id. Le symptôme est trompeur — la connexion vaut
   du portail vers l'application, jamais l'inverse. */
verif('Sous-domaines branchés', function () {
    $attendus = ['portail', 'teaching'];
    $codes = nha_db()->query('SELECT code FROM apps')->fetchAll(PDO::FETCH_COLUMN);
    $manque = array_values(array_diff($attendus, $codes));
    if (!$manque) {
        return ['ok', 'toutes les applications connues sont déclarées'];
    }
    return ['echec', 'absente(s) de la table apps : ' . implode(', ', $manque)
          . ' — exécutez sql/applications.sql'];
});

verif('HTTPS', function () {
    return [nha_https() ? 'ok' : 'echec',
            nha_https() ? 'la requête est chiffrée'
                        : 'la page est servie en clair : les cookies Secure ne seront pas posés'];
});

verif('Domaine des cookies', function () {
    $d = nha_cookie_domaine();
    return [$d === '.needhelpapp.com' ? 'ok' : 'attention',
            $d === '' ? 'hôte « ' . ($_SERVER['HTTP_HOST'] ?? '?') . ' » : cookie limité à cet hôte, '
                      . 'la connexion ne sera pas partagée entre sous-domaines'
                      : $d];
});

verif('Cookie CSRF reçu', function () {
    $j = $_COOKIE[NHA_CSRF_COOKIE] ?? '';
    return [$j !== '' ? 'ok' : 'attention',
            $j !== '' ? 'présent' : 'absent — rechargez cette page une fois, il est posé à la volée'];
});
csrf_cookie();

verif('Configuration SMTP', function () {
    if (!smtp_configure()) {
        return ['attention', 'smtp_hote ou smtp_pass est vide : les envois retombent sur mail(), '
            . 'qui est filtré chez Infomaniak. Renseignez le bloc SMTP.'];
    }
    if (nha_config('smtp_user') !== nha_config('mail_expediteur')) {
        return ['echec', 'smtp_user (' . nha_config('smtp_user') . ') diffère de mail_expediteur ('
            . nha_config('mail_expediteur') . '). En envoi authentifié, Infomaniak refuse '
            . 'un expéditeur différent du compte qui s\'authentifie.'];
    }
    return ['ok', nha_config('smtp_hote') . ':' . nha_config('smtp_port')
        . ' en ' . nha_config('smtp_chiffrement') . ', expéditeur ' . nha_config('smtp_user')];
});

verif('Envoi d\'e-mail', function () {
    $dest = (string)nha_config('mail_contact', '');
    if ($dest === '') { return ['attention', 'mail_contact n\'est pas renseigné']; }
    if (!isset($_GET['tester_mail'])) {
        return ['info', 'ajoutez &tester_mail=1 à l\'adresse pour envoyer un message de test à ' . $dest];
    }
    $corps = "Test envoyé depuis diagnostic.php le " . date('d.m.Y H:i') . ".\n";
    if (smtp_configure()) {
        $dialogue = null;
        $debut = microtime(true);
        $ok = smtp_envoyer($dest, 'Test NeedHelpApp', $corps, null, $dialogue);
        $duree = round(microtime(true) - $debut, 1);
        // Le dialogue SMTP complet dit exactement où ça bloque.
        return [$ok ? 'ok' : 'echec',
            ($ok ? "accepté par le serveur en {$duree}s, à destination de $dest — vérifiez la boîte ET les indésirables"
                 : "refusé après {$duree}s. Dialogue :\n" . trim((string)$dialogue))];
    }
    $ok = nha_mail($dest, 'Test NeedHelpApp', $corps);
    return [$ok ? 'attention' : 'echec', $ok
        ? "mail() a accepté le message, mais sans authentification : il finira probablement en indésirable"
        : 'mail() a refusé le message. Configurez le SMTP.'];
});

verif('Configuration Stripe', function () {
    $s = (string)nha_config('stripe_secret', '');
    if ($s === '') { return ['info', 'aucune clé : le site reste entièrement gratuit']; }
    $manque = array_values(array_filter(['stripe_prix_mensuel', 'stripe_prix_annuel', 'stripe_webhook_secret'],
        fn($k) => nha_config($k, '') === ''));
    $mode = str_starts_with($s, 'sk_live_') ? 'PRODUCTION' : 'test';
    if ($manque) { return ['echec', "mode $mode, mais il manque : " . implode(', ', $manque)]; }
    $prix = nha_config('stripe_prix_mensuel');
    if (!str_starts_with((string)$prix, 'price_')) {
        return ['echec', 'stripe_prix_mensuel ne commence pas par price_ : ce n\'est pas un identifiant de tarif'];
    }
    return ['ok', "mode $mode, tarifs et secret de webhook renseignés"];
});

verif('Connexion Google', function () {
    $id = (string)nha_config('google_client_id', '');
    if ($id === '') { return ['info', 'non configurée : le bouton Google n\'est pas affiché']; }
    return [str_ends_with($id, '.apps.googleusercontent.com') ? 'ok' : 'echec',
            str_ends_with($id, '.apps.googleusercontent.com')
              ? 'identifiant client valide en apparence'
              : 'cet identifiant ne ressemble pas à un client OAuth Google'];
});

verif('Cohérence du socle', function () {
    // Trois fichiers, trois marqueurs qui doivent coïncider. C'est le
    // contrôle qui repère un dépôt FTP à moitié fait.
    $v = [
        'nha-core.php' => defined('NHA_BUILD_CORE')   ? NHA_BUILD_CORE   : null,
        'http.php'     => defined('NHA_BUILD_HTTP')   ? NHA_BUILD_HTTP   : null,
        'mailer.php'   => defined('NHA_BUILD_MAILER') ? NHA_BUILD_MAILER : null,
    ];
    $vieux = array_keys(array_filter($v, fn($x) => $x === null));
    if ($vieux) {
        return ['echec', 'version inconnue pour : ' . implode(', ', $vieux)
            . ' — ces fichiers datent d\'avant le suivi de version, redéposez tout includes/'];
    }
    if (count(array_unique($v)) > 1) {
        $detail = [];
        foreach ($v as $f => $x) { $detail[] = "$f = $x"; }
        return ['echec', 'versions différentes : ' . implode(' | ', $detail)
            . ' — dépôt FTP incomplet, redéposez tout includes/'];
    }
    return ['ok', 'les trois fichiers sont en version ' . reset($v)];
});

verif('Fichiers déposés', function () {
    // Un dépôt FTP incomplet est la panne la plus fréquente et la plus
    // déroutante : les pages s'affichent, mais les formulaires échouent.
    $requis = [
        'api/ping.php', 'api/idees.php', 'api/contact.php', 'api/connexion.php',
        'api/inscription.php', 'api/mot-de-passe-oublie.php', 'api/reinitialiser.php',
        'api/profil.php', 'api/sessions.php', 'api/moi.php', 'api/export.php',
        'api/supprimer.php', 'api/google.php', 'api/paiement.php', 'api/stripe.php',
        'includes/nha-core.php', 'includes/http.php', 'includes/stripe.php',
        'includes/mailer.php', 'api/ping.php',
        'partials/page.php', 'partials/google.php',
        'assets/nha.css', 'assets/nha.js', 'assets/google.js',
    ];
    $manquants = array_values(array_filter($requis, fn($f) => !is_file(__DIR__ . '/' . $f)));
    return [$manquants ? 'echec' : 'ok',
            $manquants ? 'absents du serveur : ' . implode(', ', $manquants)
                       : count($requis) . ' fichiers présents'];
});

verif('Polices auto-hébergées', function () {
    $f = ['newsreader.woff2', 'newsreader-italic.woff2', 'public-sans.woff2'];
    $manquantes = array_values(array_filter($f, fn($n) => !is_file(__DIR__ . '/assets/fonts/' . $n)));
    return [$manquantes ? 'attention' : 'ok',
            $manquantes ? 'absentes : ' . implode(', ', $manquantes)
                        . ' — le site utilise les polices système en attendant'
                        : 'les trois fichiers sont là'];
});

verif('Journal des erreurs', function () {
    $f = ini_get('error_log');
    return ['info', $f ?: 'non défini — les erreurs vont dans le journal du serveur'];
});

$couleurs = ['ok' => '#1B6547', 'attention' => '#A0521A', 'echec' => '#8E2A2A', 'info' => '#5B5470'];
$symboles = ['ok' => '✓', 'attention' => '!', 'echec' => '✗', 'info' => 'i'];
header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Diagnostic — NeedHelpApp</title>
<link rel="stylesheet" href="/assets/nha.css">
</head><body>
<main id="contenu"><section class="doc"><div class="enveloppe lecture">
  <h1>Diagnostic</h1>
  <p class="date-maj"><?= date('d.m.Y H:i') ?> — <?= htmlspecialchars($_SERVER['HTTP_HOST'] ?? '') ?></p>
  <table>
    <?php foreach ($tests as $t): ?>
      <tr>
        <td style="width:2rem;color:<?= $couleurs[$t['etat']] ?>;font-weight:600"><?= $symboles[$t['etat']] ?></td>
        <th style="width:14rem"><?= htmlspecialchars($t['nom']) ?></th>
        <td style="white-space:pre-wrap;font-size:.875rem"><?= htmlspecialchars($t['detail']) ?></td>
      </tr>
    <?php endforeach; ?>
  </table>
  <p style="color:#5B5470;font-size:.9375rem">Supprimez ce fichier du serveur une fois l'installation stabilisée.</p>
</div></section></main>
</body></html>
