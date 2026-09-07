<?php
/**
 * CE FICHIER EST UN GABARIT. NE LE REMPLISSEZ JAMAIS.
 *
 * Copiez-le en  config.php  — qui n'est ni versionné ni déployé — et
 * renseignez la copie. Le remplir ici publie vos identifiants : c'est
 * arrivé, et le dépôt est public.
 *
 * config.php ne doit jamais être publié ni versionné : il porte le mot
 * de passe de la base ET la clé de chiffrement des données financières.
 *
 * Si votre hébergement le permet, placez-le au-dessus de la racine web
 * plutôt que dans api/. Le .htaccess du dossier le refuse déjà, mais un
 * fichier hors de portée vaut mieux qu'un fichier bien gardé.
 */
return [
    // ---- la base de l'application ----
    'host'     => 'localhost',
    'database' => '6l3nq9_budget',
    'user'     => 'utilisateur_de_la_base',
    'password' => 'mot_de_passe_de_la_base',

    /* ================================================================
       LA CLÉ DE CHIFFREMENT

       C'est elle qui rend illisibles les montants, les libellés et les
       conditions d'emprunt dans la base. Sans elle, budget refuse de
       démarrer : écrire des données financières en clair dans une base
       prévue pour les recevoir chiffrées serait pire que de s'arrêter.

       Produisez-en une, une seule fois, et gardez-en une copie hors du
       serveur :

           php -r "echo base64_encode(random_bytes(32));"

       PERDRE CETTE CLÉ, C'EST PERDRE LES DONNÉES. Aucune sauvegarde de
       la base ne les rendra lisibles sans elle. Mettez-la dans votre
       gestionnaire de mots de passe avant d'aller plus loin.

       Pour en changer un jour, ajoutez la nouvelle sous un numéro
       suivant et pointez 'coffre_cle_active' dessus. Les anciennes
       lignes restent lisibles tant que leur clé figure encore ici : ne
       retirez jamais une clé tant qu'une seule ligne s'y réfère.
       ================================================================ */
    'coffre_cles' => [
        1 => '',   // 32 octets en base64
    ],
    'coffre_cle_active' => 1,

    // ---- maintenance ----
    // Ouvre api/calcul-test.php par HTTP. En ligne de commande, la clé
    // n'est pas nécessaire. Vide = ces pages restent fermées.
    'maintenance_token' => '',

    // Le temps de brancher le portail, mettez true pour voir la raison
    // technique des échecs de connexion au lieu d'un message général.
    'portail_debug' => false,
];
