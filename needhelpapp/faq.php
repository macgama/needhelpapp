<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

$questions = [
  'Le projet' => [
    ['Qu\'est-ce que NeedHelpApp exactement ?',
     'Une série d\'applications indépendantes, chacune conçue pour une tâche précise, reliées par un compte unique. Nous ne cherchons pas à faire une application qui fait tout : nous préférons plusieurs outils simples, dont chacun fait une chose correctement.'],
    ['Pourquoi c\'est gratuit ?',
     'Parce que la plupart de ces outils remplacent un tableur ou un cahier, et qu\'un tableur est gratuit. Un abonnement facultatif finance le développement et donne la synchronisation entre appareils. Nous ne vendons ni publicité, ni données.'],
    ['Qui développe tout ça ?',
     'Une petite équipe, en Suisse. Chaque application naît d\'un besoin décrit par quelqu\'un qui le vit. Si vous en avez un, la page d\'accueil comporte un formulaire prévu pour ça.'],
  ],
  'Le compte' => [
    ['Dois-je créer un compte pour utiliser les applications ?',
     'Non. L\'apprentissage scolaire fonctionne entièrement sans compte : les textes et les exercices restent sur l\'appareil. Le compte sert à retrouver son travail sur un autre appareil et à conserver l\'historique.'],
    ['J\'ai déjà un compte sur l\'application d\'apprentissage. Dois-je en créer un autre ?',
     'Non, et le système vous en empêchera. Le compte est unique pour tout NeedHelpApp : votre adresse e-mail est déjà connue, connectez-vous simplement avec vos identifiants habituels.'],
    ['Puis-je me connecter avec Google ?',
     'Oui. Si votre adresse Google correspond à un compte existant, les deux moyens de connexion sont rattachés au même compte, sans doublon.'],
    ['Comment supprimer mon compte ?',
     'Depuis « Mon compte », en bas de page. La suppression est définitive et retire vos données de toutes les applications. Vous pouvez d\'abord en télécharger une copie.'],
  ],
  'Les données' => [
    ['Où sont hébergées mes données ?',
     'En Suisse, dans les centres de données d\'Infomaniak. Elles ne sont ni transférées ni traitées à l\'étranger.'],
    ['Mon enfant utilise l\'application d\'apprentissage. Que savez-vous de lui ?',
     'Ce que vous avez saisi : un prénom éventuel, une adresse e-mail si un compte a été créé, et les exercices effectués. Rien d\'autre. Nous ne collectons ni géolocalisation, ni carnet d\'adresses, ni comportement de navigation.'],
    ['Utilisez-vous des cookies ?',
     'Deux, tous deux nécessaires : celui qui vous garde connecté, et celui qui protège les formulaires contre les envois frauduleux. Aucun cookie de mesure d\'audience ni de publicité, donc aucun bandeau de consentement à cliquer.'],
    ['Les applications se parlent-elles entre elles ?',
     'Uniquement pour l\'identité et l\'abonnement. Ce que fait votre enfant en conjugaison n\'est pas visible depuis l\'application sportive, et réciproquement.'],
  ],
  'L\'abonnement' => [
    ['Un abonnement pris sur une application vaut-il pour les autres ?',
     'Oui, c\'est le principe. L\'abonnement est attaché au compte et s\'applique automatiquement aux applications suivantes, y compris celles qui n\'existent pas encore.'],
    ['Comment résilier ?',
     'Depuis la page « Mon abonnement », à tout moment. Vous gardez la formule payante jusqu\'à la fin de la période déjà réglée, puis revenez au gratuit sans rien perdre.'],
  ],
];

nha_page_debut('Questions fréquentes', 'Les réponses aux questions les plus courantes sur NeedHelpApp : le compte unique, les données, l\'abonnement.', 'Questions fréquentes');
?>
<section class="doc">
  <div class="enveloppe lecture">
    <h1>Les questions qui <em>reviennent</em>.</h1>
    <p class="date-maj">Si la vôtre ne s'y trouve pas, <a href="/contact.php">écrivez-nous</a> : les questions posées finissent souvent sur cette page.</p>

    <?php foreach ($questions as $section => $liste): ?>
      <h2><?= e($section) ?></h2>
      <?php foreach ($liste as [$q, $r]): ?>
        <details class="question">
          <summary><?= e($q) ?></summary>
          <p><?= $r ?></p>
        </details>
      <?php endforeach; ?>
    <?php endforeach; ?>
  </div>
</section>
<?php nha_page_fin(); ?>
