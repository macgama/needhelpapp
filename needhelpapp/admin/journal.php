<?php
/**
 * Administration — le journal.
 *
 * Deux traces distinctes : ce que les comptes ont fait, et les tentatives
 * de connexion échouées. La seconde sert à repérer une attaque, la
 * première à comprendre un compte.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';

$moi = nha_admin_exiger();
$q    = trim((string) ($_GET['q'] ?? ''));
$page = max(1, (int) ($_GET['p'] ?? 1));
$parPage = 60;

$sql = 'SELECT j.event, j.detail, j.created_at, j.ip, a.email, p.code AS app
        FROM audit_log j
        LEFT JOIN accounts a ON a.id = j.account_id
        LEFT JOIN apps p ON p.id = j.app_id
        WHERE 1 = 1';
$args = [];
if ($q !== '') {
    $sql .= ' AND (a.email LIKE ? OR j.event LIKE ? OR j.detail LIKE ?)';
    $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
    $args = [$like, $like, $like];
}
$sql .= ' ORDER BY j.id DESC LIMIT ' . ($parPage + 1) . ' OFFSET ' . (($page - 1) * $parPage);

$lignes = [];
try {
    $st = nha_db()->prepare($sql);
    $st->execute($args);
    $lignes = $st->fetchAll();
} catch (Throwable $e) { $erreur = $e->getMessage(); }
$suite = count($lignes) > $parPage;
if ($suite) { array_pop($lignes); }

$echecs = [];
try {
    $echecs = nha_db()->query(
        'SELECT email, ip, attempted_at, COUNT(*) AS n
         FROM login_attempts
         WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY email, ip ORDER BY n DESC, attempted_at DESC LIMIT 20'
    )->fetchAll();
} catch (Throwable $e) { }

nha_page_debut('Le journal — administration', '', 'admin');
nha_admin_onglets('/admin/journal.php');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Le journal</h1>

    <form class="admin-filtres" method="get" action="/admin/journal.php">
      <input type="search" name="q" value="<?= e($q) ?>"
             placeholder="Adresse, évènement, détail" aria-label="Chercher dans le journal">
      <button class="bouton" type="submit">Chercher</button>
    </form>

    <?php if (!$lignes): ?>
      <p class="vide">Rien à afficher.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr><th>Quand</th><th>Compte</th><th>Évènement</th><th>Application</th><th>Adresse IP</th></tr></thead>
          <tbody>
            <?php foreach ($lignes as $j): ?>
              <tr>
                <td><?= e(nha_admin_date($j['created_at'], true)) ?></td>
                <td><?= e($j['email'] ?? '—') ?></td>
                <td><?= e($j['event']) ?><?= $j['detail'] ? '<br><span class="mono">' . e($j['detail']) . '</span>' : '' ?></td>
                <td><?= e($j['app'] ?? '—') ?></td>
                <td><span class="mono"><?= e(nha_admin_ip($j['ip'])) ?></span></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <div class="admin-pages">
        <?php if ($page > 1): ?>
          <a href="/admin/journal.php?q=<?= urlencode($q) ?>&p=<?= $page - 1 ?>">← Précédents</a>
        <?php endif; ?>
        <span>Page <?= $page ?></span>
        <?php if ($suite): ?>
          <a href="/admin/journal.php?q=<?= urlencode($q) ?>&p=<?= $page + 1 ?>">Suivants →</a>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Les <em>connexions refusées</em> de la semaine</h2>
    <p>Regroupées par adresse et par origine. Un même couple qui revient
       souvent mérite un coup d'œil ; quelques essais dispersés sont normaux.</p>
    <?php if (!$echecs): ?>
      <p class="vide">Aucun échec cette semaine.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr><th>Adresse essayée</th><th>Origine</th><th>Tentatives</th><th>Dernière</th></tr></thead>
          <tbody>
            <?php foreach ($echecs as $t): ?>
              <tr>
                <td><?= e($t['email'] ?: '—') ?></td>
                <td><span class="mono"><?= e(nha_admin_ip($t['ip'])) ?></span></td>
                <td><?= (int) $t['n'] > 5
                       ? '<span class="admin-alerte">' . (int) $t['n'] . '</span>'
                       : (int) $t['n'] ?></td>
                <td><?= e(nha_admin_date($t['attempted_at'], true)) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</section>

<?php nha_page_fin();
