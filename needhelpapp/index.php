<?php
/**
 * Page d'accueil. Le catalogue vient de core.apps : ajouter une application
 * au portail se fait désormais par un INSERT, pas par une modification du HTML.
 */
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

$apps = nha_db()->query(
    'SELECT code, name, tagline, url, color, keywords, status
     FROM apps WHERE status <> "archive" ORDER BY position'
)->fetchAll();

// Les puces de chaque carte. Elles décrivent des fonctionnalités, pas des
// données de catalogue : elles restent dans le code du portail.
$puces = [
  'teaching' => ['Dictée en français, allemand, anglais, italien',
                 '33 familles d\'exercices de mathématiques',
                 'Utilisable sans créer de compte'],
  'sport'    => ['Fiches membres et suivi des licences',
                 'Convocations aux matchs et entraînements',
                 'Relances de cotisations automatiques'],
  'artisans' => ['Recherche par métier, lieu et disponibilité',
                 'Demande de devis en quelques champs',
                 'Avis vérifiés après travaux'],
  'asso'     => ['Registre des membres et des cotisations',
                 'Assemblées générales et votes',
                 'Comptes annuels prêts à présenter'],
  'admin'    => ['Modèles de lettres à compléter',
                 'Rappels avant échéance',
                 'Explications en langage clair'],
  'quartier' => ['Annonces limitées au voisinage',
                 'Prêt d\'outils et de matériel',
                 'Sans échange d\'argent'],
];
$libelle_etat = ['en_ligne' => 'En ligne', 'maintenance' => 'Mise à jour en cours',
                 'construction' => 'En construction', 'etude' => 'À l\'étude'];

/* La bannière propose « créer un compte » ou « mon compte » selon le cas.
   $compte est local à page.php : il faut le demander ici aussi. La fonction
   mémorise son résultat, donc cela ne coûte pas une seconde requête. */
$compte = nha_current_account();
$ouvertes = count(array_filter($apps, fn($a) => $a['status'] === 'en_ligne'));

// « L'apprentissage scolaire » → « L'apprentissage <em>scolaire</em> »
function titre_accentue(string $nom): string {
    $mots = explode(' ', $nom);
    $dernier = array_pop($mots);
    return e(implode(' ', $mots)) . ' <em>' . e($dernier) . '</em>';
}

nha_page_debut(
    'Des applications qui aident, domaine par domaine',
    'NeedHelpApp réunit des applications simples et gratuites : réviser à l\'école, gérer un club sportif, mettre en relation artisans et clients. Un seul compte pour toutes.'
);
?>

<?php /* ---------------------------------------------------------------
   La bannière.

   La photographie a été composée avec son tiers gauche vide : le texte
   s'y pose sans rien masquer. Un voile en dégradé garantit le contraste
   même si l'image est remplacée un jour par une autre.

   L'image n'est pas indispensable : sans elle, le fond de lin suffit et
   la page reste parfaitement lisible. C'est voulu — une page d'accueil
   qui dépend d'un fichier pour être compréhensible est mal faite.
   --------------------------------------------------------------- */ ?>
<section class="banniere">
  <div class="banniere-image" aria-hidden="true">
    <picture>
      <source srcset="/assets/img/accueil-table.webp" type="image/webp">
      <img src="/assets/img/accueil-table.png" alt="" loading="eager" fetchpriority="high"
           onerror="this.closest('.banniere-image').remove()">
    </picture>
  </div>
  <div class="enveloppe">
    <div class="banniere-texte">
      <span class="sur-titre">Des outils pour la vie de tous les jours</span>
      <h1>Chaque besoin mérite un outil <em>qui va droit au but</em>.</h1>
      <p class="chapeau">Réviser sa conjugaison, tenir la liste des courses de toute
         la famille, gérer les licences d'un club. Des applications simples, faites
         une par une, avec un seul compte pour toutes.</p>
      <div class="actions">
        <a class="bouton" href="#domaines">Voir les applications <span class="fleche" aria-hidden="true">→</span></a>
        <?php if (!$compte): ?>
          <a class="bouton fantome" href="/inscription.php">Créer un compte</a>
        <?php else: ?>
          <a class="bouton fantome" href="/profil.php">Mon compte</a>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>

<?php /* Le catalogue. La recherche filtre sur les mots-clés de chaque
         application, qui vivent en base : ajouter une application ne
         demande aucune modification ici. */ ?>
<section class="section" id="domaines">
  <div class="enveloppe">
    <div class="apparait">
      <span class="sur-titre">Le catalogue</span>
      <h2><?= count($apps) ?> domaines, dont <?= $ouvertes ?> <em>déjà ouvert<?= $ouvertes > 1 ? 's' : '' ?></em></h2>
      <p>Chacun naît d'un besoin qu'on nous a décrit. Les autres viendront —
         ou pas, si personne n'en veut.</p>

      <div class="recherche" style="max-width:32rem;margin-bottom:var(--e4)">
        <label class="champ" for="filtre">
          <span>De quoi avez-vous besoin&nbsp;?</span>
          <input id="filtre" type="search" autocomplete="off"
                 placeholder="dictée, courses, licences, devis, cotisations…"
                 aria-describedby="compteur">
        </label>
        <p class="discret" id="compteur" role="status" style="margin:0"></p>
      </div>
    </div>

    <ul class="tuiles apparait" id="grille">
      <?php foreach ($apps as $a): $ouvert = $a['status'] === 'en_ligne' && $a['url'];
                    $ferme  = $a['status'] === 'maintenance'; ?>
        <li class="tuile" style="--teinte:<?= e($a['color']) ?>" data-mots="<?= e($a['keywords']) ?>">
          <span class="etat <?= e($a['status']) ?>"><?= e($libelle_etat[$a['status']] ?? $a['status']) ?></span>
          <h3><?= titre_accentue($a['name']) ?></h3>
          <p class="chapeau"><?= e($a['tagline']) ?></p>
          <ul>
            <?php foreach ($puces[$a['code']] ?? [] as $p): ?><li><?= e($p) ?></li><?php endforeach; ?>
          </ul>
          <div class="ouvrir">
            <?php if ($ferme): ?>
              <a href="<?= e($a['url']) ?>">Fermée un moment
                 <span class="fleche" aria-hidden="true">→</span></a>
            <?php elseif ($ouvert): ?>
              <a href="<?= e($a['url']) ?>">Ouvrir <span class="fleche" aria-hidden="true">→</span></a>
            <?php else: ?>
              <a href="#proposer"><?= $a['status'] === 'construction' ? 'Être prévenu' : 'Donner votre avis' ?>
                 <span class="fleche" aria-hidden="true">→</span></a>
            <?php endif; ?>
          </div>
        </li>
      <?php endforeach; ?>
    </ul>
    <p class="vide" id="vide" hidden>Aucun domaine ne correspond. Décrivez votre besoin
       plus bas&nbsp;: c'est comme cela que naissent les prochaines applications.</p>
  </div>
</section>

<section class="section" id="projet">
  <div class="enveloppe apparait">
    <span class="sur-titre">Un seul compte</span>
    <h2>Un compte, <em>toutes</em> les applications.</h2>
    <div class="colonnes">
      <div>
        <span class="numero">01</span>
        <h3>Vous vous inscrivez une seule fois</h3>
        <p>Le même identifiant ouvre l'apprentissage scolaire aujourd'hui et les
           applications suivantes le jour où elles sortent. Rien à recréer.</p>
      </div>
      <div>
        <span class="numero">02</span>
        <h3>Vos données restent séparées</h3>
        <p>Ce que fait votre enfant en conjugaison n'est visible ni par le club de
           sport, ni par un artisan. Chaque application ne voit que ce qui la concerne.</p>
      </div>
      <div>
        <span class="numero">03</span>
        <h3>Tout est hébergé en Suisse</h3>
        <p>Les serveurs et la base sont chez Infomaniak. Aucun transfert vers un pays
           tiers, aucune publicité, aucune revente.</p>
      </div>
      <div>
        <span class="numero">04</span>
        <h3>Un abonnement pour toute la famille</h3>
        <p>La base reste gratuite partout. L'abonnement facultatif couvre cinq
           personnes&nbsp;: on ne paie pas cinq fois pour une même maison.</p>
      </div>
    </div>
  </div>
</section>

<section class="section" id="proposer">
  <div class="enveloppe apparait">
    <div class="panneau" style="max-width:44rem">
      <span class="sur-titre">Votre tour</span>
      <h2 style="margin-bottom:var(--e2)">Il manque une application&nbsp;? <em>Décrivez-la.</em></h2>
      <p>Les domaines ci-dessus viennent de besoins qu'on nous a décrits. Dites-nous ce
         que vous faites encore à la main&nbsp;: c'est le meilleur point de départ.</p>
      <form action="/api/idees.php" method="post" data-json data-reinitialiser="oui">
        <div class="duo">
          <label class="champ"><span>Votre prénom</span>
            <input type="text" name="prenom" autocomplete="given-name"></label>
          <label class="champ"><span>Votre e-mail</span>
            <input type="email" name="email" autocomplete="email" required></label>
        </div>
        <label class="champ"><span>Le besoin, en quelques lignes</span>
          <textarea name="besoin" rows="4" required></textarea></label>
        <button class="bouton" type="submit">Envoyer l'idée</button>
        <p class="avis" role="status"></p>
      </form>
    </div>
  </div>
</section>

<?php nha_page_fin(); ?>
