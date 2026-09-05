<?php
/**
 * Connexion Google.
 *
 * Le bouton Google (bibliothèque Google Identity Services) produit un jeton
 * d'identité signé — un JWT. Ce script le vérifie auprès de Google, puis
 * ouvre une session NeedHelpApp.
 *
 * Aucun secret client n'est nécessaire : ce flux n'utilise que
 * l'identifiant client, qui est public par nature.
 *
 * Le point critique : ne JAMAIS faire confiance au contenu du jeton sans
 * l'avoir fait valider par Google, et vérifier ensuite que le champ « aud »
 * correspond bien à NOTRE identifiant client. Sans ce second contrôle,
 * n'importe quel jeton Google valide — émis pour un autre site — ouvrirait
 * une session ici.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$clientId = (string)nha_config('google_client_id', '');
if ($clientId === '') {
    json_erreur('La connexion Google n\'est pas activée sur ce site.', 501);
}

$d      = json_corps();
$jeton  = (string)($d['credential'] ?? '');
$suite  = champ($d, 'suite', 200);
if (!preg_match('#^/[a-z0-9/._-]*$#i', $suite)) { $suite = '/profil.php'; }
if ($jeton === '' || substr_count($jeton, '.') !== 2) {
    json_erreur('Jeton Google absent ou malformé.', 400);
}

/* ---------- Vérification auprès de Google ---------- */
$ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($jeton));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$reponse = curl_exec($ch);
$code    = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($reponse === false || $code !== 200) {
    json_erreur('Google n\'a pas validé cette connexion. Réessayez.', 401);
}
$info = json_decode((string)$reponse, true);
if (!is_array($info)) { json_erreur('Réponse Google illisible.', 502); }

/* ---------- Contrôles obligatoires ---------- */
$emetteurs = ['accounts.google.com', 'https://accounts.google.com'];
if (!in_array($info['iss'] ?? '', $emetteurs, true)) {
    json_erreur('Émetteur du jeton inattendu.', 401);
}
if (!hash_equals($clientId, (string)($info['aud'] ?? ''))) {
    // Jeton valide, mais émis pour une autre application.
    json_erreur('Ce jeton ne nous est pas destiné.', 401);
}
if ((int)($info['exp'] ?? 0) < time()) {
    json_erreur('Jeton expiré. Réessayez.', 401);
}

$sub    = (string)($info['sub'] ?? '');
$email  = (string)($info['email'] ?? '');
$verifie = ($info['email_verified'] ?? '') === 'true' || ($info['email_verified'] ?? false) === true;
$nom    = (string)($info['given_name'] ?? ($info['name'] ?? ''));

if ($sub === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_erreur('Google n\'a pas transmis d\'adresse utilisable.', 400);
}

/* ---------- Ouverture de session ----------
   nha_login_google() rattache l'identité Google à un compte existant si
   l'adresse vérifiée correspond déjà. C'est ce qui évite qu'une personne
   inscrite par mot de passe se retrouve avec un second compte. */
try {
    $accountId = nha_login_google($sub, $email, $verifie, $nom !== '' ? $nom : null);
} catch (Throwable $e) {
    error_log('[NeedHelpApp] connexion Google : ' . $e->getMessage());
    json_erreur('Nous n\'arrivons pas à ouvrir votre compte. Réessayez ou utilisez un mot de passe.', 500);
}

// Une adresse validée par Google n'a pas besoin d'être reconfirmée par nous.
if ($verifie) {
    nha_db()->prepare(
        'UPDATE accounts SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?'
    )->execute([$accountId]);
}

nha_start_session($accountId);
nha_log($accountId, 'login', 'google');
noter_tentative($email, true);

json_ok(['redirection' => $suite]);
