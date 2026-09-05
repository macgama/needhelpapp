<?php
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$d     = json_corps();
$email = champ($d, 'email', 190);
$mdp   = (string)($d['mot_de_passe'] ?? '');
$suite = champ($d, 'suite', 200);
if (!preg_match('#^/[a-z0-9/._-]*$#i', $suite)) { $suite = '/profil.php'; }

limiter($email);

$st = nha_db()->prepare(
    'SELECT id, password_hash FROM accounts WHERE email = ? AND deleted_at IS NULL'
);
$st->execute([nha_normalise_email($email)]);
$compte = $st->fetch();

// Message identique dans les deux cas : ne pas révéler quelles adresses existent.
$echec = 'Adresse e-mail ou mot de passe incorrect.';

if (!$compte || !$compte['password_hash']) {
    // Temps de calcul comparable à une vérification réelle, pour ne pas
    // laisser deviner l'existence du compte par la durée de la réponse.
    password_verify($mdp, '$argon2id$v=19$m=65536,t=4,p=1$YWFhYWFhYWFhYWFhYQ$0000000000000000000000000000000000000000000');
    noter_tentative($email, false);
    json_erreur($echec, 401);
}
if (!password_verify($mdp, $compte['password_hash'])) {
    noter_tentative($email, false);
    json_erreur($echec, 401);
}

// Rehachage si les paramètres de sécurité ont changé depuis l'inscription.
if (password_needs_rehash($compte['password_hash'], PASSWORD_ARGON2ID)) {
    nha_db()->prepare('UPDATE accounts SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($mdp, PASSWORD_ARGON2ID), $compte['id']]);
}

nha_start_session((int)$compte['id']);
nha_log((int)$compte['id'], 'login');
noter_tentative($email, true);

json_ok(['redirection' => $suite]);
