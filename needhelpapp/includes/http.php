<?php
/**
 * NeedHelpApp — utilitaires communs aux endpoints /api.
 * Chargé par tous les scripts qui répondent en JSON.
 */

declare(strict_types=1);
require_once __DIR__ . '/nha-core.php';

/** Doit correspondre à NHA_BUILD_CORE. Voir includes/nha-core.php. */
const NHA_BUILD_HTTP = '2026-09-17.1';

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
    /* LA DOUBLE SOUMISSION NE SUFFIT PAS SEULE, ICI.
     *
     * Le cookie nha_csrf est posé sur .needhelpapp.com — il le faut, la
     * connexion vaut sur tous les sous-domaines. Mais un cookie de
     * domaine parent s'ÉCRIT aussi depuis n'importe lequel d'entre eux :
     * une faille sur teaching. ou familyshop. permettrait d'y poser un
     * jeton choisi, puis de forger une requête vers le portail avec le
     * même jeton en en-tête. La comparaison ci-dessous serait alors
     * parfaitement satisfaite — et elle aurait raison de l'être, les
     * deux valeurs correspondant bel et bien.
     *
     * Sec-Fetch-Site ferme cette porte. C'est le NAVIGATEUR qui le pose,
     * jamais la page, et il distingue « same-origin » de « same-site » —
     * c'est-à-dire justement le sous-domaine voisin.
     *
     * On ne refuse QUE ce qui se déclare étranger. Un en-tête absent est
     * un navigateur qui ne le connaît pas, pas une attaque : fermer
     * là-dessus exclurait des gens sans rien gagner, le jeton restant
     * exigé dans tous les cas. Aucune page du projet n'appelle l'API
     * d'un autre sous-domaine — c'est vérifiable, et c'est ce qui permet
     * ce contrôle sans rien casser.
     */
    $provenance = (string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '');
    if ($provenance !== '' && $provenance !== 'same-origin' && $provenance !== 'none') {
        json_erreur('Cette requête ne vient pas de nos pages.', 403);
    }

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
 * La clé sous laquelle une tentative est comptée.
 *
 * UNE DEMANDE DE MOT DE PASSE OUBLIÉ N'EST PAS UNE TENTATIVE DE
 * CONNEXION, ET C'EST TOUT L'OBJET DE CETTE FONCTION.
 *
 * Les deux tombaient dans le même seau. Comme limiter() compte « cette
 * adresse OU cette IP », huit demandes de réinitialisation lancées sur
 * une adresse connue suffisaient à empêcher son propriétaire de se
 * connecter pendant un quart d'heure, depuis n'importe où. Le jeton
 * anti-CSRF n'y changeait rien : celui qui attaque se le délivre à
 * lui-même. L'inscription ouvrait exactement la même porte, en signalant
 * un échec chaque fois qu'une adresse existait déjà.
 *
 * Préfixer la clé sépare les comptages sans toucher aux index :
 * « reinit:paul@exemple.ch » et « paul@exemple.ch » ne se rencontrent
 * plus. Le préfixe reste lisible tel quel dans /admin/journal.php, où il
 * dit désormais de quel genre d'échec il s'agissait.
 *
 * L'adresse est tronquée AVANT d'être préfixée : la colonne fait 190
 * caractères, et une adresse à la limite ferait déborder la clé — donc,
 * en base stricte, échouer l'écriture au pire moment.
 *
 * (teaching tranche la même question avec une colonne « kind ». C'est
 * plus propre, et cela demande une migration sur une table que quatre
 * applications interrogent : à faire le jour où une troisième sorte de
 * tentative apparaîtra.)
 */
function cle_tentative(?string $email, string $portee = 'connexion'): ?string {
    if ($email === null) { return null; }
    $prefixe = $portee === 'connexion' ? '' : $portee . ':';
    return $prefixe . mb_substr(nha_normalise_email($email), 0, 190 - mb_strlen($prefixe));
}

/**
 * Refuse au-delà de $max tentatives échouées en $minutes minutes,
 * pour une adresse e-mail ou pour une IP. La table est commune à toutes
 * les applications : changer de sous-domaine ne remet pas le compteur à zéro.
 *
 * $portee sépare les comptages. Voir cle_tentative().
 */
function limiter(?string $email, int $max = 8, int $minutes = 15,
                 string $portee = 'connexion'): void {
    $st = nha_db()->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE success = 0
           AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND (email = ? OR (ip = ? AND ip IS NOT NULL))'
    );
    $st->execute([$minutes, cle_tentative($email, $portee) ?? '', ip_binaire()]);
    if ((int)$st->fetchColumn() >= $max) {
        json_erreur('Trop de tentatives. Réessayez dans un quart d\'heure.', 429);
    }
}

function noter_tentative(?string $email, bool $succes,
                         string $portee = 'connexion'): void {
    $st = nha_db()->prepare(
        'INSERT INTO login_attempts (email, ip, app_id, success)
         VALUES (?, ?, (SELECT id FROM apps WHERE code = ?), ?)'
    );
    $st->execute([cle_tentative($email, $portee),
                  ip_binaire(), nha_app_code(), $succes ? 1 : 0]);
}

/* ---------- e-mails ---------- */
// L'envoi vit dans includes/mailer.php : SMTP authentifié, avec repli
// sur mail() tant que le SMTP n'est pas configuré.
require_once __DIR__ . '/mailer.php';

function url_absolue(string $chemin): string {
    return 'https://needhelpapp.com' . $chemin;
}
