<?php
/** Modification du prénom, de l'adresse e-mail et du mot de passe. */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$compte = nha_current_account();
if (!$compte) { json_erreur('Non connecté.', 401); }

$d       = json_corps();
$prenom  = champ($d, 'prenom', 60);
$email   = nha_normalise_email(champ($d, 'email', 190));
$nouveau = (string)($d['mot_de_passe'] ?? '');
$actuel  = (string)($d['mot_de_passe_actuel'] ?? '');

$db = nha_db();
$changements = [];

// Le prénom seul ne demande pas de confirmation.
if ($prenom !== (string)$compte['name']) {
    $db->prepare('UPDATE accounts SET name = ? WHERE id = ?')->execute([$prenom, $compte['id']]);
    $changements[] = 'prénom';
}

$sensible = ($email !== $compte['email']) || $nouveau !== '';
if ($sensible) {
    if (!$compte['password_hash']) {
        json_erreur('Votre compte utilise la connexion Google. Définissez d\'abord un mot de passe via <a href="/mot-de-passe-oublie.php">la page de récupération</a>.', 400);
    }
    if (!password_verify($actuel, $compte['password_hash'])) {
        limiter($compte['email'], 6, 15);
        noter_tentative($compte['email'], false);
        json_erreur('Le mot de passe actuel est incorrect.', 403);
    }
}

if ($nouveau !== '') {
    if (mb_strlen($nouveau) < 10) { json_erreur('Le nouveau mot de passe doit faire au moins dix caractères.'); }
    $db->prepare('UPDATE accounts SET password_hash = ?, pwd_version = pwd_version + 1 WHERE id = ?')
       ->execute([password_hash($nouveau, PASSWORD_ARGON2ID), $compte['id']]);
    $db->prepare('DELETE FROM sessions WHERE account_id = ? AND token_hash <> ?')
       ->execute([$compte['id'], hash('sha256', $_COOKIE[NHA_COOKIE] ?? '')]);
    nha_log((int)$compte['id'], 'password_change');
    $changements[] = 'mot de passe';
}

// L'adresse ne change qu'une fois confirmée depuis la NOUVELLE boîte :
// sinon une session volée suffirait à détourner le compte.
if ($email !== $compte['email']) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { json_erreur('Cette adresse ne semble pas valide.'); }
    $st = $db->prepare('SELECT 1 FROM accounts WHERE email = ? AND id <> ?');
    $st->execute([$email, $compte['id']]);
    if ($st->fetchColumn()) { json_erreur('Cette adresse est déjà utilisée par un autre compte.', 409); }

    $jeton = bin2hex(random_bytes(32));
    $db->prepare(
        'INSERT INTO action_tokens (account_id, purpose, token_hash, payload, expires_at)
         VALUES (?, "verify_email", ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))'
    )->execute([$compte['id'], hash('sha256', $jeton),
                json_encode(['nouvel_email' => $email], JSON_UNESCAPED_UNICODE)]);

    nha_mail($email, 'Confirmez votre nouvelle adresse NeedHelpApp',
        "Bonjour,\n\nConfirmez le changement d'adresse en ouvrant ce lien (valable 24 h) :\n"
        . url_absolue('/verifier.php?jeton=' . $jeton)
        . "\n\nTant que ce lien n'est pas ouvert, votre ancienne adresse reste active.\n");

    json_ok(['message' => 'Un lien de confirmation vient de partir vers ' . htmlspecialchars($email)
        . '. Votre adresse actuelle reste valable jusqu\'à ce que vous l\'ouvriez.']);
}

json_ok(['message' => $changements
    ? 'Enregistré : ' . implode(', ', $changements) . '.'
    : 'Rien n\'a changé.']);
