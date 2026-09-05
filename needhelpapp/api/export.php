<?php
/** Export complet des données du compte, au format JSON (droit d'accès). */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

$compte = nha_current_account();
if (!$compte) { header('Location: /connexion.php?suite=/profil.php'); exit; }
$id = (int)$compte['id'];

function tout(string $sql, array $p = []): array {
    $st = nha_db()->prepare($sql); $st->execute($p); return $st->fetchAll();
}

$export = [
  'genere_le' => date('c'),
  'compte' => [
    'uuid' => $compte['uuid'], 'email' => $compte['email'], 'prenom' => $compte['name'],
    'langue' => $compte['lang'], 'role' => $compte['role'],
    'inscrit_le' => $compte['created_at'], 'derniere_connexion' => $compte['last_login_at'],
  ],
  'connexions_externes' => tout('SELECT provider, linked_at FROM identities WHERE account_id = ?', [$id]),
  'applications' => tout(
    'SELECT p.code, p.name, au.role, au.first_seen_at, au.last_seen_at
     FROM app_users au JOIN apps p ON p.id = au.app_id WHERE au.account_id = ?', [$id]),
  'abonnements' => tout(
    'SELECT s.plan, s.period, s.status, s.started_at, s.current_period_end, s.cancel_at
     FROM subscription_seats seat JOIN subscriptions s ON s.id = seat.subscription_id
     WHERE seat.account_id = ?', [$id]),
  'sessions_ouvertes' => tout(
    'SELECT created_at, last_seen_at, expires_at, user_agent FROM sessions
     WHERE account_id = ? AND expires_at > NOW()', [$id]),
  'journal' => tout(
    'SELECT event, detail, created_at FROM audit_log WHERE account_id = ? ORDER BY created_at DESC LIMIT 500', [$id]),
];

// Les données métier vivent dans la base de chaque application.
// Ajoutez ici un bloc par application, en interrogeant sa base :
// $export['apprentissage'] = tout('SELECT ... FROM 6l3nq9_teaching.attempts WHERE user_id = ?', [$id]);

nha_log($id, 'export');

header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="needhelpapp-mes-donnees-' . date('Y-m-d') . '.json"');
echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
