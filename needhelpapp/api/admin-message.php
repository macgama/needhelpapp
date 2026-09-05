<?php
/**
 * Marquer un message comme traité, ou le remettre en attente.
 *
 * `handled_at` existait dans le schéma sans que rien ne s'en serve : on
 * date plutôt qu'on ne coche, pour savoir aussi QUAND c'est parti.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../admin/_socle.php';

exiger_post();
csrf_verifier();
$moi = nha_admin_exiger_json();

$d = json_corps();
$quoi = champ($d, 'action', 16) ?: 'traiter';
$id = (int) ($d['id'] ?? 0);
if ($id <= 0) {
    json_erreur('Message non désigné.', 400);
}

$st = nha_db()->prepare('SELECT id, prenom, email, besoin FROM ideas WHERE id = ?');
$st->execute([$id]);
$message = $st->fetch();
if (!$message) {
    json_erreur('Message introuvable.', 404);
}
$nom = $message['prenom'] ?: explode('@', (string) $message['email'])[0];

/* ---------------------------------------------------------------
   Répondre depuis l'administration

   Passer par sa messagerie oblige à sortir de l'application, à
   retrouver l'adresse, à recopier le contexte. Répondre ici, avec le
   message d'origine sous les yeux, prend dix secondes.
   --------------------------------------------------------------- */
if ($quoi === 'repondre') {
    $texte = trim((string) ($d['texte'] ?? ''));
    if (mb_strlen($texte) < 10) {
        json_erreur('Écrivez une réponse un peu plus longue.', 400);
    }
    $corps = $texte . "\n\n"
        . "-- \n"
        . "NeedHelpApp\n"
        . "https://needhelpapp.com\n\n"
        . "----- votre message du " . date('d.m.Y') . " -----\n"
        . $message['besoin'] . "\n";

    $parti = nha_mail((string) $message['email'], 'Votre message à NeedHelpApp', $corps);
    if (!$parti) {
        json_erreur('L\'envoi a échoué. Vérifiez la configuration avec '
                  . 'api/mail-test.php — le message reste ici, rien n\'est perdu.', 502);
    }

    /* Répondre, c'est traiter : on ne demande pas de le marquer en plus. */
    nha_db()->prepare('UPDATE ideas SET handled_at = ? WHERE id = ?')
            ->execute([date('Y-m-d H:i:s'), $id]);
    nha_log((int) $moi['id'], 'message_repondu', (string) $message['email']);

    json_ok(['traite' => true, 'repondu' => true,
             'message' => 'Réponse envoyée à ' . $nom . ', et message marqué traité.']);
}

/* ---------------------------------------------------------------
   Supprimer

   Un message traité depuis longtemps, un envoi automatique, un
   doublon : il n'y a aucune raison de les garder. La suppression
   est définitive et l'annonce.
   --------------------------------------------------------------- */
if ($quoi === 'supprimer') {
    nha_db()->prepare('DELETE FROM ideas WHERE id = ?')->execute([$id]);
    nha_log((int) $moi['id'], 'message_supprime', (string) $message['email']);
    json_ok(['supprime' => true, 'message' => 'Message supprimé.']);
}

/* ---------------------------------------------------------------
   Marquer traité, ou remettre en attente
   --------------------------------------------------------------- */
$traite = !empty($d['traite']);
nha_db()->prepare('UPDATE ideas SET handled_at = ? WHERE id = ?')
        ->execute([$traite ? date('Y-m-d H:i:s') : null, $id]);
nha_log((int) $moi['id'], $traite ? 'message_traite' : 'message_rouvert', (string) $message['email']);

json_ok([
    'traite'  => $traite,
    'message' => $traite ? 'Message marqué comme traité.' : 'Message remis en attente.',
]);
