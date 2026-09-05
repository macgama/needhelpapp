<?php
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';
csrf_cookie();

$compte = nha_exiger_connexion();
$droit  = nha_entitlement((int)$compte['id']);

// Les applications où ce compte est déjà actif : la réponse concrète à
// « suis-je déjà inscrit ailleurs ? ».
$st = nha_db()->prepare(
    'SELECT p.name, p.url, p.color, p.status, au.role, au.first_seen_at, au.last_seen_at
     FROM app_users au JOIN apps p ON p.id = au.app_id
     WHERE au.account_id = ? ORDER BY p.position'
);
$st->execute([$compte['id']]);
$mes_apps = $st->fetchAll();

$st = nha_db()->prepare('SELECT provider FROM identities WHERE account_id = ?');
$st->execute([$compte['id']]);
$fournisseurs = $st->fetchAll(PDO::FETCH_COLUMN);

$st = nha_db()->prepare(
    'SELECT created_app_id, last_seen_at, expires_at, user_agent,
            token_hash = ? AS actuelle
     FROM sessions WHERE account_id = ? AND expires_at > NOW()
     ORDER BY last_seen_at DESC LIMIT 10'
);
$st->execute([hash('sha256', $_COOKIE[NHA_COOKIE] ?? ''), $compte['id']]);
$sessions = $st->fetchAll();

function date_fr(?string $d): string {
    return $d ? date('j F Y', strtotime($d)) : '—';
}

nha_page_debut('Mon compte', '', 'profil');
?>
<section class="section" style="padding-top:clamp(2.5rem,7vw,4rem)">
  <div class="enveloppe">
    <h1 style="font-size:clamp(1.9rem,5vw,2.6rem)">Bonjour<?= $compte['name'] ? ', ' . e($compte['name']) : '' ?>.</h1>
    <p style="color:var(--encre-doux);margin-top:.75rem">
      Ce compte vous ouvre <?= count($mes_apps) ?> application<?= count($mes_apps) > 1 ? 's' : '' ?>
      et toutes celles qui viendront.
    </p>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Vos <em>applications</em></h2>
    <p>Une application apparaît ici dès votre première connexion sur son site.</p>
    <ul class="tuiles">
      <?php foreach ($mes_apps as $a): ?>
        <li class="tuile" style="border-left:4px solid <?= e($a['color']) ?>">
          <h3><?= e($a['name']) ?></h3>
          <p>Depuis le <?= e(date_fr($a['first_seen_at'])) ?>
             <?= $a['role'] !== 'membre' ? ' · ' . e($a['role']) : '' ?></p>
          <?php if ($a['url']): ?>
            <p style="margin-top:.75rem"><a href="<?= e($a['url']) ?>" style="color:<?= e($a['color']) ?>">Ouvrir →</a></p>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Votre <em>abonnement</em></h2>
    <dl>
      <div class="paire"><dt>Formule</dt>
        <dd><span class="pastille<?= $droit['plan'] === 'gratuit' ? ' libre' : '' ?>"><?= e($droit['plan']) ?></span></dd></div>
      <div class="paire"><dt>Statut</dt><dd><?= e($droit['status']) ?></dd></div>
      <?php if (!empty($droit['until'])): ?>
        <div class="paire"><dt><?= !empty($droit['cancel_at']) ? 'Se termine le' : 'Prochain renouvellement' ?></dt>
          <dd><?= e(date_fr($droit['until'])) ?></dd></div>
      <?php endif; ?>
      <?php if (!empty($droit['sold_by'])): ?>
        <div class="paire"><dt>Souscrit via</dt><dd><?= e($droit['sold_by']) ?></dd></div>
      <?php endif; ?>
    </dl>
    <p style="margin-top:1.25rem"><a class="bouton discret" href="/abonnement.php">Gérer l'abonnement</a></p>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Vos <em>identifiants</em></h2>
    <form action="/api/profil.php" method="post" data-json style="max-width:34rem">
      <label><span>Prénom</span>
        <input type="text" name="prenom" value="<?= e($compte['name']) ?>" maxlength="60"></label>
      <label><span>Adresse e-mail</span>
        <input type="email" name="email" value="<?= e($compte['email']) ?>" required>
        <p class="aide-champ">Un changement d'adresse doit être confirmé depuis la nouvelle boîte.</p></label>
      <label><span>Nouveau mot de passe (laisser vide pour ne pas changer)</span>
        <input type="password" name="mot_de_passe" autocomplete="new-password" minlength="10"></label>
      <label><span>Mot de passe actuel</span>
        <input type="password" name="mot_de_passe_actuel" autocomplete="current-password">
        <p class="aide-champ">Demandé pour tout changement d'adresse ou de mot de passe.</p></label>
      <button class="bouton" type="submit">Enregistrer</button>
      <p class="avis" role="alert"></p>
    </form>
    <?php if ($fournisseurs): ?>
      <p style="margin-top:1.5rem;color:var(--encre-doux);font-size:.9375rem">
        Connexion également possible avec&nbsp;: <?= e(implode(', ', $fournisseurs)) ?>.
      </p>
    <?php endif; ?>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Vos <em>appareils</em></h2>
    <p>Chaque connexion reste valable trente jours. Fermer les autres sessions déconnecte tous vos autres appareils, sur toutes les applications.</p>
    <table style="width:100%;border-collapse:collapse;font-size:.9375rem;margin-bottom:1.5rem">
      <?php foreach ($sessions as $s): ?>
        <tr style="border-bottom:1px solid var(--trait)">
          <td style="padding:.7rem 0;color:var(--encre-doux)"><?= e(mb_substr((string)$s['user_agent'], 0, 60)) ?></td>
          <td style="padding:.7rem 0;text-align:right;white-space:nowrap">
            <?= $s['actuelle'] ? '<span class="pastille">Cet appareil</span>' : e(date_fr($s['last_seen_at'])) ?>
          </td>
        </tr>
      <?php endforeach; ?>
    </table>
    <form action="/api/sessions.php" method="post" data-json>
      <button class="bouton discret" type="submit">Fermer les autres sessions</button>
      <p class="avis" role="alert"></p>
    </form>
  </div>
</section>

<section class="section">
  <div class="enveloppe">
    <h2>Vos <em>données</em></h2>
    <p>Vous pouvez récupérer une copie de tout ce que nous détenons, ou supprimer votre compte. La suppression est définitive et retire vos données de toutes les applications.</p>
    <p>
      <a class="bouton discret" href="/api/export.php">Télécharger mes données</a>
      <a class="bouton danger" href="/supprimer-compte.php">Supprimer mon compte</a>
    </p>
  </div>
</section>
<?php nha_page_fin(); ?>
