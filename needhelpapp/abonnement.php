<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/includes/stripe.php';
csrf_cookie();

$compte   = nha_current_account();
$droit    = $compte ? nha_entitlement((int)$compte['id']) : null;
$ouvert   = stripe_configure();
$planPaye = (string)nha_config('plan_paye', 'complet');
$abonne   = $droit && $droit['plan'] === $planPaye && in_array($droit['status'], ['actif', 'essai'], true);

/* Seul celui qui paie peut partager. On regarde donc s'il existe un
   abonnement dont ce compte est le payeur — être bénéficiaire d'une place
   ne donne pas le droit d'en distribuer. */
$monAbo = null;
$mesPlaces = [];
try {
    $st = nha_db()->prepare(
        'SELECT * FROM subscriptions
         WHERE payer_account_id = ? AND status IN (\'actif\', \'essai\')
         ORDER BY current_period_end DESC LIMIT 1'
    );
    $st->execute([$compte['id']]);
    $monAbo = $st->fetch() ?: null;
    if ($monAbo) {
        $st = nha_db()->prepare(
            'SELECT a.id, a.email, a.name FROM subscription_seats seat
             JOIN accounts a ON a.id = seat.account_id
             WHERE seat.subscription_id = ? AND seat.removed_at IS NULL
             ORDER BY seat.added_at'
        );
        $st->execute([(int) $monAbo['id']]);
        $mesPlaces = $st->fetchAll();
    }
} catch (Throwable $e) { }

// Les places couvertes, si ce compte paie pour d'autres personnes.
$places = [];
if ($compte) {
    $st = nha_db()->prepare(
        'SELECT a.email, a.name, s.seats
         FROM subscriptions s
         JOIN subscription_seats seat ON seat.subscription_id = s.id AND seat.removed_at IS NULL
         JOIN accounts a ON a.id = seat.account_id
         WHERE s.payer_account_id = ? AND s.status IN ("actif","essai")'
    );
    $st->execute([$compte['id']]);
    $places = $st->fetchAll();
}

function date_fr(?string $d): string {
    return $d ? date('j F Y', strtotime($d)) : '—';
}

nha_page_debut('L\'abonnement',
    'Les formules NeedHelpApp. Un abonnement pris sur une application vaut pour toutes les autres.');
?>
<section class="auth" style="padding-bottom:1rem">
  <div class="enveloppe">
    <h1 style="max-width:18ch">Un abonnement, <em>partout</em>.</h1>
    <p style="max-width:52ch">Une formule payante prise depuis n'importe quelle application vaut pour toutes les autres, y compris celles qui n'existent pas encore. Vous ne payez jamais deux fois.</p>
  </div>
</section>

<?php if (!empty($_GET['erreur']) || !empty($_GET['paiement'])): ?>
<section class="section" style="border-bottom:0;padding-bottom:0">
  <div class="enveloppe">
    <?php if (!empty($_GET['erreur'])): ?>
      <div class="avis erreur"><?= e((string)$_GET['erreur']) ?></div>
    <?php elseif ($_GET['paiement'] === 'ok'): ?>
      <div class="avis succes">Merci, votre paiement est enregistré. L'abonnement peut mettre quelques secondes à apparaître ci-dessous&nbsp;: rechargez la page si nécessaire.</div>
    <?php elseif ($_GET['paiement'] === 'annule'): ?>
      <div class="avis info">Paiement abandonné. Rien n'a été débité.</div>
    <?php endif; ?>
  </div>
</section>
<?php endif; ?>

<?php if ($abonne): ?>
<section class="section">
  <div class="enveloppe">
    <h2>Votre abonnement est <em>actif</em></h2>
    <dl>
      <div class="paire"><dt>Formule</dt><dd><span class="pastille"><?= e($droit['plan']) ?></span></dd></div>
      <div class="paire"><dt>Périodicité</dt><dd><?= e($droit['period'] ?? '—') ?></dd></div>
      <?php if (!empty($droit['until'])): ?>
        <div class="paire">
          <dt><?= !empty($droit['cancel_at']) ? 'Se termine le' : 'Prochain renouvellement' ?></dt>
          <dd><?= e(date_fr($droit['until'])) ?></dd>
        </div>
      <?php endif; ?>
      <?php if (!empty($droit['sold_by'])): ?>
        <div class="paire"><dt>Souscrit via</dt><dd><?= e($droit['sold_by']) ?></dd></div>
      <?php endif; ?>
    </dl>
    <p style="margin-top:1.5rem">
      <a class="bouton" href="/api/paiement.php?action=portail">Gérer, changer de carte ou résilier</a>
    </p>
    <p style="color:var(--encre-doux);font-size:.9375rem;margin-top:.75rem">
      Le portail de facturation est tenu par Stripe&nbsp;: vous y trouverez vos factures et pourrez résilier en un clic.
    </p>
  </div>
</section>
<?php if ($monAbo): $places = max(1, (int) ($monAbo['seats'] ?? 1)); ?>
<section class="section">
  <div class="enveloppe">
    <h2>Partager avec les <em>vôtres</em></h2>
    <p style="max-width:56ch">Un abonnement paie un service, pas une personne. Les
       proches que vous ajoutez ici accèdent à toutes les applications avec leur
       propre compte&nbsp;: l'apprentissage scolaire, les courses en famille, et
       celles à venir. Ils ne paient rien.</p>

    <p class="places-compte" id="places-compte">
      <b><?= count($mesPlaces) ?></b> place<?= count($mesPlaces) > 1 ? 's' : '' ?>
      occupée<?= count($mesPlaces) > 1 ? 's' : '' ?> sur <b><?= $places ?></b>.
    </p>

    <ul class="membres-abo" id="membres-abo">
      <?php foreach ($mesPlaces as $m):
        $estMoi = (int) $m['id'] === (int) $compte['id'];
        $nom = $m['name'] ?: explode('@', (string) $m['email'])[0]; ?>
        <li data-compte="<?= (int) $m['id'] ?>">
          <span class="pastille-abo"><?= e(mb_strtoupper(mb_substr($nom, 0, 1))) ?></span>
          <span class="qui"><b><?= e($nom) ?></b>
            <span class="adresse"><?= e($m['email']) ?><?= $estMoi ? ' · vous payez' : '' ?></span>
          </span>
          <?php if (!$estMoi): ?>
            <button class="bouton fantome petit retirer-place">Retirer</button>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ul>

    <?php if (count($mesPlaces) < $places): ?>
      <form class="ajout-place" id="ajout-place">
        <input type="email" id="place-email" placeholder="adresse@exemple.ch"
               aria-label="Adresse de la personne à ajouter" required>
        <button class="bouton" type="submit">Ajouter</button>
      </form>
      <p style="color:var(--encre-doux);font-size:.9375rem;margin-top:.75rem">
        La personne doit déjà avoir un compte NeedHelpApp&nbsp;: nous n'en créons
        jamais un à sa place. Elle recevra un message lui disant que l'accès lui
        est ouvert.
      </p>
    <?php else: ?>
      <p style="color:var(--encre-doux);font-size:.9375rem">
        Toutes les places sont prises. Retirez quelqu'un pour en libérer une.
      </p>
    <?php endif; ?>
    <p id="places-message" class="admin-message" hidden></p>
  </div>
</section>
<?php endif; ?>

<?php endif; ?>

<section class="section">
  <div class="enveloppe">
    <?php if (!$abonne): ?><h2>Les <em>formules</em></h2><?php endif; ?>
    <ul class="tuiles">

      <li class="tuile">
        <h3>Gratuite</h3>
        <p style="font-size:1.5rem;font-family:var(--serif);color:var(--encre);margin:.5rem 0">0.–</p>
        <p>Tous les exercices, tous les outils, sans limite de durée et sans publicité. Les données restent sur l'appareil.</p>
        <ul class="details" style="--teinte:var(--encre-doux)">
          <li>Toutes les applications ouvertes</li>
          <li>Aucun compte nécessaire</li>
          <li>Aucune synchronisation</li>
        </ul>
      </li>

      <li class="tuile" style="border-left:4px solid var(--indigo)">
        <h3>Mensuelle</h3>
        <p style="font-size:1.5rem;font-family:var(--serif);color:var(--encre);margin:.5rem 0">
          <?= e((string)nha_config('prix_mensuel', '—')) ?></p>
        <p>La synchronisation entre appareils, l'historique conservé et les bilans de progression. Sans engagement.</p>
        <ul class="details" style="--teinte:var(--indigo)">
          <li>Synchronisation sur tous vos appareils</li>
          <li>Historique et bilans conservés</li>
          <li>Valable sur toutes les applications</li>
        </ul>
        <?php if ($abonne): ?>
          <p style="margin-top:1.25rem;color:var(--encre-doux);font-size:.9375rem">Formule en cours ou déjà couverte.</p>
        <?php elseif (!$ouvert): ?>
          <p style="margin-top:1.25rem;color:var(--encre-doux);font-size:.9375rem">Bientôt disponible.</p>
        <?php elseif (!$compte): ?>
          <p style="margin-top:1.25rem"><a class="bouton" href="/inscription.php">Créer un compte</a></p>
        <?php else: ?>
          <p style="margin-top:1.25rem"><a class="bouton" href="/api/paiement.php?formule=mensuel">Choisir le mensuel</a></p>
        <?php endif; ?>
      </li>

      <li class="tuile" style="border-left:4px solid var(--d-sport)">
        <h3>Annuelle</h3>
        <p style="font-size:1.5rem;font-family:var(--serif);color:var(--encre);margin:.5rem 0">
          <?= e((string)nha_config('prix_annuel', '—')) ?></p>
        <p>La même chose, réglée une fois par an&nbsp;: <?= e((string)nha_config('prix_economie', '')) ?>.</p>
        <ul class="details" style="--teinte:var(--d-sport)">
          <li>Identique à la formule mensuelle</li>
          <li><?= e((string)nha_config('prix_economie', 'moins cher à l\'année')) ?></li>
          <li>Une seule facture par an</li>
        </ul>
        <?php if ($abonne): ?>
          <p style="margin-top:1.25rem;color:var(--encre-doux);font-size:.9375rem">
            Vous pouvez basculer sur l'annuel depuis le portail de facturation.</p>
        <?php elseif (!$ouvert): ?>
          <p style="margin-top:1.25rem;color:var(--encre-doux);font-size:.9375rem">Bientôt disponible.</p>
        <?php elseif (!$compte): ?>
          <p style="margin-top:1.25rem"><a class="bouton discret" href="/inscription.php">Créer un compte</a></p>
        <?php else: ?>
          <p style="margin-top:1.25rem"><a class="bouton" href="/api/paiement.php?formule=annuel">Choisir l'annuel</a></p>
        <?php endif; ?>
      </li>

    </ul>
    <p style="color:var(--encre-doux);font-size:.9375rem;margin-top:1.5rem">
      Paiement par carte, traité par Stripe. Nous ne voyons ni ne conservons vos données bancaires.
      Pour une école, un club ou une entreprise, <a href="/contact.php?sujet=association">écrivez-nous</a>&nbsp;:
      nous établissons une facture unique.
    </p>
  </div>
</section>

<?php if (count($places) > 1): ?>
<section class="section">
  <div class="enveloppe">
    <h2>Les personnes que vous <em>couvrez</em></h2>
    <p>Votre abonnement finance <?= count($places) ?> comptes sur <?= (int)$places[0]['seats'] ?> places.</p>
    <dl>
      <?php foreach ($places as $p): ?>
        <div class="paire"><dt><?= e($p['name'] ?: $p['email']) ?></dt><dd><?= e($p['email']) ?></dd></div>
      <?php endforeach; ?>
    </dl>
  </div>
</section>
<?php endif; ?>

<section class="section">
  <div class="enveloppe lecture">
    <h2>Les <em>questions</em> qui reviennent</h2>
    <details class="question"><summary>J'ai déjà payé sur l'application d'apprentissage. Dois-je repayer ailleurs&nbsp;?</summary>
      <p>Non. L'abonnement est attaché à votre compte, pas à l'application par laquelle il a été souscrit. Il s'applique automatiquement aux applications suivantes.</p></details>
    <details class="question"><summary>Que se passe-t-il si j'arrête de payer&nbsp;?</summary>
      <p>Vous revenez à la formule gratuite à la fin de la période déjà réglée. Rien n'est effacé&nbsp;: vos données restent, seule la synchronisation s'arrête. Elles redeviennent accessibles si vous vous réabonnez.</p></details>
    <details class="question"><summary>Comment obtenir mes factures&nbsp;?</summary>
      <p>Depuis le portail de facturation, accessible par le bouton ci-dessus une fois abonné. Vous y trouvez l'historique complet en PDF.</p></details>
    <details class="question"><summary>Puis-je récupérer mon argent&nbsp;?</summary>
      <p>Les conditions générales prévoient le remboursement au prorata en cas d'interruption du service de notre fait. Voir <a href="/conditions.php#article-5">l'article 5</a>.</p></details>
  </div>
</section>

<script>
/* Le partage des places.
   Chaque action renvoie la liste à jour : on repeint plutôt que de
   deviner, ce qui évite un affichage qui contredit la base. */
(function () {
  const message = document.getElementById('places-message');
  const liste = document.getElementById('membres-abo');
  if (!liste) return;

  function dire(texte, bon){
    message.hidden = false;
    message.className = 'admin-message ' + (bon ? 'ok' : 'err');
    message.textContent = texte;
  }

  function jeton(){
    const m = document.cookie.match(/(?:^|; )nha_csrf=([^;]*)/);
    return m ? m[1] : '';
  }

  async function appeler(corps){
    const r = await fetch('/api/abonnement-places.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-NHA-CSRF': jeton() },
      body: JSON.stringify(corps)
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.message || 'Opération impossible.');
    return d;
  }

  function repeindre(d){
    liste.innerHTML = '';
    (d.membres || []).forEach(function (m) {
      const li = document.createElement('li');
      li.dataset.compte = m.id;
      const initiale = (m.nom || '?').charAt(0).toUpperCase();
      li.innerHTML = '<span class="pastille-abo">' + initiale + '</span>'
        + '<span class="qui"><b></b><span class="adresse"></span></span>';
      li.querySelector('b').textContent = m.nom;
      li.querySelector('.adresse').textContent = m.email;
      liste.appendChild(li);
    });
    const compte = document.getElementById('places-compte');
    if (compte){
      const n = (d.membres || []).length;
      compte.innerHTML = '<b>' + n + '</b> place' + (n > 1 ? 's' : '')
        + ' occupée' + (n > 1 ? 's' : '') + ' sur <b>' + d.places + '</b>.';
    }
    // le rechargement remet les boutons « Retirer » au bon endroit
    setTimeout(function(){ window.location.reload(); }, 1200);
  }

  const forme = document.getElementById('ajout-place');
  if (forme) forme.addEventListener('submit', async function (e) {
    e.preventDefault();
    const champ = document.getElementById('place-email');
    const bouton = forme.querySelector('button');
    bouton.disabled = true;
    try {
      const d = await appeler({ action:'ajouter', email: champ.value.trim() });
      champ.value = '';
      dire(d.message, true);
      repeindre(d);
    } catch(err){ dire(err.message, false); }
    bouton.disabled = false;
  });

  liste.addEventListener('click', async function (e) {
    if (!e.target.classList.contains('retirer-place')) return;
    const li = e.target.closest('li');
    const nom = li.querySelector('b').textContent;
    if (!window.confirm('Retirer ' + nom + ' de votre abonnement ?\n\n'
        + 'Cette personne perdra l\'accès aux applications payantes, mais '
        + 'gardera son compte et tout ce qu\'elle y a créé.')) return;
    e.target.disabled = true;
    try {
      const d = await appeler({ action:'retirer', compte: li.dataset.compte });
      dire(d.message, true);
      repeindre(d);
    } catch(err){ dire(err.message, false); e.target.disabled = false; }
  });
})();
</script>

<?php nha_page_fin(); ?>
