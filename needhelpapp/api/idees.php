<?php
/**
 * Formulaire « proposer une application » de la page d'accueil.
 *
 * L'idée est enregistrée en base avant toute tentative d'envoi d'e-mail :
 * même si le serveur de mail refuse le message, rien n'est perdu.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$d      = json_corps();
$email  = champ($d, 'email', 190);
$besoin = champ($d, 'besoin', 4000);
$prenom = champ($d, 'prenom', 80);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_erreur('Cette adresse e-mail ne semble pas valide.');
}
if (mb_strlen($besoin) < 10) {
    json_erreur('Décrivez le besoin en quelques mots de plus.');
}

try {
    // Trois envois par heure et par adresse IP suffisent largement.
    $st = nha_db()->prepare(
        'SELECT COUNT(*) FROM ideas WHERE ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    $st->execute([ip_binaire()]);
    if ((int)$st->fetchColumn() >= 3) {
        json_erreur('Vous avez déjà envoyé plusieurs idées. Merci, on les lit toutes !', 429);
    }

    nha_db()->prepare(
        'INSERT INTO ideas (prenom, email, besoin, source, ip) VALUES (?, ?, ?, ?, ?)'
    )->execute([$prenom ?: null, nha_normalise_email($email), $besoin, 'accueil', ip_binaire()]);
} catch (PDOException $e) {
    error_log('[NeedHelpApp] idees — base : ' . $e->getMessage());
    json_erreur('Nous n\'arrivons pas à enregistrer votre idée. '
        . 'Écrivez-nous directement à <a href="mailto:' . nha_config('mail_contact')
        . '">' . nha_config('mail_contact') . '</a>.', 500);
}

// L'idée est en base : la notification interne part APRÈS la réponse.
// Un serveur de mail lent ne doit pas faire expirer la requête de
// l'utilisateur — c'est exactement ce qui cassait ce formulaire.
nha_mail_differe(
    (string)nha_config('mail_contact', 'contact@needhelpapp.com'),
    'Idée d\'application — ' . ($prenom ?: $email),
    "De : {$prenom} <{$email}>\nReçu le : " . date('d.m.Y H:i') . "\n\n{$besoin}\n",
    $email
);

json_ok(['message' => 'Merci, c\'est noté. Nous revenons vers vous si l\'idée prend forme.']);
