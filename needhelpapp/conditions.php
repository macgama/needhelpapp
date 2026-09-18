<?php
<<<<<<< Updated upstream
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
      éditées par Gaël Manigley, entreprise individuelle, Chemin les Jordils 2,
      1085 Vulliens (« nous »). Elles valent pour needhelpapp.com et pour
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
      <tr><th>Formule mensuelle</th><td>4.90 CHF par mois</td></tr>
      <tr><th>Formule annuelle</th><td>49.00 CHF par an, soit deux mois offerts</td></tr>
    </table>
    <p>Ces montants sont nets&nbsp;: l'éditeur n'est pas assujetti à la TVA,
      aucune taxe ne s'y ajoute et aucun frais de dossier ne s'y cache.</p>
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
      Stripe Payments Europe, Limited, à Dublin (Irlande), qui traite seul les
      données de votre carte. Nous ne les
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
      trente jours à compter du premier échec de paiement, et après un
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
      Vulliens (canton de Vaud). Cette
      clause ne prive pas le consommateur du for de son domicile lorsque la
      loi le lui réserve.</p>
    <p>Avant d'aller plus loin, écrivez-nous&nbsp;: presque tout se règle par
      un message. Notre <a href="/contact.php">formulaire de contact</a> est
      la voie la plus rapide.</p>
=======
require __DIR__ . '/partials/page.php';
nha_page_debut('Conditions générales', 'Les conditions d\'utilisation des applications NeedHelpApp : compte, abonnement, obligations, résiliation.');
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Conditions <em>générales</em></h1>
    <p class="date-maj">Version 1.0 — en vigueur depuis le <?= date('j F Y') ?></p>

    <div class="a-completer">
      <strong>À faire relire par un juriste avant la mise en ligne.</strong> Ce texte est une base sérieuse et complète, mais il engage votre responsabilité. Deux points méritent un avis professionnel&nbsp;: le traitement des données d'enfants (application scolaire) et le statut d'intermédiaire dans la mise en relation artisan-client.
    </div>

    <nav class="sommaire" aria-label="Sommaire">
      <ol>
        <li><a href="#article-1">Objet et acceptation</a></li>
        <li><a href="#article-2">Le service</a></li>
        <li><a href="#article-3">Le compte</a></li>
        <li><a href="#article-4">Les mineurs</a></li>
        <li><a href="#article-5">Formules et paiement</a></li>
        <li><a href="#article-6">Vos obligations</a></li>
        <li><a href="#article-7">Vos contenus</a></li>
        <li><a href="#article-8">Mise en relation entre utilisateurs</a></li>
        <li><a href="#article-9">Disponibilité et évolutions</a></li>
        <li><a href="#article-10">Résiliation</a></li>
        <li><a href="#article-11">Responsabilité</a></li>
        <li><a href="#article-12">Modification des conditions</a></li>
        <li><a href="#article-13">Droit applicable et for</a></li>
      </ol>
    </nav>

    <h2 id="article-1">1. Objet et acceptation</h2>
    <p>Les présentes conditions régissent l'utilisation du site needhelpapp.com et de l'ensemble des applications qui en dépendent, quel que soit le sous-domaine par lequel vous y accédez (par exemple teaching.needhelpapp.com). Elles forment un contrat entre vous et [NOM DE LA STRUCTURE], ci-après «&nbsp;l'éditeur&nbsp;».</p>
    <p>Vous les acceptez en créant un compte ou, à défaut de compte, en utilisant le service. Si vous ne les acceptez pas, n'utilisez pas le service.</p>

    <h2 id="article-2">2. Le service</h2>
    <p>NeedHelpApp met à disposition plusieurs applications distinctes, chacune consacrée à un domaine&nbsp;: apprentissage scolaire, gestion d'association sportive, mise en relation entre artisans et clients, et d'autres à venir. Chaque application dispose de ses propres fonctionnalités, mais toutes partagent le même compte utilisateur et le même abonnement.</p>
    <p>Le service de base est gratuit et ne comporte aucune publicité. Certaines fonctionnalités, notamment la synchronisation entre appareils et la conservation de l'historique, relèvent d'une formule payante décrite à l'article 5.</p>
    <p>Les applications sont des outils d'aide. Elles ne remplacent ni un enseignant, ni un comptable, ni un juriste, ni un professionnel du bâtiment. Les corrections, calculs et modèles proposés peuvent comporter des erreurs&nbsp;; il vous appartient de les vérifier avant tout usage engageant.</p>

    <h2 id="article-3">3. Le compte</h2>
    <p>Un compte est facultatif pour l'usage de base de certaines applications. Il devient nécessaire pour retrouver ses données sur plusieurs appareils, pour souscrire un abonnement et pour les applications qui reposent sur des échanges entre utilisateurs.</p>
    <p><strong>Le compte est unique pour l'ensemble de NeedHelpApp.</strong> Une adresse e-mail ne peut correspondre qu'à un seul compte. Si vous vous êtes déjà inscrit sur l'une des applications, vous ne pouvez pas en créer un second&nbsp;: connectez-vous avec vos identifiants existants. La connexion vaut pour tous les sous-domaines simultanément.</p>
    <p>Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité menée depuis votre compte. Signalez-nous sans délai tout usage que vous n'auriez pas autorisé.</p>
    <p>Les informations que vous fournissez doivent être exactes, en particulier votre adresse e-mail, seule voie de récupération de votre compte.</p>

    <h2 id="article-4">4. Les mineurs</h2>
    <p>L'application d'apprentissage scolaire s'adresse notamment à des élèves mineurs. Un mineur peut utiliser librement les fonctions qui ne requièrent pas de compte, celles-ci ne transmettant aucune donnée à l'éditeur.</p>
    <p>La création d'un compte pour un mineur de moins de seize ans relève du titulaire de l'autorité parentale, qui accepte les présentes conditions en son nom. Un parent peut créer des comptes rattachés pour ses enfants dans le cadre d'une formule familiale&nbsp;; il en demeure responsable.</p>
    <p>Aucune application NeedHelpApp ne comporte de messagerie ouverte entre utilisateurs mineurs, ni de fonctionnalité de mise en relation avec des adultes inconnus.</p>

    <h2 id="article-5">5. Formules et paiement</h2>
    <p>Les formules et leurs prix sont indiqués sur la page <a href="/abonnement.php">Abonnement</a>. Les prix s'entendent en francs suisses, [TVA incluse / hors TVA].</p>
    <p><strong>Un abonnement est attaché à votre compte, non à une application.</strong> Souscrit depuis n'importe laquelle, il s'applique à toutes les applications NeedHelpApp, y compris à celles mises en service ultérieurement pendant sa durée de validité. Vous ne payez jamais deux fois pour la même période.</p>
    <p>L'abonnement se renouvelle automatiquement à échéance, mensuellement ou annuellement selon la formule choisie, jusqu'à résiliation de votre part. Le paiement est traité par [PRESTATAIRE DE PAIEMENT]&nbsp;; l'éditeur ne conserve aucune donnée de carte bancaire.</p>
    <p>Une formule familiale ou d'association couvre un nombre défini de comptes bénéficiaires. Le titulaire qui paie peut attribuer et reprendre ces places à tout moment. Le retrait d'une place ne supprime pas le compte concerné, qui revient simplement à la formule gratuite.</p>
    <p>En cas de défaut de paiement, l'abonnement passe en statut impayé&nbsp;; l'accès aux fonctions payantes est suspendu après un délai de [X] jours et un rappel. Les données ne sont pas supprimées pour autant.</p>
    <p>Si l'éditeur interrompt durablement un service payant de son fait, la part d'abonnement correspondant à la période non fournie est remboursée au prorata.</p>

    <h2 id="article-6">6. Vos obligations</h2>
    <p>Vous vous engagez à utiliser le service conformément au droit et aux présentes conditions. Il vous est notamment interdit&nbsp;:</p>
    <ul>
      <li>de publier ou téléverser un contenu illicite, diffamatoire, haineux, violent, pornographique, ou portant atteinte aux droits de tiers, notamment au droit d'auteur&nbsp;;</li>
      <li>d'utiliser le service pour importuner, tromper ou usurper l'identité d'autrui&nbsp;;</li>
      <li>de tenter d'accéder à des données qui ne vous sont pas destinées, de contourner les mesures de sécurité, ou de perturber le fonctionnement du service&nbsp;;</li>
      <li>d'extraire massivement les contenus du service par des moyens automatisés&nbsp;;</li>
      <li>de revendre ou de mettre à disposition de tiers l'accès à votre compte ou aux fonctions payantes.</li>
    </ul>
    <p>En cas de manquement grave, l'éditeur peut suspendre ou fermer le compte concerné, après avertissement lorsque les circonstances le permettent.</p>

    <h2 id="article-7">7. Vos contenus</h2>
    <p>Les contenus que vous saisissez restent votre propriété&nbsp;: textes de dictées, listes de vocabulaire, fichiers importés, données de membres, annonces. Vous accordez à l'éditeur le seul droit de les héberger, de les traiter techniquement et de vous les restituer, pour la durée nécessaire à la fourniture du service.</p>
    <p>Si vous choisissez de partager un contenu dans une bibliothèque commune — une dictée, une liste de vocabulaire — vous acceptez qu'il soit consultable et réutilisable par les autres utilisateurs. Vous garantissez détenir les droits nécessaires sur ce que vous partagez. Vous pouvez en demander le retrait à tout moment.</p>
    <p>Vous pouvez à tout moment télécharger une copie de vos données depuis votre espace personnel.</p>

    <h2 id="article-8">8. Mise en relation entre utilisateurs</h2>
    <p>Certaines applications mettent des utilisateurs en relation, notamment des artisans et des clients potentiels. Dans ce cadre, l'éditeur n'agit qu'en qualité d'intermédiaire technique.</p>
    <p>L'éditeur n'est pas partie au contrat conclu entre les utilisateurs, ne fournit aucune prestation d'artisanat, ne perçoit aucune commission sur les travaux et ne garantit ni la qualité des prestations, ni l'exactitude des qualifications annoncées, ni la solvabilité des parties. Les litiges se règlent entre les intéressés.</p>
    <p>Il appartient à chaque professionnel de s'assurer qu'il dispose des autorisations, qualifications et assurances requises par son activité.</p>

    <h2 id="article-9">9. Disponibilité et évolutions</h2>
    <p>L'éditeur s'efforce d'assurer un service continu, sans y être tenu par une obligation de résultat. Des interruptions peuvent survenir pour maintenance, mise à jour ou cause extérieure. Les interruptions planifiées sont annoncées lorsque cela est possible.</p>
    <p>Les fonctionnalités peuvent évoluer. Si une fonctionnalité payante devait être supprimée, les abonnés en sont informés au moins trente jours à l'avance et peuvent résilier sans frais avec remboursement au prorata.</p>

    <h2 id="article-10">10. Résiliation</h2>
    <p>Vous pouvez résilier votre abonnement à tout moment depuis votre espace personnel. Il reste actif jusqu'au terme de la période déjà réglée, puis votre compte revient à la formule gratuite. Aucune donnée n'est supprimée de ce fait.</p>
    <p>Vous pouvez supprimer votre compte à tout moment depuis votre espace personnel. La suppression est définitive et vaut pour toutes les applications&nbsp;; elle entraîne l'effacement de vos données dans les délais indiqués dans la <a href="/confidentialite.php">politique de confidentialité</a>. Téléchargez vos données au préalable si vous souhaitez les conserver.</p>
    <p>L'éditeur peut résilier ou suspendre un compte en cas de manquement grave aux présentes conditions, ou si le service devait être arrêté, moyennant un préavis raisonnable et le remboursement des sommes versées pour la période non fournie.</p>

    <h2 id="article-11">11. Responsabilité</h2>
    <p>La responsabilité de l'éditeur est engagée en cas de faute intentionnelle ou de négligence grave, ainsi que dans tous les cas où la loi ne permet pas de l'exclure, notamment en cas d'atteinte à la vie ou à l'intégrité corporelle.</p>
    <p>Elle est exclue, dans les limites permises par le droit suisse, pour les dommages indirects, la perte de données dont vous n'auriez pas conservé de copie, le manque à gagner, et les conséquences d'un usage du service contraire aux présentes conditions.</p>
    <p>Il vous appartient de conserver vos propres sauvegardes des contenus qui vous importent. La fonction d'export est prévue à cet effet.</p>

    <h2 id="article-12">12. Modification des conditions</h2>
    <p>L'éditeur peut modifier les présentes conditions. Toute modification substantielle est annoncée par e-mail aux titulaires d'un compte, au moins trente jours avant son entrée en vigueur. Si vous refusez la nouvelle version, vous pouvez résilier votre abonnement et supprimer votre compte avant cette date&nbsp;; l'usage du service au-delà vaut acceptation.</p>

    <h2 id="article-13">13. Droit applicable et for</h2>
    <p>Les présentes conditions sont soumises au droit suisse, à l'exclusion des règles de conflit de lois et de la Convention de Vienne sur les contrats de vente internationale de marchandises.</p>
    <p>Le for exclusif est à [LOCALITÉ DU SIÈGE], sous réserve des fors impératifs, notamment celui du domicile du consommateur. Les parties chercheront d'abord une solution amiable&nbsp;: écrivez à <a href="mailto:contact@needhelpapp.com">contact@needhelpapp.com</a>.</p>
>>>>>>> Stashed changes
  </div>
</section>
<?php nha_page_fin(); ?>
