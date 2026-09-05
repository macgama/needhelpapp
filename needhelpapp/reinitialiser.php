<?php
/** Page atteinte depuis le lien reçu par e-mail : /reinitialiser.php?jeton=… */
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

$jeton = (string)($_GET['jeton'] ?? '');
$valide = false;

if (preg_match('/^[a-f0-9]{64}$/', $jeton)) {
    $st = nha_db()->prepare(
        'SELECT id FROM action_tokens
         WHERE token_hash = ? AND purpose = "reset_password"
           AND used_at IS NULL AND expires_at > NOW()'
    );
    $st->execute([hash('sha256', $jeton)]);
    $valide = (bool)$st->fetchColumn();
}

nha_page_debut('Nouveau mot de passe', 'Choisissez un nouveau mot de passe pour votre compte NeedHelpApp.');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <?php if (!$valide): ?>
      <h1>Ce lien n'est <em>plus valable</em>.</h1>
      <p>Les liens expirent au bout d'une heure, et ne servent qu'une fois. Demandez-en un nouveau, c'est immédiat.</p>
      <p><a class="bouton" href="/mot-de-passe-oublie.php">Demander un nouveau lien</a></p>
    <?php else: ?>
      <h1>Votre nouveau <em>mot de passe</em>.</h1>
      <p>Une fois validé, vous serez déconnecté de tous vos autres appareils.</p>
      <div class="panneau">
        <form action="/api/reinitialiser.php" method="post" data-json>
          <input type="hidden" name="jeton" value="<?= e($jeton) ?>">
          <label>
            <span>Nouveau mot de passe</span>
            <input type="password" name="mot_de_passe" autocomplete="new-password"
                   required minlength="10" data-jauge autofocus>
            <span class="jauge" aria-hidden="true"><span></span></span>
            <p class="aide-champ">Dix caractères au minimum.</p>
          </label>
          <button class="bouton large" type="submit">Enregistrer le mot de passe</button>
          <p class="avis" role="alert"></p>
        </form>
      </div>
    <?php endif; ?>
  </div>
</section>
<?php nha_page_fin(); ?>
