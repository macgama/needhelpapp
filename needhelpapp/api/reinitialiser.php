<?php
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$d     = json_corps();
$jeton = champ($d, 'jeton', 64);
$mdp   = (string)($d['mot_de_passe'] ?? '');

if (!preg_match('/^[a-f0-9]{64}$/', $jeton)) {
    json_erreur('Ce lien n\'est pas valable.', 400);
}
if (mb_strlen($mdp) < 10) {
    json_erreur('Le mot de passe doit faire au moins dix caractères.');
}

$db = nha_db();
$st = $db->prepare(
    'SELECT id, account_id FROM action_tokens
     WHERE token_hash = ? AND purpose = "reset_password"
       AND used_at IS NULL AND expires_at > NOW()'
);
$st->execute([hash('sha256', $jeton)]);
$ligne = $st->fetch();
if (!$ligne) {
    json_erreur('Ce lien a expiré ou a déjà servi. <a href="/mot-de-passe-oublie.php">Demandez-en un nouveau</a>.', 410);
}

$db->beginTransaction();
$db->prepare('UPDATE accounts SET password_hash = ?, pwd_version = pwd_version + 1 WHERE id = ?')
   ->execute([password_hash($mdp, PASSWORD_ARGON2ID), $ligne['account_id']]);
$db->prepare('UPDATE action_tokens SET used_at = NOW() WHERE id = ?')->execute([$ligne['id']]);
// Toutes les sessions tombent : si quelqu'un d'autre était connecté, il sort.
$db->prepare('DELETE FROM sessions WHERE account_id = ?')->execute([$ligne['account_id']]);
$db->commit();

nha_log((int)$ligne['account_id'], 'password_reset');
nha_start_session((int)$ligne['account_id']);

json_ok(['redirection' => '/profil.php']);
