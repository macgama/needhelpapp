<?php
/**
<<<<<<< Updated upstream
 * Configuration du socle NeedHelpApp.
 *
 * Copiez ce fichier en  config/nha.php  puis renseignez vos valeurs.
 * config/nha.php ne doit JAMAIS être versionné ni servi : il porte le mot
 * de passe de la base et les clés de paiement. Le dossier est déjà refusé
 * par son propre .htaccess ; si votre hébergement le permet, placez-le
 * carrément au-dessus de la racine web et adaptez le chemin dans
 * includes/nha-core.php.
 *
 * Ce même fichier sert au portail ET aux applications qui s'y rattachent :
 * teaching et familyshop en attendent une copie dans leur propre config/.
 *
 * Une valeur laissée vide est traitée comme absente : nha_config() rend
 * alors le défaut prévu dans le code. Vider une clé désactive donc la
 * fonction qui en dépend, plutôt que de casser la page.
 *
 * Une fois le fichier rempli, vérifiez le tout d'un coup :
 *   https://needhelpapp.com/diagnostic.php?jeton=VOTRE_JETON
=======
 * NeedHelpApp — configuration unique.
 *
 * À copier en config/nha.php et à remplir. Ce fichier n'est jamais servi
 * (voir config/.htaccess) et ne doit JAMAIS être versionné ni partagé :
 * il contient des secrets qui donnent un accès complet à votre compte Stripe.
 *
 * Les noms de clés reprennent ceux déjà utilisés dans la partie teaching,
 * pour qu'un seul fichier serve aux deux applications. Déposez-le une fois
 * et faites pointer les deux sites dessus.
>>>>>>> Stashed changes
 */

return [

<<<<<<< Updated upstream
    /* =============================================================
       La base centrale
       -------------------------------------------------------------
       Les quatre seules valeurs sans défaut : sans elles, rien ne
       démarre. Chez Infomaniak, l'hôte reste 'localhost' — la base
       est sur la même machine que le site.
       ============================================================= */
    'db_host' => 'localhost',
    'db_core' => '6l3nq9_core',
    'db_user' => 'utilisateur_de_la_base',
    'db_pass' => 'mot_de_passe_de_la_base',

    /* =============================================================
       Les adresses d'expédition
       -------------------------------------------------------------
       'mail_expediteur' signe les messages du site : vérification
       d'adresse, réinitialisation de mot de passe.
       'mail_contact' reçoit le formulaire de contact et les idées
       déposées sur la page d'accueil.
       Les deux adresses doivent EXISTER réellement sur le domaine,
       sinon les serveurs destinataires rejettent les messages.
       ============================================================= */
    'mail_expediteur' => 'noreply@needhelpapp.com',
    'mail_contact'    => 'contact@needhelpapp.com',

    /* =============================================================
       L'envoi des e-mails (SMTP)
       -------------------------------------------------------------
       Laissez 'smtp_hote' ou 'smtp_pass' vide et le site retombe sur
       mail(), que Infomaniak filtre : les messages partent en
       indésirable ou disparaissent. Renseignez ce bloc.

       ATTENTION : en envoi authentifié, Infomaniak refuse un
       expéditeur différent du compte qui s'authentifie. 'smtp_user'
       doit donc valoir exactement 'mail_expediteur' ci-dessus —
       diagnostic.php le vérifie et le signale en échec.
       ============================================================= */
    'smtp_hote'        => 'mail.infomaniak.com',
    'smtp_port'        => 587,                       // 587 en TLS, 465 en SSL
    'smtp_user'        => 'noreply@needhelpapp.com', // = mail_expediteur
    'smtp_pass'        => 'mot_de_passe_de_la_boite',
    'smtp_chiffrement' => 'tls',                     // 'tls' (587) ou 'ssl' (465)
    'smtp_delai'       => 10,                        // secondes avant abandon

    /* =============================================================
       Connexion avec Google (facultatif)
       -------------------------------------------------------------
       Identifiant client OAuth créé dans la console Google Cloud,
       type « Application Web ». Ce n'est pas un secret : il est
       visible dans la page. Déclarez-y vos origines autorisées :
       https://needhelpapp.com et chaque sous-domaine.
       Vide = le bouton Google n'est pas affiché.
       ============================================================= */
    'google_client_id' => '',   // …….apps.googleusercontent.com

    /* =============================================================
       L'abonnement (Stripe)
       -------------------------------------------------------------
       Tant que 'stripe_secret' est vide, le site est entièrement
       gratuit et ne propose rien de payant. Commencez par les clés
       en mode test (sk_test_…), passez en sk_live_… ensuite.
       ============================================================= */
    'stripe_secret' => '',   // sk_live_… ou sk_test_…

    /* Ces deux champs attendent l'identifiant d'un TARIF, qui
       commence par price_ . Ni le montant (4.90), ni l'identifiant du
       produit (prod_…) ne conviennent : un produit porte plusieurs
       tarifs, et Stripe doit savoir lequel débiter.
       Où : Catalogue de produits → votre produit → Tarifs → price_…
       Exemple : 'price_1Ab2CdEfGhIjKlMnOpQrStUv' */
    'stripe_prix_mensuel' => '',
    'stripe_prix_annuel'  => '',

    /* Le whsec_… obtenu en déclarant le point de terminaison
       https://needhelpapp.com/api/stripe.php dans Développeurs →
       Webhooks. Sans lui, les notifications de Stripe sont refusées :
       l'abonnement est payé, mais les droits n'arrivent jamais.
       C'est l'explication de presque tous les « j'ai payé et je n'ai
       rien » que montre /admin/abonnements.php. */
    'stripe_webhook_secret' => '',   // whsec_…

    /* Version de l'API Stripe. Vide = celle du code
       (STRIPE_VERSION_DEFAUT dans includes/stripe.php). Ne la
       rabaissez pas sans raison : TWINT n'accepte les abonnements
       qu'à partir de celle-ci, et une version antérieure le ferait
       disparaître de la page de paiement sans rien dire. */
    'stripe_version' => '',   // ex. '2026-05-27.dahlia'

    /* Lien du portail client, dans Stripe → Paramètres → Portail
       client. Il sert de secours quand le compte n'a pas encore
       d'identifiant de payeur : Stripe demande alors son adresse au
       client et lui envoie un code.
       Exemple : 'https://billing.stripe.com/p/login/4gMaEWgHidODaGaaRV2kw00' */
    'stripe_portail_url' => '',

    /* =============================================================
       Ce que voit et reçoit l'abonné
       ============================================================= */

    /* Prix AFFICHÉS. Ce ne sont que des textes : le montant réellement
       débité est celui des tarifs price_… ci-dessus. Gardez les deux
       en accord, et indiquez si la TVA est comprise.
       Vide = un tiret cadratin s'affiche à la place du prix. */
=======
    // ---- base de données ----
    'db_host' => '6l3nq9.myd.infomaniak.com',
    'db_core' => '6l3nq9_core',
    'db_user' => '',
    'db_pass' => '',

    // ---- adresses d'expédition ----
    // Ces boîtes doivent EXISTER dans le Manager Infomaniak, sinon les
    // messages partent en indésirables ou sont refusés.
    'mail_expediteur' => 'noreply@needhelpapp.com',
    'mail_contact'    => 'contact@needhelpapp.com',
    'mail_donnees'    => 'donnees@needhelpapp.com',

    // ---- envoi SMTP authentifié ----
    // Sur mutualisé Infomaniak, la fonction mail() part sans authentification :
    // les messages sont filtrés, classés en indésirable, ou l'appel se bloque
    // longuement. Renseignez ce bloc et tout passe par le SMTP authentifié.
    //
    // CONTRAINTE : l'adresse expéditrice doit être EXACTEMENT celle qui
    // s'authentifie. Autrement dit smtp_user == mail_expediteur, sinon le
    // serveur refuse la commande MAIL FROM.
    //
    // Le mot de passe est celui généré pour cette adresse dans le Manager,
    // pas celui de votre compte Infomaniak.
    'smtp_hote'        => 'mail.infomaniak.com',
    'smtp_port'        => 587,          // 587 avec 'tls', ou 465 avec 'ssl'
    'smtp_chiffrement' => 'tls',        // 'tls' (STARTTLS, recommandé) ou 'ssl'
    'smtp_user'        => 'noreply@needhelpapp.com',
    'smtp_pass'        => '',
    'smtp_delai'       => 10,           // secondes avant abandon

    // ---- abonnement (Stripe) ----
    // Laissez ces champs vides tant que vous n'avez pas de compte : le site
    // fonctionne alors entièrement en version gratuite, sans rien proposer
    // de payant. Commencez par les clés de test (sk_test_…, price_…, whsec_…).
    'stripe_secret' => '',           // sk_live_… ou sk_test_…

    // ATTENTION : ces deux champs attendent l'identifiant d'un TARIF.
    // Il commence par price_ . Ni le montant, ni l'identifiant du produit
    // (prod_…) ne conviennent : un produit porte plusieurs tarifs, et Stripe
    // doit savoir lequel débiter.
    // Où : Catalogue de produits → votre produit → section Tarifs → le tarif.
    'stripe_prix_mensuel' => '',     // price_… à récurrence mensuelle
    'stripe_prix_annuel'  => '',     // price_… à récurrence annuelle

    // Version de l'API Stripe. Elle décide de ce qui est POSSIBLE, pas
    // seulement de la forme des réponses : TWINT en paiement récurrent
    // n'existe qu'à partir de « 2026-05-27.dahlia ». Avec une version
    // antérieure, il n'apparaît pas dans la page de paiement, et aucun
    // message ne dit pourquoi. Laissez vide pour prendre celle du code.
    'stripe_version' => '2026-05-27.dahlia',

    // Donné par Stripe au moment où vous déclarez le point de terminaison
    // https://needhelpapp.com/api/stripe.php dans Développeurs → Webhooks.
    'stripe_webhook_secret' => '',   // whsec_…

    // Lien du portail client, dans Stripe → Paramètres → Portail client.
    // Sert de secours quand le compte n'a pas encore d'identifiant de payeur :
    // Stripe demande alors son adresse au client et lui envoie un code.
    'stripe_portail_url' => '',

    // Combien de personnes un abonnement couvre-t-il ?
    //
    // C'est une décision commerciale, pas technique. Cinq places pour
    // 4.90 CHF par mois est généreux : c'est un choix, celui de vendre à
    // des familles plutôt qu'à des individus. Mettez 1 pour n'en couvrir
    // qu'une seule, ou davantage pour une formule « famille ».
    //
    // Le payeur occupe toujours la première place.
    'places_incluses' => 5,

    // Nom de la formule payante tel qu'il est écrit dans accounts.plan.
    // Doit correspondre à ce qu'attend déjà le code de teaching.
    'plan_paye' => 'complet',

    // ---- prix affichés ----
    // Ce ne sont que des textes : le montant réellement débité est celui des
    // tarifs price_… ci-dessus. Gardez les deux en accord, et indiquez si la
    // TVA est comprise.
>>>>>>> Stashed changes
    'prix_mensuel'  => '4.90 CHF par mois',
    'prix_annuel'   => '49.00 CHF par an',
    'prix_economie' => 'deux mois offerts',

<<<<<<< Updated upstream
    /* Le nom du plan écrit dans accounts.plan et subscriptions.plan
       quand un paiement aboutit. Les applications comparent à cette
       valeur pour ouvrir les fonctions payantes : ne la changez pas
       sans les changer aussi. */
    'plan_paye' => 'complet',

    /* Le nombre de personnes qu'un abonnement couvre. Stripe facture
       une quantité de 1 pour un abonnement ordinaire, ce qui ne
       laisserait aucune place à partager ; le socle retient le plus
       grand des deux. Un abonnement paie un service, pas une
       personne : c'est le foyer qui compte. */
    'places_incluses' => 5,

    /* =============================================================
       Le jeton de diagnostic
       -------------------------------------------------------------
       Ouvre diagnostic.php, api/mail-test.php et api/stripe-test.php
       sans être connecté en administrateur. Choisissez une chaîne
       longue et imprévisible — elle vaut un mot de passe.
       Vide = ces pages répondent « introuvable » : c'est l'état
       normal une fois la mise en ligne stabilisée.
       ============================================================= */
    'diagnostic_jeton' => '',

    /* =============================================================
       Le jeton de la purge
       -------------------------------------------------------------
       tache-purge.php efface ce qui a passé sa durée de conservation.
       Lancé en ligne de commande par le planificateur, il n'a besoin
       d'aucun jeton. Celui-ci ne sert qu'aux hébergements dont le
       planificateur ne sait qu'ouvrir une adresse :
       https://needhelpapp.com/tache-purge.php?jeton=…

       Il est distinct de 'diagnostic_jeton' à dessein : celui-là doit
       être vidé une fois la mise en ligne stabilisée, alors que la
       purge, elle, tourne pour toujours.
       Vide = seule la ligne de commande fonctionne. C'est le plus sûr.
       ============================================================= */
    'purge_jeton' => '',
=======
    // ---- connexion avec Google (facultatif) ----
    // Identifiant client OAuth créé dans la console Google Cloud, type
    // « Application Web ». Ajoutez-y vos origines autorisées, par exemple
    // https://needhelpapp.com et https://teaching.needhelpapp.com .
    // Cet identifiant n'est pas un secret : il est visible dans la page.
    // Laissez vide pour ne pas proposer Google.
    'google_client_id' => '',

    // ---- diagnostic ----
    // Jeton d'accès à /diagnostic.php. Mettez une chaîne longue et aléatoire,
    // ou laissez vide pour désactiver complètement la page.
    'diagnostic_jeton' => '',
>>>>>>> Stashed changes
];
