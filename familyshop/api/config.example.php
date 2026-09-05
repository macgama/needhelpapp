<?php
/**
 * Copiez ce fichier en config.php puis renseignez vos identifiants.
 * config.php ne doit jamais être publié : il porte le mot de passe.
 */
return [
    'driver'   => 'mysql',
    'host'     => '6l3nq9.myd.infomaniak.com',
    'port'     => 3306,
    'database' => '6l3nq9_familyshop',
    'user'     => 'utilisateur_de_la_base',
    'password' => 'mot_de_passe_de_la_base',

    // utilisé seulement si driver vaut 'sqlite'
    'sqlite_path' => __DIR__ . '/../data/familyshop.sqlite',

    'cookie_secure' => true,
    'site_url'      => 'https://familyshop.needhelpapp.com',

    // Identifiant client Google, le MÊME que celui du portail : c'est lui
    // qui décide à qui les jetons sont destinés. Laissez vide pour ne pas
    // proposer « Continuer avec Google ».
    'google_client_id' => '',

    // Le temps de brancher le portail, mettez true pour voir la raison
    // technique des échecs au lieu d'un message générique. À retirer ensuite.
    'portail_debug' => false,
];
