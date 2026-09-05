<?php
/**
 * Administration — les abonnements.
 *
 * Ce qui est facturé, par qui, et ce que Stripe a raconté. C'est ici qu'on
 * comprend pourquoi un compte n'a pas les droits qu'il croit avoir payés.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';

$moi = nha_admin_exiger();
$statut = (string) ($_GET['statut'] ?? '');

$sql = 'SELECT s.*, a.email AS payeur, p.code AS vendu_par,
               (SELECT COUNT(*) FROM subscription_seats seat
                 WHERE seat.subscription_id = s.id AND seat.removed_at IS NULL) AS places
        FROM subscriptions s
        LEFT JOIN accounts a ON a.id = s.payer_account_id
        LEFT JOIN apps p ON p.id = s.sold_by_app_id
        WHERE 1 = 1';
$args = [];
if ($statut !== '' && preg_match('/^[a-z]+$/', $statut)) {
    $sql .= ' AND s.status = ?';
    $args[] = $statut;
}
$sql .= ' ORDER BY s.id DESC LIMIT 100';

$abos = [];
try {
    $st = nha_db()->prepare($sql);
    $st->execute($args);
    $abos = $st->fetchAll();
} catch (Throwable $e) { $erreur = $e->getMessage(); }

$evenements = [];
try {
    $evenements = nha_db()->query(
        'SELECT provider_event_id, type, received_at, processed_at, error
         FROM billing_events ORDER BY id DESC LIMIT 25'
    )->fetchAll();
} catch (Throwable $e) { }

nha_page_debut('Les abonnements — administration', '', 'admin');
nha_admin_onglets('/admin/abonnements.php');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Les abonnements</h1>

    <form class="admin-filtres" method="get" action="/admin/abonnements.php">
      <select name="statut" aria-label="Filtrer par statut">
        <option value="">Tous les statuts</option>
        <?php foreach (['actif' => 'Actifs', 'essai' => 'En essai', 'resilie' => 'Résiliés',
                        'impaye' => 'Impayés', 'termine' => 'Terminés'] as $v => $l): ?>
          <option value="<?= e($v) ?>" <?= $statut === $v ? 'selected' : '' ?>><?= e($l) ?></option>
        <?php endforeach; ?>
      </select>
      <button class="bouton" type="submit">Filtrer</button>
    </form>

    <?php if (!$abos): ?>
      <p class="vide">Aucun abonnement<?= $statut ? ' avec ce statut' : ' pour l\'instant' ?>.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr>
            <th>Payeur</th><th>Formule</th><th>Statut</th><th>Échéance</th>
            <th>Portée</th><th>Places</th>
          </tr></thead>
          <tbody>
            <?php foreach ($abos as $s): ?>
              <tr>
                <td><?= e($s['payeur'] ?? '—') ?><br>
                    <span class="mono"><?= e($s['provider_subscription_id'] ?? '') ?></span></td>
                <td><?= e($s['plan']) ?><br><span class="mono"><?= e($s['period'] ?? '') ?></span></td>
                <td><?= $s['status'] === 'impaye'
                       ? '<span class="admin-alerte">impayé</span>'
                       : e($s['status']) ?></td>
                <td><?= e(nha_admin_date($s['current_period_end'])) ?>
                    <?php if ($s['cancel_at']): ?>
                      <br><span class="mono">résiliation le <?= e(nha_admin_date($s['cancel_at'])) ?></span>
                    <?php endif; ?></td>
                <td><?= $s['scope'] === 'all' ? 'toutes les applications' : e($s['vendu_par'] ?? '—') ?></td>
                <td><?= (int) $s['places'] ?><?= (int) $s['seats'] > 1 ? ' / ' . (int) $s['seats'] : '' ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Ce que <em>Stripe</em> a envoyé</h2>
    <p>Les dernières notifications reçues. Un abonnement payé mais sans droits
       s’explique presque toujours ici : la notification n'est jamais arrivée,
       ou son traitement a échoué.</p>
    <?php if (!$evenements): ?>
      <p class="vide">Aucune notification reçue. Si des paiements ont eu lieu,
         vérifiez le point de terminaison dans Stripe → Développeurs → Webhooks.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr><th>Reçue</th><th>Type</th><th>Traitée</th><th>Erreur</th></tr></thead>
          <tbody>
            <?php foreach ($evenements as $ev): ?>
              <tr>
                <td><?= e(nha_admin_date($ev['received_at'], true)) ?></td>
                <td><span class="mono"><?= e($ev['type']) ?></span></td>
                <td><?= $ev['processed_at'] ? e(nha_admin_date($ev['processed_at'], true))
                                            : '<span class="admin-alerte">non traitée</span>' ?></td>
                <td><?= $ev['error'] ? '<span class="admin-alerte">' . e($ev['error']) . '</span>' : '—' ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</section>

<?php nha_page_fin();
