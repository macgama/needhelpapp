<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/partials/google.php';
csrf_cookie();

if (nha_current_account()) { header('Location: /profil.php'); exit; }

$apps_ouvertes = nha_db()->query(
    'SELECT name, url FROM apps WHERE status = "en_ligne" ORDER BY position'
)->fetchAll();

nha_page_debut('Créer un compte', 'Créez votre compte NeedHelpApp : un seul identifiant pour toutes les applications.');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Un compte, <em>une seule fois</em>.</h1>
    <p>Il ouvre l'apprentissage scolaire aujourd'hui, et les applications suivantes le jour où elles sortent. Si vous avez déjà utilisé l'une d'elles, connectez-vous plutôt&nbsp;: votre compte existe déjà.</p>

    <div class="panneau">
      <form action="/api/inscription.php" method="post" data-json>
        <label>
          <span>Votre prénom</span>
          <input type="text" name="prenom" autocomplete="given-name" maxlength="60">
        </label>
        <label>
          <span>Adresse e-mail</span>
          <input type="email" name="email" autocomplete="username" required>
          <p class="aide-champ">Elle sert d'identifiant et à récupérer votre mot de passe. Nous ne l'utilisons pour rien d'autre.</p>
        </label>
        <label>
          <span>Mot de passe</span>
          <input type="password" name="mot_de_passe" autocomplete="new-password"
                 required minlength="10" data-jauge>
          <span class="jauge" aria-hidden="true"><span></span></span>
          <p class="aide-champ">Dix caractères au minimum. Une phrase dont vous vous souvenez vaut mieux qu'un mot compliqué.</p>
        </label>
        <label class="case">
          <input type="checkbox" name="conditions" required>
          <span style="margin:0">J'accepte les <a href="/conditions.php">conditions générales</a> et j'ai lu la <a href="/confidentialite.php">politique de confidentialité</a>.</span>
        </label>
        <button class="bouton large" type="submit">Créer mon compte</button>
        <p class="avis" role="alert"></p>
      </form>

      <?php nha_bouton_google('/profil.php'); ?>
    </div>

    <p class="sous-lien">Vous avez déjà un compte&nbsp;? <a href="/connexion.php">Se connecter</a></p>

    <?php if ($apps_ouvertes): ?>
      <p class="sous-lien" style="margin-top:2.5rem">
        Vous vous êtes peut-être déjà inscrit ici&nbsp;:
        <?php foreach ($apps_ouvertes as $i => $a): ?>
          <?= $i ? ', ' : '' ?><a href="<?= e($a['url']) ?>"><?= e($a['name']) ?></a>
        <?php endforeach; ?>. Le compte est le même.
      </p>
    <?php endif; ?>
  </div>
</section>
<?php nha_page_fin(); ?>
