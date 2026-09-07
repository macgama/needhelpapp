<?php
/**
 * Diagnostic du rattachement au portail NeedHelpApp.
 *
 * À ouvrir depuis un navigateur OÙ VOUS ÊTES DÉJÀ CONNECTÉ sur
 * needhelpapp.com :
 *
 *     https://teaching.needhelpapp.com/api/portail-test.php?cle=…
 *
 * La clé est celle de 'maintenance_token' dans api/config.php.
 *
 * Il suit la chaîne dans l'ordre où elle peut rompre, et s'arrête au
 * premier maillon cassé plutôt que d'enchaîner des erreurs sans rapport.
 *
 * Aucun secret n'est affiché : les mots de passe et les clés sont
 * seulement décrits comme présents ou absents.
 */

declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

/* ---------------------------------------------------------------
   Qui a le droit d'ouvrir cette page

   Ce diagnostic décrit l'installation : présence des fichiers du
   socle, état de la configuration, tables de la base centrale. Rien
   de secret n'y est imprimé, mais l'ensemble dessine l'intérieur du
   serveur, et il n'y a aucune raison de l'offrir à qui passe.

   La clé est celle de 'maintenance_token' dans api/config.php, comme
   pour api/migrer.php. Elle est lue directement du fichier, sans
   passer par db.php : ce script doit rester capable de diagnostiquer
   une installation où le socle du portail manque encore.

   Pas de clé configurée = page fermée. C'est l'état normal une fois
   la mise en ligne stabilisée, et la même règle que diagnostic.php
   côté portail.

   config.php est relu plus bas par db.php : il doit rester un simple
   « return [...] », sans define() ni déclaration de fonction.
   --------------------------------------------------------------- */
$conf = is_file(__DIR__ . '/config.php') ? (array) require __DIR__ . '/config.php' : [];
$cle  = (string) ($conf['maintenance_token'] ?? '');
if ($cle === '' || !hash_equals($cle, (string) ($_GET['cle'] ?? ''))) {
    http_response_code(403);
    echo "Diagnostic réservé à la maintenance.\n\n";
    echo "Ajoutez dans api/config.php :\n";
    echo "   'maintenance_token' => 'un-mot-de-passe-que-vous-choisissez',\n";
    echo "puis ouvrez cette page avec ?cle=ce-mot-de-passe\n";
    exit;
}

$racine = dirname(__DIR__);
$echecs = 0;

function ligne(string $etat, string $texte): void {
    global $echecs;
    if ($etat === 'ÉCHEC') { $GLOBALS['echecs']++; }
    echo str_pad($etat, 9) . $texte . "\n";
}
function aide(string $texte): void {
    foreach (explode("\n", wordwrap($texte, 68)) as $l) {
        echo '         ' . $l . "\n";
    }
}
function titre(string $t): void { echo "\n" . $t . "\n" . str_repeat('-', strlen($t)) . "\n"; }

echo "Rattachement de teaching au portail NeedHelpApp\n";
echo "===============================================\n";
echo 'Adresse   : ' . ($_SERVER['HTTP_HOST'] ?? '?') . "\n";
echo 'PHP       : ' . PHP_VERSION . "\n";
echo 'Moment    : ' . date('d.m.Y H:i:s') . "\n";

/* ---------- 1. le transport ---------- */
titre('1. Le transport');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || ($_SERVER['SERVER_PORT'] ?? '') === '443'
      || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
ligne($https ? 'OK' : 'ÉCHEC', 'la page est servie en HTTPS');
if (!$https) {
    aide('Le cookie de session du portail est marqué « Secure » : le navigateur '
       . 'ne l\'envoie jamais en clair. Tant que teaching n\'est pas en HTTPS, '
       . 'la connexion ne peut pas suivre. Activez le certificat dans le Manager.');
}

$hote = strtolower(explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]);
$bonDomaine = str_ends_with($hote, 'needhelpapp.com');
ligne($bonDomaine ? 'OK' : 'ÉCHEC', 'le domaine se termine par needhelpapp.com');
if (!$bonDomaine) {
    aide('Un cookie posé sur .needhelpapp.com n\'est envoyé qu\'aux adresses de '
       . 'ce domaine. Une adresse de préproduction Infomaniak, une IP ou un '
       . 'autre domaine ne le recevront jamais.');
}

/* ---------- 2. le cookie ---------- */
titre('2. Le cookie de session');

$cookie = $_COOKIE['nha_session'] ?? '';
ligne($cookie !== '' ? 'OK' : 'ÉCHEC', 'le cookie « nha_session » arrive jusqu\'ici');
if ($cookie === '') {
    aide('C\'EST LE MAILLON LE PLUS SOUVENT EN CAUSE. Le navigateur ne transmet '
       . 'pas le cookie du portail. Vérifiez, dans l\'ordre :');
    aide('');
    aide('a) Êtes-vous bien connecté sur https://needhelpapp.com dans CE '
       . 'navigateur, à cet instant ?');
    aide('b) Dans les outils de développement, onglet Application → Cookies → '
       . 'https://needhelpapp.com : le cookie nha_session doit exister et son '
       . 'domaine doit être « .needhelpapp.com », avec le point initial. S\'il '
       . 'affiche « needhelpapp.com » sans point, le portail l\'a posé sur le '
       . 'seul domaine principal et aucun sous-domaine ne le recevra.');
    aide('c) Le portail était-il bien en HTTPS au moment de la connexion ?');
    aide('');
    aide('Si le domaine du cookie est faux, déconnectez-vous du portail, videz '
       . 'les cookies de needhelpapp.com, puis reconnectez-vous : le cookie '
       . 'sera reposé avec le bon domaine.');
    echo "\nCookies effectivement reçus par teaching : "
       . (count($_COOKIE) ? implode(', ', array_keys($_COOKIE)) : '(aucun)') . "\n";
    echo "\n== Diagnostic interrompu : sans cookie, la suite n'a pas de sens. ==\n";
    exit;
}
echo '         (jeton reçu, ' . strlen($cookie) . " caractères)\n";

/* ---------- 3. les fichiers du portail ---------- */
titre('3. Les fichiers copiés depuis le portail');

$socle = $racine . '/includes/nha-core.php';
$existeSocle = is_file($socle);
ligne($existeSocle ? 'OK' : 'ÉCHEC', 'includes/nha-core.php');
if (!$existeSocle) {
    aide('Copiez ce fichier depuis le portail dans ' . $racine . '/includes/. '
       . 'Sans lui, teaching ne sait pas lire l\'identité centrale et retombe '
       . 'sur son ancien système de comptes — d\'où l\'impression d\'être '
       . 'déconnecté.');
}

$conf = $racine . '/config/nha.php';
$existeConf = is_file($conf);
ligne($existeConf ? 'OK' : 'ÉCHEC', 'config/nha.php');
if (!$existeConf) {
    aide('Copiez ce fichier depuis le portail dans ' . $racine . '/config/. '
       . 'C\'est lui qui porte les identifiants de la base centrale.');
}
if (!$existeSocle || !$existeConf) {
    echo "\n== Diagnostic interrompu : les fichiers du portail manquent. ==\n";
    exit;
}

require_once $socle;

$manquantes = [];
foreach (['db_host', 'db_core', 'db_user', 'db_pass'] as $cle) {
    if (!nha_config($cle)) { $manquantes[] = $cle; }
}
ligne($manquantes ? 'ÉCHEC' : 'OK', 'la configuration porte les accès à la base centrale');
if ($manquantes) {
    aide('Champs vides dans config/nha.php : ' . implode(', ', $manquantes));
}

/* ---------- 4. le code de l'application ---------- */
titre('4. Le code de l\'application');

$brut = getenv('NHA_APP');
ligne($brut ? 'OK' : 'ATTENTION', 'NHA_APP vaut ' . ($brut ?: '(non défini)'));
if (!$brut) {
    aide('La ligne « SetEnv NHA_APP teaching » du .htaccess n\'atteint pas PHP. '
       . 'C\'est fréquent en PHP-FPM, où les variables d\'Apache ne sont pas '
       . 'toujours transmises. Le pont pose alors « teaching » lui-même, donc '
       . 'ce n\'est pas bloquant — mais si vous voyez plus bas des droits lus '
       . 'pour « portail », c\'est de là que cela vient.');
}
require_once __DIR__ . '/nha.php';
ligne('OK', 'le pont retient : ' . nha_app_code());

/* ---------- 5. la base centrale ---------- */
titre('5. La base centrale');

try {
    $db = nha_db();
    ligne('OK', 'connexion à ' . nha_config('db_core') . ' établie');
} catch (Throwable $e) {
    ligne('ÉCHEC', 'connexion à la base centrale impossible');
    aide($e->getMessage());
    aide('');
    aide('Le plus souvent : l\'utilisateur MySQL de teaching n\'a pas encore '
       . 'les droits sur 6l3nq9_core. Dans le Manager Infomaniak, Bases de '
       . 'données → Utilisateurs → celui de teaching → cochez la base core.');
    echo "\n== Diagnostic interrompu. ==\n";
    exit;
}

try {
    $id = nha_app_id('teaching');
    ligne($id ? 'OK' : 'ÉCHEC', 'l\'application « teaching » est déclarée dans la table apps'
        . ($id ? ' (id ' . $id . ')' : ''));
    if (!$id) {
        aide('C\'EST PROBABLEMENT VOTRE PANNE. Une application absente de cette '
           . 'table empêche d\'ouvrir une session depuis son sous-domaine : le '
           . 'socle y inscrit sessions.created_app_id. Le symptôme est trompeur '
           . '— la connexion vaut du portail vers teaching, jamais l\'inverse.');
        aide('');
        aide('Exécutez sur la base centrale, ou sql/applications.sql du portail :');
        aide('INSERT INTO apps (code, name, position, active) VALUES '
           . '(\'teaching\', \'L\'\'apprentissage scolaire\', 1, 1);');
    }
} catch (Throwable $e) {
    ligne('ÉCHEC', 'la table apps est illisible : ' . $e->getMessage());
}

/* ---------- 6. la session ---------- */
titre('6. La session du portail');

try {
    $st = nha_db()->prepare(
        'SELECT s.account_id, s.expires_at, s.expires_at > NOW() AS valide
         FROM sessions s WHERE s.token_hash = ?'
    );
    $st->execute([hash('sha256', $cookie)]);
    $s = $st->fetch();

    if (!$s) {
        ligne('ÉCHEC', 'ce jeton ne correspond à aucune session en base');
        aide('Le cookie existe mais la session a été supprimée, ou le portail '
           . 'écrit dans une AUTRE base que celle déclarée ici. Comparez '
           . 'db_core dans les deux fichiers config/nha.php : celui du portail '
           . 'et celui de teaching doivent désigner la même base.');
    } elseif (!$s['valide']) {
        ligne('ÉCHEC', 'la session a expiré le ' . $s['expires_at']);
        aide('Reconnectez-vous sur needhelpapp.com.');
    } else {
        ligne('OK', 'session valable jusqu\'au ' . $s['expires_at']
            . ' (compte #' . $s['account_id'] . ')');
    }
} catch (Throwable $e) {
    ligne('ÉCHEC', 'lecture des sessions impossible : ' . $e->getMessage());
}

/* La lecture seule ne suffit pas : reconnaître un visiteur met à jour la
   date de dernière visite et rattache l'application. C'est une cause de
   panne silencieuse qu'aucun message n'annonce. */
try {
    nha_db()->prepare('UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = ?')
            ->execute([hash('sha256', $cookie)]);
    ligne('OK', 'teaching peut écrire dans la base centrale');
} catch (Throwable $e) {
    ligne('ÉCHEC', 'teaching ne peut pas écrire dans la base centrale');
    aide($e->getMessage());
    aide('');
    aide('Reconnaître un visiteur suppose d\'écrire : date de dernière visite, '
       . 'rattachement de l\'application. Un utilisateur MySQL en lecture seule '
       . 'fait donc échouer toute la connexion, sans le moindre message. '
       . 'Donnez-lui les droits complets sur ' . nha_config('db_core') . '.');
}

$compte = nhaCompte();
ligne($compte ? 'OK' : 'ÉCHEC', $compte
    ? 'compte reconnu : ' . $compte['email'] . ' (#' . $compte['id'] . ')'
    : 'nha_current_account() ne renvoie personne');
if (!$compte) {
    aide('Si la session est valable juste au-dessus mais que le compte n\'est '
       . 'pas reconnu, regardez les deux points précédents : droit d\'écriture, '
       . 'et accounts.deleted_at qui doit être NULL pour ce compte. Le journal '
       . 'd\'erreurs PHP porte la raison exacte, préfixée [teaching].');
    echo "\n== Diagnostic interrompu. ==\n";
    exit;
}

/* ---------- 7. l'ancrage local ---------- */
titre('7. L\'ancrage dans la base de teaching');

require_once __DIR__ . '/db.php';
try {
    $st = db()->query("SELECT 1 FROM users LIMIT 1");
    $colonnes = [];
    foreach (db()->query('SELECT * FROM users LIMIT 1') as $r) { $colonnes = array_keys($r); }
    if (!$colonnes) {
        $q = db()->query("SELECT * FROM users WHERE 0");
        for ($i = 0; $i < $q->columnCount(); $i++) {
            $colonnes[] = $q->getColumnMeta($i)['name'] ?? '';
        }
    }
    $aColonne = in_array('account_id', $colonnes, true);
    ligne($aColonne ? 'OK' : 'ÉCHEC', 'la colonne users.account_id existe');
    if (!$aColonne) {
        aide('Passez sql/migration-portail.sql : '
           . 'ALTER TABLE users ADD COLUMN account_id INT UNSIGNED NULL AFTER id;');
        echo "\n== Diagnostic interrompu. ==\n";
        exit;
    }
} catch (Throwable $e) {
    ligne('ÉCHEC', 'base de teaching illisible : ' . $e->getMessage());
    echo "\n== Diagnostic interrompu. ==\n";
    exit;
}

$local = nhaUtilisateurLocal($compte);
ligne($local ? 'OK' : 'ÉCHEC', $local
    ? 'ligne locale #' . $local['id'] . ' · rôle ' . ($local['role'] ?? 'membre')
    : 'aucune ligne locale, et impossible d\'en créer une');

/* Le chemin d'un compte NOUVEAU n'est pas celui d'un compte existant :
   le premier est retrouvé par son adresse, le second doit être inséré.
   Seule l'insertion peut buter sur le schéma, et c'est précisément
   celle qui ne se produit jamais pendant les essais du concepteur. */
try {
    db()->beginTransaction();
    db()->prepare('INSERT INTO users (account_id, email, name) VALUES (?, ?, ?)')
        ->execute([999999, 'essai-' . bin2hex(random_bytes(5)) . '@invalide.test', 'Essai']);
    db()->rollBack();
    ligne('OK', 'un compte inconnu peut être créé localement');
} catch (Throwable $e) {
    if (db()->inTransaction()) { db()->rollBack(); }
    ligne('ÉCHEC', 'impossible de créer la ligne d\'un compte nouveau');
    aide($e->getMessage());
    aide('');
    aide('Les comptes déjà connus de teaching continueront de fonctionner, '
       . 'puisqu\'ils sont retrouvés par leur adresse. Mais aucun nouveau '
       . 'compte ne pourra entrer : il paraîtra déconnecté sans le moindre '
       . 'message. Comparez les colonnes de users avec sql/schema.sql.');
}

/* ---------- 8. les droits ---------- */
titre('8. Les droits');

$droits = nhaAbonnement((int) $compte['id']);
ligne('OK', 'plan « ' . $droits['plan'] . ' », statut « ' . $droits['status'] . ' »'
    . (!empty($droits['until']) ? ', jusqu\'au ' . $droits['until'] : ''));

$u = currentUser();
ligne($u ? 'OK' : 'ÉCHEC', $u
    ? 'currentUser() reconnaît ' . $u['email'] . ' — abonné : '
      . (abonnementActif($u) ? 'oui' : 'non')
    : 'currentUser() ne renvoie personne');

/* ---------- 9. ce dont la connexion a besoin ---------- */
titre('9. Les écritures qu\'une connexion suppose');

aide('Se connecter n\'est pas seulement lire : le socle écrit dans plusieurs '
   . 'tables. Un droit manquant sur l\'une d\'elles suffit à faire échouer '
   . 'toute la connexion, avec un message générique. Les écritures ci-dessous '
   . 'sont annulées aussitôt.');
echo "\n";

$tables = [
    'accounts'   => 'créer un compte depuis teaching',
    'identities' => 'rattacher un profil Google',
    'sessions'   => 'ouvrir la session partagée',
    'app_users'  => 'rattacher l\'application au compte',
    'audit_log'  => 'consigner l\'évènement',
];

foreach ($tables as $table => $pourquoi) {
    try {
        nha_db()->beginTransaction();
        switch ($table) {
            case 'accounts':
                nha_db()->prepare('INSERT INTO accounts (uuid, email, name, created_at) VALUES (?, ?, ?, NOW())')
                        ->execute([nha_uuid(), 'essai-' . bin2hex(random_bytes(6)) . '@invalide.test', 'Essai']);
                break;
            case 'identities':
                nha_db()->prepare('INSERT INTO identities (account_id, provider, subject, email_at_provider) VALUES (?, ?, ?, ?)')
                        ->execute([(int) $compte['id'], 'essai', bin2hex(random_bytes(8)), 'essai@invalide.test']);
                break;
            case 'sessions':
                nha_db()->prepare('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))')
                        ->execute([hash('sha256', 'essai-' . bin2hex(random_bytes(8))), (int) $compte['id']]);
                break;
            case 'app_users':
                nha_db()->prepare('UPDATE app_users SET last_seen_at = NOW() WHERE account_id = ?')
                        ->execute([(int) $compte['id']]);
                break;
            case 'audit_log':
                nha_db()->prepare('INSERT INTO audit_log (account_id, app_id, event, detail) VALUES (?, (SELECT id FROM apps WHERE code = ?), ?, ?)')
                        ->execute([(int) $compte['id'], 'teaching', 'essai', 'diagnostic']);
                break;
        }
        nha_db()->rollBack();
        ligne('OK', str_pad($table, 12) . $pourquoi);
    } catch (Throwable $e) {
        if (nha_db()->inTransaction()) { nha_db()->rollBack(); }
        ligne('ÉCHEC', str_pad($table, 12) . $pourquoi);
        aide($e->getMessage());
    }
}

/* ---------- 10. l'identifiant Google ---------- */
titre('10. L\'identifiant Google');

$gTeaching = '';
try {
    $c = config();
    $gTeaching = (string) ($c['google_client_id'] ?? '');
} catch (Throwable $e) { }
$gPortail = (string) nha_config('google_client_id', '');

if ($gTeaching === '' && $gPortail === '') {
    ligne('ATTENTION', 'aucun identifiant Google : le bouton ne sera pas proposé');
} elseif ($gTeaching !== '' && $gPortail !== '' && $gTeaching !== $gPortail) {
    ligne('ATTENTION', 'teaching et le portail utilisent DEUX identifiants différents');
    aide('teaching : ' . substr($gTeaching, 0, 24) . '…');
    aide('portail  : ' . substr($gPortail, 0, 24) . '…');
    aide('');
    aide('Ce n\'est pas bloquant — chacun vérifie les jetons qu\'il reçoit — mais '
       . 'les deux identifiants doivent avoir https://teaching.needhelpapp.com '
       . 'dans leurs origines autorisées, faute de quoi le bouton refusera de '
       . 's\'afficher sur cette page.');
} else {
    ligne('OK', 'identifiant Google cohérent');
}

/* ---------- conclusion ---------- */
titre('Conclusion');
if ($echecs === 0) {
    echo "Tout est en place. Si l'application vous affiche encore comme\n";
    echo "déconnecté, c'est côté navigateur : rechargez en vidant le cache\n";
    echo "(Ctrl+Maj+R), et vérifiez que assets/compte.js et assets/menu.js\n";
    echo "sont bien à jour sur le serveur.\n";
} else {
    echo $echecs . " maillon(s) à réparer. Reprenez le premier ÉCHEC ci-dessus :\n";
    echo "les suivants en découlent souvent.\n";
}
echo "\nSupprimez ce fichier une fois le problème résolu.\n";
