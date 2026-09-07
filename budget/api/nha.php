<?php
/**
 * Le pont entre budget et le portail NeedHelpApp.
 *
 * Copié depuis familyshop, où il a fait ses preuves, avec pour seule
 * différence le code d'application. Rien n'y est propre au budget : la
 * connexion, l'inscription, Google et l'abonnement se règlent au portail,
 * dont le cookie « nha_session », posé sur .needhelpapp.com, vaut pour
 * tous les sous-domaines.
 *
 * budget garde tout de même sa table `users`. Ce n'est pas un doublon :
 * livres, comptes, opérations et emprunts s'y rattachent par une clé
 * étrangère. Elle sert de point d'ancrage local, relié au compte central
 * par `account_id`.
 *
 * Un compte du portail qui arrive pour la première fois voit sa ligne
 * locale créée à la volée. budget n'ayant jamais eu de comptes à lui, le
 * rattrapage par adresse hérité de familyshop ne servira sans doute
 * jamais — on le garde tel quel plutôt que de faire diverger un fichier
 * qui doit rester identique d'une application à l'autre.
 */

declare(strict_types=1);

/* Le code de l'application, posé dès le chargement du fichier.
   « SetEnv NHA_APP budget » dans le .htaccess ne parvient pas toujours à
   PHP — c'est fréquent en PHP-FPM. Sans ce garde-fou, les droits seraient
   lus pour « portail » et l'abonnement paraîtrait absent. */
if (!getenv('NHA_APP')) {
    putenv('NHA_APP=budget');
    $_ENV['NHA_APP'] = 'budget';
    $_SERVER['NHA_APP'] = 'budget';
}

/**
 * Ajoute la raison technique au message, si la configuration le demande.
 *
 * « Service momentanément indisponible » protège l'utilisateur d'un jargon
 * inutile, mais empêche celui qui installe le site de savoir ce qui cloche.
 * Mettez 'portail_debug' => true dans api/config.php le temps de régler,
 * puis retirez-le.
 */
function nhaRaison(string $message, Throwable $e): string
{
    $debug = false;
    try {
        $c = config();
        $debug = !empty($c['portail_debug']);
    } catch (Throwable $x) { /* configuration illisible : on reste discret */ }
    return $debug ? ($message . ' — ' . $e->getMessage()) : $message;
}

/** Le socle du portail est-il présent et lisible ? */
function nhaDisponible(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    $socle = __DIR__ . '/../includes/nha-core.php';
    if (!is_file($socle)) {
        return $ok = false;
    }
    require_once $socle;
    return $ok = function_exists('nha_current_account');
}

/**
 * Le compte du portail, ou null.
 * Toute erreur de base est avalée : si la base centrale est indisponible,
 * budget doit rester consultable plutôt que de rendre une page blanche.
 */
function nhaCompte(): ?array
{
    static $memo = false;
    if ($memo !== false) {
        return $memo;
    }
    if (!nhaDisponible()) {
        return $memo = null;
    }
    try {
        return $memo = nha_current_account();
    } catch (Throwable $e) {
        /* nha_current_account() ne fait pas que lire : elle met à jour la
           date de dernière visite et rattache l'application. Un utilisateur
           MySQL n'ayant que le droit de lecture sur la base centrale fait
           donc échouer toute la connexion, silencieusement. */
        error_log('[budget] portail injoignable : ' . $e->getMessage());
        return $memo = null;
    }
}

/**
 * La ligne locale correspondant à un compte du portail.
 * Créée si elle manque, rapprochée par l'adresse si le compte existait
 * dans budget avant la mise en place du portail.
 */
function nhaUtilisateurLocal(array $compte): ?array
{
    $accountId = (int) $compte['id'];
    $email = strtolower(trim((string) $compte['email']));
    $nom = (string) ($compte['name'] ?? '');

    try {
        // 1. déjà rattaché
        $st = db()->prepare('SELECT * FROM users WHERE account_id = ?');
        $st->execute([$accountId]);
        $u = $st->fetch();

        // 2. un compte budget antérieur porte la même adresse : on le relie
        if (!$u) {
            $st = db()->prepare('SELECT * FROM users WHERE email = ? AND (account_id IS NULL OR account_id = 0)');
            $st->execute([$email]);
            $u = $st->fetch();
            if ($u) {
                db()->prepare('UPDATE users SET account_id = ? WHERE id = ?')
                    ->execute([$accountId, (int) $u['id']]);
                $u['account_id'] = $accountId;
                error_log('[budget] compte existant rattaché au portail : ' . $email);
            }
        }

        // 3. premier passage : on crée l'ancrage local
        if (!$u) {
            /* On ne nomme que les trois colonnes qui nous appartiennent.
               Toutes les autres ont une valeur par défaut dans le schéma :
               les répéter ici, c'était tenir deux définitions en accord —
               et la première version écrivait dans « password », colonne
               qui n'existe pas, ce qui empêchait tout nouveau compte
               d'entrer dans budget. */
            db()->prepare(
                'INSERT INTO users (account_id, email, name) VALUES (?, ?, ?)'
            )->execute([$accountId, $email, $nom]);
            $st = db()->prepare('SELECT * FROM users WHERE account_id = ?');
            $st->execute([$accountId]);
            $u = $st->fetch();
        }

        // l'adresse et le prénom suivent le portail, qui en est la source
        if ($u && ($u['email'] !== $email || (string) $u['name'] !== $nom)) {
            db()->prepare('UPDATE users SET email = ?, name = ? WHERE id = ?')
                ->execute([$email, $nom, (int) $u['id']]);
            $u['email'] = $email;
            $u['name'] = $nom;
        }
        return $u ?: null;
    } catch (Throwable $e) {
        error_log('[budget] rattachement impossible : ' . $e->getMessage());
        return null;
    }
}

/**
 * L'abonnement, tel que le portail le voit.
 * Un abonnement pris depuis une autre application vaut ici : c'est tout
 * l'intérêt d'une facturation centrale.
 */
function nhaAbonnement(int $accountId): array
{
    if (!nhaDisponible()) {
        return ['plan' => 'gratuit', 'status' => 'aucun', 'until' => null];
    }
    try {
        return nha_entitlement($accountId, 'budget');
    } catch (Throwable $e) {
        error_log('[budget] droits illisibles : ' . $e->getMessage());
        return ['plan' => 'gratuit', 'status' => 'aucun', 'until' => null];
    }
}

/* =====================================================================
   S'inscrire et se connecter DEPUIS budget

   L'utilisateur n'a pas à quitter l'application qu'il utilise : le
   formulaire reste ici, mais le compte créé et la session ouverte sont
   ceux du portail. La connexion vaut donc immédiatement partout.

   C'est le rôle même de includes/nha-core.php, « déposé à l'identique
   dans chaque application » : chacune peut ouvrir une session commune.
   ===================================================================== */

/**
 * Vérifie un mot de passe contre le compte central et ouvre la session.
 * @return array ['ok'=>bool, 'erreur'=>?string, 'compte'=>?array]
 */
function nhaConnexion(string $email, string $motDePasse): array
{
    if (!nhaDisponible()) {
        return ['ok' => false, 'erreur' => 'portail indisponible'];
    }

    try {
        // à l'intérieur du bloc protégé : cette fonction dépend de mbstring,
        // et son absence ne doit pas remonter en erreur 500
        $email = nha_normalise_email($email);

        $st = nha_db()->prepare(
            'SELECT id, email, name, password_hash FROM accounts
             WHERE email = ? AND deleted_at IS NULL'
        );
        $st->execute([$email]);
        $compte = $st->fetch();

        // même message dans les deux cas : dire « ce compte n'existe pas »
        // révélerait quelles adresses sont inscrites
        if (!$compte || !$compte['password_hash']
            || !password_verify($motDePasse, (string) $compte['password_hash'])) {
            return ['ok' => false, 'erreur' => 'adresse ou mot de passe incorrect'];
        }

        // le hachage se met à jour si les réglages de PHP ont changé
        if (password_needs_rehash((string) $compte['password_hash'], PASSWORD_ARGON2ID)) {
            nha_db()->prepare('UPDATE accounts SET password_hash = ? WHERE id = ?')
                    ->execute([password_hash($motDePasse, PASSWORD_ARGON2ID), (int) $compte['id']]);
        }

        nha_start_session((int) $compte['id']);
        nha_attach_app((int) $compte['id'], 'budget');
        nha_log((int) $compte['id'], 'login', 'budget');
        return ['ok' => true, 'compte' => $compte];
    } catch (Throwable $e) {
        error_log('[budget] connexion au portail impossible : ' . $e->getMessage());
        return ['ok' => false, 'erreur' => nhaRaison('service momentanément indisponible', $e)];
    }
}

/**
 * Crée un compte central depuis budget et ouvre la session.
 * Si l'adresse existe déjà, on ne crée rien : on le dit, et on invite à se
 * connecter — c'est le comportement du portail, et il évite les doublons.
 */
function nhaInscription(string $email, string $motDePasse, string $nom): array
{
    if (!nhaDisponible()) {
        return ['ok' => false, 'erreur' => 'portail indisponible'];
    }
    try {
        $res = nha_register($email, $motDePasse, $nom !== '' ? $nom : null);

        if ($res['status'] === 'already_exists') {
            $ou = $res['lookup']['apps'] ?? [];
            return [
                'ok' => false,
                'existe' => true,
                'erreur' => 'Cette adresse a déjà un compte'
                    . (count($ou) ? ' — créé via ' . $ou[0] : '')
                    . '. Connecte-toi plutôt.',
            ];
        }

        nha_start_session((int) $res['account_id']);
        return ['ok' => true, 'account_id' => (int) $res['account_id']];
    } catch (InvalidArgumentException $e) {
        return ['ok' => false, 'erreur' => 'cette adresse e-mail n\'est pas valide'];
    } catch (Throwable $e) {
        error_log('[budget] inscription au portail impossible : ' . $e->getMessage());
        return ['ok' => false, 'erreur' => nhaRaison('service momentanément indisponible', $e)];
    }
}

/** Connexion Google, rattachée au compte central. */
function nhaGoogle(string $sub, string $email, bool $verifie, string $nom): array
{
    if (!nhaDisponible()) {
        return ['ok' => false, 'erreur' => 'portail indisponible'];
    }
    /* Un identifiant ou une adresse vides viennent forcément d'une erreur
       d'appel, pas de Google. Le dire tout de suite évite de chercher la
       panne dans la base centrale. */
    if ($sub === '' || $email === '') {
        error_log('[budget] appel Google incomplet : sub="' . $sub . '" email="' . $email . '"');
        return ['ok' => false, 'erreur' => 'identifiant Google incomplet'];
    }
    try {
        $id = nha_login_google($sub, $email, $verifie, $nom !== '' ? $nom : null);
        nha_start_session($id);
        return ['ok' => true, 'account_id' => $id];
    } catch (Throwable $e) {
        error_log('[budget] connexion Google impossible : ' . $e->getMessage());
        return ['ok' => false, 'erreur' => nhaRaison('service momentanément indisponible', $e)];
    }
}

/**
 * L'application est-elle ouverte, ou fermée pour mise à jour ?
 *
 * L'état vit dans le catalogue du portail. Fermer un sous-domaine le
 * temps d'un déploiement vaut mieux qu'une erreur de base au milieu
 * d'un exercice.
 *
 * En cas de doute — portail absent, base injoignable — on répond oui :
 * fermer un site parce qu'on n'a pas pu lire son état serait la pire
 * des réactions.
 */
function nhaOuverte(): bool
{
    if (!nhaDisponible() || !function_exists('nha_app_ouverte')) {
        return true;
    }
    try {
        return nha_app_ouverte();
    } catch (Throwable $e) {
        error_log('[' . nha_app_code() . '] état illisible : ' . $e->getMessage());
        return true;
    }
}

/** Les adresses du portail, pour y renvoyer l'utilisateur. */
function nhaUrl(string $chemin = '/'): string
{
    return 'https://needhelpapp.com' . $chemin;
}

function nhaUrlConnexion(): string
{
    $retour = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'budget.needhelpapp.com') . '/';
    return nhaUrl('/connexion.php?retour=' . rawurlencode($retour));
}

function nhaUrlInscription(): string
{
    $retour = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'budget.needhelpapp.com') . '/';
    return nhaUrl('/inscription.php?retour=' . rawurlencode($retour));
}

/* Le mot de passe oublié reste au portail : lui seul sait envoyer les
   courriels de réinitialisation et gérer les jetons. Le dupliquer ici
   ferait deux mécanismes à tenir en accord. */
function nhaUrlMotDePasse(): string
{
    return nhaUrl('/mot-de-passe-oublie.php');
}
