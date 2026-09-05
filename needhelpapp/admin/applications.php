<?php
/**
 * Administration — le catalogue des applications.
 *
 * Cette table décide de ce qu'affiche l'accueil, et à quoi se rattachent
 * les sessions et le journal. Une application absente ne casse plus rien,
 * mais elle brouille les traces.
 */
declare(strict_types=1);
require __DIR__ . '/../partials/page.php';
require_once __DIR__ . '/_socle.php';
require_once __DIR__ . '/../includes/http.php';

$moi = nha_admin_exiger();
csrf_cookie();

$apps = [];
try {
    $apps = nha_db()->query(
        'SELECT p.*,
                (SELECT COUNT(*) FROM app_users au WHERE au.app_id = p.id) AS utilisateurs,
                (SELECT COUNT(*) FROM sessions s WHERE s.created_app_id = p.id
                  AND s.expires_at > NOW()) AS sessions_ouvertes
         FROM apps p ORDER BY p.position, p.id'
    )->fetchAll();
} catch (Throwable $e) { $erreur = $e->getMessage(); }

$etats = ['en_ligne' => 'ouverte', 'maintenance' => 'fermée pour mise à jour',
          'construction' => 'en construction', 'etude' => 'à l\'étude',
          'archive' => 'archivée'];

nha_page_debut('Les applications — administration', '', 'admin');
nha_admin_onglets('/admin/applications.php');
?>

<section class="section" style="padding-top:2rem">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.7rem,4vw,2.2rem)">Les applications</h1>
    <p>Ce catalogue commande l'accueil du portail, et sert de référence aux
       sessions et au journal.</p>

    <?php if (!$apps): ?>
      <p class="vide">Le catalogue est vide. Exécutez <span class="mono">sql/applications.sql</span>.</p>
    <?php else: ?>
      <div class="admin-tableau-cadre">
        <table class="admin-tableau">
          <thead><tr>
            <th>Application</th><th>Code</th><th>État</th>
            <th>Utilisateurs</th><th>Sessions en cours</th><th>Adresse</th>
          </tr></thead>
          <tbody>
            <?php foreach ($apps as $a): ?>
              <tr>
                <td><span style="display:inline-block;width:.7rem;height:.7rem;border-radius:50%;
                          background:<?= e($a['color']) ?>;margin-right:.4rem"></span>
                    <b><?= e($a['name']) ?></b><br>
                    <span class="mono"><?= e($a['tagline']) ?></span></td>
                <td><span class="mono"><?= e($a['code']) ?></span></td>
                <td>
                  <?php if ($a['code'] === 'portail'): ?>
                    <span class="mono">ouverte</span>
                  <?php else: ?>
                    <select class="admin-statut" data-app="<?= (int) $a['id'] ?>"
                            aria-label="État de <?= e($a['name']) ?>">
                      <?php foreach ($etats as $v => $l): ?>
                        <option value="<?= e($v) ?>" <?= $a['status'] === $v ? 'selected' : '' ?>>
                          <?= e($l) ?></option>
                      <?php endforeach; ?>
                    </select>
                  <?php endif; ?>
                </td>
                <td><?= e(nha_admin_nombre($a['utilisateurs'])) ?></td>
                <td><?= e(nha_admin_nombre($a['sessions_ouvertes'])) ?></td>
                <td><?= $a['url'] ? '<a href="' . e($a['url']) . '">' . e($a['url']) . '</a>' : '—' ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>

    <p id="admin-message" class="admin-message" hidden></p>

    <div class="avis info" style="margin-top:var(--e4)">
      <p><b>Fermer une application le temps d'une mise à jour.</b> Choisissez
         « fermée pour mise à jour »&nbsp;: ses visiteurs voient une page qui
         l'explique, au lieu d'une erreur au milieu d'un exercice.</p>
      <p style="margin-bottom:0">Les administrateurs continuent d'entrer — c'est
         justement à eux de vérifier que tout fonctionne avant de rouvrir. Le
         portail, lui, ne peut pas être fermé&nbsp;: c'est par lui qu'on rouvre
         les autres.</p>
    </div>

    <h2 style="margin-top:2.5rem">Brancher une <em>nouvelle application</em></h2>
    <ol style="line-height:1.9">
      <li>Ajouter sa ligne dans <span class="mono">sql/applications.sql</span>, puis l'exécuter.</li>
      <li>Créer le sous-domaine et sa base <span class="mono">6l3nq9_&lt;code&gt;</span>.</li>
      <li>Y copier <span class="mono">includes/nha-core.php</span> et
          <span class="mono">config/nha.php</span>.</li>
      <li>Poser <span class="mono">SetEnv NHA_APP &lt;code&gt;</span> dans son
          <span class="mono">.htaccess</span>.</li>
      <li>Donner à son utilisateur MySQL les droits sur sa base
          <b>et</b> sur <span class="mono">6l3nq9_core</span>.</li>
      <li>Placer dans sa barre de navigation un retour vers
          <span class="mono">https://needhelpapp.com/</span> : depuis un
          sous-domaine, on doit toujours pouvoir revenir au portail.</li>
    </ol>
    <p style="color:var(--encre-doux)">
      Elle hérite alors de la connexion unique, des rôles et de l'abonnement,
      sans une ligne d'authentification à écrire.
    </p>
  </div>
</section>

<script>
/* Le changement d'état part aussitôt : c'est une bascule, pas un
   formulaire. On est souvent pressé quand on ferme une application. */
document.querySelectorAll('.admin-statut').forEach(function (sel) {
  var avant = sel.value;
  sel.addEventListener('change', function () {
    var zone = document.getElementById('admin-message');
    sel.disabled = true;
    fetch('/api/admin-application.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'X-NHA-CSRF': (document.cookie.match(/(?:^|; )nha_csrf=([^;]*)/) || [])[1] || '' },
      body: JSON.stringify({ id: sel.dataset.app, statut: sel.value })
    }).then(function (r) { return r.json(); }).then(function (d) {
      sel.disabled = false;
      zone.hidden = false;
      zone.className = 'admin-message ' + (d.ok ? 'ok' : 'err');
      zone.textContent = d.message || 'Erreur.';
      if (d.ok) { avant = sel.value; } else { sel.value = avant; }
    }).catch(function () {
      sel.disabled = false; sel.value = avant;
      zone.hidden = false; zone.className = 'admin-message err';
      zone.textContent = 'Le serveur n\u2019a pas répondu.';
    });
  });
});
</script>

<?php nha_page_fin();
