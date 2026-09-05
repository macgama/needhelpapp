<?php
/**
 * Vérification minimale : « le dossier /api est-il bien en ligne, et PHP
 * tourne-t-il ? » Ouvrez https://needhelpapp.com/api/ping.php dans un
 * navigateur : vous devez voir un objet JSON.
 *
 * Ne touche NI la base NI la configuration : si ce script répond alors que
 * les autres échouent, le problème est dans la configuration, pas dans le
 * dépôt des fichiers.
 */
declare(strict_types=1);

// Lecture des marqueurs de version sans exécuter les fichiers : cette sonde
// doit répondre même si le socle est cassé.
$versions = [];
foreach (['nha-core', 'http', 'mailer'] as $f) {
    $chemin = __DIR__ . '/../includes/' . $f . '.php';
    $versions[$f . '.php'] = is_file($chemin)
        && preg_match('/NHA_BUILD_[A-Z]+ = \'([^\']+)\'/', (string)file_get_contents($chemin), $m)
        ? $m[1] : (is_file($chemin) ? 'version inconnue' : 'absent');
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'        => true,
    'service'   => 'NeedHelpApp API',
    'php'       => PHP_VERSION,
    'https'     => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'hote'      => $_SERVER['HTTP_HOST'] ?? null,
    'extensions'=> [
        'pdo_mysql' => extension_loaded('pdo_mysql'),
        'curl'      => extension_loaded('curl'),
        'mbstring'  => extension_loaded('mbstring'),
    ],
    'config'    => is_file(__DIR__ . '/../config/nha.php'),
    'versions'  => $versions,
    'coherent'  => count(array_unique($versions)) === 1,
    'heure'     => date('c'),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
