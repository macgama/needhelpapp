<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();
$compte = nha_exiger_connexion();

nha_page_debut('Supprimer mon compte', '');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Supprimer votre compte, <em>définitivement</em>.</h1>
    <p>La suppression retire vos données de toutes les applications NeedHelpApp : apprentissage, abonnement, historique. Elle prend effet immédiatement et l'effacement complet intervient sous trente jours, le temps que les sauvegardes tournent.</p>
    <p>Si vous vouliez seulement arrêter de payer, <a href="/abonnement.php">résiliez l'abonnement</a> : votre compte et vos données restent.</p>

    <div class="panneau">
      <form action="/api/supprimer.php" method="post" data-json>
        <label><span>Votre mot de passe</span>
          <input type="password" name="mot_de_passe" autocomplete="current-password" required></label>
        <label><span>Écrivez SUPPRIMER pour confirmer</span>
          <input type="text" name="confirmation" required autocomplete="off"></label>
        <button class="bouton large danger" type="submit">Supprimer définitivement</button>
        <p class="avis" role="alert"></p>
      </form>
    </div>
    <p class="sous-lien"><a href="/api/export.php">Télécharger d'abord mes données</a> · <a href="/profil.php">Annuler</a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
