<?php
/**
 * Administration — les messages reçus.
 *
 * Les idées de la page d'accueil et les messages du formulaire de contact
 * arrivent dans la même table. Ils y étaient déjà enregistrés, et personne
 * ne les lisait : l'application comptait sur un courriel qui n'arrivait
 * pas toujours.
 *
 * Un message se lit ici, se marque comme traité, et se répond en un clic.
 * `handled_at` existait dans le schéma sans que rien ne s'en serve.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../includes/http.php';

$moi = nha_admin_exiger();
csrf_cookie();

$filtre = (string) ($_GET['filtre'] ?? 'nouveaux');
$page   = max(1, (int) ($_GET['p'] ?? 1));
$parPage = 30;

$sql = 'SELECT id, prenom, email, besoin, source, ip, created_at, handled_at
        FROM ideas WHERE 1 = 1';
switch ($filtre) {
    case 'traites': $sql .= ' AND handled_at IS NOT NULL'; break;
    case 'tous':    break;
    default:        $sql .= ' AND handled_at IS NULL';
}
$sql .= ' ORDER BY created_at DESC LIMIT ' . ($parPage + 1)
      . ' OFFSET ' . (($page - 1) * $parPage);

$messages = [];
$erreur = null;
try {
    $messages = nha_db()->query($sql)->fetchAll();
} catch (Throwable $e) {
    $erreur = $e->getMessage();
}
$suite = count($messages) > $parPage;
if ($suite) { array_pop($messages); }

/* Les compteurs, pour savoir d'un coup d'œil s'il y a du travail. */
$compter = static function (string $ou): int {
    try { return (int) nha_db()->query('SELECT COUNT(*) FROM ideas WHERE ' . $ou)->fetchColumn(); }
    catch (Throwable $e) { return 0; }
};
$nouveaux = $compter('handled_at IS NULL');
$traites  = $compter('handled_at IS NOT NULL');

/* Les libellés des provenances, écrits dans api/contact.php. */
$sources = [
    'accueil'   => 'Idée depuis l\'accueil',
    'contact'   => 'Message de contact',
    'technique' => 'Problème technique',
    'donnees'   => 'Question sur les données',
    'presse'    => 'Presse',
];

nha_page_debut('Les messages — administration', '', 'admin');
nha_admin_onglets('/admin/messages.php');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Les messages</h1>
    <p>Les idées de la page d'accueil et les messages du formulaire de contact
       arrivent ici. Ils y sont enregistrés même quand l'envoi du courriel
       échoue&nbsp;: c'est cette page qui fait foi, pas votre boîte.</p>

    <ul class="admin-chiffres">
      <li><b><?= e(nha_admin_nombre($nouveaux)) ?></b><span>à traiter</span></li>
      <li><b><?= e(nha_admin_nombre($traites)) ?></b><span>traités</span></li>
    </ul>

    <div class="admin-filtres">
      <a class="bouton <?= $filtre === 'nouveaux' ? '' : 'fantome' ?>"
         href="/admin/messages.php?filtre=nouveaux">À traiter</a>
      <a class="bouton <?= $filtre === 'traites' ? '' : 'fantome' ?>"
         href="/admin/messages.php?filtre=traites">Traités</a>
      <a class="bouton <?= $filtre === 'tous' ? '' : 'fantome' ?>"
         href="/admin/messages.php?filtre=tous">Tous</a>
    </div>

    <?php if ($erreur): ?>
      <div class="avertir"><p>Lecture impossible&nbsp;: <?= e($erreur) ?></p></div>
    <?php endif; ?>

    <p id="admin-message" class="admin-message" hidden></p>

    <?php if (!$messages): ?>
      <p class="vide"><?= $filtre === 'nouveaux'
        ? 'Aucun message en attente. Tout est traité.'
        : 'Aucun message ne correspond.' ?></p>
    <?php else: ?>
      <ul class="messages-recus">
        <?php foreach ($messages as $m):
          $traite = $m['handled_at'] !== null;
          $nom = $m['prenom'] ?: explode('@', (string) $m['email'])[0]; ?>
          <li class="message<?= $traite ? ' traite' : '' ?>" data-message="<?= (int) $m['id'] ?>">
            <div class="message-entete">
              <div>
                <b><?= e($nom) ?></b>
                <a class="discret" href="mailto:<?= e($m['email']) ?>"><?= e($m['email']) ?></a>
              </div>
              <div class="message-meta">
                <span class="pastille libre"><?= e($sources[$m['source']] ?? $m['source']) ?></span>
                <span class="mono"><?= e(nha_admin_date($m['created_at'], true)) ?></span>
              </div>
            </div>

            <p class="message-corps"><?= nl2br(e($m['besoin'])) ?></p>

            <div class="message-actions">
              <button class="bouton petit ouvrir-reponse">Répondre ici</button>
              <button class="bouton fantome petit marquer"
                      data-traite="<?= $traite ? '0' : '1' ?>">
                <?= $traite ? 'Remettre à traiter' : 'Marquer comme traité' ?>
              </button>
              <a class="bouton fantome petit"
                 href="mailto:<?= e($m['email']) ?>?subject=<?= rawurlencode('Votre message à NeedHelpApp') ?>"
                 title="Ouvrir dans votre messagerie">Par ma messagerie</a>
              <button class="bouton fantome petit supprimer">Supprimer</button>
              <?php if ($traite): ?>
                <span class="mono">traité le <?= e(nha_admin_date($m['handled_at'], true)) ?></span>
              <?php endif; ?>
            </div>

            <?php /* Le formulaire de réponse reste replié : on lit d'abord,
                     on répond ensuite, et la plupart des messages se
                     traitent sans un mot. */ ?>
            <form class="reponse" hidden>
              <label>
                <span>Votre réponse à <?= e($nom) ?></span>
                <textarea rows="5" placeholder="Bonjour <?= e($nom) ?>,&#10;&#10;"></textarea>
              </label>
              <div class="rangee">
                <button class="bouton petit envoyer" type="submit">Envoyer</button>
                <button class="bouton fantome petit annuler" type="button">Annuler</button>
                <span class="mono">le message d'origine sera repris en bas de la réponse</span>
              </div>
            </form>
          </li>
        <?php endforeach; ?>
      </ul>

      <div class="admin-pages">
        <?php if ($page > 1): ?>
          <a href="/admin/messages.php?filtre=<?= e($filtre) ?>&amp;p=<?= $page - 1 ?>">← Précédents</a>
        <?php endif; ?>
        <span>Page <?= $page ?></span>
        <?php if ($suite): ?>
          <a href="/admin/messages.php?filtre=<?= e($filtre) ?>&amp;p=<?= $page + 1 ?>">Suivants →</a>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>
</section>

<script>
/* Les actions sur un message.
   Aucune ne recharge la page : on est souvent en train d'en traiter
   plusieurs à la suite, et perdre sa place à chaque clic est pénible. */
(function () {

  function jeton(){
    var m = document.cookie.match(/(?:^|; )nha_csrf=([^;]*)/);
    return m ? m[1] : '';
  }

  function dire(texte, bon){
    var z = document.getElementById('admin-message');
    z.hidden = false;
    z.className = 'admin-message ' + (bon ? 'ok' : 'err');
    z.textContent = texte;
  }

  function appeler(corps){
    return fetch('/api/admin-message.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NHA-CSRF': jeton() },
      body: JSON.stringify(corps)
    }).then(function (r) { return r.json(); });
  }

  document.querySelectorAll('.message').forEach(function (li) {
    var id = li.dataset.message;
    var forme = li.querySelector('.reponse');

    var ouvrir = li.querySelector('.ouvrir-reponse');
    if (ouvrir) ouvrir.addEventListener('click', function () {
      forme.hidden = !forme.hidden;
      if (!forme.hidden) forme.querySelector('textarea').focus();
    });

    var annuler = li.querySelector('.annuler');
    if (annuler) annuler.addEventListener('click', function () { forme.hidden = true; });

    if (forme) forme.addEventListener('submit', function (e) {
      e.preventDefault();
      var zone = forme.querySelector('textarea');
      var bouton = forme.querySelector('.envoyer');
      bouton.disabled = true;
      bouton.textContent = 'Envoi…';
      appeler({ action: 'repondre', id: id, texte: zone.value })
        .then(function (d) {
          bouton.disabled = false;
          bouton.textContent = 'Envoyer';
          dire(d.message || 'Erreur.', !!d.ok);
          if (!d.ok) return;
          forme.hidden = true;
          zone.value = '';
          li.classList.add('traite');
          var marquer = li.querySelector('.marquer');
          if (marquer) { marquer.dataset.traite = '0'; marquer.textContent = 'Remettre à traiter'; }
        })
        .catch(function () {
          bouton.disabled = false;
          bouton.textContent = 'Envoyer';
          dire('Le serveur n\u2019a pas répondu.', false);
        });
    });

    var marquer = li.querySelector('.marquer');
    if (marquer) marquer.addEventListener('click', function () {
      marquer.disabled = true;
      appeler({ action: 'traiter', id: id, traite: marquer.dataset.traite === '1' })
        .then(function (d) {
          marquer.disabled = false;
          dire(d.message || 'Erreur.', !!d.ok);
          if (!d.ok) return;
          li.classList.toggle('traite', d.traite);
          marquer.dataset.traite = d.traite ? '0' : '1';
          marquer.textContent = d.traite ? 'Remettre à traiter' : 'Marquer comme traité';
        })
        .catch(function () { marquer.disabled = false; dire('Le serveur n\u2019a pas répondu.', false); });
    });

    var supprimer = li.querySelector('.supprimer');
    if (supprimer) supprimer.addEventListener('click', function () {
      var qui = li.querySelector('b').textContent;
      if (!window.confirm('Supprimer le message de ' + qui + ' ?\n\n'
          + 'La suppression est définitive : le texte ne sera plus nulle part.')) return;
      supprimer.disabled = true;
      appeler({ action: 'supprimer', id: id })
        .then(function (d) {
          dire(d.message || 'Erreur.', !!d.ok);
          if (!d.ok) { supprimer.disabled = false; return; }
          li.style.transition = 'opacity .25s, transform .25s';
          li.style.opacity = '0';
          li.style.transform = 'translateX(-8px)';
          setTimeout(function () { li.remove(); }, 260);
        })
        .catch(function () { supprimer.disabled = false; dire('Le serveur n\u2019a pas répondu.', false); });
    });
  });

})();
</script>

<?php nha_page_fin();
