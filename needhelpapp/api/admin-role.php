<?php
/**
 * Changer le rôle d'un compte.
 *
 * Le rôle est global : il n'existe pas d'administrateur d'une seule
 * application. Deux garde-fous, et ils comptent : sans eux, une fausse
 * manœuvre laisserait NeedHelpApp sans personne pour y accéder, et il
 * faudrait repasser par phpMyAdmin.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../admin/_socle.php';

exiger_post();
csrf_verifier();

$moi = nha_admin_exiger_json();

$d     = json_corps();
$cible = (int) ($d['compte'] ?? 0);
$role  = champ($d, 'role', 16);

if (!in_array($role, ['membre', 'moderateur', 'admin'], true)) {
    json_erreur('Rôle inconnu.', 400);
}
if ($cible <= 0) {
    json_erreur('Compte non désigné.', 400);
}

$st = nha_db()->prepare('SELECT id, email, name, role FROM accounts WHERE id = ? AND deleted_at IS NULL');
$st->execute([$cible]);
$compte = $st->fetch();
if (!$compte) {
    json_erreur('Compte introuvable.', 404);
}

// on ne se retire pas soi-même les clés de la maison
if ((int) $compte['id'] === (int) $moi['id'] && $role !== 'admin') {
    json_erreur('Vous ne pouvez pas retirer votre propre accès d\'administration. '
              . 'Demandez à un autre administrateur de le faire.', 409);
}

// et l'on ne retire pas le dernier administrateur
if ($compte['role'] === 'admin' && $role !== 'admin') {
    $n = (int) nha_db()->query(
        "SELECT COUNT(*) FROM accounts WHERE role = 'admin' AND deleted_at IS NULL"
    )->fetchColumn();
    if ($n <= 1) {
        json_erreur('C\'est le dernier administrateur : nommez quelqu\'un d\'autre avant.', 409);
    }
}

if ($compte['role'] === $role) {
    json_ok(['message' => 'Ce compte avait déjà ce rôle.', 'role' => $role]);
}

nha_db()->prepare('UPDATE accounts SET role = ? WHERE id = ?')->execute([$role, $cible]);
nha_log($cible, 'role_change', $compte['role'] . ' → ' . $role . ' (par ' . $moi['email'] . ')');

/* Un modérateur accède à tout sans payer : le cache d'abonnement doit
   suivre, sinon les applications continueraient de le croire non abonné
   jusqu'au prochain passage d'un webhook. */
try { nha_refresh_cache($cible); } catch (Throwable $e) { }

json_ok([
    'message' => e($compte['email']) . ' est désormais ' . mb_strtolower(nha_admin_role($role)) . '.',
    'role'    => $role,
]);
