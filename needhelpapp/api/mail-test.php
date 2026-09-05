<?php
/**
 * Pourquoi les courriels ne partent-ils pas ?
 *
 * Le message d'erreur d'un envoi raté est presque toujours inutile :
 * « mail() a renvoyé false ». Cette page montre le DIALOGUE réel avec le
 * serveur SMTP, ligne par ligne. C'est là que se lit la vraie cause —
 * authentification refusée, expéditeur non autorisé, port fermé.
 *
 *   https://needhelpapp.com/api/mail-test.php?a=vous
 *
 * Réservée aux administrateurs, ou au jeton de diagnostic.
 */
declare(strict_types=1);
require __DIR__ . '/../includes/http.php';
require_once __DIR__ . '/../includes/mailer.php';

header('Content-Type: text/plain; charset=utf-8');

$compte = nha_current_account();
$admin  = $compte && ($compte['role'] ?? '') === 'admin';
$attendu = (string) nha_config('diagnostic_jeton', '');
if (!$admin && ($attendu === '' || ($_GET['jeton'] ?? '') !== $attendu)) {
    http_response_code(403);
    echo "Réservé aux administrateurs, ou au jeton de diagnostic.\n";
    exit;
}

$echecs = 0;
function ligne(string $etat, string $texte): void {
    global $echecs;
    if ($etat === 'ÉCHEC') { $echecs++; }
    echo str_pad($etat, 9) . $texte . "\n";
}
function aide(string $t): void {
    foreach (explode("\n", wordwrap($t, 68)) as $l) { echo '         ' . $l . "\n"; }
}

echo "Les courriels\n=============\n\n";

/* ---------- 1. la configuration ---------- */
$hote = (string) nha_config('smtp_hote', '');
$user = (string) nha_config('smtp_user', '');
$pass = (string) nha_config('smtp_pass', '');
$exp  = (string) nha_config('mail_expediteur', '');
$port = (int) nha_config('smtp_port', 587);

if (!smtp_configure()) {
    ligne('ÉCHEC', 'aucun SMTP configuré');
    aide('C\'EST PROBABLEMENT VOTRE PANNE. Sans smtp_hote et smtp_pass, les '
       . 'envois retombent sur mail(), qu\'Infomaniak filtre presque toujours : '
       . 'le message part sans erreur apparente et n\'arrive jamais.');
    aide('');
    aide('Dans config/nha.php, ajoutez :');
    aide('');
    aide("    'smtp_hote' => 'mail.infomaniak.com',");
    aide("    'smtp_port' => 587,");
    aide("    'smtp_user' => 'info@needhelpapp.com',");
    aide("    'smtp_pass' => 'le mot de passe de CETTE boîte',");
    aide("    'smtp_chiffrement' => 'tls',");
    aide('');
    aide('Le mot de passe est celui de la boîte e-mail dans le Manager '
       . 'Infomaniak, pas celui de votre compte Infomaniak.');
} else {
    ligne('OK', 'serveur : ' . $hote . ':' . $port
        . ' (' . nha_config('smtp_chiffrement', 'tls') . ')');
    ligne('OK', 'utilisateur : ' . $user);
}

/* ---------- 2. l'expéditeur ---------- */
if ($exp === '') {
    ligne('ÉCHEC', 'mail_expediteur est vide');
} elseif ($user !== '' && $user !== $exp) {
    ligne('ÉCHEC', 'smtp_user (' . $user . ') diffère de mail_expediteur (' . $exp . ')');
    aide('Infomaniak refuse d\'expédier au nom d\'une autre adresse que celle '
       . 'qui s\'authentifie. Les deux doivent être identiques.');
} else {
    ligne('OK', 'expéditeur : ' . $exp);
}

/* ---------- 3. les boîtes de réception ---------- */
foreach (['mail_contact' => 'contact', 'mail_donnees' => 'données'] as $cle => $quoi) {
    $a = (string) nha_config($cle, '');
    ligne($a !== '' ? 'OK' : 'ATTENTION', 'boîte ' . $quoi . ' : ' . ($a ?: 'non configurée'));
}

/* ---------- 4. l'envoi pour de vrai ---------- */
$vers = trim((string) ($_GET['a'] ?? ''));
if ($vers === 'vous' && $compte) { $vers = (string) $compte['email']; }

if ($vers === '') {
    echo "\nPour tenter un envoi réel, ajoutez à l'adresse :\n";
    echo "  ?a=vous                     — vers votre propre adresse\n";
    echo "  ?a=quelquun@exemple.ch      — vers une adresse précise\n";
} elseif (!filter_var($vers, FILTER_VALIDATE_EMAIL)) {
    ligne('ÉCHEC', 'adresse d\'essai invalide : ' . $vers);
} else {
    echo "\n--- envoi vers " . $vers . " ---\n";
    $dialogue = null;
    $ok = smtp_configure()
        ? smtp_envoyer($vers, 'Essai NeedHelpApp',
            "Ceci est un message d'essai.\n\nS'il vous parvient, la messagerie "
          . "fonctionne et vous pouvez supprimer api/mail-test.php.\n", null, $dialogue)
        : nha_mail($vers, 'Essai NeedHelpApp', "Message d'essai, sans SMTP configuré.\n");

    ligne($ok ? 'OK' : 'ÉCHEC', $ok ? 'le serveur a accepté le message' : 'l\'envoi a échoué');

    if ($dialogue !== null && $dialogue !== '') {
        echo "\n--- ce que le serveur a répondu ---\n";
        echo $dialogue;
        echo "\nLes codes qui reviennent souvent :\n";
        echo "  535  authentification refusée — mot de passe de la BOÎTE, pas du compte\n";
        echo "  550  expéditeur ou destinataire refusé — vérifiez mail_expediteur\n";
        echo "  554  message tenu pour indésirable — vérifiez SPF et DKIM\n";
        echo "  (rien reçu)  port fermé ou bloqué par l'hébergeur\n";
    }
    if ($ok) {
        echo "\nSi le message n'arrive pas malgré ce succès, regardez les\n";
        echo "indésirables, puis vérifiez SPF, DKIM et DMARC sur needhelpapp.com.\n";
    }
}

/* ---------- 5. ce qui est arrivé récemment ---------- */
try {
    $n = (int) nha_db()->query(
        "SELECT COUNT(*) FROM audit_log WHERE event = 'mail_failed'
          AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)"
    )->fetchColumn();
    if ($n > 0) {
        echo "\n";
        ligne('ATTENTION', $n . ' échec(s) d\'envoi consignés cette semaine');
        aide('Le détail figure dans /admin/journal.php, évènement « mail_failed ».');
    }
} catch (Throwable $e) { }

echo "\n";
echo $echecs === 0
    ? "La configuration est en place.\n"
    : $echecs . " point(s) à corriger. Reprenez le premier ÉCHEC.\n";
echo "\nSupprimez ce fichier une fois le problème résolu.\n";
