<?php
/**
 * Gabarit partagé du portail NeedHelpApp.
 *
 *   require __DIR__.'/partials/page.php';
 *   nha_page_debut('Se connecter', 'Description pour les moteurs.', 'connexion');
 *   ... contenu ...
 *   nha_page_fin();
 *
 * Toute modification du menu ou du pied de page se fait ici, une seule fois.
 */

declare(strict_types=1);
require_once __DIR__ . '/../includes/nha-core.php';

/* e() vit désormais dans includes/nha-core.php : elle sert aussi aux
   points d'entrée JSON, qui ne chargent pas ce gabarit. La définir ici
   seulement provoquait une erreur fatale dès qu'une action d'API voulait
   échapper une valeur — le changement de rôle en est mort en silence. */

/** Les entrées du menu principal : libellé => URL. */
function nha_menu(): array {
    return [
        'Les applications'   => '/#domaines',
        'Le projet'          => '/#projet',
        'Questions fréquentes' => '/faq.php',
    ];
}

/**
 * @param string      $titre   Titre de la page, sans le nom du site.
 * @param string      $desc    Meta description.
 * @param string|null $courant Identifiant de la page courante, pour aria-current.
 */
function nha_page_debut(string $titre, string $desc = '', ?string $courant = null): void {
    $compte = nha_current_account();
    ?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2E2A5C">
<title><?= e($titre) ?> — NeedHelpApp</title>
<?php if ($desc !== ''): ?><meta name="description" content="<?= e($desc) ?>"><?php endif; ?>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<!-- Polices auto-hébergées : aucun appel vers un serveur tiers, pas de bandeau de consentement. -->
<link rel="preload" href="/assets/fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:"Newsreader";src:url(/assets/fonts/newsreader.woff2) format("woff2");
  font-weight:400 500;font-style:normal;font-display:swap}
@font-face{font-family:"Newsreader";src:url(/assets/fonts/newsreader-italic.woff2) format("woff2");
  font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Public Sans";src:url(/assets/fonts/public-sans.woff2) format("woff2");
  font-weight:400 600;font-style:normal;font-display:swap}
</style>
<?php /* La date du fichier sert de version : une feuille modifiée est
         rechargée aussitôt, sans quoi le navigateur sert l'ancienne et
         l'on croit que le style n'a pas été écrit. */ ?>
<link rel="stylesheet" href="/assets/nha.css?v=<?= @filemtime(__DIR__ . '/../assets/nha.css') ?: '1' ?>">
</head>
<body>
<a class="saut-contenu" href="#contenu">Aller au contenu</a>
<header class="entete">
  <div class="enveloppe rangee">
    <a class="marque" href="/">Need<span class="aide">Help</span>App</a>
    <button class="bascule" aria-expanded="false" aria-controls="navigation">Menu</button>
    <nav class="navigation" id="navigation" aria-label="Navigation principale">
      <?php foreach (nha_menu() as $libelle => $url): ?>
        <a href="<?= e($url) ?>"<?= $courant === $libelle ? ' aria-current="page"' : '' ?>><?= e($libelle) ?></a>
      <?php endforeach; ?>
      <?php if ($compte): ?>
        <?php if (($compte['role'] ?? 'membre') === 'admin'): ?>
          <?php /* le lien n'apparaît qu'aux administrateurs ; les pages
                    revérifient le rôle en base, masquer ne protège rien */ ?>
          <a href="/admin/"<?= $courant === 'admin' ? ' aria-current="page"' : '' ?>>Administration</a>
        <?php endif; ?>
        <a href="/profil.php"<?= $courant === 'profil' ? ' aria-current="page"' : '' ?>>Mon compte</a>
        <a class="connexion" href="/deconnexion.php">Se déconnecter</a>
      <?php else: ?>
        <a class="connexion" href="/connexion.php"<?= $courant === 'connexion' ? ' aria-current="page"' : '' ?>>Se connecter</a>
      <?php endif; ?>
    </nav>
  </div>
</header>
<main id="contenu">
<?php
}

function nha_page_fin(): void {
    ?>
</main>
<footer class="pied">
  <div class="enveloppe">
    <ul class="liens">
      <li><a href="https://teaching.needhelpapp.com/">Apprentissage</a></li>
      <li><a href="/#domaines">Tous les domaines</a></li>
      <li><a href="/faq.php">Questions fréquentes</a></li>
      <li><a href="/contact.php">Contact</a></li>
      <li><a href="/mentions-legales.php">Mentions légales</a></li>
      <li><a href="/conditions.php">Conditions générales</a></li>
      <li><a href="/confidentialite.php">Confidentialité</a></li>
    </ul>
    <p>NeedHelpApp — hébergé en Suisse chez Infomaniak. Aucune publicité, aucun traceur tiers.</p>
  </div>
</footer>
<script src="/assets/nha.js?v=<?= @filemtime(__DIR__ . '/../assets/nha.js') ?: '1' ?>" defer></script>
</body>
</html>
<?php
}

/** Redirige vers la connexion si personne n'est identifié. */
function nha_exiger_connexion(): array {
    $compte = nha_current_account();
    if (!$compte) {
        $retour = urlencode($_SERVER['REQUEST_URI'] ?? '/profil.php');
        header('Location: /connexion.php?suite=' . $retour);
        exit;
    }
    return $compte;
}
