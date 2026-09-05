<?php
/**
 * Copiez ce fichier en  config.php  puis renseignez vos identifiants.
 * config.php ne doit jamais être publié ni versionné : il contient
 * le mot de passe de la base de données.
 */
return [
    // 'mysql' sur l'hébergement Infomaniak, 'sqlite' pour essayer en local
    'driver'   => 'mysql',

    'host'     => 'localhost',
    'port'     => 3306,
    'database' => 'nom_de_la_base',
    'user'     => 'utilisateur_de_la_base',
    'password' => 'mot_de_passe_de_la_base',

    // utilisé seulement si driver vaut 'sqlite'
    'sqlite_path' => __DIR__ . '/../data/dictee.sqlite',

    // laissez true : le site sera servi en https
    'cookie_secure' => true,

    // ---- envoi des e-mails de récupération de mot de passe ----
    // Adresse expéditrice. Elle DOIT appartenir à un domaine hébergé chez
    // vous et exister réellement, sinon les messages seront rejetés.
    'mail_from'      => 'dictee@mondomaine.ch',
    'mail_from_name' => 'La dictée',

    // Adresse publique du site, sous-domaine compris. À RENSEIGNER :
    // laissée vide, elle est devinée d'après la requête, ce qui donne le
    // domaine principal au lieu du sous-domaine dès qu'un proxy s'interpose.
    // Exemple : 'https://teaching.mondomaine.ch'
    'site_url' => 'https://teaching.mondomaine.ch',

    // Adresse qui reçoit les signalements de la bibliothèque partagée.
    // Laissez vide pour ne rien recevoir : les signalements seront alors
    // seulement comptés en base, et il faudra les consulter à la main.
    'admin_email' => 'contact@mondomaine.ch',

    // true : les messages sont écrits dans data/mails.log au lieu d'être
    // envoyés. Pratique pour essayer en local, à laisser false en ligne.
    'mail_debug_log' => false,

    // ---- connexion avec Google (facultatif) ----
    // Identifiant client OAuth créé dans la console Google Cloud, type
    // « Application Web ». Ajoutez-y vos origines autorisées, par exemple
    // https://teaching.mondomaine.ch . Cet identifiant n'est pas un secret :
    // il est visible dans la page. Laissez vide pour ne pas proposer Google.
    'google_client_id' => '',

    // ---- abonnement (Stripe) ----
    // Laissez ces champs vides tant que vous n'avez pas de compte : le site
    // fonctionne alors entièrement en version gratuite, sans rien proposer
    // de payant. Les clés se trouvent dans le tableau de bord Stripe ;
    // commencez par celles en mode test (sk_test_…, price_…, whsec_…).
    'stripe_secret'         => '',   // sk_live_… ou sk_test_…

    // ATTENTION : ces deux champs attendent l'identifiant d'un TARIF.
    // Il commence par price_ . Ni le montant (4.90), ni l'identifiant du
    // produit (prod_…) ne conviennent : un produit porte plusieurs tarifs,
    // et Stripe doit savoir lequel débiter.
    // Où : Catalogue de produits → votre produit → section Tarifs →
    //      cliquez sur le tarif → price_…
    // Exemple : 'price_1Ab2CdEfGhIjKlMnOpQrStUv'
    'stripe_prix_mensuel'   => '',   // tarif récurrent mensuel
    'stripe_prix_annuel'    => '',   // tarif récurrent annuel
    'stripe_webhook_secret' => '',   // whsec_… donné en déclarant api/stripe.php

    // Le temps de brancher le portail NeedHelpApp, mettez true pour voir la
    // raison technique des échecs de connexion au lieu de « service
    // momentanément indisponible ». À retirer une fois tout au vert : ces
    // messages ne regardent pas les utilisateurs.
    'portail_debug' => false,

    // Version de l'API Stripe. Ne la rabaissez pas sans raison : TWINT
    // n'accepte les abonnements qu'à partir de celle-ci, et une version
    // antérieure le ferait disparaître de la page de paiement sans le dire.
    'stripe_version' => '2026-05-27.dahlia',

    // Lien du portail client, dans Stripe → Paramètres → Portail client.
    // Il sert de secours si le compte n'a pas encore d'identifiant de payeur :
    // Stripe demande alors son adresse au client et lui envoie un code.
    // Exemple : 'https://billing.stripe.com/p/login/4gMaEWgHidODaGaaRV2kw00'
    'stripe_portail_url' => '',

    // true : les refus du service de paiement sont affichés en clair à
    // l'écran. Utile le temps de la mise au point, à remettre à false
    // ensuite : un client n'a pas à lire « No such price ».
    'debug_paiement' => false,

    // Prix AFFICHÉS aux visiteurs. Ce ne sont que des textes : le montant
    // réellement débité est celui des tarifs price_… ci-dessus. Gardez les
    // deux en accord, et indiquez si la TVA est comprise.
    'prix_mensuel'  => '4.90 CHF par mois',
    'prix_annuel'   => '49.00 CHF par an',
    'prix_economie' => 'deux mois offerts',
];
