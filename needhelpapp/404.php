<?php
require __DIR__ . '/partials/page.php';
http_response_code(404);
nha_page_debut('Page introuvable', '');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1>Cette page <em>n'existe pas</em>.</h1>
    <p>Elle a peut-être été déplacée, ou l'adresse comporte une coquille.</p>
    <p><a class="bouton" href="/">Revenir à l'accueil</a>
       <a class="bouton discret" href="/contact.php">Nous signaler le lien</a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
