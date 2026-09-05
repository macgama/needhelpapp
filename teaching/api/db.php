<?php
declare(strict_types=1);

/**
 * Socle commun de l'API : configuration, connexion à la base,
 * session, et petits utilitaires de réponse.
 */

// Les erreurs ne doivent jamais partir dans la réponse : elles casseraient
// le JSON attendu par le navigateur et révéleraient des détails inutiles.
ini_set('display_errors', '0');
error_reporting(E_ALL);

const MAX_TEXT   = 20000;   // caractères d'une dictée
const MAX_NAME   = 120;
const MAX_PREFS  = 8000;

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            fail('configuration absente : copiez config.example.php en config.php', 500);
        }
        $cfg = require $file;
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = config();
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    if (($c['driver'] ?? 'mysql') === 'sqlite') {
        $path = $c['sqlite_path'] ?? (__DIR__ . '/../data/dictee.sqlite');
        $dir  = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0770, true);
        }
        $fresh = !is_file($path);
        $pdo = new PDO('sqlite:' . $path, null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        if ($fresh) {
            $schema = __DIR__ . '/../sql/schema.sqlite.sql';
            if (is_file($schema)) {
                $pdo->exec((string) file_get_contents($schema));
            }
        }
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $c['host'] ?? 'localhost',
        (int) ($c['port'] ?? 3306),
        $c['database'] ?? ''
    );
    $pdo = new PDO($dsn, $c['user'] ?? '', $c['password'] ?? '', $options);
    return $pdo;
}

function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $c = config();
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_name('dictee_sess');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (bool) ($c['cookie_secure'] ?? $https),
    ]);
    session_start();

    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
}

function jsonOut(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): void
{
    jsonOut(['error' => $message], $status);
}

/** Corps de requête JSON, toujours sous forme de tableau. */
function body(): array
{
    static $parsed = null;
    if ($parsed === null) {
        $raw = file_get_contents('php://input') ?: '';
        $d = json_decode($raw, true);
        $parsed = is_array($d) ? $d : [];
    }
    return $parsed;
}

/* mbstring n'est pas activée partout : on s'en sert si elle est là,
   sinon on retombe sur un découpage UTF-8 fait à la main. */
function u_len(string $s): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($s, 'UTF-8');
    }
    return (int) preg_match_all('/./us', $s);
}

function u_cut(string $s, int $max): string
{
    if (u_len($s) <= $max) {
        return $s;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max, 'UTF-8');
    }
    $chars = preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    return implode('', array_slice($chars, 0, $max));
}

function u_lower(string $s): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function str_field(string $key, int $max, string $default = ''): string
{
    $v = body()[$key] ?? $default;
    if (!is_string($v)) {
        $v = $default;
    }
    // on coupe proprement en UTF-8 plutôt qu'au milieu d'un caractère
    return u_cut(trim($v), $max);
}

/** Codes de niveau acceptés : n1 (première année d'école) à n9. */
function levelCode(string $v): string
{
    return preg_match('/^n[1-9]$/', $v) ? $v : '';
}

function wordCount(string $text): int
{
    return (int) preg_match_all('/[\p{L}\p{N}]+/u', $text);
}

function publicCount(int $userId): int
{
    $st = db()->prepare('SELECT COUNT(*) FROM dictations WHERE user_id = ? AND is_public = 1');
    $st->execute([$userId]);
    return (int) $st->fetchColumn();
}

/* Les langues proposées. En ajouter une ne demande que d'étendre ce
   tableau : rien dans la base ni dans l'interface n'est écrit en dur. */
const LANGUES = ['fr', 'de', 'en', 'it'];

function langueValide(string $code): string
{
    $c = strtolower(substr(trim($code), 0, 2));
    return in_array($c, LANGUES, true) ? $c : '';
}

/* Les familles d'exercices, connues aussi du serveur : une famille
   inventée par un navigateur ne doit pas entrer en base. */
const FAMILLES_MATHS = ['livrets', 'complements', 'divisions', 'trous',
                        'progressions', 'carres', 'doubles',
                        'addition', 'soustraction', 'multiplication', 'division',
                        'priorites', 'relatifs', 'fractions', 'unites', 'pourcents', 'algebre',
                        'diviseurs', 'scientifique', 'arrondis',
                        'temps', 'vitesse', 'echelles', 'interets',
                        'proportionnalite', 'affine', 'binomes', 'equation2',
                        'aires', 'volumes', 'pythagore', 'angles', 'trigonometrie'];

/** Met une ligne de série de mathématiques dans la forme attendue. */
function shapeMaths(array $r): array
{
    $reglages = json_decode((string) ($r['reglages'] ?? '{}'), true);
    $out = [
        'id'       => (int) ($r['id'] ?? 0),
        'name'     => (string) ($r['name'] ?? ''),
        'chapter'  => (string) ($r['chapter'] ?? ''),
        'famille'  => (string) ($r['famille'] ?? ''),
        'reglages' => is_array($reglages) ? $reglages : [],
        'nb'       => (int) ($r['nb_questions'] ?? 20),
    ];
    foreach (['is_public', 'borrowed'] as $col) {
        if (array_key_exists($col, $r)) {
            $out[$col] = (int) $r[$col] === 1;
        }
    }
    foreach (['origin_owner', 'share_token'] as $col) {
        if (array_key_exists($col, $r)) {
            $out[$col] = $r[$col] ?: ($col === 'share_token' ? null : '');
        }
    }
    return $out;
}

/**
 * Nettoie les réglages venus du navigateur : on ne garde que des clés
 * connues et des valeurs simples. Un réglage est du texte libre stocké
 * en base, donc une porte d'entrée s'il n'est pas filtré.
 */
function reglagesMaths($brut): string
{
    if (!is_array($brut)) {
        return '{}';
    }
    $permis = ['livrets', 'jusqua', 'sens', 'cible', 'dizaines', 'operation',
               'type', 'sauts', 'montre', 'demandes',
               'ordre', 'decimales', 'termes', 'multiplicateur', 'diviseur', 'reste',
               'niveau', 'parentheses', 'negatifs', 'grandeur', 'ecart', 'lettre',
               'rang', 'cherche', 'forme', 'rapport'];
    $propre = [];
    foreach ($permis as $cle) {
        if (!array_key_exists($cle, $brut)) {
            continue;
        }
        $v = $brut[$cle];
        if (is_array($v)) {
            $liste = [];
            foreach (array_slice($v, 0, 20) as $x) {
                if (is_numeric($x)) {
                    $liste[] = (int) $x;
                }
            }
            $propre[$cle] = $liste;
        } elseif (is_bool($v)) {
            $propre[$cle] = $v;
        } elseif (is_numeric($v)) {
            $propre[$cle] = (int) $v;
        } elseif (is_string($v) && preg_match('/^[a-z]{1,16}$/', $v)) {
            $propre[$cle] = $v;
        }
    }
    return json_encode($propre, JSON_UNESCAPED_UNICODE);
}

/** Met une ligne de liste de vocabulaire dans la forme attendue. */
function shapeVocab(array $r): array
{
    $out = [
        'id'      => (int) ($r['id'] ?? 0),
        'name'    => (string) ($r['name'] ?? ''),
        'chapter' => (string) ($r['chapter'] ?? ''),
        'source'  => (string) ($r['lang_source'] ?? 'fr'),
        'target'  => (string) ($r['lang_target'] ?? ''),
    ];
    foreach (['is_public', 'borrowed'] as $col) {
        if (array_key_exists($col, $r)) {
            $out[$col] = (int) $r[$col] === 1;
        }
    }
    foreach (['origin_owner', 'share_token'] as $col) {
        if (array_key_exists($col, $r)) {
            $out[$col] = $r[$col] ?: ($col === 'share_token' ? null : '');
        }
    }
    if (array_key_exists('nb', $r)) {
        $out['nb'] = (int) $r['nb'];
    }
    return $out;
}

/** Les mots d'une liste, dans l'ordre. */
function motsDeLaListe(int $listId): array
{
    $st = db()->prepare('SELECT source, target, note FROM vocab_words WHERE list_id = ? ORDER BY position, id');
    $st->execute([$listId]);
    return array_map(static function (array $m): array {
        return [
            'source' => (string) $m['source'],
            'target' => (string) $m['target'],
            'note'   => (string) $m['note'],
        ];
    }, $st->fetchAll());
}

/**
 * Remplace les mots d'une liste. On efface puis on réécrit : une liste de
 * vocabulaire se modifie en bloc, et tenter de rapprocher l'ancien et le
 * nouveau ligne à ligne compliquerait sans rien apporter.
 */
function enregistrerMots(int $listId, array $mots): int
{
    db()->prepare('DELETE FROM vocab_words WHERE list_id = ?')->execute([$listId]);
    $st = db()->prepare('INSERT INTO vocab_words (list_id, position, source, target, note) VALUES (?, ?, ?, ?, ?)');
    $n = 0;
    foreach ($mots as $m) {
        if (!is_array($m)) {
            continue;
        }
        $source = u_cut(trim((string) ($m['source'] ?? '')), 120);
        $target = u_cut(trim((string) ($m['target'] ?? '')), 120);
        if ($source === '' || $target === '') {
            continue;   // une paire incomplète n'apprend rien
        }
        $st->execute([$listId, $n, $source, $target, u_cut(trim((string) ($m['note'] ?? '')), 80)]);
        $n++;
        if ($n >= 300) {
            break;
        }
    }
    return $n;
}

/** Met une ligne de liste de verbes dans la forme attendue par le navigateur. */
function shapeListe(array $r): array
{
    $decouper = static function ($v): array {
        return array_values(array_filter(array_map('trim', explode(',', (string) $v))));
    };
    $out = [
        'id'     => (int) ($r['id'] ?? 0),
        'name'   => (string) ($r['name'] ?? ''),
        'verbs'  => $decouper($r['verbs'] ?? ''),
        'tenses' => $decouper($r['tenses'] ?? ''),
        'langue' => (string) ($r['langue'] ?? 'fr'),
    ];
    foreach ([['is_public', 'is_public'], ['borrowed', 'borrowed']] as [$col, $cle]) {
        if (array_key_exists($col, $r)) {
            $out[$cle] = (int) $r[$col] === 1;
        }
    }
    if (array_key_exists('origin_owner', $r)) {
        $out['origin_owner'] = (string) $r['origin_owner'];
    }
    if (array_key_exists('share_token', $r)) {
        $out['share_token'] = $r['share_token'] ?: null;
    }
    return $out;
}

/** Met une ligne de dictée dans la forme attendue par le navigateur. */
function shapeDictation(array $r): array
{
    $out = [
        'id'     => (int) ($r['id'] ?? 0),
        'title'  => (string) ($r['title'] ?? ''),
        'author' => (string) ($r['author'] ?? ''),
        'level'  => (string) ($r['level'] ?? ''),
        'lang'   => (string) ($r['lang'] ?? 'fr'),
    ];
    if (array_key_exists('text', $r)) {
        $out['text'] = (string) $r['text'];
    }
    if (array_key_exists('word_count', $r)) {
        $out['word_count'] = (int) $r['word_count'];
    }
    if (array_key_exists('is_public', $r)) {
        $out['is_public'] = (int) $r['is_public'] === 1;
    }
    if (array_key_exists('share_token', $r)) {
        $out['share_token'] = $r['share_token'] ?: null;
    }
    if (array_key_exists('borrowed', $r)) {
        $out['borrowed'] = (int) $r['borrowed'] === 1;
    }
    if (array_key_exists('origin_owner', $r)) {
        $out['origin_owner'] = (string) $r['origin_owner'];
    }
    return $out;
}

/* =====================================================================
   Connexion avec Google

   Le navigateur reçoit de Google un jeton signé et nous le transmet. Tout
   se joue ici : un jeton non vérifié permettrait à n'importe qui d'entrer
   dans n'importe quel compte en fabriquant le sien. On contrôle donc la
   signature avec les clés publiques de Google, puis l'émetteur, le
   destinataire, la date, et le fait que l'adresse soit vérifiée.
   ===================================================================== */

/* Toutes les extensions ne sont pas activées partout : on se sert de cURL
   quand elle est là, des flux PHP sinon, et l'on échoue proprement si aucun
   des deux n'est disponible. */
function httpGet(string $url, int $delai = 10, array $entetes = []): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $delai]
            + ($entetes ? [CURLOPT_HTTPHEADER => $entetes] : []));
        $r = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($r === false || $code !== 200) ? null : (string) $r;
    }
    if (!ini_get('allow_url_fopen')) {
        error_log('[dictee] ni cURL ni allow_url_fopen : appel réseau impossible');
        return null;
    }
    $ctx = stream_context_create(['http' => [
        'timeout' => $delai, 'ignore_errors' => true,
        'header' => implode("\r\n", $entetes),
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    return $r === false ? null : (string) $r;
}

function httpPostForm(string $url, array $donnees, array $entetes = [], ?string $auth = null, int $delai = 20): array
{
    $corps = http_build_query($donnees);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $corps,
            CURLOPT_TIMEOUT => $delai,
            CURLOPT_HTTPHEADER => $entetes,
        ];
        if ($auth !== null) {
            $opts[CURLOPT_USERPWD] = $auth;
        }
        curl_setopt_array($ch, $opts);
        $r = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        return ['corps' => $r === false ? null : (string) $r, 'code' => $code, 'erreur' => $err];
    }

    if (!ini_get('allow_url_fopen')) {
        return ['corps' => null, 'code' => 0, 'erreur' => 'ni cURL ni allow_url_fopen'];
    }
    $lignes = array_merge(['Content-Type: application/x-www-form-urlencoded'], $entetes);
    if ($auth !== null) {
        $lignes[] = 'Authorization: Basic ' . base64_encode($auth);
    }
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'header' => implode("\r\n", $lignes),
        'content' => $corps, 'timeout' => $delai, 'ignore_errors' => true,
    ]]);
    $r = @file_get_contents($url, false, $ctx);
    $code = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m)) {
            $code = (int) $m[1];
        }
    }
    return ['corps' => $r === false ? null : (string) $r, 'code' => $code, 'erreur' => ''];
}

function b64url(string $s): string
{
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)) ?: '';
}

/** Encodage ASN.1 minimal, pour transformer une clé JWK en clé PEM. */
function asn1Longueur(int $n): string
{
    if ($n < 128) {
        return chr($n);
    }
    $octets = '';
    while ($n > 0) {
        $octets = chr($n & 0xFF) . $octets;
        $n >>= 8;
    }
    return chr(0x80 | strlen($octets)) . $octets;
}
function asn1Entier(string $octets): string
{
    $octets = ltrim($octets, "\x00");
    if ($octets === '' || (ord($octets[0]) & 0x80)) {
        $octets = "\x00" . $octets;   // un entier ASN.1 est signé
    }
    return "\x02" . asn1Longueur(strlen($octets)) . $octets;
}

function jwkVersPem(array $jwk): string
{
    $n = b64url((string) ($jwk['n'] ?? ''));
    $e = b64url((string) ($jwk['e'] ?? ''));
    if ($n === '' || $e === '') {
        return '';
    }
    $rsa = asn1Entier($n) . asn1Entier($e);
    $rsa = "\x30" . asn1Longueur(strlen($rsa)) . $rsa;

    $algo = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
    $bits = "\x03" . asn1Longueur(strlen($rsa) + 1) . "\x00" . $rsa;
    $spki = "\x30" . asn1Longueur(strlen($algo) + strlen($bits)) . $algo . $bits;

    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/** Clés publiques de Google, gardées en cache une demi-journée. */
function googleCles(bool $forcer = false): array
{
    $c = config();
    $fichier = $c['google_jwks_cache'] ?? (__DIR__ . '/../data/google-jwks.json');
    $dossier = dirname($fichier);
    if (!is_dir($dossier)) {
        @mkdir($dossier, 0770, true);
    }

    $frais = is_file($fichier) && (time() - (int) filemtime($fichier) < 43200);
    if ($frais && !$forcer) {
        $j = json_decode((string) file_get_contents($fichier), true);
        if (is_array($j) && !empty($j['keys'])) {
            return $j['keys'];
        }
    }

    $reponse = httpGet((string) ($c['google_jwks_url'] ?? 'https://www.googleapis.com/oauth2/v3/certs'));

    if ($reponse === null) {
        if (is_file($fichier)) {                      // le cache périmé vaut mieux que rien
            $j = json_decode((string) file_get_contents($fichier), true);
            if (is_array($j) && !empty($j['keys'])) {
                return $j['keys'];
            }
        }
        return [];
    }
    @file_put_contents($fichier, (string) $reponse);
    $j = json_decode((string) $reponse, true);
    return is_array($j) && !empty($j['keys']) ? $j['keys'] : [];
}

/**
 * Vérifie un jeton d'identité Google et renvoie ses informations,
 * ou null si quoi que ce soit ne va pas.
 */
/** L'identifiant client, nettoyé : un retour à la ligne dans config.php
    suffirait à le rendre invalide, et l'erreur serait incompréhensible. */
function googleClientId(): string
{
    return trim(preg_replace('/\s+/', '', (string) (config()['google_client_id'] ?? '')));
}

function verifierJetonGoogle(string $jwt): ?array
{
    $clientId = googleClientId();
    if ($clientId === '') {
        return null;
    }

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }
    $entete = json_decode(b64url($parts[0]), true);
    $charge = json_decode(b64url($parts[1]), true);
    $signature = b64url($parts[2]);
    if (!is_array($entete) || !is_array($charge) || $signature === '') {
        return null;
    }
    if (($entete['alg'] ?? '') !== 'RS256' || empty($entete['kid'])) {
        return null;   // on n'accepte qu'un seul algorithme, jamais « none »
    }

    $trouver = static function (array $cles, string $kid): ?array {
        foreach ($cles as $k) {
            if (($k['kid'] ?? '') === $kid) {
                return $k;
            }
        }
        return null;
    };
    $cle = $trouver(googleCles(), (string) $entete['kid']);
    if (!$cle) {
        $cle = $trouver(googleCles(true), (string) $entete['kid']);   // clés renouvelées ?
    }
    if (!$cle) {
        return null;
    }
    $pem = jwkVersPem($cle);
    if ($pem === '') {
        return null;
    }
    if (openssl_verify($parts[0] . '.' . $parts[1], $signature, $pem, OPENSSL_ALGO_SHA256) !== 1) {
        return null;
    }

    $iss = (string) ($charge['iss'] ?? '');
    if ($iss !== 'accounts.google.com' && $iss !== 'https://accounts.google.com') {
        return null;
    }
    if ((string) ($charge['aud'] ?? '') !== $clientId) {
        return null;   // jeton destiné à une autre application
    }
    $maintenant = time();
    if ((int) ($charge['exp'] ?? 0) < $maintenant - 60) {
        return null;
    }
    if ((int) ($charge['iat'] ?? 0) > $maintenant + 300) {
        return null;
    }
    if (empty($charge['sub']) || empty($charge['email'])) {
        return null;
    }
    $verifiee = $charge['email_verified'] ?? false;
    if ($verifiee !== true && $verifiee !== 'true') {
        return null;   // sans adresse vérifiée, on ne peut pas rattacher un compte
    }

    return [
        'sub'    => (string) $charge['sub'],
        'email'  => u_lower((string) $charge['email']),
        'nom'    => trim((string) ($charge['given_name'] ?? $charge['name'] ?? '')),
    ];
}

/* =====================================================================
   Abonnement
   Le gratuit reste entièrement utilisable : composer une dictée, la faire,
   se corriger, s'entraîner à la conjugaison. L'abonnement ouvre ce qui
   suppose de garder ou de partager quelque chose.
   ===================================================================== */

/** Ce que le navigateur peut afficher de l'offre, sans clé ni secret. */
function offrePublique(): array
{
    $c = config();
    return [
        'disponible'    => stripeConfigure(),
        'prix_mensuel'  => (string) ($c['prix_mensuel'] ?? ''),
        'prix_annuel'   => (string) ($c['prix_annuel'] ?? ''),
        'economie'      => (string) ($c['prix_economie'] ?? ''),
    ];
}

/* =====================================================================
   Les rôles
     membre      : le cas ordinaire, l'accès complet dépend de l'abonnement
     moderateur  : accès complet à l'application, sans payer
     admin       : idem, plus la zone d'administration
   ===================================================================== */
/* Les rôles sont ceux du portail, communs à toutes les applications :
   il n'existe pas d'administrateur « de teaching ». */
const ROLES = ['membre', 'moderateur', 'admin'];

function roleDe(array $u): string
{
    $r = (string) ($u['role'] ?? 'membre');
    return in_array($r, ROLES, true) ? $r : 'membre';
}

function estAdmin(array $u): bool { return roleDe($u) === 'admin'; }

/** Accès complet sans payer : administrateurs et modérateurs. */
function accesOffert(array $u): bool
{
    $r = roleDe($u);
    return $r === 'admin' || $r === 'moderateur';
}

/** Réservé aux administrateurs. Vérifié en base, jamais d'après le navigateur. */
function requireAdmin(): array
{
    $u = requireUser();
    if (!estAdmin($u)) {
        jsonOut(['error' => 'réservé à l\'administration'], 403);
    }
    return $u;
}

/** Un abonnement encore valable : payé, ou résilié mais pas encore échu. */
function abonnementActif(array $u): bool
{
    // un rôle privilégié ouvre tout, sans passer par le paiement
    if (accesOffert($u)) {
        return true;
    }

    /* Le portail nomme les états autrement : un plan autre que « gratuit »
       et un statut actif ou en essai valent abonnement, quelle que soit
       l'application qui l'a vendu. */
    if (!empty($u['portail'])) {
        $plan = (string) ($u['plan'] ?? 'gratuit');
        $statut = (string) ($u['plan_statut'] ?? 'aucun');
        if ($plan === 'gratuit' || $plan === '') {
            return false;
        }
        if (!in_array($statut, ['actif', 'essai', 'resilie'], true)) {
            return false;
        }
        $fin = $u['plan_fin'] ?? null;
        return $fin === null || strtotime((string) $fin) > time();
    }

    $statut = (string) ($u['plan_statut'] ?? 'aucun');
    if ($statut !== 'actif' && $statut !== 'resilie') {
        return false;
    }
    $fin = $u['plan_fin'] ?? null;
    if (!$fin) {
        // Résilié sans terme connu : on laisse l'accès ouvert. La personne a
        // payé sa période ; c'est la notification de fin qui la refermera.
        // Fermer par défaut reviendrait à couper un service déjà réglé.
        return true;
    }
    return strtotime((string) $fin) > time();
}

function etatAbonnement(array $u): array
{
    return [
        'plan'    => (string) ($u['plan'] ?? 'gratuit'),
        'statut'  => (string) ($u['plan_statut'] ?? 'aucun'),
        'fin'     => $u['plan_fin'] ?? null,
        'abonne'  => abonnementActif($u),
        'role'    => roleDe($u),
        'offert'  => accesOffert($u),   // accès sans paiement
        'portail' => !empty($u['portail']),
    ];
}

/* =====================================================================
   La part gratuite d'un compte

   Un compte sans abonnement garde cinq éléments par application, et peut
   en reprendre cinq dans les bibliothèques. Assez pour se rendre compte,
   trop peu pour une classe entière : c'est le but.

   Publier, partager et suivre ses résultats restent réservés aux abonnés.
   ===================================================================== */
const QUOTA_GRATUIT = 5;

/**
 * Vérifie qu'un compte non abonné n'a pas atteint sa part gratuite.
 * @param string $condition SQL supplémentaire, par exemple 'borrowed = 1'
 */
function verifierQuota(array $u, string $table, string $condition, string $quoi, string $ou): void
{
    if (abonnementActif($u)) {
        return;
    }
    $sql = 'SELECT COUNT(*) FROM ' . $table . ' WHERE user_id = ?'
         . ($condition !== '' ? ' AND ' . $condition : '');
    $st = db()->prepare($sql);
    $st->execute([$u['id']]);
    if ((int) $st->fetchColumn() < QUOTA_GRATUIT) {
        return;
    }
    jsonOut([
        'error' => 'Ton compte gratuit garde ' . QUOTA_GRATUIT . ' ' . $quoi . ' ' . $ou
                 . '. Supprime-en un, ou prends un abonnement pour ne plus compter.',
        'quota_atteint' => true,
        'abonnement_requis' => true,
    ], 402);
}

/** Réservé aux abonnés : tout ce qui crée, publie ou partage. */
function requireAbonne(): array
{
    $u = requireUser();
    if (!abonnementActif($u)) {
        jsonOut([
            'error'    => 'cette fonction fait partie de l\'abonnement',
            'abonnement_requis' => true,
        ], 402);
    }
    return $u;
}

/* ---------------------------------------------------------------------
   Prestataire de paiement (Stripe)
   Les appels sont faits à la main : pas de bibliothèque à installer sur
   un hébergement mutualisé, et rien de plus qu'une requête HTTPS.
   --------------------------------------------------------------------- */
/**
 * Version d'API demandée à Stripe.
 * Elle compte : TWINT n'accepte les abonnements qu'à partir du 27 mai 2026.
 * Une version plus ancienne ne le proposerait tout simplement pas, sans
 * message d'erreur — le moyen de paiement serait absent, voilà tout.
 */
function versionStripe(): string
{
    return (string) (config()['stripe_version'] ?? '2026-05-27.dahlia');
}

function stripeConfigure(): bool
{
    $c = config();
    return !empty($c['stripe_secret']) && !empty($c['stripe_prix_mensuel']) && !empty($c['stripe_prix_annuel']);
}

/**
 * @param bool $fatal true : un refus interrompt la requête.
 *                    false : il est renvoyé, à charge de l'appelant de
 *                    prévoir une solution de repli.
 */
function stripeAppel(string $chemin, array $donnees, bool $fatal = true): array
{
    $c = config();
    $base = (string) ($c['stripe_base'] ?? 'https://api.stripe.com/v1/');
    $r = httpPostForm(
        $base . $chemin,
        $donnees,
        ['Stripe-Version: ' . versionStripe()],
        ((string) $c['stripe_secret']) . ':'
    );
    $reponse = $r['corps'];
    $code = $r['code'];

    if ($reponse === null) {
        error_log('[dictee] Stripe injoignable : ' . $r['erreur']);
        if (!$fatal) {
            return ['__echec' => 'service injoignable'];
        }
        fail('le service de paiement est injoignable, réessaie dans un instant', 503);
    }
    $j = json_decode((string) $reponse, true);
    if (!is_array($j)) {
        error_log('[dictee] Stripe : réponse illisible');
        if (!$fatal) {
            return ['__echec' => 'réponse illisible'];
        }
        fail('réponse inattendue du service de paiement', 502);
    }
    if ($code >= 400) {
        $detail = (string) ($j['error']['message'] ?? '');
        error_log('[dictee] Stripe ' . $code . ' : ' . $detail);
        if (!$fatal) {
            return ['__echec' => $detail];
        }
        jsonOut([
            'error' => 'le service de paiement a refusé la demande',
            // le détail n'est montré que si on l'a demandé dans config.php :
            // en exploitation, un client n'a pas à lire « No such price »
            'detail' => !empty($c['debug_paiement']) ? $detail : null,
            'aide'   => 'ouvrez api/paiement-test.php pour vérifier la configuration',
        ], 502);
    }
    return $j;
}

/* =====================================================================
   Messages envoyés aux utilisateurs
   Trois occasions seulement : la bienvenue, la prise d'abonnement et la
   résiliation. Chacun est court, en texte simple, et rappelle où l'on peut
   se désabonner — c'est ce qu'on cherche quand on relit ce genre de message.
   ===================================================================== */

function signatureMail(): string
{
    $c = config();
    return "\n---\n" . siteUrl() . "\n"
        . "Pour toute question, réponds simplement à ce message"
        . (!empty($c['admin_email']) ? ' (' . $c['admin_email'] . ')' : '') . ".\n";
}

function mailBienvenue(string $email, string $nom): void
{
    $bonjour = $nom !== '' ? 'Bonjour ' . $nom . ',' : 'Bonjour,';
    $texte = $bonjour . "\n\n"
        . "Ton compte est créé. Tu peux t'en servir tout de suite :\n\n"
        . "  La dictée      " . siteUrl() . "/dictee.html\n"
        . "  La conjugaison " . siteUrl() . "/conjugaison.html\n\n"
        . "Tout fonctionne sans payer : composer une dictée, la faire lire à voix\n"
        . "haute, se corriger, s'entraîner sur les verbes. L'abonnement, facultatif,\n"
        . "sert à garder et à partager — tes dictées, tes listes, tes résultats.\n\n"
        . "  " . siteUrl() . "/abonnement.html\n\n"
        . "Si tu n'es pas à l'origine de cette inscription, ignore ce message :\n"
        . "le compte restera inutilisé.\n"
        . signatureMail();
    sendMail($email, 'Bienvenue sur ' . parse_url(siteUrl(), PHP_URL_HOST), $texte);
}

function mailAbonnement(string $email, string $nom, string $plan, ?string $fin): void
{
    $c = config();
    $bonjour = $nom !== '' ? 'Bonjour ' . $nom . ',' : 'Bonjour,';
    $montant = $plan === 'annuel' ? (string) ($c['prix_annuel'] ?? '') : (string) ($c['prix_mensuel'] ?? '');
    $echeance = $fin ? date('d.m.Y', strtotime($fin)) : null;

    $texte = $bonjour . "\n\n"
        . "Ton abonnement " . ($plan === 'annuel' ? 'annuel' : 'mensuel') . " est actif. Merci.\n\n"
        . ($montant !== '' ? "Montant : " . $montant . "\n" : '')
        . ($echeance ? "Prochaine échéance : " . $echeance . "\n" : '')
        . "Reconduction automatique jusqu'à résiliation.\n\n"
        . "Ce que cela ouvre :\n"
        . "  - enregistrer tes dictées et les retrouver partout\n"
        . "  - la bibliothèque partagée, pour ouvrir et publier des dictées\n"
        . "  - tes listes de verbes, à composer et à partager\n"
        . "  - le suivi de tes résultats, dictée par dictée\n\n"
        . "Résilier prend deux clics, à tout moment, depuis :\n"
        . "  " . siteUrl() . "/abonnement.html\n"
        . "L'accès reste alors ouvert jusqu'à la fin de la période déjà payée.\n\n"
        . "Tes factures sont disponibles au même endroit.\n"
        . "Conditions générales : " . siteUrl() . "/conditions.html\n"
        . signatureMail();
    sendMail($email, 'Ton abonnement est actif', $texte);
}

function mailResiliation(string $email, string $nom, ?string $fin): void
{
    $bonjour = $nom !== '' ? 'Bonjour ' . $nom . ',' : 'Bonjour,';
    $echeance = $fin ? date('d.m.Y', strtotime($fin)) : null;

    $texte = $bonjour . "\n\n"
        . "Ta résiliation est enregistrée. Aucun nouveau prélèvement n'aura lieu.\n\n"
        . ($echeance
            ? "Ton accès reste ouvert jusqu'au " . $echeance . ", terme de la période\n"
              . "que tu as déjà payée. Ensuite il se refermera.\n\n"
            : "Ton accès reste ouvert jusqu'au terme de la période déjà payée.\n\n")
        . "Rien n'est effacé. Tes dictées, tes listes et tes résultats resteront\n"
        . "consultables et exportables, même après cette date. Seuls\n"
        . "l'enregistrement, le partage et la bibliothèque seront suspendus.\n\n"
        . "Si tu changes d'avis, tu peux reprendre un abonnement quand tu veux :\n"
        . "  " . siteUrl() . "/abonnement.html\n\n"
        . "Si cette résiliation n'est pas de ton fait, écris-nous sans tarder.\n"
        . signatureMail();
    sendMail($email, 'Résiliation enregistrée', $texte);
}

/**
 * Applique chez nous l'état d'un abonnement lu chez Stripe.
 * Trois chemins y mènent : la notification signée, la confirmation au retour
 * du paiement, et la resynchronisation manuelle. Un seul endroit décide donc
 * de ce qu'est un abonnement actif.
 */
/**
 * Fin de la période en cours.
 * Stripe l'a déplacée : autrefois sur l'abonnement, elle vit maintenant sur
 * ses lignes. On regarde aux deux endroits, et l'on retient la plus lointaine.
 */
function finDePeriode(array $sub): int
{
    $fin = (int) ($sub['current_period_end'] ?? 0);
    foreach (($sub['items']['data'] ?? []) as $ligne) {
        $fin = max($fin, (int) ($ligne['current_period_end'] ?? 0));
    }
    // en dernier ressort, la date d'arrêt programmée
    $fin = max($fin, (int) ($sub['cancel_at'] ?? 0), (int) ($sub['ended_at'] ?? 0));
    return $fin;
}

function appliquerAbonnement(int $userId, string $payeur, string $abonnementId): bool
{
    if ($abonnementId === '') {
        return false;
    }
    $r = stripeLire('subscriptions/' . rawurlencode($abonnementId));
    if (!$r['ok']) {
        error_log('[dictee] abonnement illisible : ' . $r['message']);
        return false;
    }
    $sub = $r['objet'];

    $etat = (string) ($sub['status'] ?? '');
    $resilie = !empty($sub['cancel_at_period_end']);
    $statut = 'aucun';
    if ($etat === 'active' || $etat === 'trialing') {
        $statut = $resilie ? 'resilie' : 'actif';
    } elseif ($etat === 'past_due' || $etat === 'unpaid') {
        $statut = 'impaye';
    }

    $c = config();
    $prix = (string) ($sub['items']['data'][0]['price']['id'] ?? '');
    $plan = ($prix !== '' && $prix === (string) ($c['stripe_prix_annuel'] ?? '')) ? 'annuel' : 'mensuel';
    $fin = finDePeriode($sub);
    $finTexte = $fin ? date('Y-m-d H:i:s', $fin) : null;

    // On regarde d'où l'on vient : les messages ne partent qu'aux changements
    // d'état, jamais à chaque synchronisation.
    $st = db()->prepare('SELECT email, name, plan_statut FROM users WHERE id = ?');
    $st->execute([$userId]);
    $avant = $st->fetch() ?: ['email' => '', 'name' => '', 'plan_statut' => 'aucun'];
    $ancien = (string) $avant['plan_statut'];

    db()->prepare('UPDATE users SET plan = ?, plan_statut = ?, plan_fin = ?, payeur_id = COALESCE(?, payeur_id), abonnement_id = ? WHERE id = ?')
        ->execute([
            $plan, $statut, $finTexte,
            $payeur !== '' ? $payeur : null, $abonnementId, $userId,
        ]);

    if ($avant['email'] !== '') {
        if ($statut === 'actif' && $ancien !== 'actif') {
            mailAbonnement((string) $avant['email'], (string) $avant['name'], $plan, $finTexte);
        } elseif ($statut === 'resilie' && $ancien !== 'resilie') {
            mailResiliation((string) $avant['email'], (string) $avant['name'], $finTexte);
        }
    }
    return true;
}

/**
 * Retrouve l'abonnement d'un compte à partir de son adresse e-mail.
 * Filet de sécurité quand la notification n'est jamais arrivée.
 */
function retrouverAbonnement(int $userId, string $email): bool
{
    $r = stripeLire('customers?limit=5&email=' . rawurlencode($email));
    if (!$r['ok']) {
        return false;
    }
    foreach (($r['objet']['data'] ?? []) as $client) {
        $cid = (string) ($client['id'] ?? '');
        if ($cid === '') {
            continue;
        }
        $s = stripeLire('subscriptions?limit=5&status=all&customer=' . rawurlencode($cid));
        if (!$s['ok']) {
            continue;
        }
        foreach (($s['objet']['data'] ?? []) as $sub) {
            if (in_array((string) ($sub['status'] ?? ''), ['active', 'trialing', 'past_due', 'unpaid'], true)) {
                return appliquerAbonnement($userId, $cid, (string) ($sub['id'] ?? ''));
            }
        }
    }
    return false;
}


/**
 * Vérifie la signature d'un message reçu du prestataire.
 * Sans cette vérification, n'importe qui pourrait s'offrir un abonnement
 * en envoyant une fausse notification de paiement.
 */
/** Lecture d'un objet chez le prestataire, pour vérifier la configuration. */
function stripeLire(string $chemin): array
{
    $c = config();
    $base = (string) ($c['stripe_base'] ?? 'https://api.stripe.com/v1/');
    $reponse = httpGet($base . $chemin, 15, [
        'Authorization: Basic ' . base64_encode(((string) ($c['stripe_secret'] ?? '')) . ':'),
        'Stripe-Version: ' . versionStripe(),
    ]);
    if ($reponse === null) {
        return ['ok' => false, 'message' => 'service injoignable'];
    }
    $j = json_decode($reponse, true);
    if (!is_array($j)) {
        return ['ok' => false, 'message' => 'réponse illisible'];
    }
    if (isset($j['error'])) {
        return ['ok' => false, 'message' => (string) ($j['error']['message'] ?? 'refus'), 'objet' => $j];
    }
    return ['ok' => true, 'objet' => $j];
}

function stripeSignatureValide(string $corps, string $entete, string $secret, int $tolerance = 300): bool
{
    $horodatage = null;
    $signatures = [];
    foreach (explode(',', $entete) as $morceau) {
        $paire = explode('=', trim($morceau), 2);
        if (count($paire) !== 2) {
            continue;
        }
        if ($paire[0] === 't') {
            $horodatage = (int) $paire[1];
        } elseif ($paire[0] === 'v1') {
            $signatures[] = $paire[1];
        }
    }
    if (!$horodatage || !$signatures) {
        return false;
    }
    if (abs(time() - $horodatage) > $tolerance) {
        return false;   // message trop ancien : on refuse les rejeux
    }
    $attendue = hash_hmac('sha256', $horodatage . '.' . $corps, $secret);
    foreach ($signatures as $s) {
        if (hash_equals($attendue, $s)) {
            return true;
        }
    }
    return false;
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        fail('méthode non autorisée', 405);
    }
    $sent = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($sent) || $sent === '' || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $sent)) {
        fail('session expirée, recharge la page', 419);
    }
}

/**
 * Le compte connecté.
 *
 * Deux sources, dans cet ordre : le portail NeedHelpApp d'abord — c'est lui
 * qui détient l'identité —, puis la session locale, qui ne sert plus qu'aux
 * installations sans portail (développement, hébergement séparé).
 *
 * Le portail l'emporte : si les deux répondent, c'est le compte central qui
 * fait foi, sans quoi une session locale oubliée masquerait la bonne.
 */
function currentUser(): ?array
{
    require_once __DIR__ . '/nha.php';
    $compte = nhaCompte();
    if ($compte) {
        $u = nhaUtilisateurLocal($compte);
        if ($u) {
            $u['id'] = (int) $u['id'];
            $u['account_id'] = (int) $compte['id'];
            $u['portail'] = true;

            /* Le rôle vient du portail, jamais de la table locale.
               Deux vérités concurrentes — nommer quelqu'un administrateur
               ici sans que le portail le sache, ou l'inverse — auraient
               produit une confusion certaine. Il n'y a qu'un rôle, global. */
            $u['role'] = (string) ($compte['role'] ?? 'membre');

            // l'abonnement vient du portail, jamais des colonnes locales :
            // un abonnement pris ailleurs doit valoir ici aussi
            $droits = nhaAbonnement((int) $compte['id']);
            $u['plan'] = (string) ($droits['plan'] ?? 'gratuit');
            $u['plan_statut'] = (string) ($droits['status'] ?? 'aucun');
            $u['plan_fin'] = $droits['until'] ?? null;

            unset($u['password'], $u['pwd_version']);
            return $u;
        }
    }

    /* Quand le portail est en place, il est la seule source d'identité.
       Se rabattre sur la session locale ferait apparaître comme connecté,
       ici seulement, quelqu'un que le portail ne connaît pas — ou qui s'en
       est déconnecté. Une session locale héritée d'avant la bascule doit
       cesser de valoir. */
    if (nhaDisponible()) {
        return null;
    }

    $id = $_SESSION['uid'] ?? null;
    if (!$id) {
        return null;
    }
    $st = db()->prepare('SELECT id, email, name, pwd_version, role, plan, plan_statut, plan_fin, payeur_id, abonnement_id FROM users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    if (!$u) {
        return null;
    }
    // un mot de passe changé ailleurs ferme les sessions ouvertes sur les autres appareils
    if ((int) $u['pwd_version'] !== (int) ($_SESSION['pv'] ?? -1)) {
        $_SESSION = [];
        return null;
    }
    unset($u['pwd_version']);
    $u['id'] = (int) $u['id'];
    return $u;
}

function openSessionFor(int $userId, int $pwdVersion): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    $_SESSION['pv']  = $pwdVersion;
}

function requireUser(): array
{
    $u = currentUser();
    if (!$u) {
        fail('il faut être connecté', 401);
    }
    return $u;
}

function clientIp(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

/**
 * Compte les essais récents d'un même type, venant de la même adresse IP.
 * Sert à freiner aussi bien les tentatives de connexion que les demandes
 * répétées de nouveau mot de passe.
 */
function recentAttempts(string $kind, int $minutes): int
{
    $since = (config()['driver'] ?? 'mysql') === 'sqlite'
        ? "datetime('now','-" . $minutes . " minutes')"
        : 'DATE_SUB(NOW(), INTERVAL ' . $minutes . ' MINUTE)';
    $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND kind = ? AND created_at > ' . $since);
    $st->execute([clientIp(), $kind]);
    return (int) $st->fetchColumn();
}

function noteAttempt(string $kind, string $email): void
{
    $st = db()->prepare('INSERT INTO login_attempts (ip, kind, email) VALUES (?, ?, ?)');
    $st->execute([clientIp(), $kind, u_cut($email, 190)]);
}

/** Adresse publique du site, pour composer le lien envoyé par e-mail. */
/**
 * Adresse publique du site, utilisée pour les liens envoyés par e-mail.
 * Renseignez 'site_url' dans config.php : deviner à partir de la requête
 * échoue dès qu'un proxy ou un alias de domaine s'interpose, et l'on se
 * retrouve avec le domaine principal au lieu du sous-domaine.
 */
function siteUrl(): string
{
    $c = config();
    if (!empty($c['site_url'])) {
        return rtrim((string) $c['site_url'], '/');
    }
    error_log('[dictee] site_url absent de config.php : les liens envoyés par e-mail risquent d\'être faux');

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = (string) ($_SERVER['HTTP_X_FORWARDED_HOST']
        ?? $_SERVER['HTTP_HOST']
        ?? $_SERVER['SERVER_NAME']
        ?? 'localhost');
    $host = trim(explode(',', $host)[0]);
    $dir  = rtrim(dirname(dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/api/index.php'))), '/');
    return ($https ? 'https://' : 'http://') . $host . $dir;
}

function mimeHeader(string $s): string
{
    return preg_match('/[^\x20-\x7E]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
}

/**
 * Envoi d'un message. En développement, on écrit dans data/mails.log
 * plutôt que d'envoyer : on peut suivre le parcours sans boîte aux lettres.
 */
function sendMail(string $to, string $subject, string $text): bool
{
    $c = config();

    if (!empty($c['mail_debug_log'])) {
        $dir = __DIR__ . '/../data';
        if (!is_dir($dir)) {
            @mkdir($dir, 0770, true);
        }
        @file_put_contents(
            $dir . '/mails.log',
            date('c') . " -> " . $to . "\n" . $subject . "\n" . $text . "\n\n",
            FILE_APPEND
        );
        return true;
    }

    $from = (string) ($c['mail_from'] ?? '');
    if ($from === '' || !function_exists('mail')) {
        error_log('[dictee] envoi impossible : mail_from absent');
        return false;
    }
    $headers = implode("\r\n", [
        'From: ' . mimeHeader((string) ($c['mail_from_name'] ?? 'La dictée')) . ' <' . $from . '>',
        'Reply-To: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    return @mail($to, mimeHeader($subject), $text, $headers, '-f' . $from);
}
