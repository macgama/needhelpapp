<?php
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
      <tr><th>Responsable</th><td><span class="a-completer">[Raison sociale et adresse complète]</span></td></tr>
      <tr><th>Contact</th><td><a href="mailto:donnees@needhelpapp.com">donnees@needhelpapp.com</a></td></tr>
      <tr><th>Représentant dans l'UE</th><td><span class="a-completer">[Nom et adresse du représentant, ou : sans objet]</span></td></tr>
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
      <tr><td><span class="a-completer">[Nom du prestataire de paiement]</span></td><td>Paiement de l'abonnement et facturation</td><td><span class="a-completer">[Pays du prestataire de paiement]</span></td></tr>
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
      <tr><td>Compte supprimé</td><td>Neutralisé immédiatement, effacé définitivement au plus tard 30 jours après</td></tr>
    </table>
    <p>La suppression d'un compte est immédiate dans ses effets&nbsp;:
      l'adresse est neutralisée, le prénom et le mot de passe effacés, les
      sessions fermées, les liaisons Google rompues. Ne subsiste, pendant
      trente jours au plus, qu'un enregistrement technique permettant de
      traiter un litige de facturation ou un retour d'erreur. Passé ce délai,
      il disparaît.</p>

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
  </div>
</section>
<?php nha_page_fin(); ?>
