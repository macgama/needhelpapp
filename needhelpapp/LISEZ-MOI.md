# NeedHelpApp — le portail

Site maître de needhelpapp.com. PHP 8.1+, MySQL/MariaDB, aucune dépendance
externe, aucun outil de build. Vous déposez, ça tourne.

## La base de données

`sql/schema.sql` crée les douze tables de `6l3nq9_core`. Il n'existait
pas : la base ne vivait que sur le serveur, ce qui interdisait de la
recréer, de la vérifier, ou de savoir ce que le socle attend. Il est aligné
sur l'export de production.

`sql/applications.sql` complète le catalogue. La ligne **`portail` y
manquait** : c'est pourquoi toutes les entrées d'`audit_log` portent un
`app_id` vide, et l'on ne peut pas savoir d'où venait chaque connexion.
Ce n'est pas bloquant — les deux colonnes concernées acceptent NULL — mais
c'est une perte d'information.

Depuis cette version, le socle crée de lui-même la ligne d'une application
inconnue plutôt que de laisser le trou, et le note dans le journal.
Complétez ensuite son libellé et son adresse.

## Mise en ligne

1. **Créer le site** dans le Manager Infomaniak, domaine `needhelpapp.com`,
   PHP 8.3, racine `/web`.
2. **Déposer le contenu de ce dossier** par SFTP dans la racine du site.
3. **Copier `config/nha.exemple.php` en `config/nha.php`** et le remplir :
   base de données, adresses d'expédition, clés Stripe, identifiant Google.
   Le même fichier sert au portail et à teaching. Le dossier `config/` n'est jamais servi grâce à son
   propre `.htaccess`, mais si votre hébergement le permet, placez-le
   carrément au-dessus de la racine web et adaptez le chemin dans
   `includes/nha-core.php`.
4. **Déposer les polices** dans `assets/fonts/` (voir le LISEZ-MOI qui s'y
   trouve). Sans elles, le site tombe sur Georgia et une sans-serif système :
   c'est moins joli, mais rien ne casse.
5. **Activer le certificat SSL** (Let's Encrypt, gratuit dans le Manager).
   Le `.htaccess` force déjà HTTPS et le domaine sans `www`.
6. **Vérifier SPF, DKIM et DMARC** sur needhelpapp.com, sinon les e-mails de
   confirmation partiront en indésirables. Créer les adresses
   `noreply@`, `contact@` et `donnees@`.
7. **Déclarer le webhook Stripe** : Développeurs → Webhooks → point de
   terminaison `https://needhelpapp.com/api/stripe.php`. Cochez
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. Reportez le `whsec_…` obtenu
   dans `stripe_webhook_secret`.
8. **Autoriser vos origines** dans la console Google Cloud pour le client
   OAuth : `https://needhelpapp.com` et chaque sous-domaine.
9. **Vérifier l'installation** : `https://needhelpapp.com/diagnostic.php?jeton=…`
   avec le jeton défini dans la configuration. Ajoutez `&tester_mail=1` pour
   envoyer un message d'essai. Supprimez ce fichier une fois tout au vert.

## À compléter avant d'ouvrir au public

Cherchez `[` dans les fichiers : tous les champs à remplir sont entre
crochets.

- `mentions-legales.php` — raison sociale, IDE, siège, for.
- `conditions.php` — nom de la structure, prix, prestataire de paiement,
  délai de suspension pour impayé, localité du for.
- `abonnement.php` — les montants.
- `confidentialite.php` — responsable du traitement, prestataire de paiement.

Les conditions générales et la politique de confidentialité sont des bases
sérieuses, pas un avis juridique. Deux points méritent une relecture
professionnelle : le traitement de données d'enfants dans l'application
scolaire, et votre statut d'intermédiaire dans la mise en relation
artisan-client.

## Les feuilles de style portent une version

`nha.css` et `nha.js` sont appelés avec la date du fichier en paramètre.
Sans cela, le navigateur sert sa copie et l'on croit que le style n'a jamais
été écrit — c'est exactement ce qui est arrivé à la première version de
l'administration, dont les tableaux s'affichaient en texte brut.

Rien à faire au déploiement : la date change toute seule.

## L'administration

`/admin/` — réservé aux comptes dont `accounts.role` vaut `admin`. Il n'y a
qu'un rôle : administrer, c'est administrer NeedHelpApp, pas une application
en particulier. Le lien n'apparaît dans le menu que pour ceux qui l'ont, et
chaque page relit le rôle **en base** : masquer un lien ne protège rien.

Cinq pages :

- **Vue d'ensemble** — les chiffres, la répartition par application, les
  derniers évènements, et des alertes quand quelque chose cloche : une
  application absente du catalogue, des paiements en échec, une vague de
  connexions refusées.
- **Les comptes** — recherche, filtres, et le rôle modifiable d'une liste
  déroulante. Le changement part aussitôt : un seul choix, une seule
  conséquence.
- **Les abonnements** — ce qui est facturé, par qui, et surtout ce que
  Stripe a envoyé. Un abonnement payé sans droits s'explique presque
  toujours là : la notification n'est jamais arrivée, ou son traitement a
  échoué.
- **Les applications** — le catalogue, avec le nombre d'utilisateurs et de
  sessions en cours, et la marche à suivre pour en brancher une nouvelle.
- **Le journal** — les évènements des comptes, et les connexions refusées de
  la semaine regroupées par adresse et origine.

### Ce qui reste à chaque application

La modération de ses contenus. Les dictées publiées de teaching vivent dans
sa base, et les traiter suppose de savoir ce qu'est une dictée : le portail
n'a pas à l'apprendre.

### Deux garde-fous sur les rôles

On ne se retire pas soi-même l'administration, et l'on ne retire pas le
dernier administrateur. Sans eux, une fausse manœuvre laisserait le site
sans personne pour y accéder, et il faudrait repasser par phpMyAdmin.

Un modérateur accède à tout sans payer : le cache d'abonnement est
recalculé aussitôt, sans quoi les applications continueraient de le croire
non abonné jusqu'au prochain paiement.

## L'abonnement partagé

Un abonnement paie un service, pas une personne. Une famille de cinq n'a
aucune raison de payer cinq fois pour que les enfants fassent leurs
dictées et que tout le monde tienne la même liste de courses.

Le schéma le prévoyait depuis le début — `subscriptions.seats` et
`subscription_seats` — sans que rien ne s'en serve. C'est fait.

**Le payeur ajoute des proches** depuis `/abonnement.php`, par leur
adresse. Le mécanisme était déjà branché partout : `nha_entitlement()`
lit les places, donc ajouter quelqu'un lui ouvre aussitôt teaching,
familyshop et les applications à venir, sans une ligne de plus.

Le nombre de places se règle dans `config/nha.php` :

    'places_incluses' => 5,

**C'est une décision commerciale, pas technique.** Cinq places pour 4.90
CHF par mois est généreux : c'est le choix de vendre à des familles
plutôt qu'à des individus. Mettez 1 pour n'en couvrir qu'une.

Les abonnements déjà en cours gardent l'ancienne valeur jusqu'à leur
renouvellement : `sql/migration-places.sql` la relève tout de suite.

### Ce qui est refusé, et pourquoi

- **On ne crée jamais de compte à la place de quelqu'un.** La personne
  doit déjà en avoir un ; elle choisira elle-même son mot de passe et
  saura qu'elle existe chez nous.
- **Quelqu'un qui paie déjà son propre abonnement** ne peut pas être
  ajouté en silence : il continuerait de payer pour rien. Le message le
  dit et l'invite à résilier d'abord.
- **Le payeur ne peut pas retirer sa propre place** : c'est lui qui
  paie. Pour arrêter, il résilie.

Retirer quelqu'un ne supprime pas la ligne, elle est datée : savoir qui a
eu accès et quand est utile en cas de litige, et cela permet de rendre la
place sans repartir de zéro.

## Les messages reçus

Les idées de la page d'accueil et les messages de contact arrivent dans la
table `ideas`, **avant** tout envoi de courriel. C'est important : un
courriel qui n'arrive pas ne fait perdre aucun message.

`/admin/messages.php` les affiche, permet de répondre en un clic et de les
marquer traités. La colonne `handled_at` existait dans le schéma sans que
rien ne s'en serve.

L'accueil de l'administration signale les messages en attente : c'est la
seule alerte sur laquelle on peut agir tout de suite, donc elle passe
avant les autres.

## Quand les courriels ne partent pas

`api/mail-test.php` montre le **dialogue réel** avec le serveur SMTP,
ligne par ligne. C'est là que se lit la vraie cause, là où « mail() a
renvoyé false » n'apprend rien.

La cause la plus fréquente : **aucun SMTP configuré**. Sans `smtp_hote` et
`smtp_pass`, les envois retombent sur `mail()`, qu'Infomaniak filtre
presque toujours — le message part sans erreur apparente et n'arrive
jamais.

    'smtp_hote' => 'mail.infomaniak.com',
    'smtp_port' => 587,
    'smtp_user' => 'info@needhelpapp.com',
    'smtp_pass' => 'le mot de passe de CETTE boîte',
    'smtp_chiffrement' => 'tls',

Le mot de passe est celui de la **boîte e-mail** dans le Manager, pas
celui du compte Infomaniak. Et `smtp_user` doit être identique à
`mail_expediteur` : Infomaniak refuse d'expédier au nom d'une autre
adresse que celle qui s'authentifie.

## Les avertissements : deux systèmes, et c'est voulu

**Le portail** affiche ses messages **dans la page**, à l'endroit qui les
concerne : sous le formulaire qu'on vient d'envoyer, sous le champ qui
pose problème. Un site de pages, où chaque action recharge ou répond une
fois, n'a pas besoin d'autre chose.

**Teaching et FamilyShop** emploient le bandeau flottant d'`avis.js` :
ce sont des applications d'une seule page, où l'on enchaîne vingt actions
sans changer d'écran. Un message inscrit dans la page y serait manqué.

Ce n'est donc pas un oubli, mais deux réponses à deux situations. Le
bandeau conviendrait mal au portail — il flotte au-dessus du contenu, ce
qui a du sens pendant une séance de travail, beaucoup moins sur une page
qu'on lit une fois.

## Fermer une application le temps d'une mise à jour

Dans `/admin/applications.php`, l'état de chaque application se change
d'une liste déroulante. « Fermée pour mise à jour » affiche à ses
visiteurs une page qui l'explique, au lieu d'une erreur de base au milieu
d'un exercice.

**Les administrateurs continuent d'entrer** : c'est justement à eux de
vérifier que tout fonctionne avant de rouvrir.

**Le portail ne peut pas être fermé** : c'est par lui qu'on rouvre les
autres, et se couper l'accès à la page qui permettrait de le faire serait
une belle impasse.

En cas de doute — base injoignable, ligne absente du catalogue —
`nha_app_ouverte()` répond **oui**. Fermer un site parce qu'on n'a pas pu
lire son état serait la pire des réactions.

## TWINT

Trois conditions doivent être réunies, et aucune ne se signale quand elle
manque — la page de paiement se contente de ne pas le proposer.

1. **La version de l'API.** TWINT en paiement *récurrent* n'existe qu'à
   partir de `2026-05-27.dahlia`. Le code utilisait `2025-03-31.basil`,
   ce qui suffit à l'expliquer. Elle se règle maintenant dans
   `config/nha.php`, sous `stripe_version`.
2. **La devise.** TWINT n'accepte que le franc suisse.
3. **Les mentions légales complètes**, et TWINT activé dans le tableau de
   bord Stripe — il n'est proposé qu'aux comptes dont l'entreprise est en
   Suisse ou au Liechtenstein.

`api/stripe-test.php` vérifie les quatre points et dit lequel manque.

## Structure

```
index.php                page d'accueil, catalogue lu depuis core.apps
connexion.php            formulaires d'authentification
inscription.php
mot-de-passe-oublie.php
reinitialiser.php
verifier.php             confirmation d'adresse e-mail
deconnexion.php
profil.php               compte, applications, appareils, données
abonnement.php           formules et état courant
supprimer-compte.php
faq.php  contact.php
mentions-legales.php  conditions.php  confidentialite.php
404.php

partials/page.php        en-tête, pied, menu — le seul endroit à modifier
includes/nha-core.php    identité, sessions, droits (copié dans chaque app)
includes/http.php        JSON, CSRF, limitation de débit, e-mails
config/db.php            identifiants (à créer, jamais versionné)
assets/nha.css  nha.js  fonts/  favicon.svg

api/inscription.php      création de compte + détection de doublon
api/connexion.php
api/mot-de-passe-oublie.php  api/reinitialiser.php
api/profil.php           prénom, e-mail, mot de passe
api/sessions.php         fermer les autres appareils
api/moi.php              identité + droits en JSON, pour les autres apps
api/export.php           droit d'accès (JSON téléchargeable)
api/supprimer.php
api/idees.php  api/contact.php
api/paiement.php         départ vers Stripe (paiement, portail client)
api/stripe.php           webhook : point d'entrée unique des paiements
api/abonnement-places.php partager son abonnement avec les siens
api/stripe-test.php      pourquoi TWINT n'apparaît pas
api/mail-test.php        pourquoi les courriels ne partent pas
admin/messages.php       les messages reçus, à traiter
api/admin-message.php    répondre, marquer traité, supprimer
api/admin-application.php fermer ou rouvrir une application
sql/migration-places.sql ouvrir les abonnements existants au partage
api/google.php           vérification du jeton d'identité Google
diagnostic.php           contrôle d'installation, protégé par jeton
admin/_socle.php         accès et outils communs de l'administration
admin/index.php          vue d'ensemble
admin/comptes.php        recherche, rôles
admin/abonnements.php    abonnements et notifications de paiement
admin/applications.php   le catalogue
admin/journal.php        évènements et connexions refusées
api/admin-role.php       changer un rôle, avec ses garde-fous
sql/schema.sql           la base centrale
sql/applications.sql     le catalogue des applications
```

## Brancher une nouvelle application

1. Ajouter sa ligne dans `sql/applications.sql`, puis l'exécuter — elle
   apparaît sur l'accueil, et ses utilisateurs peuvent ouvrir une session
   depuis son sous-domaine.
2. Créer le sous-domaine dans le Manager, avec sa propre base
   `6l3nq9_<code>`.
3. Copier `includes/nha-core.php` et `includes/http.php` dans la nouvelle
   application, poser `NHA_APP=<code>`.
4. Donner à son utilisateur MySQL les droits sur sa base **et** sur
   `6l3nq9_core`. Un utilisateur par application : le plafond de
   38 connexions simultanées d'Infomaniak est par utilisateur, pas par base.
5. Placer un retour vers `https://needhelpapp.com/` dans sa barre de
   navigation. Depuis un sous-domaine, l'adresse du portail n'est pas
   devinable : sans ce lien, on y revient par le bouton « précédent » ou
   pas du tout.

L'application hérite alors de la connexion unique et de l'abonnement, sans
une ligne de code d'authentification à écrire.

## Ce qui reste à faire

- `assets/fonts/` : déposer les trois fichiers WOFF2.
- Une tâche planifiée mensuelle pour purger les comptes supprimés depuis
  plus de trente jours, les sessions expirées et les tentatives de connexion.
- Adapter le code de teaching pour qu'il lise `config/nha.php` et
  `includes/nha-core.php` plutôt que sa propre table `users`.
- La traduction : tous les textes sont en français, en dur. Si vous visez
  l'allemand et l'italien comme dans l'application d'apprentissage, il faudra
  extraire les chaînes avant qu'elles ne se multiplient.

## Un formulaire ne marche pas : par où commencer

Les formulaires envoient du JSON à `/api/…`. Trois vérifications, dans
l'ordre, règlent la quasi-totalité des cas.

**1. Le dossier `api/` est-il en ligne ?**
Ouvrez `https://needhelpapp.com/api/ping.php`. Vous devez voir un objet JSON
indiquant la version de PHP et si `config/nha.php` est présent. Une page
« Cette page n'existe pas » signifie que le dossier n'a pas été déposé :
c'est la panne la plus fréquente après un envoi FTP partiel.

**2. Que dit le script lui-même ?**
Ouvrez directement `https://needhelpapp.com/api/idees.php`. Attendu :
`{"ok":false,"message":"Méthode non autorisée."}` avec un code 405 — c'est
normal, le script refuse les requêtes GET. Toute autre réponse est le
message d'erreur réel.

**3. Que dit la console du navigateur ?**
Touche F12, onglet Console. Depuis la version actuelle, toute réponse qui
n'est pas du JSON y est affichée intégralement avec son code HTTP, et
l'utilisateur voit un message précis plutôt qu'un vague « la connexion a
échoué ». Les erreurs serveur portent une référence à huit caractères que
l'on retrouve dans le journal d'erreurs PHP du Manager Infomaniak.

`diagnostic.php?jeton=…` fait ces contrôles automatiquement, plus la liste
des fichiers manquants et un test d'envoi d'e-mail.

## Déposer une mise à jour

Les fichiers de `includes/` forment un tout et portent un marqueur de
version commun (`NHA_BUILD_CORE`, `NHA_BUILD_HTTP`, `NHA_BUILD_MAILER`).
**Déposez toujours le dossier `includes/` en entier**, en mode « écraser »
et non « ignorer si taille identique ».

Un dépôt partiel est la panne la plus difficile à diagnostiquer : le code
casse à un endroit sans rapport avec le fichier oublié. Deux garde-fous
sont en place :

- `includes/mailer.php` refuse de se charger si un ancien `http.php` définit
  encore `nha_mail()`, et le dit explicitement au lieu de provoquer un
  « Cannot redeclare function ».
- `api/ping.php` affiche la version lue dans chacun des trois fichiers et un
  drapeau `coherent`. `diagnostic.php` fait le même contrôle.

Après chaque dépôt, ouvrez `https://needhelpapp.com/api/ping.php` : si
`coherent` vaut `false`, le transfert est incomplet.

## Configurer l'envoi d'e-mails

C'est le point qui casse le plus souvent une mise en ligne chez Infomaniak.

1. Dans le Manager, créez réellement les boîtes `noreply@needhelpapp.com`,
   `contact@needhelpapp.com` et `donnees@needhelpapp.com`. Une adresse qui
   n'existe pas fait refuser le message.
2. Générez un mot de passe pour `noreply@needhelpapp.com` — c'est celui de
   l'adresse, pas celui de votre compte Infomaniak.
3. Remplissez le bloc SMTP de `config/nha.php` : `mail.infomaniak.com`,
   port 587, chiffrement `tls`, `smtp_user` = `noreply@needhelpapp.com`,
   `smtp_pass` = le mot de passe généré.
4. **`smtp_user` doit être identique à `mail_expediteur`.** En envoi
   authentifié, Infomaniak refuse un expéditeur différent du compte qui
   s'authentifie. Le diagnostic vérifie ce point explicitement.
5. Dans la zone DNS de needhelpapp.com, ajoutez `include:spf.infomaniak.ch`
   à l'enregistrement SPF, et activez DKIM et DMARC.
6. Testez : `diagnostic.php?jeton=…&tester_mail=1`. En cas d'échec, la page
   affiche le dialogue SMTP complet, ligne par ligne — vous voyez exactement
   à quelle commande le serveur a dit non.

Tant que le SMTP n'est pas configuré, le code retombe sur `mail()`. Cela
fonctionne parfois, mais sans authentification les messages sont filtrés.

Les notifications de contact et d'idées partent **après** la réponse HTTP
(`nha_mail_differe`) : un serveur de mail lent ne peut plus faire expirer la
requête de l'utilisateur. Les e-mails d'authentification restent synchrones,
car l'utilisateur doit savoir immédiatement si l'envoi a échoué.
