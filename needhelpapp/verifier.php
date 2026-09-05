<?php
/** Confirmation d'adresse e-mail, à l'inscription ou lors d'un changement. */
require __DIR__ . '/partials/page.php';
require_once __DIR__ . '/includes/http.php';

$jeton = (string)($_GET['jeton'] ?? '');
$ok = false; $message = 'Ce lien a expiré ou a déjà servi.';

if (preg_match('/^[a-f0-9]{64}$/', $jeton)) {
    $db = nha_db();
    $st = $db->prepare(
        'SELECT id, account_id, payload FROM action_tokens
         WHERE token_hash = ? AND purpose = "verify_email"
           AND used_at IS NULL AND expires_at > NOW()'
    );
    $st->execute([hash('sha256', $jeton)]);
    if ($t = $st->fetch()) {
        $nouvel = json_decode((string)$t['payload'], true)['nouvel_email'] ?? null;
        $db->beginTransaction();
        if ($nouvel) {
            $db->prepare('UPDATE accounts SET email = ?, email_verified_at = NOW() WHERE id = ?')
               ->execute([$nouvel, $t['account_id']]);
            $message = 'Votre nouvelle adresse est confirmée.';
        } else {
            $db->prepare('UPDATE accounts SET email_verified_at = NOW() WHERE id = ?')
               ->execute([$t['account_id']]);
            $message = 'Votre adresse est confirmée. Votre compte est prêt.';
        }
        $db->prepare('UPDATE action_tokens SET used_at = NOW() WHERE id = ?')->execute([$t['id']]);
        $db->commit();
        nha_log((int)$t['account_id'], 'email_verified');
        $ok = true;
    }
}

nha_page_debut('Confirmation', '');
?>
<section class="auth">
  <div class="enveloppe etroit">
    <h1><?= $ok ? 'C\'est <em>confirmé</em>.' : 'Lien <em>expiré</em>.' ?></h1>
    <p><?= e($message) ?></p>
    <p><a class="bouton" href="<?= $ok ? '/profil.php' : '/connexion.php' ?>">
      <?= $ok ? 'Aller à mon compte' : 'Se connecter' ?></a></p>
  </div>
</section>
<?php nha_page_fin(); ?>
