<?php
/**
 * Mentions légales.
 *
 * Les valeurs entre crochets et surlignées sont à remplir avant
 * l'ouverture au public : api/stripe-test.php les compte et refuse de
 * passer au vert tant qu'il en reste. Stripe, de son côté, n'active pas
 * TWINT sans mentions légales complètes.
 */
require __DIR__ . '/partials/page.php';

nha_page_debut(
  'Mentions légales',
  'Éditeur, hébergement, propriété intellectuelle et responsabilité du site needhelpapp.com.'
);
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Mentions <em>légales</em>.</h1>
    <p class="date-maj">Dernière mise à jour&nbsp;: 7 septembre 2026.</p>

    <div class="sommaire">
      <ul>
        <li><a href="#editeur">L'éditeur du site</a></li>
        <li><a href="#contact">Nous joindre</a></li>
        <li><a href="#hebergement">L'hébergement</a></li>
        <li><a href="#propriete">Propriété intellectuelle</a></li>
        <li><a href="#responsabilite">Responsabilité</a></li>
        <li><a href="#liens">Les liens et les applications tierces</a></li>
        <li><a href="#droit">Droit applicable et for</a></li>
      </ul>
    </div>

    <h2 id="editeur">L'éditeur du site</h2>
    <p>Le site <strong>needhelpapp.com</strong> et ses sous-domaines sont édités par&nbsp;:</p>
    <table>
      <tr><th>Raison sociale</th><td><span class="a-completer">[Raison sociale complète, forme juridique comprise]</span></td></tr>
      <tr><th>Siège</th><td><span class="a-completer">[Rue et numéro, NPA, localité, Suisse]</span></td></tr>
      <tr><th>Numéro IDE</th><td><span class="a-completer">[CHE-000.000.000]</span></td></tr>
      <tr><th>Numéro de TVA</th><td><span class="a-completer">[CHE-000.000.000 TVA, ou : non assujetti]</span></td></tr>
      <tr><th>Responsable de la publication</th><td><span class="a-completer">[Prénom et nom]</span></td></tr>
    </table>
    <p>Si vous n'êtes pas encore inscrit au registre du commerce, indiquez-le
      ici en toutes lettres plutôt que de laisser la ligne vide&nbsp;: une
      mention absente se remarque davantage qu'une mention modeste.</p>

    <h2 id="contact">Nous joindre</h2>
    <p>Par le <a href="/contact.php">formulaire de contact</a>, qui aboutit
      dans la même boîte qu'un courriel et vous garantit une réponse à
      l'adresse que vous indiquez.</p>
    <ul>
      <li>Questions générales&nbsp;: <a href="mailto:contact@needhelpapp.com">contact@needhelpapp.com</a></li>
      <li>Protection des données&nbsp;: <a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a></li>
    </ul>
    <p>Le courrier postal est à adresser au siège indiqué ci-dessus.</p>

    <h2 id="hebergement">L'hébergement</h2>
    <p>Le site et sa base de données sont hébergés par <strong>Infomaniak
      Network SA</strong>, à Genève, en Suisse. Les serveurs se trouvent en
      Suisse&nbsp;: vos données ne sont ni transférées ni traitées à
      l'étranger du fait de l'hébergement.</p>
    <p>Deux exceptions, et seulement si vous les déclenchez vous-même&nbsp;:
      la connexion par Google et le paiement de l'abonnement. Elles sont
      décrites dans la <a href="/confidentialite.php">politique de
      confidentialité</a>.</p>

    <h2 id="propriete">Propriété intellectuelle</h2>
    <p>Le code, les textes, la charte graphique et les illustrations du site
      sont protégés. Vous pouvez les citer et les partager en indiquant leur
      source&nbsp;; vous ne pouvez pas les reproduire en vue d'exploiter un
      service concurrent, ni en retirer les mentions d'origine.</p>
    <p>Les polices de caractères employées — Newsreader et Public&nbsp;Sans —
      sont sous licence SIL Open Font et restent la propriété de leurs
      auteurs. Elles sont servies depuis nos propres serveurs&nbsp;: aucune
      requête n'est adressée à un tiers pour les afficher.</p>
    <p>Ce que vous déposez dans les applications reste à vous. Nous n'en
      revendiquons aucun droit et ne l'exploitons pas à d'autres fins que de
      vous le restituer. Les règles de partage propres à chaque application
      figurent à l'article&nbsp;8 des
      <a href="/conditions.php#article-8">conditions générales</a>.</p>

    <h2 id="responsabilite">Responsabilité</h2>
    <p>Les applications sont mises à disposition en l'état. Nous les tenons à
      jour et corrigeons les défauts qui nous sont signalés, sans pouvoir
      garantir qu'elles soient exemptes d'erreur ni disponibles sans
      interruption.</p>
    <p>Les exercices, corrections et suggestions produits par les
      applications sont des aides. Ils ne remplacent ni un enseignant, ni un
      professionnel du domaine concerné, et une erreur de leur part ne vaut
      pas conseil.</p>
    <p>Nous vous recommandons de conserver une copie de ce qui compte pour
      vous. La page <a href="/profil.php">Mon compte</a> permet de tout
      télécharger à tout moment, au format JSON.</p>

    <h2 id="liens">Les liens et les applications tierces</h2>
    <p>Le site renvoie vers des sites que nous n'éditons pas. Nous n'avons
      aucune maîtrise de leur contenu et n'en répondons pas.</p>
    <p>Certaines applications de NeedHelpApp mettent des personnes en
      relation — un client et un artisan, par exemple. Nous ne sommes alors
      ni partie au contrat, ni garant de son exécution&nbsp;: notre rôle
      s'arrête à la mise en relation. L'article&nbsp;7 des
      <a href="/conditions.php#article-7">conditions générales</a> le
      précise.</p>

    <h2 id="droit">Droit applicable et for</h2>
    <p>Le droit suisse s'applique. Le for est à
      <span class="a-completer">[Localité du for judiciaire]</span>, sous
      réserve des dispositions impératives protégeant les consommateurs, qui
      peuvent vous ouvrir le for de votre domicile.</p>
    <p>Avant toute procédure, écrivez-nous&nbsp;: presque tout se règle par
      un message.</p>
  </div>
</section>
<?php nha_page_fin(); ?>
