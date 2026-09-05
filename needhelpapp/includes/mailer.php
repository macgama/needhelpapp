<?php
/**
 * NeedHelpApp — envoi d'e-mails.
 *
 * Pourquoi ne pas se contenter de mail() : sur l'hébergement mutualisé
 * Infomaniak, mail() part sans authentification. Les messages sont filtrés,
 * classés en indésirable, ou refusés — et surtout la fonction peut BLOQUER
 * plusieurs dizaines de secondes avant d'échouer, ce qui fait expirer la
 * requête HTTP et donne l'impression que le formulaire est cassé.
 *
 * On passe donc par le SMTP authentifié d'Infomaniak, avec des délais
 * d'attente courts et explicites. Pas de Composer : environ 150 lignes de
 * fsockopen suffisent pour du texte brut.
 *
 * Contrainte d'Infomaniak à ne pas oublier : en envoi authentifié,
 * l'adresse expéditrice DOIT être celle qui s'authentifie. Autrement dit
 * mail_expediteur et smtp_user doivent être identiques.
 */

declare(strict_types=1);
require_once __DIR__ . '/nha-core.php';

/** Doit correspondre à NHA_BUILD_CORE. Voir includes/nha-core.php. */
const NHA_BUILD_MAILER = '2026-09-03.3';

/**
 * Garde-fou contre un dépôt FTP incomplet.
 *
 * Jusqu'à la version 2026-09-03.2, nha_mail() était définie dans http.php.
 * Si ce fichier-là n'a pas été remplacé, la redéclarer ici provoquerait une
 * erreur fatale « Cannot redeclare function nha_mail() ». On préfère un
 * message qui nomme le fichier fautif.
 */
if (function_exists('nha_mail')) {
    throw new RuntimeException(
        'includes/http.php est une ancienne version : il définit encore nha_mail(). '
        . 'Redéposez includes/http.php, includes/mailer.php et includes/nha-core.php '
        . 'en écrasant les fichiers existants.'
    );
}

function smtp_configure(): bool {
    return nha_config('smtp_hote', '') !== '' && nha_config('smtp_pass', '') !== '';
}

/**
 * Envoi par SMTP authentifié.
 *
 * @param string|null $dialogue Reçoit la conversation SMTP, utile au diagnostic.
 * @return bool
 */
function smtp_envoyer(string $destinataire, string $sujet, string $corps,
                      ?string $repondreA = null, ?string &$dialogue = null): bool {
    $hote        = (string)nha_config('smtp_hote', 'mail.infomaniak.com');
    $port        = (int)nha_config('smtp_port', 587);
    $utilisateur = (string)nha_config('smtp_user', '');
    $motDePasse  = (string)nha_config('smtp_pass', '');
    $chiffrement = (string)nha_config('smtp_chiffrement', 'tls');   // 'tls' (587) ou 'ssl' (465)
    $expediteur  = (string)nha_config('mail_expediteur', $utilisateur);
    $delai       = (int)nha_config('smtp_delai', 10);

    $journal = '';
    $flux = null;

    // Fermer proprement même en cas de sortie anticipée.
    $terminer = function (bool $ok) use (&$flux, &$journal, &$dialogue): bool {
        if (is_resource($flux)) { @fclose($flux); }
        $dialogue = $journal;
        return $ok;
    };

    $lire = function () use (&$flux, &$journal): array {
        $lignes = '';
        do {
            $ligne = fgets($flux, 515);
            if ($ligne === false) { $journal .= "← (rien reçu / délai dépassé)\n"; return [0, '']; }
            $lignes .= $ligne;
            $journal .= '← ' . rtrim($ligne) . "\n";
            // Une réponse multiligne a un tiret en 4e position : « 250-… ».
        } while (isset($ligne[3]) && $ligne[3] === '-');
        return [(int)substr($lignes, 0, 3), $lignes];
    };

    $ecrire = function (string $commande, bool $secret = false) use (&$flux, &$journal): void {
        $journal .= '→ ' . ($secret ? '(masqué)' : rtrim($commande)) . "\n";
        fwrite($flux, $commande . "\r\n");
    };

    $adresse = ($chiffrement === 'ssl' ? 'ssl://' : '') . $hote . ':' . $port;
    $flux = @stream_socket_client($adresse, $errno, $errstr, $delai,
        STREAM_CLIENT_CONNECT, stream_context_create([
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
        ]));
    if (!$flux) {
        $journal .= "connexion à {$adresse} impossible : {$errstr} ({$errno})\n";
        return $terminer(false);
    }
    stream_set_timeout($flux, $delai);

    [$code] = $lire();
    if ($code !== 220) { return $terminer(false); }

    $nomLocal = $_SERVER['HTTP_HOST'] ?? 'needhelpapp.com';
    $ecrire('EHLO ' . $nomLocal);
    [$code] = $lire();
    if ($code !== 250) { return $terminer(false); }

    if ($chiffrement === 'tls') {
        $ecrire('STARTTLS');
        [$code] = $lire();
        if ($code !== 220) { return $terminer(false); }
        if (!@stream_socket_enable_crypto($flux, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $journal .= "échec de la négociation TLS\n";
            return $terminer(false);
        }
        $journal .= "-- TLS établi --\n";
        $ecrire('EHLO ' . $nomLocal);
        [$code] = $lire();
        if ($code !== 250) { return $terminer(false); }
    }

    $ecrire('AUTH LOGIN');
    [$code] = $lire();
    if ($code !== 334) { return $terminer(false); }
    $ecrire(base64_encode($utilisateur));
    [$code] = $lire();
    if ($code !== 334) { return $terminer(false); }
    $ecrire(base64_encode($motDePasse), true);
    [$code] = $lire();
    if ($code !== 235) {
        $journal .= "-- authentification refusée : vérifiez smtp_user et smtp_pass --\n";
        return $terminer(false);
    }

    $ecrire('MAIL FROM:<' . $expediteur . '>');
    [$code] = $lire();
    if ($code !== 250) {
        $journal .= "-- expéditeur refusé : il doit correspondre au compte authentifié --\n";
        return $terminer(false);
    }
    $ecrire('RCPT TO:<' . $destinataire . '>');
    [$code] = $lire();
    if ($code !== 250 && $code !== 251) { return $terminer(false); }

    $ecrire('DATA');
    [$code] = $lire();
    if ($code !== 354) { return $terminer(false); }

    $entetes = [
        'Date: ' . date('r'),
        'From: NeedHelpApp <' . $expediteur . '>',
        'To: <' . $destinataire . '>',
        'Reply-To: ' . ($repondreA ?? $expediteur),
        'Subject: =?UTF-8?B?' . base64_encode($sujet) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@needhelpapp.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: NeedHelpApp',
    ];

    // Normalisation des fins de ligne, puis « dot stuffing » : une ligne
    // réduite à un point terminerait le message prématurément.
    $texte = preg_replace('/\r\n|\r|\n/', "\r\n", $corps) ?? $corps;
    $texte = preg_replace('/^\./m', '..', $texte) ?? $texte;

    fwrite($flux, implode("\r\n", $entetes) . "\r\n\r\n" . $texte . "\r\n.\r\n");
    $journal .= "→ (corps du message)\n";
    [$code] = $lire();
    if ($code !== 250) { return $terminer(false); }

    $ecrire('QUIT');
    $lire();
    return $terminer(true);
}

/**
 * Envoi d'un message. Passe par le SMTP authentifié s'il est configuré,
 * sinon retombe sur mail(). Consigne toujours les échecs : un envoi raté
 * ne doit jamais passer inaperçu.
 */
function nha_mail(string $destinataire, string $sujet, string $corps, ?string $repondreA = null): bool {
    if ($repondreA !== null && !filter_var($repondreA, FILTER_VALIDATE_EMAIL)) {
        $repondreA = null;   // empêche l'injection d'en-têtes par un formulaire
    }
    if (!filter_var($destinataire, FILTER_VALIDATE_EMAIL)) {
        error_log('[NeedHelpApp] destinataire invalide : ' . $destinataire);
        return false;
    }

    if (smtp_configure()) {
        $dialogue = null;
        $ok = smtp_envoyer($destinataire, $sujet, $corps, $repondreA, $dialogue);
        if (!$ok) {
            error_log('[NeedHelpApp] SMTP a échoué vers ' . $destinataire . " :\n" . $dialogue);
        }
        return $ok;
    }

    // Repli : mail() non authentifié. Fonctionne parfois, mais Infomaniak
    // filtre. À ne garder que le temps de configurer le SMTP.
    $expediteur = (string)nha_config('mail_expediteur', 'noreply@needhelpapp.com');
    $entetes = [
        'From: NeedHelpApp <' . $expediteur . '>',
        'Reply-To: ' . ($repondreA ?? $expediteur),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    $ok = @mail($destinataire, '=?UTF-8?B?' . base64_encode($sujet) . '?=',
                $corps, implode("\r\n", $entetes), '-f' . $expediteur);
    if (!$ok) {
        error_log('[NeedHelpApp] mail() a échoué vers ' . $destinataire
                  . ' — SMTP non configuré, voir config/nha.php');
    }
    return $ok;
}

/**
 * Envoi APRÈS avoir répondu au navigateur.
 *
 * Une notification interne ne doit jamais faire attendre l'utilisateur ni,
 * pire, faire expirer sa requête. Le message part une fois la réponse HTTP
 * close. À réserver aux envois dont l'échec n'a pas besoin d'être annoncé
 * sur-le-champ : notifications de contact, alertes internes.
 *
 * Les e-mails d'authentification (mot de passe oublié, vérification
 * d'adresse) restent synchrones : l'utilisateur doit savoir tout de suite
 * si l'envoi a échoué.
 */
function nha_mail_differe(string $destinataire, string $sujet, string $corps, ?string $repondreA = null): void {
    register_shutdown_function(function () use ($destinataire, $sujet, $corps, $repondreA) {
        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();          // PHP-FPM : la réponse est déjà partie
        }
        @ignore_user_abort(true);
        @set_time_limit(30);
        nha_mail($destinataire, $sujet, $corps, $repondreA);
    });
}
