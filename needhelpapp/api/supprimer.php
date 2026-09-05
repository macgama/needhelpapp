<?php
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$compte = nha_current_account();
if (!$compte) { json_erreur('Non connecté.', 401); }

$d = json_corps();
if (champ($d, 'confirmation', 20) !== 'SUPPRIMER') {
    json_erreur('Écrivez SUPPRIMER en majuscules pour confirmer.');
}
if ($compte['password_hash'] && !password_verify((string)($d['mot_de_passe'] ?? ''), $compte['password_hash'])) {
    limiter($compte['email'], 5, 15);
    noter_tentative($compte['email'], false);
    json_erreur('Mot de passe incorrect.', 403);
}

$id = (int)$compte['id'];
$db = nha_db();
$db->beginTransaction();

// Suppression douce : l'adresse est neutralisée pour libérer l'unicité,
// les sessions tombent, et une purge planifiée efface définitivement
// après trente jours (voir tache-purge.php).
$db->prepare(
    'UPDATE accounts SET deleted_at = NOW(), email = CONCAT("supprime+", id, "@needhelpapp.invalid"),
            name = NULL, password_hash = NULL WHERE id = ?'
)->execute([$id]);
$db->prepare('DELETE FROM sessions WHERE account_id = ?')->execute([$id]);
$db->prepare('DELETE FROM identities WHERE account_id = ?')->execute([$id]);
$db->prepare('UPDATE subscriptions SET status = "resilie", cancel_at = NOW() WHERE payer_account_id = ?')->execute([$id]);
$db->commit();

nha_log(null, 'account_deleted', 'id=' . $id);
nha_logout();

json_ok(['redirection' => '/?supprime=1']);
