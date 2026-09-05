<?php
/**
 * Formulaire de contact.
 *
 * Le message est TOUJOURS enregistré en base avant la tentative d'envoi :
 * même si le serveur de mail refuse le message, rien n'est perdu et vous
 * le retrouvez dans la table ideas. La réponse à l'utilisateur dit la
 * vérité sur ce qui s'est réellement passé.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$d       = json_corps();
$email   = champ($d, 'email', 190);
$message = champ($d, 'message', 8000);
$prenom  = champ($d, 'prenom', 80);
$sujet   = champ($d, 'sujet', 40);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_erreur('Cette adresse e-mail ne semble pas valide.');
}
if (mb_strlen($message) < 10) {
    json_erreur('Votre message est un peu court.');
}
if (!preg_match('/^[a-z_]{0,40}$/', $sujet)) { $sujet = 'question'; }

try {
    $st = nha_db()->prepare(
        'SELECT COUNT(*) FROM ideas WHERE ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    $st->execute([ip_binaire()]);
    if ((int)$st->fetchColumn() >= 5) {
        json_erreur('Trop de messages envoyés depuis cette connexion. Réessayez dans une heure.', 429);
    }

    nha_db()->prepare(
        'INSERT INTO ideas (prenom, email, besoin, source, ip) VALUES (?, ?, ?, ?, ?)'
    )->execute([$prenom ?: null, nha_normalise_email($email), $message,
                'contact:' . $sujet, ip_binaire()]);
} catch (PDOException $e) {
    error_log('[NeedHelpApp] contact — base : ' . $e->getMessage());
    json_erreur('Nous n\'arrivons pas à enregistrer votre message. '
        . 'Écrivez-nous directement à <a href="mailto:' . nha_config('mail_contact')
        . '">' . nha_config('mail_contact') . '</a>.', 500);
}

// Le message est en base. La notification interne part APRÈS la réponse :
// l'utilisateur n'attend jamais le serveur de mail. Reply-To pointe sur
// l'expéditeur réel, répondre depuis la boîte suffit donc.
nha_mail_differe(
    (string)nha_config('mail_contact', 'contact@needhelpapp.com'),
    'Contact [' . $sujet . '] — ' . ($prenom ?: $email),
    "De : {$prenom} <{$email}>\nSujet : {$sujet}\n"
    . "Reçu le : " . date('d.m.Y H:i') . "\n\n{$message}\n",
    $email
);

json_ok(['message' => 'Message envoyé. Nous répondons sous un à trois jours ouvrables.']);
