<?php
/**
 * Administration — les comptes.
 *
 * Chercher quelqu'un, voir ce qu'il utilise et ce qu'il paie, changer son
 * rôle. Le rôle est global : il n'y a pas d'administrateur d'une seule
 * application.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../includes/http.php';

$moi = nha_admin_exiger();
csrf_cookie();

$q      = trim((string) ($_GET['q'] ?? ''));
$filtre = (string) ($_GET['filtre'] ?? '');
$page   = max(1, (int) ($_GET['p'] ?? 1));
$parPage = 40;

$sql = 'SELECT a.id, a.email, a.name, a.role, a.plan, a.plan_statut, a.plan_fin,
               a.email_verified_at, a.created_at, a.last_login_at, a.deleted_at,
               (SELECT COUNT(*) FROM app_users au WHERE au.account_id = a.id) AS nb_apps,
               (SELECT COUNT(*) FROM identities i WHERE i.account_id = a.id) AS nb_identites
        FROM accounts a WHERE 1 = 1';
$args = [];

if ($q !== '') {
    $sql .= ' AND (a.email LIKE ? OR a.name LIKE ?)';
    $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
    $args[] = $like;
    $args[] = $like;
}
switch ($filtre) {
    case 'admins':      $sql .= " AND a.role <> 'membre'"; break;
    case 'abonnes':     $sql .= " AND a.plan_statut IN ('actif','essai')"; break;
    case 'impayes':     $sql .= " AND a.plan_statut = 'impaye'"; break;
    case 'non_verifies':$sql .= ' AND a.email_verified_at IS NULL'; break;
    case 'supprimes':   $sql .= ' AND a.deleted_at IS NOT NULL'; break;
    default:            $sql .= ' AND a.deleted_at IS NULL';
}
$sql .= ' ORDER BY a.id DESC LIMIT ' . ($parPage + 1) . ' OFFSET ' . (($page - 1) * $parPage);

$comptes = [];
$erreur = null;
try {
    $st = nha_db()->prepare($sql);
    $st->execute($args);
    $comptes = $st->fetchAll();
} catch (Throwable $e) {
    $erreur = $e->getMessage();
}
$suite = count($comptes) > $parPage;
if ($suite) { array_pop($comptes); }

$lien = static function (array $params) use ($q, $filtre): string {
    return '/admin/comptes.php?' . http_build_query(array_merge(
        ['q' => $q, 'filtre' => $filtre], $params));
};

nha_page_debut('Les comptes — administration', '', 'admin');
nha_admin_onglets('/admin/comptes.php');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Les comptes</h1>

    <form class="admin-filtres" method="get" action="/admin/comptes.php">
      <input type="search" name="q" value="<?= e($q) ?>" placeholder="Adresse ou prénom"
             aria-label="Chercher un compte">
      <select name="filtre" aria-label="Filtrer">
        <option value="">Comptes actifs</option>
        <option value="admins"       <?= $filtre === 'admins' ? 'selected' : '' ?>>Rôles particuliers</option>
        <option value="abonnes"      <?= $filtre === 'abonnes' ? 'selected' : '' ?>>Abonnés</option>
        <option value="impayes"      <?= $filtre === 'impayes' ? 'selected' : '' ?>>Paiements en échec</option>
        <option value="non_verifies" <?= $filtre === 'non_verifies' ? 'selected' : '' ?>>Adresses non vérifiées</option>
        <option value="supprimes"    <?= $filtre === 'supprimes' ? 'selected' : '' ?>>Comptes supprimés</option>
      </select>
      <button class="bouton" type="submit">Chercher</button>
    </form>

    <?php if ($erreur): ?>
      <div class="avertir"><p>Lecture impossible : <?= e($erreur) ?></p></div>
    <?php endif; ?>

    <p id="admin-message" class="admin-message" hidden></p>

    <?php if (!$comptes): ?>
      <p class="vide">Aucun compte ne correspond.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead>
            <tr><th>Compte</th><th>Rôle</th><th>Abonnement</th><th>Applications</th><th>Inscrit</th></tr>
          </thead>
          <tbody>
            <?php foreach ($comptes as $c): ?>
              <tr<?= $c['deleted_at'] ? ' class="supprime"' : '' ?>>
                <td>
                  <b><?= e($c['name'] ?: '—') ?></b><br>
                  <span class="mono"><?= e($c['email']) ?></span>
                  <?php if (!$c['email_verified_at']): ?>
                    <br><span class="admin-alerte">adresse non vérifiée</span>
                  <?php endif; ?>
                  <?php if ($c['nb_identites'] > 0): ?>
                    <br><span class="mono">via Google</span>
                  <?php endif; ?>
                  <?php if ($c['deleted_at']): ?>
                    <br><span class="admin-alerte">supprimé le <?= e(nha_admin_date($c['deleted_at'])) ?></span>
                  <?php endif; ?>
                </td>
                <td>
                  <select class="admin-role" data-compte="<?= (int) $c['id'] ?>"
                          <?= $c['deleted_at'] ? 'disabled' : '' ?>
                          aria-label="Rôle de <?= e($c['email']) ?>">
                    <option value="membre"     <?= $c['role'] === 'membre' ? 'selected' : '' ?>>Membre</option>
                    <option value="moderateur" <?= $c['role'] === 'moderateur' ? 'selected' : '' ?>>Modérateur</option>
                    <option value="admin"      <?= $c['role'] === 'admin' ? 'selected' : '' ?>>Administrateur</option>
                  </select>
                </td>
                <td>
                  <?php if ($c['role'] !== 'membre'): ?>
                    <span class="pastille libre">accès offert</span>
                  <?php elseif ($c['plan_statut'] === 'actif' || $c['plan_statut'] === 'essai'): ?>
                    <?= e($c['plan']) ?><br><span class="mono"><?= e($c['plan_statut']) ?>
                      <?= $c['plan_fin'] ? ' → ' . e(nha_admin_date($c['plan_fin'])) : '' ?></span>
                  <?php elseif ($c['plan_statut'] === 'impaye'): ?>
                    <span class="admin-alerte">paiement en échec</span>
                  <?php else: ?>
                    <span class="mono">version gratuite</span>
                  <?php endif; ?>
                </td>
                <td><?= (int) $c['nb_apps'] ?></td>
                <td>
                  <?= e(nha_admin_date($c['created_at'])) ?><br>
                  <span class="mono"><?= $c['last_login_at']
                      ? 'vu le ' . e(nha_admin_date($c['last_login_at']))
                      : 'jamais revenu' ?></span>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>

      <div class="admin-pages">
        <?php if ($page > 1): ?>
          <a href="<?= e($lien(['p' => $page - 1])) ?>">← Précédents</a>
        <?php endif; ?>
        <span>Page <?= $page ?></span>
        <?php if ($suite): ?>
          <a href="<?= e($lien(['p' => $page + 1])) ?>">Suivants →</a>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <p style="color:var(--encre-doux);margin-top:1.5rem">
      Le rôle vaut pour toutes les applications : un administrateur l'est partout.
      Le modérateur, lui, accède à tout sans payer.
    </p>
  </div>
</section>

<script>
/* Le changement de rôle part aussitôt, sans bouton « enregistrer » :
   un seul choix, une seule conséquence. Le serveur revérifie tout. */
document.querySelectorAll('.admin-role').forEach(function (sel) {
  var avant = sel.value;
  sel.addEventListener('change', function () {
    var message = document.getElementById('admin-message');
    sel.disabled = true;
    fetch('/api/admin-role.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'X-NHA-CSRF': (document.cookie.match(/(?:^|; )nha_csrf=([^;]*)/) || [])[1] || '' },
      body: JSON.stringify({ compte: sel.dataset.compte, role: sel.value })
    }).then(function (r) { return r.json(); }).then(function (d) {
      sel.disabled = false;
      message.hidden = false;
      if (d.ok) { avant = sel.value; message.className = 'admin-message ok'; }
      else { sel.value = avant; message.className = 'admin-message err'; }
      message.textContent = d.message || 'Rôle modifié.';
    }).catch(function () {
      sel.disabled = false; sel.value = avant;
      message.hidden = false; message.className = 'admin-message err';
      message.textContent = 'Le serveur n\u2019a pas répondu.';
    });
  });
});
</script>

<?php nha_page_fin();
