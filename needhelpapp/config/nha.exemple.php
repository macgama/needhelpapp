<?php
/**
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
 */

return [

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
    'prix_mensuel'  => '4.90 CHF par mois',
    'prix_annuel'   => '49.00 CHF par an',
    'prix_economie' => 'deux mois offerts',

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
];
