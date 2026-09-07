<?php
/**
 * FamilyShop — la couche de données.
 *
 * Une idée gouverne tout ce fichier : rien n'appartient à une personne,
 * tout appartient au foyer. Chaque lecture et chaque écriture passe donc
 * par foyerCourant(), qui vérifie l'appartenance. Sans cela, connaître un
 * identifiant suffirait à lire la liste de courses d'une autre famille.
 */

declare(strict_types=1);

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
        $path = $c['sqlite_path'] ?? (__DIR__ . '/../data/familyshop.sqlite');
        if (!is_dir(dirname($path))) {
            @mkdir(dirname($path), 0770, true);
        }
        $neuve = !is_file($path);
        $pdo = new PDO('sqlite:' . $path, null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        /* Aucune fonction de date n'est ajoutée : les requêtes n'en
           emploient pas. Les dates sont calculées en PHP et passées en
           paramètre, de sorte que les mêmes requêtes valent pour MySQL
           et pour SQLite. */
        if ($neuve) {
            $schema = __DIR__ . '/../sql/schema.sqlite.sql';
            if (is_file($schema)) {
                $pdo->exec((string) file_get_contents($schema));
            }
        }
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $c['host'] ?? 'localhost', (int) ($c['port'] ?? 3306), $c['database'] ?? '');
    $pdo = new PDO($dsn, $c['user'] ?? '', $c['password'] ?? '', $options);
    return $pdo;
}

/* ---------------------------------------------------------------
   Réponses
   --------------------------------------------------------------- */
function jsonOut(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): never
{
    jsonOut(['error' => $message], $code);
}

function body(): array
{
    static $corps = null;
    if ($corps === null) {
        $brut = file_get_contents('php://input') ?: '';
        $d = json_decode($brut, true);
        $corps = is_array($d) ? $d : [];
    }
    return $corps;
}

function champ(string $cle, int $max = 190): string
{
    $v = trim((string) (body()[$cle] ?? ''));
    return mb_substr($v, 0, $max);
}

function nombre(string $cle): ?float
{
    $v = body()[$cle] ?? null;
    if ($v === null || $v === '') {
        return null;
    }
    $v = str_replace(',', '.', (string) $v);
    return is_numeric($v) ? (float) $v : null;
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        fail('méthode non autorisée', 405);
    }
    $envoye = (string) ($_SERVER['HTTP_X_CSRF'] ?? '');
    if ($envoye === '' || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $envoye)) {
        fail('session expirée, recharge la page', 419);
    }
}

/* ---------------------------------------------------------------
   Qui parle
   --------------------------------------------------------------- */
function currentUser(): ?array
{
    require_once __DIR__ . '/nha.php';
    $compte = nhaCompte();
    if (!$compte) {
        return null;
    }
    $u = nhaUtilisateurLocal($compte);
    if (!$u) {
        return null;
    }
    $u['id'] = (int) $u['id'];
    $u['account_id'] = (int) $compte['id'];
    $u['role'] = (string) ($compte['role'] ?? 'membre');
    return $u;
}

function requireUser(): array
{
    $u = currentUser();
    if (!$u) {
        fail('il faut être connecté', 401);
    }
    return $u;
}

/* ---------------------------------------------------------------
   Le foyer
   --------------------------------------------------------------- */

/**
 * Un code court, lisible à voix haute et sans ambiguïté.
 * Ni O ni 0, ni I ni 1 : un code se dicte au téléphone.
 */
function codeFoyer(): string
{
    $lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $lettres[random_int(0, strlen($lettres) - 1)];
    }
    return $code;
}

/**
 * Le foyer de la personne, créé au besoin.
 *
 * Personne ne doit avoir à « créer un foyer » avant de pouvoir écrire sa
 * première liste : on lui en donne un, qu'il pourra renommer et partager.
 */
function foyerCourant(array $u): array
{
    $st = db()->prepare(
        'SELECT h.*, m.role AS mon_role
         FROM households h JOIN household_members m ON m.household_id = h.id
         WHERE m.user_id = ? ORDER BY m.joined_at LIMIT 1'
    );
    $st->execute([$u['id']]);
    $f = $st->fetch();
    if ($f) {
        $f['id'] = (int) $f['id'];
        return $f;
    }

    // premier passage : on lui ouvre un foyer sans rien lui demander
    $nom = $u['name'] !== '' ? ('Chez ' . $u['name']) : 'Ma famille';
    for ($essai = 0; $essai < 5; $essai++) {
        try {
            $code = codeFoyer();
            db()->prepare(
                'INSERT INTO households (name, join_code, created_by) VALUES (?, ?, ?)'
            )->execute([$nom, $code, $u['id']]);
            $id = (int) db()->lastInsertId();
            db()->prepare(
                'INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)'
            )->execute([$id, $u['id'], 'proprietaire']);
            return foyerCourant($u);
        } catch (PDOException $e) {
            // collision de code : on retire au sort
            if ($e->getCode() !== '23000') {
                throw $e;
            }
        }
    }
    fail('impossible de créer le foyer', 500);
}

/** Vérifie que cette personne appartient bien à ce foyer. */
function exigerMembre(array $u, int $foyerId): void
{
    $st = db()->prepare('SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?');
    $st->execute([$foyerId, $u['id']]);
    if (!$st->fetch()) {
        fail('ce foyer n\'est pas le tien', 403);
    }
}

/**
 * Marque le foyer comme modifié.
 *
 * Les navigateurs ouverts comparent ce nombre au leur toutes les quelques
 * secondes. Oublier de l'appeler après une écriture, c'est laisser l'autre
 * membre devant une liste périmée sans qu'il le sache — le défaut le plus
 * agaçant qu'une application partagée puisse avoir.
 */
function toucher(int $foyerId): int
{
    db()->prepare('UPDATE households SET version = version + 1 WHERE id = ?')->execute([$foyerId]);
    $st = db()->prepare('SELECT version FROM households WHERE id = ?');
    $st->execute([$foyerId]);
    return (int) $st->fetchColumn();
}

/* ---------------------------------------------------------------
   Ingrédients : mêmes règles que côté navigateur
   --------------------------------------------------------------- */

/** La clé de regroupement : « Les Oignons » et « oignon » n'en font qu'une. */
function cleIngredient(string $texte): string
{
    $t = mb_strtolower(trim($texte), 'UTF-8');
    $t = strtr($t, [
        'à'=>'a','â'=>'a','ä'=>'a','é'=>'e','è'=>'e','ê'=>'e','ë'=>'e',
        'î'=>'i','ï'=>'i','ô'=>'o','ö'=>'o','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c','œ'=>'oe',
    ]);
    $t = preg_replace('/^(de |du |des |la |le |les |l\'|d\')/u', '', $t);
    $t = preg_replace('/[.,;:!?()]/u', ' ', $t);
    $t = preg_replace('/\s+/u', ' ', trim($t));

    $mots = array_map(static function (string $m): string {
        if (preg_match('/eaux$/', $m)) return substr($m, 0, -1);
        if (preg_match('/aux$/', $m))  return substr($m, 0, -3) . 'al';
        if (strlen($m) > 3 && preg_match('/[^aeiou]s$/', $m)) return substr($m, 0, -1);
        if (strlen($m) > 3 && preg_match('/x$/', $m)) return substr($m, 0, -1);
        return $m;
    }, explode(' ', $t));

    return mb_substr(implode(' ', $mots), 0, 80);
}

/* CETTE LISTE DOIT SUIVRE CELLE DE assets/ingredients.js, ET DANS LE
   MÊME ORDRE — c'est l'ordre du magasin.

   Deux listes qui doivent s'accorder finissent toujours par diverger :
   'bebe' et 'animaux' ont été ajoutés au catalogue du navigateur sans
   l'être ici, et rayonValide() reversait silencieusement chaque couche
   et chaque croquette dans « Divers ». Le navigateur devinait juste, le
   serveur écrasait — donc en fin de liste, à l'opposé du rayon. */
const RAYONS = ['legumes', 'boucherie', 'poisson', 'cremerie', 'boulangerie', 'epicerie',
                'sucre', 'surgeles', 'boissons', 'entretien', 'hygiene', 'bebe',
                'animaux', 'divers'];

function rayonValide(string $r): string
{
    return in_array($r, RAYONS, true) ? $r : 'divers';
}

const UNITES = ['g', 'kg', 'ml', 'cl', 'dl', 'l', 'cs', 'cc', 'pièce', 'tranche', 'gousse',
                'botte', 'boîte', 'paquet', 'sachet', 'pot', 'bouteille', 'pack', 'cube',
                'pincée', ''];

function uniteValide(string $u): string
{
    $u = trim($u);
    return in_array($u, UNITES, true) ? $u : mb_substr($u, 0, 12);
}

/* =====================================================================
   La connexion Google.

   Repris de teaching à l'identique. Le point critique tient en une
   phrase : ne jamais faire confiance au contenu d'un jeton sans en
   avoir vérifié la signature auprès de Google, puis vérifier que le
   champ « aud » désigne bien NOTRE identifiant client. Sans ce second
   contrôle, n'importe quel jeton Google valide — émis pour un autre
   site — ouvrirait une session ici.
   ===================================================================== */

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

function asn1Entier(string $octets): string
{
    $octets = ltrim($octets, "\x00");
    if ($octets === '' || (ord($octets[0]) & 0x80)) {
        $octets = "\x00" . $octets;   // un entier ASN.1 est signé
    }
    return "\x02" . asn1Longueur(strlen($octets)) . $octets;
}

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

function b64url(string $s): string
{
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4)) ?: '';
}

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
