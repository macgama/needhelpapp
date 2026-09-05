<?php
/**
 * Identité et droits du compte connecté, en JSON.
 *
 * C'est LE point d'entrée pour toute application qui ne partagerait pas
 * le même serveur MySQL. Aujourd'hui teaching lit directement la base
 * centrale ; si une application part ailleurs demain, elle appelle cette
 * URL avec le cookie de session et obtient la même information.
 *
 *   GET https://needhelpapp.com/api/moi.php   (cookie nha_session requis)
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

$compte = nha_current_account();
if (!$compte) { json_erreur('Non connecté.', 401); }

$droit = nha_entitlement((int)$compte['id'], $_GET['app'] ?? null);

$st = nha_db()->prepare(
    'SELECT p.code, p.name, au.role FROM app_users au
     JOIN apps p ON p.id = au.app_id WHERE au.account_id = ? ORDER BY p.position'
);
$st->execute([$compte['id']]);

json_ok([
    'compte' => [
        'uuid'     => $compte['uuid'],
        'email'    => $compte['email'],
        'prenom'   => $compte['name'],
        'verifie'  => $compte['email_verified_at'] !== null,
        'role'     => $compte['role'],
        'inscrit_le' => $compte['created_at'],
    ],
    'droits'       => $droit,
    'applications' => $st->fetchAll(),
]);
