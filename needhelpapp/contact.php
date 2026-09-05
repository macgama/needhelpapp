<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

$compte = nha_current_account();
$sujets = [
  'question'    => 'Une question sur une application',
  'probleme'    => 'Un problème technique',
  'idee'        => 'Une idée d\'application',
  'association' => 'Une demande pour un club ou une école',
  'donnees'     => 'Mes données personnelles',
  'presse'      => 'Presse ou partenariat',
];
$sujet_initial = $_GET['sujet'] ?? '';

nha_page_debut('Nous écrire', 'Contactez l\'équipe NeedHelpApp : questions, problèmes techniques, idées d\'applications.');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Écrivez-nous, <em>on répond</em>.</h1>
    <p>Nous sommes une petite équipe : comptez un à trois jours ouvrables. Pour un problème technique, précisez l'application et l'appareil, cela nous fait gagner un aller-retour.</p>

    <div class="panneau">
      <form action="/api/contact.php" method="post" data-json data-reinitialiser="oui">
        <label><span>Sujet</span>
          <select name="sujet">
            <?php foreach ($sujets as $cle => $libelle): ?>
              <option value="<?= e($cle) ?>"<?= $sujet_initial === $cle ? ' selected' : '' ?>><?= e($libelle) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <div class="duo">
          <label><span>Votre prénom</span>
            <input type="text" name="prenom" autocomplete="given-name" value="<?= e($compte['name'] ?? '') ?>"></label>
          <label><span>Votre e-mail</span>
            <input type="email" name="email" autocomplete="email" required value="<?= e($compte['email'] ?? '') ?>"></label>
        </div>
        <label><span>Votre message</span><textarea name="message" required minlength="10"></textarea></label>
        <button class="bouton large" type="submit">Envoyer le message</button>
        <p class="avis" role="alert"></p>
      </form>
    </div>

    <p class="sous-lien">Ou directement : <a href="mailto:contact@needhelpapp.com">contact@needhelpapp.com</a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
