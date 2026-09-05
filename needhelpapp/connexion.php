<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/partials/google.php';
csrf_cookie();

// Déjà connecté : inutile de proposer un formulaire.
if (nha_current_account()) { header('Location: /profil.php'); exit; }

$suite = $_GET['suite'] ?? '/profil.php';
// Seules les destinations internes sont acceptées : sinon la page devient
// un tremplin de redirection ouverte pour du hameçonnage.
if (!preg_match('#^/[a-z0-9/._-]*$#i', $suite)) { $suite = '/profil.php'; }

nha_page_debut('Se connecter', 'Connectez-vous à votre compte NeedHelpApp.', 'connexion');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Content de vous <em>revoir</em>.</h1>
    <p>Un seul compte pour l'apprentissage scolaire et toutes les applications à venir.</p>

    <div class="panneau">
      <form action="/api/connexion.php" method="post" data-json>
        <input type="hidden" name="suite" value="<?= e($suite) ?>">
        <label>
          <span>Adresse e-mail</span>
          <input type="email" name="email" autocomplete="username" required autofocus>
        </label>
        <label>
          <span>Mot de passe</span>
          <input type="password" name="mot_de_passe" autocomplete="current-password" required>
        </label>
        <label class="case">
          <input type="checkbox" name="memoriser" checked>
          <span style="margin:0">Rester connecté sur cet appareil pendant 30 jours</span>
        </label>
        <button class="bouton large" type="submit">Se connecter</button>
        <p class="avis" role="alert"></p>
      </form>

      <p class="sous-lien"><a href="/mot-de-passe-oublie.php">Mot de passe oublié&nbsp;?</a></p>

      <?php nha_bouton_google($suite); ?>
    </div>

    <p class="sous-lien">Pas encore de compte&nbsp;? <a href="/inscription.php">En créer un</a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
