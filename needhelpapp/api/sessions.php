<?php
/** Ferme toutes les sessions du compte sauf celle en cours. */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$compte = nha_current_account();
if (!$compte) { json_erreur('Non connecté.', 401); }

$st = nha_db()->prepare('DELETE FROM sessions WHERE account_id = ? AND token_hash <> ?');
$st->execute([$compte['id'], hash('sha256', $_COOKIE[NHA_COOKIE] ?? '')]);
nha_log((int)$compte['id'], 'sessions_closed', (string)$st->rowCount());

json_ok(['message' => $st->rowCount() . ' session(s) fermée(s). Cet appareil reste connecté.']);
