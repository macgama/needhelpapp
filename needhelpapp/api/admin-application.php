<?php
/**
 * Changer l'état d'une application.
 *
 * Sert surtout à en fermer une le temps d'une mise à jour : mieux vaut
 * une page qui explique qu'une erreur de base au milieu d'une dictée.
 *
 * L'état vit dans `apps.status`, que l'accueil du portail lit déjà. Les
 * applications, elles, doivent l'interroger : nha_app_ouverte() est là
 * pour cela, dans le socle commun.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../admin/_socle.php';

exiger_post();
csrf_verifier();
$moi = nha_admin_exiger_json();

const ETATS = ['en_ligne', 'maintenance', 'construction', 'etude', 'archive'];

$d = json_corps();
$id = (int) ($d['id'] ?? 0);
$etat = champ($d, 'statut', 16);

if (!in_array($etat, ETATS, true)) {
    json_erreur('État inconnu.', 400);
}

$st = nha_db()->prepare('SELECT id, code, name, status FROM apps WHERE id = ?');
$st->execute([$id]);
$app = $st->fetch();
if (!$app) {
    json_erreur('Application introuvable.', 404);
}

/* Fermer le portail lui-même n'aurait aucun sens : on se coupe l'accès
   à la page qui permettrait de le rouvrir. */
if ($app['code'] === 'portail' && $etat !== 'en_ligne') {
    json_erreur('Le portail ne peut pas être fermé : c\'est par lui qu\'on rouvre '
              . 'les autres. Fermez les applications une par une.', 409);
}

nha_db()->prepare('UPDATE apps SET status = ? WHERE id = ?')->execute([$etat, $id]);
nha_log((int) $moi['id'], 'app_statut', $app['code'] . ' : ' . $app['status'] . ' → ' . $etat);

$libelles = [
    'en_ligne'     => 'ouverte',
    'maintenance'  => 'fermée pour mise à jour',
    'construction' => 'en construction',
    'etude'        => 'à l\'étude',
    'archive'      => 'archivée',
];

json_ok([
    'statut'  => $etat,
    'message' => $app['name'] . ' est désormais ' . $libelles[$etat] . '.',
]);
