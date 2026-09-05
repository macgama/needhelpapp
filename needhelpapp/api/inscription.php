<?php
/**
 * Création de compte depuis le portail.
 *
 * Point clé : si l'adresse est déjà connue, AUCUN second compte n'est créé.
 * Le compte existant est simplement rattaché au portail, et la réponse
 * invite à se connecter.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$d     = json_corps();
$email = champ($d, 'email', 190);
$mdp   = (string)($d['mot_de_passe'] ?? '');
$nom   = champ($d, 'prenom', 60);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_erreur('Cette adresse e-mail ne semble pas valide.');
}
if (mb_strlen($mdp) < 10) {
    json_erreur('Le mot de passe doit faire au moins dix caractères.');
}
if (empty($d['conditions'])) {
    json_erreur('Merci d\'accepter les conditions générales pour continuer.');
}
limiter($email, 10, 60);

$res = nha_register($email, $mdp, $nom !== '' ? $nom : null);

if ($res['status'] === 'already_exists') {
    noter_tentative($email, false);
    $apps = $res['lookup']['apps'];

    // Choix assumé : on indique que le compte existe, plutôt que de renvoyer
    // un message neutre. Cela évite à l'utilisateur de croire son inscription
    // faite alors qu'il ne recevra rien, au prix de confirmer l'existence de
    // l'adresse. Pour fermer cette porte, remplacez ce bloc par un message
    // identique à celui du succès et envoyez un e-mail de rappel à la place.
    $ou = $apps
        ? ' Il a été créé via ' . implode(' et ', array_map('htmlspecialchars', $apps)) . '.'
        : '';
    json_erreur(
        'Vous avez déjà un compte NeedHelpApp avec cette adresse.' . $ou .
        ' <a href="/connexion.php">Connectez-vous</a>, ou ' .
        '<a href="/mot-de-passe-oublie.php">réinitialisez votre mot de passe</a>.',
        409,
        ['deja_inscrit' => true, 'applications' => $apps]
    );
}

// Lien de vérification d'adresse.
$jeton = bin2hex(random_bytes(32));
$st = nha_db()->prepare(
    'INSERT INTO action_tokens (account_id, purpose, token_hash, expires_at)
     VALUES (?, "verify_email", ?, DATE_ADD(NOW(), INTERVAL 3 DAY))'
);
$st->execute([$res['account_id'], hash('sha256', $jeton)]);

nha_mail($email, 'Confirmez votre adresse NeedHelpApp',
    "Bonjour,\n\n" .
    "Votre compte NeedHelpApp est créé. Il vous ouvre l'apprentissage scolaire\n" .
    "et toutes les applications à venir, sans nouvelle inscription.\n\n" .
    "Confirmez votre adresse en ouvrant ce lien, valable trois jours :\n" .
    url_absolue('/verifier.php?jeton=' . $jeton) . "\n\n" .
    "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n\n" .
    "L'équipe NeedHelpApp\nhttps://needhelpapp.com\n");

nha_start_session((int)$res['account_id']);
noter_tentative($email, true);

json_ok(['redirection' => '/profil.php']);
