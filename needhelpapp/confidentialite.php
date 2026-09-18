<?php
<<<<<<< Updated upstream
/**
 * Politique de confidentialité.
 *
 * Écrite d'après ce que le code fait réellement : les tables du socle,
 * les durées inscrites dans includes/nha-core.php et les points d'entrée
 * de api/. Si vous modifiez une durée de conservation ou ajoutez une
 * donnée collectée, cette page doit suivre — sans quoi elle devient un
 * engagement que le code ne tient pas.
 *
 * Les valeurs entre crochets et surlignées sont à remplir avant
 * l'ouverture au public.
 *
 * À relire par un professionnel : le traitement des données d'enfants
 * dans l'application scolaire.
 */
require __DIR__ . '/partials/page.php';

nha_page_debut(
  'Politique de confidentialité',
  'Quelles données NeedHelpApp collecte, pourquoi, combien de temps, avec qui elles sont partagées, et comment exercer vos droits.'
);
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Vos <em>données</em>.</h1>
    <p class="date-maj">Dernière mise à jour&nbsp;: 7 septembre 2026.</p>

    <p>Le principe tient en trois phrases. Nous collectons ce qu'il faut
      pour que le service fonctionne, et rien de plus. Nous ne vendons
      rien&nbsp;: ni publicité, ni fichier, ni statistique nominative. Tout
      est hébergé en Suisse, et vous pouvez repartir avec l'intégralité de
      vos données quand vous le voulez.</p>

    <p>L'application Android <strong>Conduite</strong> fait exception, et dans
      le bon sens&nbsp;: elle ne déclare aucune permission réseau et ne nous
      transmet donc rien du tout. Elle a sa
      <a href="/conduite-confidentialite.php">propre page</a>.</p>

    <div class="sommaire">
      <ul>
        <li><a href="#responsable">Qui est responsable</a></li>
        <li><a href="#donnees">Ce que nous collectons, et pourquoi</a></li>
        <li><a href="#bases">Sur quelle base légale</a></li>
        <li><a href="#cookies">Les cookies</a></li>
        <li><a href="#destinataires">À qui vos données sont transmises</a></li>
        <li><a href="#durees">Combien de temps nous les gardons</a></li>
        <li><a href="#enfants">Les enfants et l'application scolaire</a></li>
        <li><a href="#securite">Comment elles sont protégées</a></li>
        <li><a href="#droits">Vos droits, et comment les exercer</a></li>
        <li><a href="#modifications">Modifications de ce document</a></li>
      </ul>
    </div>

    <h2 id="responsable">Qui est responsable</h2>
    <p>Le responsable du traitement au sens de la loi fédérale sur la
      protection des données (nLPD) et, lorsqu'il s'applique, du règlement
      européen (RGPD) est&nbsp;:</p>
    <table>
      <tr><th>Responsable</th><td>Gaël Manigley, entreprise individuelle,<br>Chemin les Jordils 2, 1085 Vulliens, Suisse</td></tr>
      <tr><th>Contact</th><td><a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a></td></tr>
      <tr><th>Représentant dans l'UE</th><td>Sans objet — le service s'adresse au public suisse</td></tr>
    </table>
    <p>Chaque application peut traiter en plus les données qui lui sont
      propres — les exercices d'une dictée, les menus d'un foyer. Le compte,
      lui, est commun&nbsp;: c'est de lui que parle cette page.</p>

    <h2 id="donnees">Ce que nous collectons, et pourquoi</h2>
    <h3>Quand vous créez un compte</h3>
    <ul>
      <li><strong>Votre adresse e-mail.</strong> Elle identifie le compte,
        sert à confirmer l'inscription et à réinitialiser un mot de passe
        oublié.</li>
      <li><strong>Un prénom, si vous en donnez un.</strong> Il ne sert qu'à
        vous saluer. Le champ peut rester vide.</li>
      <li><strong>Votre mot de passe, sous forme d'empreinte.</strong> Nous
        ne le connaissons pas et ne pouvons pas le retrouver.</li>
      <li><strong>Votre langue d'affichage.</strong></li>
    </ul>
    <h3>Si vous vous connectez avec Google</h3>
    <p>Nous recevons de Google un identifiant technique et l'adresse e-mail
      du compte Google. Rien d'autre&nbsp;: ni carnet d'adresses, ni photo,
      ni contenu. Cette liaison se défait depuis
      <a href="/profil.php">Mon compte</a>.</p>
    <h3>Pendant que vous utilisez le service</h3>
    <ul>
      <li><strong>Vos sessions ouvertes</strong>&nbsp;: date de connexion,
        dernière activité, adresse IP et description du navigateur. C'est ce
        qui vous permet de voir vos appareils connectés et d'en déconnecter
        un à distance.</li>
      <li><strong>Les tentatives de connexion</strong>, réussies ou non, avec
        l'adresse IP. Sans elles, un mot de passe se casse par essais
        successifs.</li>
      <li><strong>Un journal des évènements du compte</strong>&nbsp;:
        inscription, changement de mot de passe, souscription, suppression.
        Il sert à répondre quand vous nous demandez ce qui s'est passé.</li>
      <li><strong>Les applications que vous ouvrez</strong>, et la date de
        votre dernier passage dans chacune.</li>
    </ul>
    <h3>Si vous vous abonnez</h3>
    <p>Nous conservons l'état de votre abonnement — formule, périodicité,
      échéance — et un identifiant de client chez le prestataire de paiement.
      <strong>Nous ne voyons jamais votre numéro de carte</strong>&nbsp;: il
      est saisi chez le prestataire et ne transite pas par nos serveurs.</p>
    <h3>Si vous nous écrivez</h3>
    <p>Le formulaire de contact et celui des idées enregistrent votre
      adresse, votre message et l'adresse IP d'envoi. Cette dernière ne sert
      qu'à limiter les envois répétés&nbsp;: sans elle, le formulaire
      deviendrait une boîte à courrier indésirable.</p>
    <h3>Ce que nous ne collectons pas</h3>
    <p>Ni géolocalisation, ni carnet d'adresses, ni suivi de navigation, ni
      profil publicitaire, ni mesure d'audience par un tiers. Aucune donnée
      sensible n'est demandée&nbsp;: ni santé, ni opinion, ni appartenance.</p>

    <h2 id="bases">Sur quelle base légale</h2>
    <table>
      <tr><th>Traitement</th><th>Base</th></tr>
      <tr><td>Tenue du compte et fourniture du service</td><td>Exécution du contrat</td></tr>
      <tr><td>Facturation et abonnement</td><td>Exécution du contrat, obligation légale de conservation comptable</td></tr>
      <tr><td>Sécurité, limitation des tentatives, journal</td><td>Intérêt légitime à protéger les comptes</td></tr>
      <tr><td>E-mails de service (confirmation, réinitialisation)</td><td>Exécution du contrat</td></tr>
      <tr><td>Connexion avec Google</td><td>Votre consentement, retirable à tout moment</td></tr>
    </table>
    <p>Nous n'envoyons pas de lettre d'information et ne faisons pas de
      prospection&nbsp;: la question du consentement publicitaire ne se pose
      donc pas.</p>

    <h2 id="cookies">Les cookies</h2>
    <p>Deux, tous deux nécessaires au fonctionnement. Aucun cookie de mesure
      d'audience, aucun cookie publicitaire, et donc aucun bandeau de
      consentement à cliquer.</p>
    <table>
      <tr><th>Cookie</th><th>Rôle</th><th>Durée</th></tr>
      <tr><td>nha_session</td><td>Vous garde connecté sur l'ensemble des sous-domaines</td><td>30 jours</td></tr>
      <tr><td>nha_csrf</td><td>Empêche qu'un autre site envoie un formulaire en votre nom</td><td>Le temps de la visite</td></tr>
    </table>
    <p>Les polices de caractères sont servies depuis nos serveurs. Rien n'est
      demandé à Google Fonts&nbsp;: votre adresse IP n'est pas transmise pour
      afficher une page.</p>

    <h2 id="destinataires">À qui vos données sont transmises</h2>
    <p>À personne, sauf aux trois prestataires ci-dessous, chacun pour la
      seule tâche qui lui revient. Aucun d'eux n'a le droit de les utiliser à
      ses propres fins.</p>
    <table>
      <tr><th>Prestataire</th><th>Ce qu'il traite</th><th>Où</th></tr>
      <tr><td>Infomaniak Network SA</td><td>Hébergement du site, de la base et des e-mails</td><td>Suisse</td></tr>
      <tr><td>Stripe Payments Europe, Limited</td><td>Paiement de l'abonnement et facturation</td><td>Irlande</td></tr>
      <tr><td>Google Ireland Ltd.</td><td>Uniquement si vous choisissez la connexion Google</td><td>Union européenne</td></tr>
    </table>
    <p>Nous ne vendons ni ne louons aucune donnée. Nous n'en transmettons à
      une autorité que sur réquisition fondée, et nous vous en informons
      lorsque la loi nous le permet.</p>
    <p>L'hébergement et le traitement courant ont lieu en Suisse. Les deux
      exceptions ci-dessus ne se produisent que si vous les déclenchez
      vous-même, vers des pays reconnus comme offrant une protection
      adéquate ou sous clauses contractuelles types.</p>

    <h2 id="durees">Combien de temps nous les gardons</h2>
    <table>
      <tr><th>Donnée</th><th>Conservation</th></tr>
      <tr><td>Compte et profil</td><td>Tant que le compte existe</td></tr>
      <tr><td>Sessions</td><td>30 jours, ou jusqu'à déconnexion</td></tr>
      <tr><td>Jeton de confirmation d'adresse</td><td>3 jours</td></tr>
      <tr><td>Jeton de réinitialisation de mot de passe</td><td>1 heure</td></tr>
      <tr><td>Tentatives de connexion</td><td>12 mois</td></tr>
      <tr><td>Journal des évènements du compte</td><td>12 mois</td></tr>
      <tr><td>Messages de contact et idées</td><td>24 mois</td></tr>
      <tr><td>Pièces comptables et facturation</td><td>10 ans, comme l'exige le droit suisse</td></tr>
      <tr><td>Compte supprimé</td><td>Neutralisé immédiatement, effacé 30 jours après</td></tr>
      <tr><td>Compte supprimé ayant été abonné</td><td>Réduit à une écriture comptable anonyme, conservée 10 ans</td></tr>
    </table>
    <p>La suppression d'un compte est immédiate dans ses effets&nbsp;:
      l'adresse est neutralisée, le prénom et le mot de passe effacés, les
      sessions fermées, les liaisons Google rompues. Ne subsiste que le temps
      de traiter un litige de facturation ou un retour d'erreur un
      enregistrement technique qui ne vous désigne plus. Trente jours plus
      tard, une tâche automatique l'efface, avec tout ce qui s'y
      rattachait.</p>
    <p>Une seule exception, et elle nous est imposée&nbsp;: si vous avez été
      abonné, le droit suisse nous oblige à conserver dix ans les pièces
      comptables. Ce qui subsiste alors n'est plus un compte — ni adresse, ni
      prénom, ni mot de passe, ni historique — mais une écriture anonyme
      portant les dates et le montant d'un abonnement. Elle ne permet pas de
      remonter jusqu'à vous, et aucune application ne la lit.</p>

    <h2 id="enfants">Les enfants et l'application scolaire</h2>
    <p>L'application d'apprentissage fonctionne <strong>sans compte</strong>.
      Les textes et les exercices restent alors sur l'appareil et ne nous
      parviennent jamais. C'est le mode que nous recommandons pour un
      enfant.</p>
    <p>Si un compte est ouvert, nous ne savons de l'enfant que ce qui a été
      saisi&nbsp;: un prénom éventuel, une adresse e-mail, et les exercices
      effectués. Rien de plus. Ces données servent uniquement à lui restituer
      son travail d'un appareil à l'autre. Elles ne sont ni profilées, ni
      transmises à un tiers, ni utilisées pour lui adresser quoi que ce
      soit.</p>
    <p>En dessous de seize ans, le compte s'ouvre sous la responsabilité d'un
      parent ou du représentant légal, qui accepte les conditions et exerce
      les droits décrits plus bas. Un enseignant qui fait travailler une
      classe entière est invité à utiliser le mode sans compte.</p>

    <h2 id="securite">Comment elles sont protégées</h2>
    <ul>
      <li>Tout le site est servi en HTTPS&nbsp;; le trafic en clair est
        redirigé.</li>
      <li>Les mots de passe ne sont conservés que sous forme d'empreinte
        moderne, non réversible.</li>
      <li>Les jetons de session sont stockés hachés&nbsp;: le vol de la base
        ne permettrait pas d'ouvrir une session.</li>
      <li>Les formulaires sont protégés contre les envois déclenchés depuis
        un autre site, et les tentatives de connexion sont limitées.</li>
      <li>L'accès à l'administration est réservé aux comptes qui en ont le
        rôle, vérifié à chaque page et non seulement à l'affichage du
        menu.</li>
      <li>Les données sont sauvegardées par l'hébergeur, en Suisse.</li>
    </ul>
    <p>Aucun système n'est inviolable. En cas de fuite présentant un risque
      pour vous, nous informons le Préposé fédéral et les personnes
      concernées, sans délai inutile.</p>

    <h2 id="droits">Vos droits, et comment les exercer</h2>
    <ul>
      <li><strong>Accès et copie.</strong> La page
        <a href="/profil.php">Mon compte</a> permet de télécharger
        l'intégralité de vos données en un fichier JSON, immédiatement et
        sans nous écrire.</li>
      <li><strong>Rectification.</strong> Prénom, adresse et mot de passe se
        modifient depuis la même page.</li>
      <li><strong>Suppression.</strong> Depuis
        <a href="/supprimer-compte.php">Mon compte</a>, en écrivant
        SUPPRIMER pour confirmer. Définitive, et valable pour toutes les
        applications.</li>
      <li><strong>Opposition et limitation.</strong> Écrivez-nous&nbsp;:
        nous examinons chaque demande, et nous expliquons notre réponse
        quand nous ne pouvons pas y donner suite.</li>
      <li><strong>Retrait du consentement.</strong> La liaison Google se
        défait sans que le compte en souffre.</li>
    </ul>
    <p>Pour tout cela&nbsp;:
      <a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a>.
      Nous répondons dans les trente jours. Nous pouvons vous demander de
      confirmer votre identité — depuis l'adresse du compte, par exemple —
      avant de communiquer des données&nbsp;: c'est aussi une protection.</p>
    <p>Si notre réponse ne vous satisfait pas, vous pouvez saisir le Préposé
      fédéral à la protection des données et à la transparence (PFPDT), à
      Berne. Résidant dans l'Union européenne, vous pouvez saisir l'autorité
      de contrôle de votre pays.</p>

    <h2 id="modifications">Modifications de ce document</h2>
    <p>Cette page suit le code&nbsp;: elle change quand une donnée collectée,
      une durée ou un destinataire change. La date en tête indique la
      dernière révision.</p>
    <p>Une modification substantielle — une nouvelle catégorie de données, un
      nouveau destinataire — vous est annoncée par courriel au moins trente
      jours à l'avance, et vous laisse le temps de partir avec vos
      données.</p>
=======
require __DIR__ . '/partials/page.php';
nha_page_debut('Confidentialité', 'Quelles données NeedHelpApp collecte, pourquoi, combien de temps, et comment exercer vos droits.');
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Politique de <em>confidentialité</em></h1>
    <p class="date-maj">Version 1.0 — en vigueur depuis le <?= date('j F Y') ?></p>

    <p>Ce document décrit ce que nous savons de vous, pourquoi, combien de temps, et ce que vous pouvez exiger. Il vaut pour needhelpapp.com et pour toutes les applications qui en dépendent.</p>
    <p>Le principe qui guide l'ensemble&nbsp;: nous ne collectons que ce dont le service a besoin pour fonctionner. Nous ne vendons rien, nous n'affichons aucune publicité, et nous n'installons aucun traceur d'audience.</p>

    <div class="a-completer">
      <strong>À compléter&nbsp;:</strong> l'identité du responsable du traitement (article 1), le prestataire de paiement (article 5) et, si vous traitez régulièrement des données de personnes situées dans l'Union européenne, la désignation éventuelle d'un représentant au sens de l'art. 27 RGPD. À faire relire en même temps que les conditions générales.
    </div>

    <nav class="sommaire" aria-label="Sommaire">
      <ol>
        <li><a href="#c1">Qui est responsable</a></li>
        <li><a href="#c2">Quelles données, et pourquoi</a></li>
        <li><a href="#c3">Sur quelle base juridique</a></li>
        <li><a href="#c4">Combien de temps</a></li>
        <li><a href="#c5">Qui d'autre y a accès</a></li>
        <li><a href="#c6">Les cookies</a></li>
        <li><a href="#c7">Le cas des enfants</a></li>
        <li><a href="#c8">La séparation entre applications</a></li>
        <li><a href="#c9">La sécurité</a></li>
        <li><a href="#c10">Vos droits</a></li>
        <li><a href="#c11">Modifications</a></li>
      </ol>
    </nav>

    <h2 id="c1">1. Qui est responsable</h2>
    <p>Le responsable du traitement est [NOM DE LA STRUCTURE], [adresse complète], Suisse. Pour toute question relative à vos données&nbsp;: <a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a>.</p>
    <p>Le traitement est soumis à la loi fédérale suisse sur la protection des données (nLPD) et, pour les personnes situées dans l'Union européenne, au règlement général sur la protection des données (RGPD).</p>

    <h2 id="c2">2. Quelles données, et pourquoi</h2>
    <table>
      <thead><tr><th>Donnée</th><th>Pourquoi</th></tr></thead>
      <tbody>
        <tr><td>Adresse e-mail</td><td>Identifiant du compte, récupération du mot de passe, messages indispensables au service.</td></tr>
        <tr><td>Prénom, si vous le donnez</td><td>Vous saluer par votre nom. Facultatif.</td></tr>
        <tr><td>Mot de passe</td><td>Protéger l'accès. Conservé sous forme d'empreinte Argon2id, jamais en clair. Nous sommes dans l'impossibilité technique de le lire.</td></tr>
        <tr><td>Identifiant Google, si vous utilisez ce mode de connexion</td><td>Vous reconnaître d'une visite à l'autre.</td></tr>
        <tr><td>Contenus que vous saisissez</td><td>Dictées, listes de vocabulaire, exercices, membres d'association, annonces&nbsp;: c'est le service lui-même.</td></tr>
        <tr><td>Résultats d'exercices</td><td>Afficher votre progression et vos bilans.</td></tr>
        <tr><td>Abonnement et statut de paiement</td><td>Savoir à quelles fonctions vous avez droit, et établir les factures.</td></tr>
        <tr><td>Sessions ouvertes&nbsp;: date, adresse IP, navigateur</td><td>Vous garder connecté, vous permettre de fermer une session oubliée, détecter les accès frauduleux.</td></tr>
        <tr><td>Tentatives de connexion échouées</td><td>Bloquer les attaques par essais répétés. Effacées après trente jours.</td></tr>
      </tbody>
    </table>
    <p>Nous ne collectons ni géolocalisation, ni carnet d'adresses, ni contenu de votre appareil, ni historique de navigation hors de nos sites. Nous ne pratiquons aucun profilage publicitaire et ne prenons aucune décision automatisée produisant des effets juridiques à votre égard.</p>
    <p>Sans compte, l'application d'apprentissage fonctionne intégralement sur votre appareil&nbsp;: vos textes et vos exercices ne nous parviennent pas.</p>

    <h2 id="c3">3. Sur quelle base juridique</h2>
    <ul>
      <li><strong>Exécution du contrat</strong> (art. 6 par. 1 let. b RGPD)&nbsp;: compte, contenus, abonnement, facturation.</li>
      <li><strong>Intérêt légitime</strong> (let. f)&nbsp;: sécurité du service, prévention des abus, journalisation technique.</li>
      <li><strong>Obligation légale</strong> (let. c)&nbsp;: conservation des pièces comptables.</li>
      <li><strong>Consentement</strong> (let. a)&nbsp;: uniquement pour ce qui n'est pas nécessaire, par exemple une lettre d'information à laquelle vous vous seriez inscrit. Il se retire aussi facilement qu'il se donne.</li>
    </ul>

    <h2 id="c4">4. Combien de temps</h2>
    <dl>
      <dt>Compte et contenus</dt><dd>Tant que le compte existe.</dd>
      <dt>Après suppression du compte</dt><dd>Effacement sous trente jours, délai destiné à couvrir une suppression accidentelle et le cycle des sauvegardes.</dd>
      <dt>Sauvegardes</dt><dd>Conservées trente jours par l'hébergeur, puis écrasées.</dd>
      <dt>Sessions</dt><dd>Trente jours, ou jusqu'à déconnexion.</dd>
      <dt>Tentatives de connexion</dt><dd>Trente jours.</dd>
      <dt>Pièces comptables et factures</dt><dd>Dix ans, comme l'exige le droit commercial suisse (art. 958f CO).</dd>
      <dt>Messages envoyés via le formulaire de contact</dt><dd>Deux ans après la fin de l'échange.</dd>
    </dl>

    <h2 id="c5">5. Qui d'autre y a accès</h2>
    <p>Nous ne vendons, ne louons et n'échangeons aucune donnée. Trois catégories de tiers seulement interviennent&nbsp;:</p>
    <dl>
      <dt>Infomaniak Network SA, Genève</dt>
      <dd>Hébergement du site, de la base de données et des e-mails. Données stockées exclusivement en Suisse.</dd>
      <dt>[PRESTATAIRE DE PAIEMENT]</dt>
      <dd>Traitement des paiements. Il reçoit votre e-mail et le montant&nbsp;; nous ne recevons ni ne stockons vos données de carte. Ce prestataire applique sa propre politique de confidentialité.</dd>
      <dt>Google LLC, si vous choisissez la connexion Google</dt>
      <dd>Uniquement dans ce cas, et à votre initiative. Nous recevons alors votre adresse e-mail et un identifiant technique. Si vous n'utilisez pas ce mode de connexion, aucune donnée n'est échangée avec Google&nbsp;: nos polices de caractères et nos scripts sont hébergés sur nos propres serveurs.</dd>
    </dl>
    <p>Nous ne transférons aucune donnée hors de Suisse, sauf le cas ci-dessus de la connexion Google, que vous déclenchez vous-même. Nous répondrions à une réquisition d'une autorité suisse compétente, dans le cadre strict de la loi&nbsp;; nous n'accédons pas à vos contenus autrement.</p>

    <h2 id="c6">6. Les cookies</h2>
    <p>Deux cookies, tous deux nécessaires au fonctionnement. Aucun ne sert à la mesure d'audience ou à la publicité&nbsp;: c'est pourquoi ce site ne vous impose aucun bandeau de consentement.</p>
    <table>
      <thead><tr><th>Nom</th><th>Rôle</th><th>Durée</th></tr></thead>
      <tbody>
        <tr><td>nha_session</td><td>Vous garde connecté sur l'ensemble des applications.</td><td>30 jours</td></tr>
        <tr><td>nha_csrf</td><td>Vérifie que les formulaires envoyés proviennent bien de nos pages.</td><td>30 jours</td></tr>
      </tbody>
    </table>
    <p>Les applications utilisent également le stockage local de votre navigateur pour conserver vos exercices en cours quand vous n'avez pas de compte. Ces données ne quittent pas votre appareil et disparaissent si vous videz votre navigateur.</p>

    <h2 id="c7">7. Le cas des enfants</h2>
    <p>L'application d'apprentissage s'adresse notamment à des élèves. Elle est conçue pour fonctionner <em>sans</em> compte&nbsp;: dans ce mode, aucune donnée d'enfant ne nous parvient. C'est le mode que nous recommandons pour un usage en classe.</p>
    <p>Lorsqu'un compte est créé pour un enfant de moins de seize ans, il relève du titulaire de l'autorité parentale, qui peut à tout moment consulter, exporter ou supprimer les données. Nous ne collectons dans ce cadre que le strict nécessaire&nbsp;: une adresse e-mail, un prénom facultatif, et les résultats d'exercices.</p>
    <p>Aucune application NeedHelpApp ne comporte de messagerie ouverte, de profil public, de fonction de mise en relation avec des inconnus, ni de publicité ciblée. Nous ne cherchons pas à savoir dans quelle école ni dans quelle classe se trouve un élève.</p>

    <h2 id="c8">8. La séparation entre applications</h2>
    <p>Un compte unique ne signifie pas des données mises en commun. Seuls votre identité, votre session et votre abonnement sont partagés entre applications&nbsp;: ce sont les trois éléments nécessaires pour vous reconnaître et savoir à quoi vous avez droit.</p>
    <p>Le contenu métier reste cloisonné. Les exercices de votre enfant ne sont pas accessibles depuis l'application sportive, les membres de votre club ne sont pas visibles depuis l'application scolaire, et un artisan ne voit rien de votre activité ailleurs. Cette séparation est structurelle&nbsp;: chaque application dispose de sa propre base de données.</p>

    <h2 id="c9">9. La sécurité</h2>
    <ul>
      <li>Tout le trafic est chiffré (HTTPS obligatoire, HSTS activé).</li>
      <li>Les mots de passe sont hachés avec Argon2id, jamais conservés en clair et jamais visibles par nous.</li>
      <li>Les jetons de session sont stockés sous forme d'empreinte&nbsp;: un accès à notre base ne permettrait pas de se connecter à votre place.</li>
      <li>Les tentatives de connexion sont limitées, sur l'ensemble des applications à la fois.</li>
      <li>Les accès à la base sont restreints et les requêtes systématiquement préparées.</li>
      <li>Les sauvegardes automatiques sont assurées par l'hébergeur, en Suisse.</li>
    </ul>
    <p>Aucun système n'est infaillible. En cas de violation présentant un risque élevé pour vos droits, nous informons les personnes concernées et le Préposé fédéral à la protection des données et à la transparence, dans les délais légaux.</p>

    <h2 id="c10">10. Vos droits</h2>
    <p>Vous pouvez à tout moment&nbsp;:</p>
    <ul>
      <li><strong>accéder</strong> à vos données et en obtenir une copie lisible&nbsp;— le bouton «&nbsp;Télécharger mes données&nbsp;» de votre espace personnel le fait immédiatement&nbsp;;</li>
      <li><strong>rectifier</strong> ce qui est inexact, directement depuis votre profil&nbsp;;</li>
      <li><strong>supprimer</strong> votre compte et vos données&nbsp;;</li>
      <li><strong>vous opposer</strong> à un traitement fondé sur notre intérêt légitime&nbsp;;</li>
      <li><strong>limiter</strong> un traitement contesté, le temps de la vérification&nbsp;;</li>
      <li><strong>retirer votre consentement</strong> lorsqu'il en constitue la base&nbsp;;</li>
      <li><strong>recevoir vos données dans un format réutilisable</strong>, ce que fait l'export au format JSON.</li>
    </ul>
    <p>Écrivez à <a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a>. Nous répondons dans les trente jours. Nous pouvons demander un élément permettant de vérifier votre identité, afin de ne pas remettre vos données à quelqu'un d'autre.</p>
    <p>Si notre réponse ne vous satisfait pas, vous pouvez saisir le Préposé fédéral à la protection des données et à la transparence (PFPDT), Feldeggweg 1, 3003 Berne. Si vous résidez dans l'Union européenne, vous pouvez également saisir l'autorité de contrôle de votre pays.</p>

    <h2 id="c11">11. Modifications</h2>
    <p>Cette politique peut évoluer. Toute modification substantielle est annoncée par e-mail aux titulaires d'un compte au moins trente jours avant son entrée en vigueur. La date de version figure en haut de cette page.</p>
>>>>>>> Stashed changes
  </div>
</section>
<?php nha_page_fin(); ?>
