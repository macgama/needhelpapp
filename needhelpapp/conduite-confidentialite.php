<?php
/**
 * Politique de confidentialité de l'application Android « Conduite ».
 *
 * Une page à part, et pas une section de confidentialite.php, pour deux
 * raisons. La première est réglementaire : le Play Store réclame une
 * adresse publique qui décrive CETTE application, et un document qui
 * parlerait surtout d'un portail web ferait mauvais effet à la revue.
 * La seconde est qu'elle n'a presque rien en commun avec l'autre — pas
 * de compte, pas de cookie, pas de serveur, pas de destinataire.
 *
 * ÉCRITE D'APRÈS LE CODE, ET VÉRIFIABLE CONTRE LUI. Chaque affirmation
 * de cette page correspond à une ligne de conduite/app/ :
 *
 *   « aucune permission réseau »   AndroidManifest.xml
 *   « la coordonnée est jetée »    detection/SourcePosition.kt
 *   « distance par intégration »   service/ServiceConduite.kt
 *   « exclue des sauvegardes »     res/xml/regles_sauvegarde.xml
 *
 * Si l'une de ces lignes change, cette page doit suivre le même jour :
 * sans quoi elle devient un engagement que le code ne tient plus.
 */
require __DIR__ . '/partials/page.php';

nha_page_debut(
  'Conduite — politique de confidentialité',
  "Ce que l'application Conduite lit sur votre téléphone, ce qu'elle y garde, et pourquoi elle ne peut rien envoyer nulle part."
);
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Conduite, et <em>vos données</em>.</h1>
    <p class="date-maj">Dernière mise à jour&nbsp;: 10 septembre 2026.</p>

    <p>Cette page ne concerne que l'application Android <strong>Conduite</strong>,
      qui bloque certaines applications de votre téléphone pendant que vous
      roulez. Les autres services de NeedHelpApp sont couverts par la
      <a href="/confidentialite.php">politique générale</a>.</p>

    <p>Le principe tient en une phrase&nbsp;: <strong>l'application ne
      transmet rien, à personne, nulle part</strong> — non pas parce que nous
      le promettons, mais parce qu'elle ne déclare aucune permission réseau et
      ne peut donc matériellement pas le faire.</p>

    <div class="sommaire">
      <ul>
        <li><a href="#responsable">Qui est responsable</a></li>
        <li><a href="#lit">Ce que l'application lit</a></li>
        <li><a href="#garde">Ce qu'elle garde, et où</a></li>
        <li><a href="#envoie">Ce qu'elle envoie</a></li>
        <li><a href="#autorisations">Les autorisations, une par une</a></li>
        <li><a href="#achat">L'achat</a></li>
        <li><a href="#droits">Vos droits</a></li>
        <li><a href="#modifications">Modifications de ce document</a></li>
      </ul>
    </div>

    <h2 id="responsable">Qui est responsable</h2>
    <p>Le responsable du traitement au sens de la loi fédérale sur la
      protection des données (nLPD) et, lorsqu'il s'applique, du règlement
      européen (RGPD) est&nbsp;:</p>
    <ul>
      <li><strong>Responsable</strong> — Gaël Manigley, entreprise individuelle,
        Chemin les Jordils 2, 1085 Vulliens, Suisse</li>
      <li><strong>Contact</strong> — donnees@needhelpapp.com</li>
    </ul>
    <p>En pratique, ce rôle est ici presque vide de contenu&nbsp;: aucune
      donnée issue de l'application ne nous parvient. Nous le mentionnons
      parce que la loi l'exige, et parce qu'une page qui n'aurait pas de
      responsable désigné serait suspecte.</p>

    <h2 id="lit">Ce que l'application lit</h2>
    <p>Quatre choses, toutes sur l'appareil, toutes pour la même raison&nbsp;:
      décider si le véhicule roule.</p>

    <h3>Votre position — et ce qu'il en reste</h3>
    <p>C'est le point le plus important de cette page. L'application demande
      votre position pour une seule grandeur&nbsp;: <strong>la vitesse</strong>.
      Le relevé du capteur est lu, sa vitesse et sa précision en sont
      extraites, et <strong>l'objet est immédiatement jeté</strong>. La
      latitude et la longitude ne sont écrites nulle part, ni en mémoire
      durable, ni dans un fichier, ni dans la base locale.</p>
    <p>La distance d'un trajet n'est donc pas calculée en additionnant des
      positions&nbsp;: elle est obtenue en <strong>intégrant la vitesse</strong>
      dans le temps. C'est quelques pour cent moins exact, et cela signifie que
      l'application ne sait pas — et ne peut pas savoir — où vous êtes allé.</p>

    <h3>Votre activité</h3>
    <p>Le système Android indique s'il vous croit «&nbsp;en véhicule&nbsp;»,
      «&nbsp;à pied&nbsp;» ou «&nbsp;à vélo&nbsp;», avec un indice de confiance.
      Cela sert à ne pas bloquer un cycliste, et à rendre la main dès que vous
      sortez de la voiture. Rien n'en est conservé.</p>

    <h3>La liaison Bluetooth de votre véhicule</h3>
    <p>Si vous désignez l'autoradio de votre voiture, l'application est
      informée de sa connexion et de sa déconnexion. Elle ne recherche
      <strong>aucun appareil autour de vous</strong>, n'échange aucune donnée
      par Bluetooth, et ne lit la liste de vos appareils appairés qu'au moment
      où vous ouvrez l'écran de choix.</p>

    <h3>L'application affichée à l'écran</h3>
    <p>Pendant un trajet — et seulement pendant un trajet — l'application
      consulte les statistiques d'usage d'Android pour connaître le
      <strong>nom du paquet</strong> de l'application au premier plan. Jamais
      le contenu de vos écrans, jamais ce que vous tapez, jamais un titre de
      fenêtre. Ce nom n'est pas conservé&nbsp;; il sert à décider, dans
      l'instant, s'il faut recouvrir l'écran.</p>

    <h2 id="garde">Ce qu'elle garde, et où</h2>
    <p>Deux choses, dans le stockage privé de l'application sur votre
      téléphone.</p>
    <ul>
      <li><strong>Vos réglages</strong> — mode de blocage, applications
        choisies, seuils, véhicules désignés.</li>
      <li><strong>Un historique de trajets</strong> — pour chacun&nbsp;: date,
        durée, distance, vitesse maximale, nombre d'ouvertures interceptées, et
        si vous vous êtes déclaré passager. <strong>Aucun itinéraire, aucune
        coordonnée</strong>&nbsp;: elles n'ont jamais existé.</li>
    </ul>
    <p>Cet historique est explicitement <strong>exclu des sauvegardes
      automatiques</strong> d'Android&nbsp;: il ne part donc pas sur les
      serveurs de Google avec le reste de votre téléphone. Vous pouvez
      l'effacer d'un bouton depuis l'écran «&nbsp;Trajets&nbsp;», et
      désinstaller l'application le supprime définitivement.</p>

    <h2 id="envoie">Ce qu'elle envoie</h2>
    <p>Rien.</p>
    <p>Ce n'est pas une figure de style. L'application <strong>ne déclare
      aucune permission d'accès à Internet</strong>. Android lui refuserait
      toute connexion sortante si elle tentait d'en établir une&nbsp;; il n'y a
      donc ni serveur, ni compte, ni identifiant publicitaire, ni mesure
      d'audience, ni rapport d'incident automatique, ni bibliothèque tierce de
      suivi. Vous pouvez le vérifier vous-même&nbsp;: la liste des
      autorisations est visible dans la fiche Play Store et dans les réglages
      de votre téléphone.</p>

    <h2 id="autorisations">Les autorisations, une par une</h2>
    <p>Chacune est demandée pour une fonction précise, et l'application
      fonctionne — moins bien — sans la plupart d'entre elles.</p>
    <ul>
      <li><strong>Position (y compris en arrière-plan)</strong> — la vitesse.
        L'arrière-plan est indispensable&nbsp;: un conducteur n'a pas
        l'application ouverte à l'écran, c'est tout l'objet du produit.</li>
      <li><strong>Reconnaissance d'activité</strong> — distinguer la voiture du
        vélo et de la marche.</li>
      <li><strong>Affichage par-dessus les autres applications</strong> — c'est
        le blocage lui-même.</li>
      <li><strong>Accès aux données d'usage</strong> — savoir quelle
        application est affichée, pour ne recouvrir que celles que vous avez
        choisies.</li>
      <li><strong>Notification permanente</strong> — Android l'exige pour
        laisser un service tourner en continu.</li>
      <li><strong>Bluetooth</strong> — lire la liste de vos appareils appairés,
        pour que vous puissiez y désigner votre voiture.</li>
      <li><strong>Ne pas déranger</strong> — facultative&nbsp;: faire taire les
        notifications le temps du trajet, selon vos propres règles de priorité.
        L'état d'origine est rétabli à l'arrivée.</li>
    </ul>
    <p>L'application n'utilise <strong>pas</strong> de service
      d'accessibilité, ne lit pas vos messages, n'accède ni à vos contacts, ni
      à votre appareil photo, ni à votre microphone.</p>

    <h2 id="achat">L'achat</h2>
    <p>Conduite s'installe gratuitement et se débloque par un achat unique.
      Cet achat est traité <strong>entièrement par Google Play</strong>&nbsp;:
      c'est Google qui encaisse, qui édite la facture et qui conserve les
      données de paiement, selon ses propres conditions et sa propre politique
      de confidentialité. Nous ne voyons ni votre moyen de paiement, ni votre
      adresse, ni votre nom&nbsp;; nous recevons de Google des montants
      agrégés, sans identité d'acheteur.</p>
    <p>Votre achat est rattaché à votre compte Google, pas à un compte chez
      nous&nbsp;: <strong>il n'y a rien à créer, et rien à se rappeler</strong>.
      Changer de téléphone le restitue automatiquement.</p>

    <h2 id="droits">Vos droits</h2>
    <p>La nLPD et le RGPD vous donnent un droit d'accès, de rectification,
      d'effacement, de portabilité et d'opposition. Nous devons vous les
      rappeler, et nous devons aussi être francs sur ce qu'ils signifient
      ici&nbsp;: <strong>nous ne détenons aucune donnée vous concernant</strong>,
      il n'y a donc rien que nous puissions vous transmettre ni effacer à votre
      demande.</p>
    <p>Tout ce que l'application produit vit sur votre téléphone et vous
      appartient&nbsp;: l'écran «&nbsp;Trajets&nbsp;» efface l'historique, et
      la désinstallation efface le reste. Pour l'achat, adressez-vous au
      support Google Play, qui en est le seul dépositaire.</p>
    <p>Une question&nbsp;? <strong>donnees@needhelpapp.com</strong>. Vous
      pouvez également saisir le Préposé fédéral à la protection des données
      et à la transparence.</p>

    <h2 id="modifications">Modifications de ce document</h2>
    <p>Cette page suit le code&nbsp;: elle change le jour où l'application
      lit, garde ou envoie autre chose. La date en tête indique la dernière
      révision.</p>
    <p>Si une version future devait transmettre quoi que ce soit — un mode
      surveillé reliant deux téléphones, par exemple — cela ne se ferait pas en
      silence&nbsp;: la permission réseau apparaîtrait dans la fiche Play
      Store, cette page serait réécrite avant, et la fonction serait facultative.</p>
  </div>
</section>
<?php nha_page_fin(); ?>
