<?php
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$email = champ(json_corps(), 'email', 190);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_erreur('Cette adresse e-mail ne semble pas valide.');
}
limiter($email, 5, 60);

$st = nha_db()->prepare('SELECT id FROM accounts WHERE email = ? AND deleted_at IS NULL');
$st->execute([nha_normalise_email($email)]);
$id = $st->fetchColumn();

if ($id !== false) {
    $jeton = bin2hex(random_bytes(32));
    nha_db()->prepare(
        'INSERT INTO action_tokens (account_id, purpose, token_hash, expires_at)
         VALUES (?, "reset_password", ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))'
    )->execute([$id, hash('sha256', $jeton)]);

    nha_mail($email, 'Réinitialiser votre mot de passe NeedHelpApp',
        "Bonjour,\n\n" .
        "Vous avez demandé un nouveau mot de passe. Ouvrez ce lien dans l'heure :\n" .
        url_absolue('/reinitialiser.php?jeton=' . $jeton) . "\n\n" .
        "Ce lien ne sert qu'une fois. Si vous n'avez rien demandé, ignorez ce\n" .
        "message : votre mot de passe actuel reste valable.\n\n" .
        "L'équipe NeedHelpApp\n");
    nha_log((int)$id, 'reset_requested');
}
noter_tentative($email, false);

// Réponse identique que l'adresse existe ou non.
json_ok(['message' => 'Si cette adresse correspond à un compte, le lien vient de partir. Vérifiez aussi vos indésirables.']);
