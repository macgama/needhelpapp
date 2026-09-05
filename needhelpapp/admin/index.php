<?php
/**
 * Administration — vue d'ensemble.
 *
 * Ce qu'on veut savoir en ouvrant la page : combien de comptes, combien
 * paient, ce qui s'est passé récemment, et si quelque chose cloche.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';

$moi = nha_admin_exiger();

/** Un compteur qui ne fait pas tomber la page s'il échoue. */
function compter(string $sql): int {
    try { return (int) nha_db()->query($sql)->fetchColumn(); }
    catch (Throwable $e) { return -1; }
}

$chiffres = [
    'Comptes'          => compter('SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL'),
    'Adresses vérifiées' => compter('SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL AND email_verified_at IS NOT NULL'),
    'Abonnements actifs' => compter("SELECT COUNT(*) FROM subscriptions WHERE status IN ('actif','essai')"),
    'Administrateurs'  => compter("SELECT COUNT(*) FROM accounts WHERE role = 'admin' AND deleted_at IS NULL"),
    'Applications'     => compter("SELECT COUNT(*) FROM apps WHERE status = 'en_ligne'"),
];

// les sept derniers jours, pour voir si le site vit
$nouveaux = compter('SELECT COUNT(*) FROM accounts WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)');
$connexions = compter('SELECT COUNT(*) FROM sessions WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)');
$echecs = compter('SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 7 DAY)');

// la répartition par application
$apps = [];
try {
    $apps = nha_db()->query(
        'SELECT p.name, p.code, p.color, p.status, COUNT(au.account_id) AS n
         FROM apps p LEFT JOIN app_users au ON au.app_id = p.id
         GROUP BY p.id ORDER BY p.position'
    )->fetchAll();
} catch (Throwable $e) { }

// les derniers évènements
$journal = [];
try {
    $journal = nha_db()->query(
        'SELECT j.event, j.detail, j.created_at, a.email, p.code AS app
         FROM audit_log j
         LEFT JOIN accounts a ON a.id = j.account_id
         LEFT JOIN apps p ON p.id = j.app_id
         ORDER BY j.id DESC LIMIT 12'
    )->fetchAll();
} catch (Throwable $e) { }

// ce qui mérite une alerte
$alertes = [];
$sansApp = compter('SELECT COUNT(*) FROM apps WHERE code = \'portail\'');
if ($sansApp === 0) {
    $alertes[] = 'L\'application « portail » manque au catalogue : les connexions '
               . 'faites ici ne sont rattachées à aucune application dans le journal. '
               . 'Exécutez sql/applications.sql.';
}
/* Les messages non traités : c'est la seule alerte sur laquelle on peut
   agir tout de suite, donc elle passe avant les autres. */
$aTraiter = compter('SELECT COUNT(*) FROM ideas WHERE handled_at IS NULL');
if ($aTraiter > 0) {
    $alertes[] = $aTraiter . ' message(s) en attente de réponse. '
               . 'Ils sont dans « Les messages ».';
}
$impayes = compter("SELECT COUNT(*) FROM subscriptions WHERE status = 'impaye'");
if ($impayes > 0) {
    $alertes[] = $impayes . ' abonnement(s) en échec de paiement.';
}
if ($echecs > 50) {
    $alertes[] = $echecs . ' tentatives de connexion échouées cette semaine : '
               . 'jetez un œil au journal.';
}

nha_page_debut('Administration', '', 'admin');
nha_admin_onglets('/admin/');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Vue d'ensemble</h1>

    <?php if ($alertes): ?>
      <div class="avertir" style="margin-top:1.5rem">
        <?php foreach ($alertes as $a): ?><p><?= e($a) ?></p><?php endforeach; ?>
      </div>
    <?php endif; ?>

    <ul class="admin-chiffres">
      <?php foreach ($chiffres as $libelle => $n): ?>
        <li><b><?= $n < 0 ? '—' : e(nha_admin_nombre($n)) ?></b><span><?= e($libelle) ?></span></li>
      <?php endforeach; ?>
    </ul>

    <p style="color:var(--encre-doux);margin-top:1rem">
      Ces sept derniers jours : <b><?= e(nha_admin_nombre(max(0, $nouveaux))) ?></b> compte(s) créé(s),
      <b><?= e(nha_admin_nombre(max(0, $connexions))) ?></b> connexion(s),
      <b><?= e(nha_admin_nombre(max(0, $echecs))) ?></b> échec(s).
    </p>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Les <em>applications</em></h2>
    <ul class="tuiles">
      <?php foreach ($apps as $a): ?>
        <li class="tuile" style="border-left:4px solid <?= e($a['color']) ?>">
          <h3><?= e($a['name']) ?></h3>
          <p><b><?= e(nha_admin_nombre($a['n'])) ?></b> utilisateur<?= $a['n'] > 1 ? 's' : '' ?>
             · <?= e(str_replace('_', ' ', $a['status'])) ?></p>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Les derniers <em>évènements</em></h2>
    <?php if (!$journal): ?>
      <p class="vide">Rien pour l'instant.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr><th>Quand</th><th>Compte</th><th>Évènement</th><th>Application</th></tr></thead>
          <tbody>
            <?php foreach ($journal as $j): ?>
              <tr>
                <td><?= e(nha_admin_date($j['created_at'], true)) ?></td>
                <td><?= e($j['email'] ?? '—') ?></td>
                <td><?= e($j['event']) ?><?= $j['detail'] ? ' · ' . e($j['detail']) : '' ?></td>
                <td><?= e($j['app'] ?? '—') ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <p style="margin-top:1rem"><a href="/admin/journal.php">Tout le journal →</a></p>
    <?php endif; ?>
  </div>
</section>

<?php nha_page_fin();
