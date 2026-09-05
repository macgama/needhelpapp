<?php
/**
 * NeedHelpApp — socle commun d'identité et d'abonnement.
 *
 * Ce fichier est déposé à l'identique dans chaque application
 * (needhelpapp.com, teaching., sport., artisans.). C'est le SEUL endroit
 * qui parle à la base 6l3nq9_core. Si une application part un jour sur un
 * autre serveur, seules les fonctions de ce fichier passent de SQL à HTTP.
 *
 * PHP 8.1+, PDO MySQL.
 */

declare(strict_types=1);

/**
 * Marqueur de version du socle.
 *
 * Les trois fichiers de includes/ doivent porter la MÊME valeur. Un dépôt
 * FTP partiel — un fichier remplacé, l'autre non — est la panne la plus
 * pénible à diagnostiquer : le code plante à un endroit sans rapport avec
 * le fichier oublié. Ce marqueur permet de le détecter tout de suite.
 */
const NHA_BUILD_CORE = '2026-09-03.3';

const NHA_COOKIE       = 'nha_session';
const NHA_SESSION_DAYS = 30;

/**
 * Échappe une valeur avant de l'écrire dans une page ou un message.
 *
 * Elle vivait dans partials/page.php, que les points d'entrée JSON ne
 * chargent pas : appeler e() depuis une action d'API tuait la requête
 * sans le moindre message lisible. Sa place est ici, avec le reste du
 * socle commun.
 */
if (!function_exists('e')) {
    function e(?string $s): string {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }
}

/** Code de l'application courante : 'teaching', 'sport', 'portail'… */
function nha_app_code(): string {
    return getenv('NHA_APP') ?: 'portail';
}

/**
 * Une valeur de configuration, lue une seule fois par requête.
 * Le même fichier config/nha.php sert au portail et à teaching.
 */
function nha_config(?string $cle = null, mixed $defaut = null): mixed {
    static $c = null;
    if ($c === null) {
        $chemin = __DIR__ . '/../config/nha.php';
        if (!is_file($chemin)) {
            throw new RuntimeException('config/nha.php est absent. Copiez config/nha.exemple.php.');
        }
        $c = require $chemin;
    }
    if ($cle === null) return $c;
    return array_key_exists($cle, $c) && $c[$cle] !== '' ? $c[$cle] : $defaut;
}

/**
 * Domaine du cookie de session.
 *
 * En production : '.needhelpapp.com', pour que la connexion vaille sur tous
 * les sous-domaines. Sur une adresse de préproduction Infomaniak, sur une
 * IP ou en local, un cookie posé sur .needhelpapp.com serait REFUSÉ par le
 * navigateur et rien ne fonctionnerait : on retombe alors sur un cookie
 * limité à l'hôte courant. C'est la cause la plus fréquente d'un « Votre
 * page a expiré » qui ne part jamais.
 */
function nha_cookie_domaine(): string {
    $hote = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $hote = explode(':', $hote)[0];
    return str_ends_with($hote, 'needhelpapp.com') ? '.needhelpapp.com' : '';
}

/** Les cookies ne sont marqués Secure que si la requête est bien en HTTPS. */
function nha_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['SERVER_PORT'] ?? '') === '443'
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

/** Options communes aux cookies du domaine. */
function nha_cookie_options(int $duree, bool $httponly = true): array {
    return [
        'expires'  => $duree > 0 ? time() + $duree : 1,
        'path'     => '/',
        'domain'   => nha_cookie_domaine(),
        'secure'   => nha_https(),
        'httponly' => $httponly,
        'samesite' => 'Lax',
    ];
}

function nha_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . nha_config('db_host') . ';dbname=' . nha_config('db_core') . ';charset=utf8mb4',
            (string)nha_config('db_user'), (string)nha_config('db_pass'),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
             PDO::ATTR_EMULATE_PREPARES => false]
        );
    }
    return $pdo;
}

function nha_normalise_email(string $email): string {
    return mb_strtolower(trim($email));
}

/**
 * L'identifiant d'une application, créé au besoin.
 *
 * Une application absente de cette table faisait échouer l'ouverture de
 * session : nha_start_session() y insère created_app_id, et audit_log.app_id
 * s'y réfère aussi. Le symptôme était déroutant — la connexion valait depuis
 * le portail vers l'application, mais jamais l'inverse.
 *
 * Plutôt que d'exiger une insertion manuelle avant le premier branchement,
 * la ligne est créée à la volée. Son libellé reste à corriger dans la table
 * pour l'affichage, mais plus rien ne casse entre-temps.
 */
function nha_app_id(string $code): ?int {
    static $memo = [];
    if (array_key_exists($code, $memo)) return $memo[$code];

    $st = nha_db()->prepare('SELECT id FROM apps WHERE code = ?');
    $st->execute([$code]);
    $id = $st->fetchColumn();
    if ($id !== false) return $memo[$code] = (int)$id;

    try {
        nha_db()->prepare(
            'INSERT INTO apps (code, name, position, active) VALUES (?, ?, 99, 1)'
        )->execute([$code, ucfirst($code)]);
        error_log('[NeedHelpApp] application « ' . $code . ' » déclarée automatiquement '
                . 'dans la table apps. Complétez son libellé et son adresse.');
        return $memo[$code] = (int)nha_db()->lastInsertId();
    } catch (Throwable $e) {
        // course entre deux requêtes simultanées, ou droits insuffisants
        $st = nha_db()->prepare('SELECT id FROM apps WHERE code = ?');
        $st->execute([$code]);
        $id = $st->fetchColumn();
        return $memo[$code] = ($id === false ? null : (int)$id);
    }
}

/* ============================================================
   1. LE CONTRÔLE DEMANDÉ : ce compte existe-t-il déjà ailleurs ?
   ============================================================ */

/**
 * Retourne l'état d'un e-mail avant inscription.
 *   ['exists' => bool, 'account_id' => ?int, 'apps' => string[],
 *    'has_password' => bool, 'providers' => string[]]
 *
 * 'apps' liste les applications où le compte est déjà actif : c'est ce qui
 * permet d'écrire « Vous avez déjà un compte, créé via L'apprentissage
 * scolaire » au lieu de créer un doublon.
 */
function nha_lookup_email(string $email): array {
    $email = nha_normalise_email($email);
    $st = nha_db()->prepare(
        'SELECT a.id, a.password_hash IS NOT NULL AS has_password
         FROM accounts a WHERE a.email = ? AND a.deleted_at IS NULL'
    );
    $st->execute([$email]);
    $row = $st->fetch();
    if (!$row) {
        return ['exists' => false, 'account_id' => null, 'apps' => [],
                'has_password' => false, 'providers' => []];
    }
    $id = (int)$row['id'];

    $st = nha_db()->prepare(
        'SELECT p.name FROM app_users au JOIN apps p ON p.id = au.app_id
         WHERE au.account_id = ? ORDER BY p.position'
    );
    $st->execute([$id]);
    $apps = $st->fetchAll(PDO::FETCH_COLUMN);

    $st = nha_db()->prepare('SELECT provider FROM identities WHERE account_id = ?');
    $st->execute([$id]);
    $providers = $st->fetchAll(PDO::FETCH_COLUMN);

    return ['exists' => true, 'account_id' => $id, 'apps' => $apps,
            'has_password' => (bool)$row['has_password'], 'providers' => $providers];
}

/**
 * Inscription depuis n'importe quelle application.
 *
 * Ne crée JAMAIS un second compte pour un e-mail déjà connu : si l'adresse
 * existe, la fonction rattache simplement l'application courante au compte
 * existant et renvoie 'already_exists'. C'est à l'appelant de décider quoi
 * afficher (voir la note sur l'énumération d'e-mails plus bas).
 *
 * Retour : ['status' => 'created'|'already_exists', 'account_id' => int, 'lookup' => array]
 */
function nha_register(string $email, ?string $password, ?string $name = null): array {
    $email = nha_normalise_email($email);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Adresse e-mail invalide.');
    }
    $db = nha_db();
    $lookup = nha_lookup_email($email);

    if ($lookup['exists']) {
        nha_attach_app((int)$lookup['account_id'], nha_app_code());
        return ['status' => 'already_exists',
                'account_id' => (int)$lookup['account_id'], 'lookup' => $lookup];
    }

    $hash = $password === null ? null
          : password_hash($password, PASSWORD_ARGON2ID);

    $db->beginTransaction();
    try {
        $st = $db->prepare(
            'INSERT INTO accounts (uuid, email, name, password_hash, created_at)
             VALUES (?, ?, ?, ?, NOW())'
        );
        $st->execute([nha_uuid(), $email, $name, $hash]);
        $id = (int)$db->lastInsertId();
        nha_attach_app($id, nha_app_code());
        nha_log($id, 'signup', nha_app_code());
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        // Course entre deux inscriptions simultanées : l'index unique a tranché.
        if ($e instanceof PDOException && $e->getCode() === '23000') {
            $lookup = nha_lookup_email($email);
            nha_attach_app((int)$lookup['account_id'], nha_app_code());
            return ['status' => 'already_exists',
                    'account_id' => (int)$lookup['account_id'], 'lookup' => $lookup];
        }
        throw $e;
    }
    return ['status' => 'created', 'account_id' => $id, 'lookup' => $lookup];
}

/** Marque le compte comme utilisateur de l'application courante. */
function nha_attach_app(int $accountId, string $appCode, string $role = 'membre'): void {
    $appId = nha_app_id($appCode);
    if ($appId === null) return;
    $st = nha_db()->prepare(
        'INSERT INTO app_users (account_id, app_id, role, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_seen_at = NOW()'
    );
    $st->execute([$accountId, $appId, $role]);
}

/**
 * Connexion Google. Rattache l'identité à un compte existant si l'e-mail
 * Google (vérifié) correspond déjà à un compte — sinon deux comptes
 * coexisteraient pour la même personne.
 */
function nha_login_google(string $sub, string $email, bool $emailVerified, ?string $name): int {
    $db = nha_db();
    $st = $db->prepare('SELECT account_id FROM identities WHERE provider = ? AND subject = ?');
    $st->execute(['google', $sub]);
    $id = $st->fetchColumn();
    if ($id !== false) { nha_attach_app((int)$id, nha_app_code()); return (int)$id; }

    $email = nha_normalise_email($email);
    if ($emailVerified) {
        $lookup = nha_lookup_email($email);
        if ($lookup['exists']) {
            $st = $db->prepare(
                'INSERT INTO identities (account_id, provider, subject, email_at_provider)
                 VALUES (?, ?, ?, ?)'
            );
            $st->execute([$lookup['account_id'], 'google', $sub, $email]);
            nha_log((int)$lookup['account_id'], 'link_identity', 'google');
            nha_attach_app((int)$lookup['account_id'], nha_app_code());
            return (int)$lookup['account_id'];
        }
    }
    $res = nha_register($email, null, $name);
    $st = $db->prepare(
        'INSERT INTO identities (account_id, provider, subject, email_at_provider)
         VALUES (?, ?, ?, ?)'
    );
    $st->execute([$res['account_id'], 'google', $sub, $email]);
    return $res['account_id'];
}

/**
 * Cette application est-elle ouverte ?
 *
 * Sert à fermer un sous-domaine le temps d'une mise à jour. Les
 * administrateurs continuent d'entrer : c'est justement eux qui doivent
 * vérifier que tout fonctionne avant de rouvrir.
 *
 * En cas de doute — base injoignable, ligne absente — on répond « oui ».
 * Fermer un site parce qu'on n'a pas pu lire son état serait la pire
 * des réactions.
 */
function nha_app_ouverte(?string $code = null): bool {
    $code = $code ?? nha_app_code();
    try {
        $st = nha_db()->prepare('SELECT status FROM apps WHERE code = ?');
        $st->execute([$code]);
        $etat = $st->fetchColumn();
        if ($etat === false) return true;
        if ($etat === 'en_ligne') return true;

        $compte = nha_current_account();
        return $compte && ($compte['role'] ?? '') === 'admin';
    } catch (Throwable $e) {
        error_log('[NeedHelpApp] état de « ' . $code . ' » illisible : ' . $e->getMessage());
        return true;
    }
}

/* ============================================================
   2. SESSION PARTAGÉE SUR *.needhelpapp.com
   ============================================================ */

function nha_start_session(int $accountId): void {
    $token = bin2hex(random_bytes(32));
    $st = nha_db()->prepare(
        'INSERT INTO sessions (token_hash, account_id, expires_at, created_app_id, ip, user_agent)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, ?)'
    );
    $st->execute([hash('sha256', $token), $accountId, NHA_SESSION_DAYS,
                  nha_app_id(nha_app_code()),
                  @inet_pton($_SERVER['REMOTE_ADDR'] ?? '') ?: null,
                  substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);

    // Le domaine parent est la clé du « une seule connexion » : le même
    // cookie est envoyé à teaching., sport. et artisans.
    setcookie(NHA_COOKIE, $token, nha_cookie_options(NHA_SESSION_DAYS * 86400));
    nha_db()->prepare('UPDATE accounts SET last_login_at = NOW() WHERE id = ?')
            ->execute([$accountId]);
}

/**
 * Compte connecté, ou null. Rattache au passage l'application courante.
 * Le résultat est mémorisé : une page qui appelle cette fonction trois fois
 * ne déclenche qu'une requête.
 */
function nha_current_account(): ?array {
    static $memo = false;
    if ($memo !== false) return $memo;

    $token = $_COOKIE[NHA_COOKIE] ?? '';
    if ($token === '') return $memo = null;

    $st = nha_db()->prepare(
        'SELECT a.* FROM sessions s
         JOIN accounts a ON a.id = s.account_id
         WHERE s.token_hash = ? AND s.expires_at > NOW() AND a.deleted_at IS NULL'
    );
    $st->execute([hash('sha256', $token)]);
    $account = $st->fetch();
    if (!$account) return $memo = null;

    nha_db()->prepare('UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = ?')
            ->execute([hash('sha256', $token)]);
    nha_attach_app((int)$account['id'], nha_app_code());
    return $memo = $account;
}

function nha_logout(): void {
    $token = $_COOKIE[NHA_COOKIE] ?? '';
    if ($token !== '') {
        nha_db()->prepare('DELETE FROM sessions WHERE token_hash = ?')
                ->execute([hash('sha256', $token)]);
    }
    setcookie(NHA_COOKIE, '', nha_cookie_options(0));
}

/* ============================================================
   3. DROITS : l'abonnement pris ailleurs remonte automatiquement
   ============================================================ */

/**
 * Droits effectifs d'un compte pour une application donnée.
 * Un abonnement scope='all' vaut pour toutes les applications, y compris
 * celles qui n'existent pas encore. Un abonnement pris via teaching est
 * donc immédiatement visible depuis sport ou artisans, sans aucune
 * synchronisation : les trois lisent la même table.
 */
function nha_entitlement(int $accountId, ?string $appCode = null): array {
    $appCode = $appCode ?? nha_app_code();
    $st = nha_db()->prepare(
        'SELECT s.plan, s.status, s.period, s.current_period_end, s.cancel_at,
                s.scope, p.code AS sold_by
         FROM subscription_seats seat
         JOIN subscriptions s ON s.id = seat.subscription_id
         LEFT JOIN apps p  ON p.id = s.sold_by_app_id
         LEFT JOIN apps ap ON ap.id = s.app_id
         WHERE seat.account_id = ?
           AND seat.removed_at IS NULL
           AND s.status IN (\'actif\',\'essai\')
           AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
           AND (s.scope = \'all\' OR ap.code = ?)
         ORDER BY FIELD(s.plan, \'pro\', \'famille\', \'gratuit\'),
                  s.current_period_end DESC
         LIMIT 1'
    );
    $st->execute([$accountId, $appCode]);
    $row = $st->fetch();
    if (!$row) {
        return ['plan' => 'gratuit', 'status' => 'aucun', 'until' => null, 'sold_by' => null];
    }
    return ['plan' => $row['plan'], 'status' => $row['status'],
            'period' => $row['period'], 'until' => $row['current_period_end'],
            'cancel_at' => $row['cancel_at'], 'sold_by' => $row['sold_by']];
}

/**
 * Recalcule le cache accounts.plan / plan_statut / plan_fin.
 * Appelée après chaque webhook de paiement et après tout ajout ou retrait
 * de place. Pas de trigger SQL : non disponible sur mutualisé Infomaniak.
 */
function nha_refresh_cache(int $accountId): void {
    $e = nha_entitlement($accountId, null);
    $st = nha_db()->prepare(
        'UPDATE accounts SET plan = ?, plan_statut = ?, plan_fin = ?,
                plan_app_id = (SELECT id FROM apps WHERE code = ?)
         WHERE id = ?'
    );
    $st->execute([$e['plan'], $e['status'], $e['until'], $e['sold_by'], $accountId]);
}

function nha_uuid(): string {
    $d = random_bytes(16);
    $d[6] = chr(ord($d[6]) & 0x0f | 0x40);
    $d[8] = chr(ord($d[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

/**
 * Consigne un évènement. Un journal qui échoue ne doit jamais empêcher
 * l'action elle-même : on garde la trace de l'échec, et l'on continue.
 */
function nha_log(?int $accountId, string $event, ?string $detail = null): void {
    try {
    $st = nha_db()->prepare(
        'INSERT INTO audit_log (account_id, app_id, event, detail, ip)
         VALUES (?, (SELECT id FROM apps WHERE code = ?), ?, ?, ?)'
    );
    $st->execute([$accountId, nha_app_code(), $event, $detail,
                  @inet_pton($_SERVER['REMOTE_ADDR'] ?? '') ?: null]);
    } catch (Throwable $e) {
        error_log('[NeedHelpApp] journal indisponible (' . $event . ') : ' . $e->getMessage());
    }
}
