<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

nha_page_debut('Mot de passe oublié', 'Recevez un lien pour choisir un nouveau mot de passe NeedHelpApp.');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Choisissons-en un <em>nouveau</em>.</h1>
    <p>Indiquez l'adresse de votre compte. Si elle nous est connue, vous recevrez un lien valable une heure.</p>

    <div class="panneau">
      <form action="/api/mot-de-passe-oublie.php" method="post" data-json>
        <label>
          <span>Adresse e-mail</span>
          <input type="email" name="email" autocomplete="username" required autofocus>
        </label>
        <button class="bouton large" type="submit">Envoyer le lien</button>
        <p class="avis" role="alert"></p>
      </form>
    </div>

    <p class="sous-lien"><a href="/connexion.php">Revenir à la connexion</a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
