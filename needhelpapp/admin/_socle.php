<?php
/**
 * L'administration du portail — le socle.
 *
 * Un seul rôle décide de tout : accounts.role = 'admin'. Il n'y a pas
 * d'administrateur « de teaching » ou « de sport » : administrer, c'est
 * administrer NeedHelpApp.
 *
 * Chaque page d'administration commence par nha_admin_exiger(), qui relit
 * le rôle EN BASE à chaque requête. Masquer un lien ne protège rien.
 */

declare(strict_types=1);
require_once __DIR__ . '/../includes/nha-core.php';

/** Le compte connecté, s'il administre. Sinon, on n'entre pas. */
function nha_admin_exiger(): array {
    $compte = nha_current_account();
    if (!$compte) {
        header('Location: /connexion.php?suite=' . urlencode($_SERVER['REQUEST_URI'] ?? '/admin/'));
        exit;
    }
    if (($compte['role'] ?? 'membre') !== 'admin') {
        http_response_code(403);
        require __DIR__ . '/../partials/page.php';
        nha_page_debut('Accès refusé');
        echo '<section class="section"><div class="enveloppe etroit">'
           . '<h1>Cette page est réservée</h1>'
           . '<p>Votre compte n\'a pas le rôle d\'administrateur. '
           . 'Si c\'est une erreur, demandez-le à quelqu\'un qui l\'a déjà.</p>'
           . '<p style="margin-top:1.5rem"><a class="bouton" href="/profil.php">Retour à mon compte</a></p>'
           . '</div></section>';
        nha_page_fin();
        exit;
    }
    return $compte;
}

/** Le même en JSON, pour les points d'entrée d'administration. */
function nha_admin_exiger_json(): array {
    require_once __DIR__ . '/../includes/http.php';
    $compte = nha_current_account();
    if (!$compte) {
        json_erreur('Non connecté.', 401);
    }
    if (($compte['role'] ?? 'membre') !== 'admin') {
        json_erreur('Réservé à l\'administration.', 403);
    }
    return $compte;
}

/* ---------------------------------------------------------------
   Les onglets de l'administration
   --------------------------------------------------------------- */
function nha_admin_menu(): array {
    return [
        'Vue d\'ensemble' => '/admin/',
        'Les comptes'     => '/admin/comptes.php',
        'Les messages'    => '/admin/messages.php',
        'Les abonnements' => '/admin/abonnements.php',
        'Les applications'=> '/admin/applications.php',
        'Le journal'      => '/admin/journal.php',
    ];
}

function nha_admin_onglets(string $courant): void {
    echo '<nav class="admin-onglets" aria-label="Administration"><div class="enveloppe">';
    foreach (nha_admin_menu() as $libelle => $url) {
        $actif = ($url === $courant);
        echo '<a href="' . e($url) . '"' . ($actif ? ' aria-current="page"' : '') . '>'
           . e($libelle) . '</a>';
    }
    echo '</div></nav>';
}

/* ---------------------------------------------------------------
   Petits outils d'affichage
   --------------------------------------------------------------- */
function nha_admin_date(?string $d, bool $heure = false): string {
    if (!$d) return '—';
    $t = strtotime($d);
    return $t ? date($heure ? 'j M Y à H:i' : 'j M Y', $t) : '—';
}

/** Un nombre lisible : 1 240 plutôt que 1240. */
function nha_admin_nombre(int|float|string $n): string {
    return number_format((float) $n, 0, ',', ' ');
}

/**
 * Une adresse IP redevient lisible.
 * Elle est stockée en binaire, ce qui est compact mais illisible à l'œil.
 */
function nha_admin_ip(?string $bin): string {
    if ($bin === null || $bin === '') return '—';
    $ip = @inet_ntop($bin);
    return $ip === false ? '—' : $ip;
}

/** Le libellé humain d'un rôle. */
function nha_admin_role(string $role): string {
    return ['admin' => 'Administrateur', 'moderateur' => 'Modérateur'][$role] ?? 'Membre';
}
