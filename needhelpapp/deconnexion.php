<?php
/** Déconnexion. En POST depuis un bouton, ou en GET depuis le menu. */
require_once __DIR__ . '/includes/nha-core.php';
nha_logout();
header('Location: /?deconnecte=1');
exit;
