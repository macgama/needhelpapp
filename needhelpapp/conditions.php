<?php
/**
 * Conditions générales.
 *
 * L'article 5 porte l'ancre #article-5 : abonnement.php y renvoie
 * directement depuis la question « Puis-je récupérer mon argent ? ».
 * L'article 7 porte #article-7, l'article 8 #article-8 : les mentions
 * légales s'y réfèrent. Ne renumérotez pas sans corriger ces liens.
 *
 * Les valeurs entre crochets et surlignées sont à remplir avant
 * l'ouverture au public. api/stripe-test.php les compte.
 *
 * Ce texte est une base sérieuse, ce n'est pas un avis juridique. Deux
 * points méritent une relecture professionnelle : les données d'enfants
 * dans l'application scolaire (article 8) et notre statut d'intermédiaire
 * dans la mise en relation (article 7).
 */
require __DIR__ . '/partials/page.php';

nha_page_debut(
  'Conditions générales',
  'Les règles d\'utilisation de NeedHelpApp : le compte, l\'abonnement, la résiliation, le remboursement et les responsabilités de chacun.'
);
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Conditions <em>générales</em>.</h1>
    <p class="date-maj">Version du 7 septembre 2026. Elles s'appliquent dès la création de votre compte.</p>

    <div class="sommaire">
      <ul>
        <li><a href="#article-1">1. Objet et acceptation</a></li>
        <li><a href="#article-2">2. Le compte</a></li>
        <li><a href="#article-3">3. Ce qui est gratuit, ce qui est payant</a></li>
        <li><a href="#article-4">4. L'abonnement, le paiement, la résiliation</a></li>
        <li><a href="#article-5">5. Interruption du service et remboursement</a></li>
        <li><a href="#article-6">6. Ce que nous attendons de vous</a></li>
        <li><a href="#article-7">7. Ce que nous garantissons, et ce que nous ne garantissons pas</a></li>
        <li><a href="#article-8">8. Vos contenus et vos données</a></li>
        <li><a href="#article-9">9. Suspension et fermeture d'un compte</a></li>
        <li><a href="#article-10">10. Modification des présentes conditions</a></li>
        <li><a href="#article-11">11. Droit applicable et for</a></li>
      </ul>
    </div>

    <h2 id="article-1">1. Objet et acceptation</h2>
    <p>Les présentes conditions règlent l'utilisation de NeedHelpApp, un
      ensemble d'applications indépendantes reliées par un compte unique,
      éditées par <span class="a-completer">[Raison sociale de la structure]</span> (« nous »). Elles valent pour needhelpapp.com et pour
      tous ses sous-domaines.</p>
    <p>Vous les acceptez en créant un compte. Si vous utilisez une
      application sans compte — ce que plusieurs d'entre elles permettent —
      seuls les articles 6, 7 et 11 vous concernent.</p>
    <p>Une application peut ajouter ses propres règles pour ce qui lui est
      propre. Elles complètent celles-ci&nbsp;; en cas de contradiction, le
      texte le plus favorable à l'utilisateur l'emporte.</p>

    <h2 id="article-2">2. Le compte</h2>
    <h3>Un seul compte pour tout</h3>
    <p>Le compte est unique pour l'ensemble de NeedHelpApp. L'adresse
      e-mail en est la clé&nbsp;: elle ne peut pas servir deux fois. Si vous
      vous étiez déjà inscrit sur une application, connectez-vous avec vos
      identifiants habituels plutôt que d'en créer un second — le système
      vous en empêchera de toute façon.</p>
    <h3>Qui peut en ouvrir un</h3>
    <p>Le compte est réservé aux personnes capables de discernement. En
      dessous de seize ans, l'accord d'un parent ou du représentant légal est
      nécessaire&nbsp;; c'est lui qui accepte les présentes conditions au nom
      de l'enfant et qui exerce ses droits.</p>
    <h3>Vos identifiants</h3>
    <p>Vous choisissez votre mot de passe et vous en répondez. Nous ne le
      connaissons pas&nbsp;: il n'est conservé que sous forme d'empreinte,
      d'où il ne peut pas être retrouvé. Si vous soupçonnez qu'il a été
      découvert, changez-le depuis <a href="/profil.php">Mon compte</a>&nbsp;:
      toutes les autres sessions ouvertes tombent aussitôt.</p>
    <p>Vous pouvez aussi vous connecter avec Google. Les deux moyens
      aboutissent au même compte, sans doublon.</p>
    <h3>Fermer son compte</h3>
    <p>À tout moment, depuis <a href="/supprimer-compte.php">Mon compte</a>,
      sans justification et sans frais. La fermeture est définitive et vaut
      pour toutes les applications. Téléchargez d'abord vos données si vous y
      tenez&nbsp;: après, il sera trop tard.</p>

    <h2 id="article-3">3. Ce qui est gratuit, ce qui est payant</h2>
    <p>L'essentiel des applications est gratuit et le restera. La plupart
      remplacent un cahier ou un tableur, et un tableur ne se facture pas.</p>
    <p>L'abonnement facultatif finance le développement et ouvre les
      fonctions qui coûtent des serveurs&nbsp;: la synchronisation entre
      appareils, la conservation de l'historique, le partage au sein du
      foyer.</p>
    <p>Nous ne vendons ni publicité, ni données. Si cela devait changer, ce
      ne serait pas par une modification discrète de ce paragraphe&nbsp;:
      vous en seriez averti par courriel, et vous pourriez partir avec vos
      données.</p>

    <h2 id="article-4">4. L'abonnement, le paiement, la résiliation</h2>
    <h3>Les tarifs</h3>
    <table>
      <tr><th>Formule mensuelle</th><td><span class="a-completer">[montant mensuel, TVA comprise ou non]</span></td></tr>
      <tr><th>Formule annuelle</th><td><span class="a-completer">[montant annuel, TVA comprise ou non]</span></td></tr>
    </table>
    <p>Les prix affichés sur la page <a href="/abonnement.php">Abonnement</a>
      font foi&nbsp;; ceux d'ici les reprennent. Un changement de tarif ne
      s'applique jamais à une période déjà réglée.</p>
    <h3>Un abonnement vaut pour tout</h3>
    <p>Il est attaché à votre compte, pas à l'application par laquelle vous
      l'avez souscrit. Il s'étend automatiquement aux applications suivantes,
      y compris à celles qui n'existent pas encore.</p>
    <p>Il couvre également les personnes de votre foyer que vous y ajoutez,
      dans la limite du nombre de places de votre formule. Un abonnement paie
      un service, pas une personne. Les places se gèrent depuis la page
      <a href="/abonnement.php">Abonnement</a>&nbsp;; vous restez responsable
      des personnes que vous y invitez.</p>
    <h3>Le paiement</h3>
    <p>Il est encaissé par
      <span class="a-completer">[Nom du prestataire de paiement et son pays]</span>, qui traite seul les données de votre carte. Nous ne les
      voyons jamais et n'en conservons aucune trace&nbsp;: seul un
      identifiant de client nous revient, sans numéro ni date de validité.</p>
    <p>L'abonnement est reconduit tacitement à chaque échéance, jusqu'à
      résiliation. Vos factures sont disponibles en PDF depuis le portail de
      facturation, accessible depuis la page
      <a href="/abonnement.php">Abonnement</a>.</p>
    <h3>La résiliation</h3>
    <p>À tout moment, en un clic, sans motif et sans pénalité. Vous conservez
      la formule payante jusqu'au terme de la période déjà réglée, puis
      revenez au gratuit. Rien n'est effacé&nbsp;: vos données restent, seule
      la synchronisation s'arrête, et elle reprend si vous vous réabonnez.</p>
    <h3>Le droit de révocation</h3>
    <p>Le droit suisse ne prévoit pas de droit de rétractation général pour
      un service souscrit en ligne. Nous en accordons un tout de même&nbsp;:
      écrivez-nous dans les quatorze jours suivant un premier abonnement et
      nous le remboursons intégralement, sans discuter. Passé ce délai,
      l'article 5 s'applique.</p>

    <h2 id="article-5">5. Interruption du service et remboursement</h2>
    <p>Si le service payant est interrompu de notre fait pendant une durée
      significative, vous êtes remboursé au prorata des jours perdus. La
      formule annuelle est ramenée au nombre de jours effectivement servis.
      Nous procédons de nous-mêmes lorsque l'interruption nous est
      imputable&nbsp;; sinon, un message à
      <a href="mailto:contact@needhelpapp.com">contact@needhelpapp.com</a>
      suffit, et le remboursement part sur le moyen de paiement d'origine.</p>
    <p>Sont exclues de ce calcul les interruptions brèves d'entretien,
      annoncées à l'avance quand nous le pouvons, et celles qui tiennent à
      une cause hors de notre maîtrise&nbsp;: panne de l'hébergeur,
      défaillance d'un réseau, décision d'une autorité.</p>
    <p>Si nous décidions d'arrêter une application payante, vous seriez
      averti au moins soixante jours à l'avance, le solde de votre abonnement
      vous serait rendu, et vos données resteraient téléchargeables pendant
      toute cette période.</p>

    <h2 id="article-6">6. Ce que nous attendons de vous</h2>
    <ul>
      <li>N'utilisez pas nos applications pour un usage illicite, ni pour
        porter atteinte à quelqu'un.</li>
      <li>Ne déposez pas de contenu illégal, haineux, diffamatoire, ni de
        contenu sur lequel vous n'avez aucun droit.</li>
      <li>Ne tentez pas d'accéder au compte d'un autre, ni de contourner les
        limites techniques du service.</li>
      <li>N'automatisez pas d'extraction massive ni d'envoi en série&nbsp;:
        les protections en place vous bloqueraient, et c'est l'ensemble des
        utilisateurs qui en pâtirait.</li>
      <li>Si vous découvrez une faille, dites-le-nous avant d'en parler
        ailleurs. Nous répondons vite et nous ne poursuivons personne pour
        un signalement de bonne foi.</li>
    </ul>

    <h2 id="article-7">7. Ce que nous garantissons, et ce que nous ne garantissons pas</h2>
    <p>Nous mettons les applications à disposition en l'état, avec le soin
      d'un éditeur diligent. Nous ne garantissons ni l'absence totale de
      défaut, ni une disponibilité ininterrompue.</p>
    <p>Les corrections, exercices et suggestions produits automatiquement
      sont des aides et peuvent se tromper. Ils ne remplacent ni un
      enseignant, ni un professionnel, ni votre propre jugement.</p>
    <h3>Notre rôle dans les mises en relation</h3>
    <p>Certaines applications rapprochent deux personnes — un client et un
      artisan, par exemple. Dans ce cas, <strong>nous ne sommes pas partie au
      contrat</strong> qu'elles concluent. Nous ne fixons ni le prix, ni le
      délai, ni l'étendue des travaux&nbsp;; nous n'encaissons pas leur
      règlement et nous ne garantissons ni la qualité de la prestation, ni la
      solvabilité, ni les assurances ou autorisations de chacun. Les
      vérifications d'usage restent à faire par les intéressés, et les
      différends se règlent entre eux.</p>
    <p>Nous retirons les annonces manifestement abusives dès que nous en
      avons connaissance, mais nous ne contrôlons pas chaque annonce avant sa
      publication.</p>
    <h3>Limite de responsabilité</h3>
    <p>Notre responsabilité est engagée en cas de faute grave ou de dol, sans
      limite, ainsi que dans tous les cas où la loi ne permet pas de
      l'écarter — atteinte à la vie ou à l'intégrité corporelle notamment.
      Pour le reste, elle est limitée au montant que vous nous avez versé au
      cours des douze mois précédant le fait dommageable. Le service gratuit
      n'ouvre donc pas de droit à réparation pécuniaire.</p>

    <h2 id="article-8">8. Vos contenus et vos données</h2>
    <p>Ce que vous écrivez, déposez ou produisez dans les applications vous
      appartient. Nous n'en revendiquons aucun droit. Nous obtenons seulement
      l'autorisation technique de le stocker, de l'afficher sur vos appareils
      et de le sauvegarder — rien de plus, et cela s'éteint à la fermeture de
      votre compte.</p>
    <p>Si vous choisissez de publier un contenu dans un espace partagé, il
      devient visible des personnes qui y ont accès. Nous pouvons retirer un
      contenu signalé et manifestement contraire à l'article 6, sans que cela
      nous oblige à surveiller l'ensemble.</p>
    <p>Le traitement de vos données personnelles est décrit dans la
      <a href="/confidentialite.php">politique de confidentialité</a>, qui
      fait partie intégrante des présentes conditions. Elle précise
      notamment ce que nous savons d'un enfant qui utilise l'application
      scolaire&nbsp;: peu de choses, et rien qui serve à autre chose qu'à
      lui rendre son travail.</p>
    <p>Vous pouvez à tout moment télécharger l'ensemble de vos données depuis
      <a href="/profil.php">Mon compte</a>, dans un format lisible par une
      machine.</p>

    <h2 id="article-9">9. Suspension et fermeture d'un compte</h2>
    <p>Nous pouvons suspendre ou fermer un compte qui contrevient gravement à
      l'article 6, ou qui met en péril le service ou ses utilisateurs. Sauf
      urgence ou obligation légale, nous vous prévenons d'abord et vous
      laissons vous expliquer.</p>
    <p>En cas d'impayé, les fonctions payantes sont suspendues après
      <span class="a-completer">[délai de suspension pour impayé, en jours]</span> à compter du premier échec de paiement, et après un
      rappel envoyé à votre adresse. Vos données ne sont pas effacées&nbsp;:
      le compte revient simplement à la formule gratuite, et tout redevient
      accessible dès la régularisation.</p>
    <p>Si nous fermons un compte à tort, nous le rétablissons et nous
      remboursons la période perdue.</p>

    <h2 id="article-10">10. Modification des présentes conditions</h2>
    <p>Nous pouvons les faire évoluer, par exemple lorsqu'une application
      nouvelle apparaît. Une modification substantielle vous est annoncée par
      courriel au moins trente jours à l'avance.</p>
    <p>Si elle ne vous convient pas, vous pouvez résilier avant son entrée en
      vigueur et être remboursé au prorata. Continuer à utiliser le service
      après cette date vaut acceptation.</p>

    <h2 id="article-11">11. Droit applicable et for</h2>
    <p>Le droit suisse s'applique, à l'exclusion des règles de conflit de
      lois et de la Convention de Vienne sur les ventes internationales.</p>
    <p>Le for exclusif est à
      <span class="a-completer">[Localité du for judiciaire]</span>. Cette
      clause ne prive pas le consommateur du for de son domicile lorsque la
      loi le lui réserve.</p>
    <p>Avant d'aller plus loin, écrivez-nous&nbsp;: presque tout se règle par
      un message. Notre <a href="/contact.php">formulaire de contact</a> est
      la voie la plus rapide.</p>
  </div>
</section>
<?php nha_page_fin(); ?>
