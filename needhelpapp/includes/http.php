<?php
/**
 * NeedHelpApp — utilitaires communs aux endpoints /api.
 * Chargé par tous les scripts qui répondent en JSON.
 */

declare(strict_types=1);
require_once __DIR__ . '/nha-core.php';

/** Doit correspondre à NHA_BUILD_CORE. Voir includes/nha-core.php. */
const NHA_BUILD_HTTP = '2026-09-03.3';

const NHA_CSRF_COOKIE = 'nha_csrf';

/* ---------- filet de sécurité ----------
   Sans ces deux gestionnaires, une exception ou une erreur fatale produit
   une page HTML d'erreur. Le navigateur essaie alors de la lire comme du
   JSON, échoue, et l'utilisateur voit « la connexion a échoué » : le vrai
   message est perdu. On garantit ici qu'un endpoint /api répond TOUJOURS
   en JSON, avec une référence qui permet de retrouver la trace complète
   dans le journal du serveur. */

/** Vrai si le script courant est un endpoint JSON (dossier /api). */
function est_api(): bool {
    return str_contains(str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? ''), '/api/');
}

if (est_api()) {
    set_exception_handler(function (Throwable $e): void {
        $ref = substr(bin2hex(random_bytes(4)), 0, 8);
        error_log('[NeedHelpApp][' . $ref . '] ' . get_class($e) . ' : ' . $e->getMessage()
                  . ' — ' . $e->getFile() . ':' . $e->getLine());
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'ok' => false,
            'reference' => $ref,
            'message' => 'Une erreur est survenue de notre côté (référence ' . $ref . '). '
                       . 'Elle est enregistrée dans notre journal.',
        ], JSON_UNESCAPED_UNICODE);
    });

    register_shutdown_function(function (): void {
        $e = error_get_last();
        if ($e === null || !in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            return;
        }
        $ref = substr(bin2hex(random_bytes(4)), 0, 8);
        error_log('[NeedHelpApp][' . $ref . '] fatale : ' . $e['message']
                  . ' — ' . $e['file'] . ':' . $e['line']);
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'ok' => false,
            'reference' => $ref,
            'message' => 'Le serveur s\'est interrompu (référence ' . $ref . ').',
        ], JSON_UNESCAPED_UNICODE);
    });
}

/* ---------- réponses ---------- */

function json_ok(array $data = []): never {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data + ['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_erreur(string $message, int $code = 400, array $extra = []): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($extra + ['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Corps JSON de la requête, ou tableau vide. */
function json_corps(): array {
    $brut = file_get_contents('php://input') ?: '';
    $data = json_decode($brut, true);
    return is_array($data) ? $data : [];
}

function champ(array $d, string $cle, int $max = 500): string {
    return mb_substr(trim((string)($d[$cle] ?? '')), 0, $max);
}

/* ---------- CSRF (double soumission de cookie) ---------- */

/** Pose le cookie anti-CSRF s'il manque. À appeler sur chaque page HTML. */
function csrf_cookie(): string {
    $jeton = $_COOKIE[NHA_CSRF_COOKIE] ?? '';
    if ($jeton === '' || !preg_match('/^[a-f0-9]{32}$/', $jeton)) {
        $jeton = bin2hex(random_bytes(16));
        // httponly à false : nha.js doit pouvoir le lire, c'est le principe
        // même de la double soumission.
        setcookie(NHA_CSRF_COOKIE, $jeton, nha_cookie_options(86400 * 30, false));
        $_COOKIE[NHA_CSRF_COOKIE] = $jeton;
    }
    return $jeton;
}

/** Refuse la requête si le jeton d'en-tête ne correspond pas au cookie. */
function csrf_verifier(): void {
    $cookie = $_COOKIE[NHA_CSRF_COOKIE] ?? '';
    $entete = $_SERVER['HTTP_X_NHA_CSRF'] ?? '';
    if ($cookie === '') {
        // Le navigateur n'a jamais reçu le cookie : presque toujours un
        // problème de domaine ou de HTTPS, pas une expiration.
        json_erreur('Votre navigateur n\'accepte pas nos cookies de sécurité. '
            . 'Vérifiez que vous êtes bien sur https://needhelpapp.com et que '
            . 'les cookies ne sont pas bloqués.', 419);
    }
    if (!hash_equals($cookie, $entete)) {
        json_erreur('Votre page a expiré. Rechargez-la et recommencez.', 419);
    }
}

function exiger_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_erreur('Méthode non autorisée.', 405);
    }
}

/* ---------- limitation de débit ---------- */

function ip_binaire(): ?string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $bin = @inet_pton($ip);
    return $bin === false ? null : $bin;
}

/**
 * Refuse au-delà de $max tentatives échouées en $minutes minutes,
 * pour une adresse e-mail ou pour une IP. La table est commune à toutes
 * les applications : changer de sous-domaine ne remet pas le compteur à zéro.
 */
function limiter(?string $email, int $max = 8, int $minutes = 15): void {
    $st = nha_db()->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE success = 0
           AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND (email = ? OR (ip = ? AND ip IS NOT NULL))'
    );
    $st->execute([$minutes, $email !== null ? nha_normalise_email($email) : '', ip_binaire()]);
    if ((int)$st->fetchColumn() >= $max) {
        json_erreur('Trop de tentatives. Réessayez dans un quart d\'heure.', 429);
    }
}

function noter_tentative(?string $email, bool $succes): void {
    $st = nha_db()->prepare(
        'INSERT INTO login_attempts (email, ip, app_id, success)
         VALUES (?, ?, (SELECT id FROM apps WHERE code = ?), ?)'
    );
    $st->execute([$email !== null ? nha_normalise_email($email) : null,
                  ip_binaire(), nha_app_code(), $succes ? 1 : 0]);
}

/* ---------- e-mails ---------- */
// L'envoi vit dans includes/mailer.php : SMTP authentifié, avec repli
// sur mail() tant que le SMTP n'est pas configuré.
require_once __DIR__ . '/mailer.php';

function url_absolue(string $chemin): string {
    return 'https://needhelpapp.com' . $chemin;
}
