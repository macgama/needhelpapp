# La dictée — installation sur Infomaniak

## Ce que contient le dossier

```
index.html                     l'accueil, avec les deux applications
abonnement.html                l'offre, la souscription, la gestion
profil.html                    le compte, ses données, son mot de passe
faq.html                       les questions fréquentes
admin.html                     la zone d'administration
vocabulaire.html               les listes bilingues et leurs exercices
mathematiques.html             le calcul mental, sept familles
conditions.html                les conditions générales, à compléter
dictee.html                    l'application de dictée
conjugaison.html               l'application de conjugaison
confidentialite.html           la page de confidentialité, à compléter
assets/app.css                 les styles communs, petit écran d'abord
assets/app.js                  la logique de la dictée
assets/compte.js               connexion et compte, partagés hors dictée
assets/menu.js                 la barre du haut et le menu du compte
assets/profil.js               la page de profil
assets/admin.js                la zone d'administration
assets/bienvenue.js            les messages d'accueil, inscription et abonnement
assets/vocabulaire.js          le vocabulaire : composition, exercice, listes
assets/vocab-listes.js         les listes toutes prêtes, embarquées
assets/maths.js                les générateurs d'exercices, sans interface
assets/mathematiques.js        l'interface du calcul mental
assets/google.js               le bouton « Continuer avec Google »
assets/conjugueur.js           le moteur de conjugaison française
assets/conjugueur-en.js        le moteur de conjugaison anglaise
assets/verbes-en.js            la liste des verbes anglais
assets/conjugueur-it.js        le moteur de conjugaison italienne
assets/verbes-it.js            la liste des verbes italiens
assets/conjugueur-de.js        le moteur de conjugaison allemande
assets/verbes-de.js            la liste des verbes allemands
assets/verbes.js               la liste des verbes de l'application
assets/conjugaison.js          l'interface de la conjugaison
assets/conjugaison.css         ses styles propres
api/index.php                  l'API : comptes, dictées, réglages, résultats
api/stripe.php                 réception des notifications de paiement
api/migrer.php                 met la base à jour, en n'appliquant que ce qui manque
api/paiement-test.php          vérifie la configuration Stripe et explique les refus
api/portail-test.php           vérifie le rattachement au portail NeedHelpApp
api/db.php                     connexion, session, envoi d'e-mails, utilitaires
api/config.example.php         à copier en config.php et à renseigner
api/.htaccess                  interdit l'accès direct à la configuration
sql/schema.sql                 structure de la base, pour MySQL / MariaDB
sql/schema.sqlite.sql          la même, pour un essai en local
sql/migration-mot-de-passe.sql à n'exécuter que sur une base installée avant
                               l'ajout de la récupération de mot de passe
sql/migration-bibliotheque.sql à n'exécuter que sur une base installée avant
                               l'ajout de la bibliothèque partagée
sql/migration-listes-verbes.sql à n'exécuter que sur une base installée avant
                               les listes de verbes de la conjugaison
sql/migration-emprunts.sql     à n'exécuter que sur une base installée avant
                               la reprise des dictées d'autrui
sql/migration-abonnement.sql   à n'exécuter que sur une base installée avant
                               l'abonnement et le suivi des résultats
sql/migration-google.sql       à n'exécuter que sur une base installée avant
                               la connexion avec Google
```

## Installation, étape par étape

**1. Créer la base de données.** Dans le Manager Infomaniak, ouvre
*Hébergement Web → Bases de données → Ajouter*. Note le nom de la base,
l'utilisateur, le mot de passe et le serveur (souvent `localhost`).

**2. Créer les tables.** Toujours dans le Manager, ouvre phpMyAdmin sur cette
base, onglet *Importer*, et envoie `sql/schema.sql`. Quatre tables
apparaissent : `users`, `dictations`, `attempts`, `login_attempts`.

**3. Envoyer les fichiers.** Par FTP ou depuis le gestionnaire de fichiers,
copie le contenu du dossier dans le répertoire web du site, en général
`/web`. Les pages doivent se trouver à la racine, pas dans un sous-dossier,
sauf si tu ajustes le chemin `API` en tête de `assets/app.js`. Les liens que
le serveur fabrique — partage d'une dictée, récupération de mot de passe —
pointent sur `dictee.html` : si tu renommes ce fichier, corrige les trois
occurrences dans `api/index.php`.

**4. Renseigner la configuration.** Renomme `api/config.example.php` en
`api/config.php` et remplis les valeurs de l'étape 1. Laisse
`'driver' => 'mysql'` et `'cookie_secure' => true`.

**4 bis. L'envoi des e-mails.** La récupération de mot de passe envoie un
lien par message. Crée d'abord une véritable adresse sur ton domaine, par
exemple `dictee@mondomaine.ch`, dans *Hébergement Web → Mail*. Reporte-la
dans `mail_from`, et indique l'adresse publique du site dans `site_url` :
c'est elle qui compose le lien. Une adresse expéditrice inexistante, ou
appartenant à un domaine que tu n'héberges pas, fait rejeter les messages
ou les classe en indésirables.

**5. Vérifier deux réglages.** PHP doit être en version 8.0 ou plus récente
(*Hébergement Web → Site → PHP*), et le site servi en HTTPS avec la
redirection automatique activée. Sans HTTPS, le cookie de session est refusé
par le navigateur puisque `cookie_secure` vaut `true`.

**6. Essayer.** Ouvre le site, crée un compte, enregistre une dictée,
déconnecte-toi, reconnecte-toi : la dictée doit être là.

## Attention au dossier `data`

Il contient la base SQLite si vous utilisez ce mode, le cache des clés
publiques de Google et le journal des e-mails de développement. Un
`.htaccess` l'interdit à la lecture, et un `index.html` vide le masque en
cas de listage. **Vérifiez tout de même** en ouvrant
`https://votre-site/data/dictee.sqlite` dans un navigateur : vous devez
obtenir une erreur 403, jamais un téléchargement. Une base SQLite servie en
clair, ce sont tous les comptes et toutes les empreintes de mots de passe
livrés au premier venu.

En production, le mode `sqlite` n'est pas recommandé : préférez MySQL, dont
la base vit hors du répertoire web par construction.

## Essayer sur son ordinateur avant de mettre en ligne

Avec PHP installé, aucune base de données n'est nécessaire :

```bash
cp api/config.example.php api/config.php
# dans config.php, mettre  'driver' => 'sqlite'  et  'cookie_secure' => false
php -S localhost:8080
```

Les tables SQLite sont créées toutes seules au premier lancement, dans
`data/dictee.sqlite`. Ce dossier `data` ne doit pas partir en production.

## Quand quelque chose ne marche plus

Ouvrez `https://votre-site/api/index.php?a=diagnostic`. La page dit en clair
si la base est à jour, quels éléments manquent, et **quelle migration
exécuter** pour chacun. Elle indique aussi la version de PHP et les
extensions disponibles. Elle ne renvoie aucune donnée d'utilisateur ni aucun
secret : seulement la structure attendue et ce qui s'en écarte.

Une colonne absente est de loin la panne la plus fréquente après une mise à
jour, parce qu'il faut penser à envoyer les fichiers **et** à passer les
migrations. Le serveur le dit désormais explicitement à l'utilisateur au
lieu d'un « erreur interne du serveur » qui n'aide personne.

### Mettre la base à jour sans se tromper

Les fichiers `sql/migration-*.sql` se rejouent mal : une migration déjà
passée à moitié s'arrête sur la première instruction déjà appliquée, et l'on
ne sait plus où l'on en est. Préférez `api/migrer.php`, qui regarde la base
telle qu'elle est et ne produit que les instructions manquantes.

Ouvert simplement — `https://votre-site/api/migrer.php` — il **affiche** le
SQL à coller dans phpMyAdmin, sans rien modifier. C'est l'usage le plus sûr.

Pour qu'il applique lui-même les changements, ajoutez dans `config.php` :

```php
'maintenance_token' => 'un-mot-de-passe-que-vous-choisissez',
```

puis ouvrez `api/migrer.php?executer=1&cle=ce-mot-de-passe`. Sans cette clé,
le script refuse de toucher à quoi que ce soit. Retirez-la de la
configuration une fois la mise à jour faite, ou gardez-la : elle ne donne
accès à rien d'autre.

Les index et contraintes sont appliqués séparément et les doublons sont
ignorés : une erreur « Duplicate key name » sur ces lignes est sans gravité.

Les fichiers `sql/migration-*.sql` restent fournis pour référence, dans cet
ordre : mot-de-passe, bibliothèque, listes-verbes, emprunts, abonnement,
google.

## Mettre à jour le site

Envoie **tous** les fichiers, pas seulement ceux que tu crois modifiés : une
page et un script de versions différentes provoquent des pannes qui n'ont
aucun rapport apparent avec leur cause.

Pour que ce cas ne reste pas mystérieux, chaque page porte un
`data-version` et chaque script contient la même chaîne. S'ils diffèrent, un
bandeau rouge s'affiche en haut de l'application et le dit explicitement, avec
la marche à suivre. Les feuilles de style et les scripts sont par ailleurs
appelés avec `?v=` suivi de cette même version : un fichier neuf n'est jamais
servi depuis le cache du navigateur.

Quand tu modifies le code, change la version en trois endroits — l'attribut
`data-version` des trois pages, les `?v=` de leurs balises, et la constante
`VERSION` en bas de `assets/app.js` et de `assets/conjugaison.js`.

## Comment la page est organisée

Cinq destinations dans la barre du haut. Les trois premières sont des lieux —
*Créer une dictée*, *Mes dictées*, *Bibliothèque partagée* — les deux
dernières sont les temps de l'exercice, *La dictée* et *La correction*, qui
ne s'activent qu'une fois un texte prêt.

L'écran de création suit l'ordre dans lequel on travaille : d'abord
l'identité de la dictée — titre, auteur, niveau —, puis le texte avec ses
boutons d'import, puis en dessous seulement les actions et la case de
publication.

Une dictée ouverte reste ouverte : le deuxième clic sur *Enregistrer*
remplace la version gardée après confirmation, au lieu d'empiler une copie.
Une ligne sous les boutons dit à tout moment si le texte affiché est
enregistré ou modifié. Reprendre une dictée de la bibliothèque, en revanche,
crée une nouvelle entrée chez soi : on ne modifie pas celle d'un autre.

Les trois exemples ne sont plus dans l'éditeur mais en tête de la
bibliothèque. Ils vivent dans `assets/app.js`, tableaux `SAMPLES` et
`EXEMPLES_META` : aucune ligne en base, ils fonctionnent sans compte et même
si le serveur ne répond pas.

## Avec ou sans compte

Le compte est facultatif. Une personne de passage se sert de tout — lecture,
découpage, correction, import d'un PDF ou d'une photo — sans rien créer.
En revanche rien n'est conservé : ni dictée, ni réglage, ni résultat, et
aucun cookie n'est déposé. Une invitation discrète apparaît sous « Mes
dictées » pour expliquer ce qui change avec un compte.

Ouverte depuis un dossier, sans partie serveur, l'application retrouve son
comportement autonome et range tout dans le navigateur : la distinction ne
vaut que pour le site en ligne.

## Ce qui se passe sans serveur

L'application reste entièrement utilisable si l'API est absente : ouverte
directement depuis un dossier, ou hébergée sans la partie PHP. Elle interroge
`api/index.php?a=session` au démarrage ; en cas d'échec, la barre de compte
disparaît et tout est rangé dans le navigateur. C'est le même fichier qui
sert dans les deux cas, il n'y a pas deux versions à maintenir.

## L'API en bref

Tout passe par `api/index.php?a=action`, en JSON, sur la même origine. Les
requêtes qui modifient quelque chose sont en POST et portent l'en-tête
`X-CSRF` obtenu par l'action `session`.

| Action              | Méthode | Effet                                        |
|---------------------|---------|----------------------------------------------|
| `session`           | GET     | utilisateur connecté et jeton anti-CSRF       |
| `register`, `login` | POST    | ouvrir une session                            |
| `logout`            | POST    | la fermer, et délivrer un nouveau jeton       |
| `settings`          | GET/POST| réglages de lecture du compte                 |
| `dictations`        | GET     | liste des dictées                             |
| `dictation_save`    | POST    | créer ou modifier une dictée                  |
| `dictation_delete`  | POST    | en supprimer une                              |
| `attempts`          | GET     | quinze derniers résultats                     |
| `attempt_save`      | POST    | enregistrer un résultat                       |
| `password_forgot`   | POST    | envoyer un lien de nouveau mot de passe       |
| `password_reset`    | POST    | choisir le nouveau mot de passe               |
| `dictation_publish` | POST    | publier ou retirer une dictée de la bibliothèque |
| `dictation_share`   | POST    | obtenir le lien de partage d'une dictée       |
| `dictation_open`    | GET     | ouvrir une dictée par son lien, sans compte   |
| `library`           | GET     | chercher dans les dictées publiées            |
| `dictation_report`  | POST    | signaler une dictée publiée                   |
| `dictation_borrow`  | POST    | reprendre chez soi la dictée d'un autre       |
| `lists`             | GET     | les listes de verbes du compte                |
| `list_save`         | POST    | créer ou modifier une liste                   |
| `list_delete`       | POST    | supprimer une liste                           |
| `list_share`        | POST    | obtenir le lien de partage d'une liste        |
| `list_open`         | GET     | ouvrir une liste par son lien, sans compte    |
| `account_delete`    | POST    | effacer le compte et tout ce qui s'y rattache |

Ce contrat est indépendant de PHP : si tu passes un jour à Node sur un
serveur cloud, il suffit de réimplémenter ces douze actions, sans toucher au
navigateur.

## Les niveaux scolaires

La base ne connaît que des codes, `n1` à `n9`, correspondant aux neuf années
où l'on fait des dictées. La traduction vit dans `assets/app.js`, dans le
tableau `NIVEAUX` :

| Code | Suisse | France | Belgique | Québec        | Âge      |
|------|--------|--------|----------|---------------|----------|
| n1   | 3H     | CP     | P1       | 1re année     | 6–7 ans  |
| n2   | 4H     | CE1    | P2       | 2e année      | 7–8 ans  |
| n3   | 5H     | CE2    | P3       | 3e année      | 8–9 ans  |
| n4   | 6H     | CM1    | P4       | 4e année      | 9–10 ans |
| n5   | 7H     | CM2    | P5       | 5e année      | 10–11 ans|
| n6   | 8H     | 6e     | P6       | 6e année      | 11–12 ans|
| n7   | 9H     | 5e     | S1       | Secondaire 1  | 12–13 ans|
| n8   | 10H    | 4e     | S2       | Secondaire 2  | 13–14 ans|
| n9   | 11H    | 3e     | S3       | Secondaire 3  | 14–15 ans|

Chacun choisit son système dans les réglages : une dictée déposée en 6H
apparaît comme CM1 à un utilisateur français, sans conversion ni doublon en
base. Pour ajouter un pays, il suffit d'ajouter une colonne au tableau et une
option au menu `#sys` : le serveur n'a pas à changer.

## La bibliothèque partagée, et sa modération

Publier est un choix explicite, dictée par dictée. La recherche porte sur le
titre et sur le nom d'auteur, et se combine avec le filtre de niveau ; les
caractères `%` et `_` saisis dans la recherche sont neutralisés pour qu'ils
ne servent pas de joker SQL.

Le catalogue est ouvert à tous — titre, auteur, niveau, nombre de mots —
mais le texte demande un compte. La règle est appliquée par le serveur, pas
seulement par l'interface : l'action `library` ne renvoie le jeton d'accès
qu'aux personnes connectées, si bien qu'un visiteur n'a aucun moyen
d'atteindre le contenu. Masquer simplement le bouton n'aurait rien protégé,
le jeton étant visible dans la réponse.

Une exception assumée : un lien de partage `?d=` reste ouvert sans compte.
C'est le point de la fonction — un enseignant envoie une dictée à vingt
familles sans leur imposer une inscription. Si tu préfères fermer aussi
cette porte, il suffit d'ajouter `requireUser();` en tête de l'action
`dictation_open`.

Tu accueilles du contenu écrit par d'autres : c'est une responsabilité.

Un clic sur « Signaler » enregistre une ligne dans la table `reports`, une
seule par dictée et par adresse IP — recliquer ne fait pas monter le
compteur, et une personne seule ne peut donc pas faire retirer une dictée
qui la dérange. Au troisième signalement venu de trois adresses distinctes,
la dictée quitte la bibliothèque et son lien cesse de répondre.

Tu es prévenu par e-mail à l'adresse `admin_email` de `config.php`, deux
fois seulement : au premier signalement, pour que tu puisses juger toi-même
sans attendre, et au troisième, quand le retrait a eu lieu. Le message
contient le titre, l'auteur déclaré, l'adresse du compte qui a publié, le
lien pour lire le texte, et la requête SQL à exécuter selon ta décision. Si
tu laisses `admin_email` vide, rien n'est envoyé et les signalements sont
seulement comptés en base.

Pour voir ce qui a été signalé :

```sql
SELECT d.id, d.title, d.author, d.reports, u.email
FROM dictations d JOIN users u ON u.id = d.user_id
WHERE d.reports > 0 ORDER BY d.reports DESC;
```

Pour dépublier définitivement une dictée : `UPDATE dictations SET is_public = 0 WHERE id = ?`.
Remettre `reports` à zéro rétablit une dictée signalée à tort.

## La dictée en quatre langues

Français, allemand, anglais et italien. Le tableau `LANGUES_DICTEE` porte,
pour chacune, le nom des signes de ponctuation, la formule de retour à la
ligne et le code servant à choisir une voix. Ajouter une langue ne demande
que d'étendre ce tableau.

Changer de langue change trois choses à la fois : la voix retenue — les voix
sont filtrées sur le code de langue —, le nom des signes annoncés, et la
langue déclarée à la synthèse vocale. Si aucune voix de la langue choisie
n'est installée, le message le dit clairement plutôt que de lire de
l'allemand avec un accent français.

Chaque dictée porte sa langue, qui la suit lorsqu'elle est partagée ou
reprise. La bibliothèque se filtre par langue.

**Et cette langue s'impose.** Dès qu'une dictée existante est ouverte, le
sélecteur se verrouille : lire un texte allemand avec une voix française
n'apprendrait rien, ni la prononciation ni l'orthographe. Un dernier
garde-fou rétablit la langue au moment de lancer la lecture, au cas où un
réglage serait resté de travers.

Le verrou ne reste levé que devant un texte qu'on est en train d'écrire —
c'est là que la langue se décide. Sur **sa propre** dictée, un bouton
« Corriger la langue de cette dictée » permet de revenir sur un mauvais
étiquetage, après confirmation ; sur une dictée reprise, ce bouton n'existe
pas, puisqu'elle appartient à son auteur.

### Des réglages propres à chaque langue

Une dictée d'allemand ne se lit pas comme une dictée de français : plus
lentement, par groupes plus courts, avec une voix allemande. Chaque langue
garde donc **son propre jeu de réglages** — vitesse, taille des groupes,
répétition, voix, annonce de la ponctuation — et changer de langue les
rappelle.

Une langue encore jamais réglée ne part pas des valeurs du français mais de
valeurs adaptées : lecture à 0,85, groupes de six mots, groupe répété deux
fois. C'est ce qu'un enseignant fait spontanément en dictant dans une langue
que ses élèves apprennent.

Le titre du panneau nomme la langue concernée — « Réglages de lecture —
allemand » — pour qu'on ne croie pas régler l'ensemble.

Les enregistrements faits avant ce changement sont relus sans perte : un jeu
de réglages unique devient celui du français.

Le découpage et la correction, eux, n'ont rien demandé : ils travaillent sur
la ponctuation et sur les lettres, que ces quatre langues partagent. Le
tokeniseur couvrait déjà le ß et les trémas.

## Le découpage de la dictée

Un groupe s'arrête toujours à une ponctuation : virgule, point-virgule,
deux-points, point. Jamais au milieu d'un membre de phrase. La conséquence
assumée est qu'un membre plus long que la taille demandée reste entier —
mieux vaut un groupe un peu long qu'une phrase coupée en son milieu, qu'un
enfant ne peut ni comprendre ni retenir.

Pour compenser, un groupe dépassant la taille demandée de plus de deux mots
est **relu deux fois**, même si le réglage dit « une seule fois ».

Le dernier groupe d'un paragraphe porte une marque de retour à la ligne.
Elle est annoncée après la ponctuation — « point, à la ligne » — et retirée
de l'affichage comme des comptages.

## La ponctuation à la correction

Une même ponctuation s'écrit de plusieurs façons selon le clavier : trois
points ou le caractère `…`, guillemets droits ou français, apostrophe droite
ou courbe, tiret court ou long, espace insécable ou non. `normaliserPonctuation()`
les ramène à une forme unique avant la comparaison. Compter faux un élève qui
a tapé `...` là où le texte portait `…` serait une faute de l'application,
pas la sienne.

En revanche un point mis à la place d'une virgule reste une vraie faute, et
c'est bien ce que fait le correcteur.

## Deux auteurs à ne pas confondre

Une dictée porte deux noms de personne, et l'interface doit les distinguer
clairement, faute de quoi on attribue *L'incipit du roman* au collègue qui
l'a saisie plutôt qu'à Maupassant.

- `author` est **l'auteur du texte** : Maupassant, La Fontaine, ou personne
  si le texte est original. C'est une donnée du texte, saisie librement.
  Affiché « texte de … ».
- `origin_owner` est **le compte qui a composé la dictée** et l'a partagée.
  Il est relevé au moment de la reprise, à partir du prénom du compte source.
  Affiché « dictée partagée par … ».

Dans « Mes dictées », les deux listes sont séparées : *Les dictées que j'ai
créées* d'un côté, *Reprises dans la bibliothèque* de l'autre. Les premières
portent la mention « composée par toi » et offrent partage et publication ;
les secondes nomment leur créateur et n'offrent que l'ouverture et le retrait.

## Créer une dictée, ou ouvrir celle qui l'est déjà

L'écran change d'outillage selon le cas, ce que gère `appliquerMode()`. En
création, il propose d'importer un PDF ou une photo, de restaurer une
sauvegarde et de remettre le texte en forme, sous le titre « Préparer le
texte ». Sur une dictée déjà ouverte, ces outils disparaissent — on ne
prépare plus, on relit — et le titre devient simplement « Le texte ». Le
glisser-déposer est neutralisé de la même façon.

Deux entrées de navigation mènent à cet écran, avec deux intentions
différentes. **Créer une dictée** part toujours d'une feuille blanche, après
confirmation si le texte affiché n'est pas enregistré. **La dictée ouverte**
n'apparaît que lorsqu'une dictée est chargée — la sienne, ou une reprise de
la bibliothèque — et y ramène sans rien effacer. C'est de là que l'on
modifie, puis que l'on lance « Commencer la dictée ».

## À qui appartient une dictée

Une dictée reprise dans la bibliothèque ou reçue par un lien peut être
enregistrée chez soi, pour ne pas avoir à retourner la chercher. Elle reste
pourtant celle de son auteur : ni modification, ni publication, ni partage
sous un autre nom. Seule la suppression de sa propre liste est permise.

La colonne `borrowed` de `dictations` porte cette distinction, et
`origin_token` retient d'où vient la copie, ce qui évite les doublons si
l'on reprend deux fois la même.

La règle est appliquée par le serveur, pas seulement par l'interface :
`dictation_save`, `dictation_publish` et `dictation_share` refusent une
dictée empruntée. Surtout, l'action `dictation_borrow` ne reçoit que le
jeton : le titre, l'auteur et le texte sont copiés depuis la source, jamais
depuis ce que dit le navigateur. Une requête forgée ne peut donc pas
maquiller l'auteur.

Côté écran, les champs sont verrouillés, la case de publication disparaît,
un encadré nomme l'auteur, et le bouton devient « Enregistrer dans mes
dictées ». Dans la liste personnelle, ces dictées portent une pastille au
nom de leur auteur et n'offrent que « Ouvrir » et « Supprimer ».

## Le partage par lien

Le lien est composé par le navigateur, à partir de l'adresse réellement
affichée : `window.location.origin + pathname`. Le serveur, lui, ne connaît
pas toujours la sienne — derrière un proxy ou un alias de domaine, il
répondait `needhelpapp.com` au lieu de `teaching.needhelpapp.com`. Seuls les
liens envoyés par e-mail sont encore composés côté serveur, et c'est
`site_url` de `config.php` qui fait alors foi : **renseignez-le avec le
sous-domaine complet**, sinon les liens de récupération de mot de passe
seront faux eux aussi.

Chaque dictée peut recevoir un lien `?d=` suivi d'un jeton de 32 caractères.
Le lien fonctionne sans compte, y compris pour une dictée non publiée : c'est
le principe du lien secret. Supprimer la dictée invalide le lien.

## La récupération de mot de passe, en détail

La demande répond toujours la même chose, que l'adresse existe ou non : sans
cela, ce formulaire dirait à n'importe qui si une adresse possède un compte.
Le lien contient un jeton de 64 caractères tiré au hasard ; seule son
empreinte est stockée, si bien qu'une fuite de la base ne permet pas de
fabriquer un lien valable. Il expire au bout d'une heure, ne sert qu'une
fois, et toute demande antérieure est annulée. Cinq demandes par heure et
par adresse IP au maximum.

Changer de mot de passe ferme les sessions ouvertes sur les autres
appareils : c'est le rôle de la colonne `pwd_version`. Si quelqu'un s'était
introduit dans un compte, la récupération suffit à l'en chasser.

Pour vérifier le parcours sans boîte aux lettres, mets `mail_debug_log` à
`true` : le message est écrit dans `data/mails.log` au lieu d'être envoyé.
À remettre à `false` en ligne.

## Sécurité, ce qui est en place

Les mots de passe sont hachés avec `password_hash` et jamais stockés en
clair. Toutes les requêtes SQL sont préparées. Le cookie de session est
`HttpOnly`, `SameSite=Lax` et `Secure`. L'identifiant de session est
régénéré à chaque connexion. Les connexions sont limitées à dix essais par
quart d'heure et par adresse IP. Les messages d'erreur ne disent jamais si
une adresse e-mail existe. `config.php` est refusé par le serveur web grâce
au `.htaccess`.

Un point reste à ta charge : la table `login_attempts` grossit lentement et
mérite une purge annuelle, tout comme les jetons expirés.

```sql
DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
DELETE FROM password_resets WHERE expires_at < NOW();
```

## Avant d'ouvrir le service au-delà de ta famille

`confidentialite.html` est rédigée et reliée depuis le pied de page et
depuis la fenêtre de connexion, mais elle comporte des mentions entre
crochets à remplacer : ton nom ou ta raison sociale, ton adresse postale,
ton adresse de contact, et la date de mise en ligne. Un encadré jaune en
haut de la page te le rappelle ; supprime-le une fois les champs remplis.
Ces mentions sont exigées aussi bien par la LPD suisse que par le RGPD dès
qu'on conserve une adresse e-mail.

Un point de vigilance à connaître : les polices sont chargées depuis Google
Fonts, ce qui expose l'adresse IP des visiteurs à Google. La page de
confidentialité le mentionne. Pour t'en affranchir, télécharge les trois
familles, dépose-les dans `assets/` et remplace le lien vers
`fonts.googleapis.com` par une déclaration `@font-face` locale, dans
`index.html` et dans `confidentialite.html`.

## Clés des services de voix IA

Elles restent saisies dans le navigateur et ne sont ni transmises au serveur
ni enregistrées, volontairement : une clé qui traîne dans une base de
données est une clé qui fuit. Chacun colle la sienne au moment de s'en
servir.


## La conjugaison

L'application est entièrement autonome : aucune base, aucun appel réseau,
tout se calcule dans le navigateur. Elle peut donc être copiée seule sur
n'importe quel hébergement, sans PHP.

### Le moteur, `assets/conjugueur.js`

Il fonctionne à trois niveaux, du plus général au plus particulier.

D'abord les **règles régulières** : les verbes en `-er` avec leurs pièges
orthographiques — la cédille de « nous plaçons », le e de « nous mangeons »,
le doublement de « j'appelle », l'accent de « j'achète » et de « je lève »,
le y de « j'emploie » — et les verbes du 2e groupe en `-ir`.

Ensuite les **familles du 3e groupe**, reconnues à la terminaison :
`-dre` (rendre), `-indre` (craindre), `-uire` (conduire), `-aître`
(connaître), `-cevoir` (apercevoir), `-quérir` (conquérir).

Enfin une **table d'irréguliers**, étendue aux composés par leur préfixe :
« comprendre » se conjugue comme « prendre », « devenir » comme « venir ».
Les bases sont essayées de la plus longue à la plus courte, sinon « écrire »
serait pris pour un composé de « rire ».

Les temps composés ne sont pas stockés : ils sont montés à partir de
l'auxiliaire conjugué et du participe passé, avec l'accord du participe pour
les verbes qui se conjuguent avec être.

### Ajouter un verbe

Pour un verbe régulier, il n'y a rien à faire : il est déjà reconnu. Pour un
irrégulier, ajoute une entrée dans `IRREGULIERS` avec les six formes du
présent, le radical du futur, le type de passé simple et le participe passé ;
le reste se déduit. S'il a des composés, ajoute son nom à
`BASES_COMPOSABLES`.

### Vérifier le moteur

Le fichier ne dépend d'aucune bibliothèque et s'utilise aussi en ligne de
commande, ce qui permet de le contrôler :

```bash
node -e "const C=require('./assets/conjugueur.js');
         console.log(C.conjugue('prendre').subjonctif.join(', '))"
```

### Les temps couverts

Vingt-quatre, soit tous ceux d'une table de conjugaison scolaire :

| Mode | Temps |
|------|-------|
| Indicatif | présent, imparfait, passé simple, futur simple, passé composé, plus-que-parfait, passé antérieur, futur antérieur, futur proche |
| Subjonctif | présent, imparfait, passé, plus-que-parfait |
| Conditionnel | présent, passé 1re forme, passé 2e forme |
| Impératif | présent, passé |
| Infinitif | présent, passé |
| Participe | présent, passé |
| Gérondif | présent, passé |

Seuls les temps surcomposés du français parlé régional — « quand j'ai eu
fini » — manquent, ainsi que le passé récent, qui n'est pas un temps mais
une périphrase.

### La feuille imprimable

**Attention si vous modifiez la page** : `#feuille` doit rester **fille
directe de `<body>`**. La règle d'impression masque tous les enfants de
`<body>` sauf elle ; enfermée dans `.wrap`, elle disparaissait avec le reste
et le PDF sortait blanc.

Un abonné peut tirer son exercice sur papier : bouton « Imprimer en PDF »
dans Composer. Le même tirage que l'exercice à l'écran alimente deux pages —
les questions, puis le corrigé, séparés par un saut de page.

Aucune bibliothèque n'est utilisée et rien ne part au serveur. La feuille est
construite dans la page même, et `@media print` masque tout le reste : menu,
onglets, boutons. Le navigateur produit le PDF par « Enregistrer au format
PDF », ce qui fonctionne partout, y compris hors ligne, et garde le texte de
l'exercice chez l'utilisateur.

La question doit rester posable sur le papier, où l'on ne peut rien
demander : l'impératif nomme sa personne, les temps à forme unique le
signalent, les autres donnent le pronom sujet, élision comprise —
« j'eus pris » et non « je eus pris ». C'est la même logique qu'à l'écran,
et elle est écrite une seule fois.

L'en-tête porte le nom de la sélection, le décompte des verbes et des temps,
la date, et une ligne « Nom / Classe / Note sur N ».

### Les écrans de la conjugaison

Ils sont sept : Composer, S'entraîner, Mes listes, Bibliothèque partagée,
Les verbes, Mes résultats, et le bilan d'exercice.

« Les verbes » a absorbé l'ancien écran « Consulter » : les deux faisaient le
même travail. Un seul champ sert maintenant à chercher dans la liste et à
conjuguer ; tant que la saisie ne désigne pas un verbe connu, la liste
filtrée s'affiche, et dès qu'elle en désigne un, sa conjugaison prend la
place. Un bouton ramène à la liste, un autre ajoute le verbe à la sélection
en cours.

De même, l'éditeur de listes a disparu : il faisait double emploi avec
« Composer ». Une liste **est** une sélection — des verbes et des temps —, et
c'est dans Composer qu'on la bâtit, qu'on l'ouvre et qu'on l'enregistre. Deux
éditeurs auraient fini par diverger.

« Mes listes » ne montre donc plus que les sélections enregistrées : les
siennes d'un côté, celles reprises dans la bibliothèque de l'autre. Les
règles de propriété sont celles des dictées : une liste reprise s'utilise
mais ne se modifie ni ne se republie, et son auteur reste nommé.

### La liste des verbes

`assets/verbes.js` contient 984 verbes, rangés par groupe. Le rangement ne
sert à rien à l'écran : il sert à la vérification. L'erreur la plus facile à
commettre est de classer un verbe dans le mauvais groupe, et la plus
difficile à voir, puisque le moteur produit alors des formes plausibles mais
fausses. Un script compare le groupe déclaré au groupe deviné par
`Conjugueur.origine()` et signale tout désaccord :

```bash
node -e "
const C=require('./assets/conjugueur.js'), V=require('./assets/verbes.js');
console.log(V.parGroupe.g3.filter(v=>C.origine(v)==='2e groupe'));
console.log(V.parGroupe.g2.filter(v=>C.origine(v)!=='2e groupe'));"
```

C'est ainsi qu'ont été trouvés `répartir`, pris pour un composé de `partir`,
et `inscrire`, pris pour un composé de `rire`.

La liste n'est pas reprise d'un site existant. D'une part une base compilée
par un tiers lui appartient ; d'autre part rien ne garantirait que notre
moteur conjugue correctement chacun de ses verbes, et une liste dont un
verbe sur cinquante est faux vaut moins qu'une liste plus courte et sûre.
Chaque entrée d'ici a été confrontée au moteur : 984 verbes, 106 091 formes
engendrées, aucune anomalie.

Pour ajouter des verbes, il suffit de les écrire dans le bloc du groupe
correspondant, puis de relancer la vérification ci-dessus.

### Les verbes couverts

Il n'existe pas de liste complète des verbes français dans l'application, et
il n'en faut pas : les verbes réguliers sont calculés, pas stockés. N'importe
quel verbe en `-er` ou du 2e groupe saisi par l'utilisateur est conjugué
correctement, y compris s'il vient d'être inventé.

Restent les irréguliers, forcément énumérés. La table en compte une
soixantaine, étendus par les six familles et par le mécanisme des composés,
ce qui couvre plusieurs centaines de verbes. Un contrôle sur 218 verbes
parmi les plus fréquents du français ne laisse aucun trou.

Trois manques connus, à traiter le jour où ils gênent : les verbes
pronominaux (`se lever`), les défectifs rares (`traire`, `clore`, `gésir`,
`seoir`), et les quelques verbes dont le participe passé n'obéit à aucune
règle (`absoudre`). Un verbe inconnu est signalé à l'utilisateur au lieu
d'être conjugué de travers, ce qui est le comportement important.

### Le compte

La conjugaison utilise le même compte que la dictée, par `assets/compte.js`.
Les réglages de l'exercice sont rangés sous la clé `conjugaison` du champ
`settings` de l'utilisateur, à côté de ceux de la dictée, sans collision. Les
bilans rejoignent la table `attempts` avec une étiquette qui commence par
« Conjugaison · », si bien que l'écran « Mes résultats » montre les deux
entraînements dans le même fil.

### Les listes de verbes

Un utilisateur connecté compose ses propres séries — les verbes d'une leçon,
ceux qu'un élève rate — depuis l'onglet « Mes listes ». Chaque verbe saisi
est vérifié par le moteur avant d'entrer dans la liste : on ne peut pas y
mettre un mot que l'application ne saurait pas conjuguer. Le serveur
revérifie de son côté, filtre les doublons et plafonne à 200 verbes.

Les listes enregistrées apparaissent ensuite dans « Composer », à côté des
listes prêtes à l'emploi, et se combinent avec elles.

Le partage passe par un lien `conjugaison.html?l=` suivi d'un jeton de 32
caractères. Il s'ouvre sans compte : un enseignant envoie la liste à sa
classe sans imposer d'inscription. À l'ouverture, la liste est cochée
d'office dans le composeur, prête à être travaillée, et n'est pas conservée
au-delà de la visite si le visiteur n'a pas de compte.

### Le partage sur mobile

Les boutons « Partager », côté dictée comme côté listes de verbes, appellent
`navigator.share()` quand le navigateur le propose : la feuille de partage
du système s'ouvre avec WhatsApp, Messages, le courrier, tout ce que
l'utilisateur a installé. C'est le cas sur Android, sur iOS et sur Safari
macOS. Ailleurs — Firefox et Chrome sur ordinateur, principalement — le lien
est copié dans le presse-papiers, et affiché en clair si même cela échoue.
Une fermeture de la feuille par l'utilisateur est traitée comme une
annulation silencieuse, sans message d'erreur.

### La correction des réponses

Les accents comptent : « chantais » et « chantai » sont deux formes
différentes. En revanche les majuscules et les espaces en trop sont
tolérés, et l'accord au féminin ou au pluriel du participe passé est
accepté : « je suis allée » vaut « je suis allé ». Les doubles orthographes
admises le sont aussi : « je paye » vaut « je paie ».


## Les messages d'accueil dans l'application

Deux fenêtres, chacune montrée **une seule fois par compte** : à la création
du compte, et à l'ouverture de l'abonnement. Trois points chacune, pas
davantage — au-delà on ne lit plus.

Le marquage se fait dans le navigateur, par identifiant de compte
(`teaching-vu-bienvenue-7`). Deux personnes se partageant un ordinateur
voient donc chacune la leur, ce qu'un simple drapeau global aurait empêché.

La fenêtre est construite en JavaScript plutôt que recopiée dans chaque
page : neuf balisages identiques auraient fini par diverger, comme cela
s'était déjà produit avec la barre du haut.

Le message d'inscription est déclenché par le champ `nouveau` que renvoie
`register` — et déjà `google` pour un compte créé de cette façon. Celui de
l'abonnement se déclenche au premier passage à l'état abonné, sur n'importe
quelle page : `Compte.demarrer` le vérifie à chaque chargement, de sorte
qu'un abonnement activé par la notification de paiement pendant que
l'utilisateur navigue ailleurs ne passe pas inaperçu.

Le ton reste factuel. « Un peu de promotion » pour l'abonnement, oui, mais
sans exagération : ce que l'on vend est exactement ce qu'on annonce, et un
enseignant qui se sent poussé à l'achat ne revient pas.

## Les messages envoyés aux utilisateurs

Trois occasions, et trois seulement : la bienvenue à l'inscription — par
mot de passe comme par Google —, la prise d'abonnement, et la résiliation.
Pas de relance, pas de lettre d'information : le compte de messagerie de
quelqu'un n'est pas un canal de promotion.

Les deux messages liés à l'abonnement ne partent qu'aux **changements
d'état**. `appliquerAbonnement()` lit le statut d'avant, le compare à celui
d'après, et n'écrit que si la valeur change. C'est indispensable : cette
fonction est appelée par trois chemins — retour de paiement, bouton de
rattrapage, notification — et peut l'être plusieurs fois de suite. Vérifié :
trois synchronisations successives n'envoient rien de plus.

Le message de confirmation d'abonnement rappelle le montant, l'échéance, la
reconduction automatique et la manière de résilier. Celui de résiliation
donne la date jusqu'à laquelle l'accès reste ouvert et précise que rien
n'est effacé. Ce sont des mentions attendues d'un contrat à distance, autant
qu'une politesse.

Tout cela suppose `mail_from` renseigné dans `config.php`, avec une adresse
qui existe réellement sur votre domaine. Pendant la mise au point, mettez
`mail_debug_log` à `true` : les messages sont alors écrits dans
`data/mails.log` au lieu d'être envoyés, ce qui permet de les relire.

## L'abonnement

### Trois situations, et non deux

| | Faire les exercices | Enregistrer | Reprendre | Publier, partager, résultats |
|---|---|---|---|---|
| **Sans compte** | oui | non | non | non |
| **Compte gratuit** | oui | 5 par application | 5 par bibliothèque | non |
| **Abonné** | oui | sans limite | sans limite | oui |

Cinq est assez pour se rendre compte, trop peu pour une classe entière :
c'est exactement le but. Un enseignant qui prépare ses dictées de l'année
dépassera le seuil dès la deuxième semaine, un parent curieux ne le
rencontrera peut-être jamais — et c'est très bien.

`verifierQuota()` compte séparément **ce qu'on a créé** et **ce qu'on a
repris** : la colonne `borrowed` distingue les deux. Reprendre cinq listes
dans la bibliothèque n'empêche donc pas d'en composer cinq soi-même.

Le message de refus dit ce qu'il faut faire — supprimer un élément ou
s'abonner — plutôt que d'opposer une porte close. Rien n'est jamais effacé
au passage.

Une décision à connaître : **les bibliothèques s'ouvrent à tout compte, même
gratuit**. Fermer la vitrine à qui vient de s'inscrire n'aurait servi
personne ; c'est la reprise, celle qui garde, qui est comptée.

### Ce qui est gratuit, ce qui ne l'est pas

Le gratuit reste entièrement utilisable : composer ou importer une dictée, la
faire lire, se corriger, s'entraîner à la conjugaison sur les 984 verbes et
les 24 temps. L'abonnement ouvre ce qui suppose de **garder ou de partager** :
enregistrer ses dictées, la bibliothèque partagée, les listes de verbes, le
suivi des résultats.

Une nuance que je vous recommande de conserver : un abonnement échu ne
**bloque jamais la lecture**. Les dictées, les listes et les résultats
restent consultables et exportables ; seuls l'enregistrement, le partage et
la bibliothèque se referment. Retenir les données de quelqu'un pour le
forcer à payer serait contestable en droit et détestable en pratique.

La règle est appliquée par le serveur. `requireAbonne()` garde
`dictation_save`, `dictation_borrow`, `dictation_publish`, `dictation_share`,
`list_save`, `list_share` et `attempt_save`, et renvoie un code 402 avec
`abonnement_requis`. La bibliothèque ne livre le jeton d'accès qu'aux
abonnés. Masquer les boutons ne protégerait rien.

### Mettre en place les paiements

1. Créez un compte Stripe, puis, dans *Catalogue de produits*, un produit
   « Abonnement Teaching » avec **deux tarifs récurrents** : un mensuel, un
   annuel. Cliquez sur chaque tarif et copiez son **identifiant**, de la
   forme `price_1Ab2CdEfGhIjKlMnOpQrStUv`.

   C'est un identifiant, pas un montant. Deux réglages se ressemblent dans
   `config.php` et il ne faut pas les confondre :

   ```php
   'stripe_prix_mensuel' => 'price_1Ab2Cd…',      // ce que Stripe débite
   'prix_mensuel'        => '4.90 CHF par mois',  // ce qui s'affiche
   ```
2. Dans *Développeurs → Webhooks*, déclarez l'adresse
   `https://votre-site/api/stripe.php` et abonnez-la aux évènements
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` et
   `invoice.payment_failed`. Notez le secret `whsec_…`.
3. Reportez les quatre valeurs dans `api/config.php`, ainsi que les prix
   affichés. **Commencez par les clés de test** (`sk_test_…`) : Stripe
   fournit des numéros de carte d'essai et un outil pour rejouer les
   notifications.
4. Tant que ces champs restent vides, le site n'affiche aucune offre payante
   et fonctionne intégralement en gratuit. Rien ne casse.

### TWINT

TWINT demande deux choses, l'une technique et l'autre juridique.

**La version d'API.** TWINT n'accepte les paiements récurrents que depuis
`2026-05-27.dahlia`. Avec une version antérieure — le code demandait
`2024-06-20` — il n'est tout simplement pas proposé sur la page de paiement
d'un abonnement, sans message d'erreur : le moyen de paiement est absent,
voilà tout. La version vit désormais dans `stripe_version` et ne devrait pas
être rabaissée. Le changement était sans risque ici, la lecture de la date de
fin de période regardant déjà les deux emplacements possibles.

**Les mentions légales.** Stripe vérifie que le site affiche en clair la
dénomination et la forme juridique — pour une entreprise individuelle, le nom
complet du propriétaire —, l'adresse postale complète, et au moins un moyen
de contact. D'où `mentions-legales.html`, liée depuis le pied de page de
toutes les pages. **Elle doit être remplie** : `api/paiement-test.php` le
refuse tant qu'il y subsiste un crochet, et le dit.

Les prix doivent être en CHF, ce que la même page vérifie en lisant les
tarifs chez Stripe.

Reste à activer TWINT dans *Paramètres → Moyens de paiement*. Un seul mandat
est permis par personne et par commerçant : un client qui résilie puis se
réabonne peut devoir confirmer à nouveau dans son application.

### Quand le paiement est refusé

Ouvrez `api/paiement-test.php?cle=…`, avec la clé de `maintenance_token`
(la même que pour `api/migrer.php`). La page lit votre configuration,
interroge Stripe et traduit son refus. Elle ne modifie rien et ne facture
rien.

La clé est nécessaire parce que cette page dit quelles clés sont posées et
si le compte tourne en test ou en production : c'est un état des lieux du
paiement, il n'a pas à être public. Sans `maintenance_token` dans
`config.php`, la page reste fermée.

Les causes les plus fréquentes, toutes reconnues par cette page :

- **« No such price »** — l'identifiant est mal recopié, ou bien le tarif a
  été créé en mode test alors que la clé est en mode production, ou
  l'inverse. Dans Stripe, l'interrupteur « Mode test » commande les deux à
  la fois, et les identifiants ne sont pas interchangeables.
- **tarif non récurrent** — un abonnement exige un tarif « périodique », pas
  « unique ». Il faut le recréer.
- **tarif archivé** — il existe mais est désactivé dans Stripe.
- **clé refusée** — c'est souvent la clé publiable (`pk_…`) qui a été copiée
  au lieu de la clé secrète (`sk_…`).

Pour voir le message brut de Stripe directement à l'écran pendant la mise au
point, mettez `'debug_paiement' => true` dans `config.php`. Remettez-le à
`false` ensuite : un client n'a pas à lire « No such price ».

### Résilier

La résiliation passe par le portail client de Stripe, où l'abonné change
aussi de carte et télécharge ses factures. Le bouton « Gérer ou résilier mon
abonnement » y mène, et un lien « Mon abonnement » figure dans la barre de
compte des deux applications.

Activez ce portail dans Stripe → *Paramètres → Portail client*, et copiez le
lien qui s'y affiche dans `stripe_portail_url` de `config.php`.

Le site ouvre normalement le portail directement sur le bon client. Si
l'identifiant de payeur manque — abonnement activé à la main, notification
jamais arrivée — il est d'abord recherché chez Stripe à partir de l'adresse
du compte, puis rattaché. Le lien public ne sert donc que de **dernier
secours** : normalement le site ouvre le portail directement sur le bon
client, sans qu'il ait à s'identifier ; mais si l'identifiant de payeur
manque encore, ou si Stripe est momentanément injoignable, c'est ce lien
public qui prend le relais — Stripe demande alors son adresse au client et
lui envoie un code.

Pouvoir résilier ne doit jamais dépendre d'un service en panne : c'est la
raison de ce repli, vérifié en simulant une coupure.

**Un piège de l'API Stripe** : la date de fin de période a changé de place.
Elle figurait sur l'objet `subscription`, elle vit désormais sur ses lignes
(`items.data[].current_period_end`). La fonction `finDePeriode()` regarde aux
deux endroits et retient la plus lointaine, ce qui rend le code indifférent à
la version d'API du compte. Sans cela, un abonnement résilié se retrouvait
sans date de fin, et l'accès se refermait aussitôt au lieu de durer jusqu'au
terme payé.

Par prudence, un abonnement résilié dont le terme est inconnu **reste
ouvert** : la personne a payé sa période, et c'est la notification de fin qui
la refermera. Fermer par défaut reviendrait à couper un service déjà réglé.

Une résiliation ne coupe rien immédiatement. Stripe envoie
`customer.subscription.updated` avec `cancel_at_period_end`, le compte passe
au statut `resilie`, et l'accès reste ouvert jusqu'à `plan_fin`. Ensuite
`customer.subscription.deleted` le referme. Les données ne sont jamais
effacées.

### Trois chemins pour ouvrir un abonnement

Faire dépendre l'activation du seul webhook était une erreur : mal déclaré,
le client paie et ne reçoit rien. Il y a désormais trois chemins, qui
aboutissent tous à la même fonction `appliquerAbonnement()` :

1. **Au retour du paiement.** L'adresse de retour porte l'identifiant de la
   session ; le serveur la relit chez Stripe et vérifie qu'elle est payée et
   qu'elle appartient bien au compte connecté. C'est ce qui ouvre l'accès
   immédiatement, sans dépendre d'aucune configuration de webhook.
2. **Le bouton « Retrouver mon abonnement »**, sur la page d'abonnement.
   Le serveur cherche chez Stripe un abonnement à l'adresse du compte et le
   rattache. C'est le rattrapage pour qui a payé sans rien voir s'ouvrir.
3. **La notification signée**, qui reste indispensable pour la suite :
   renouvellements, échecs de paiement, résiliations. Elle seule est
   informée de ce qui se passe après le premier paiement.

Aucun de ces chemins ne croit le navigateur sur parole : chacun relit l'état
chez Stripe avant de modifier quoi que ce soit.

### Pourquoi la notification signée reste nécessaire

Le retour de l'utilisateur sur la page « merci » ne prouve rien : cette
adresse peut être ouverte à la main, et le navigateur peut être fermé avant
d'y arriver. Seul le message signé envoyé par Stripe à `api/stripe.php`
ouvre ou ferme un abonnement. Sa signature est vérifiée par HMAC-SHA256, les
messages de plus de cinq minutes sont refusés, et l'identifiant d'évènement
est unique en base : un même message rejoué n'est traité qu'une fois.

J'ai éprouvé cette vérification sur six cas — signature juste, signature
falsifiée, corps modifié après signature, message rejoué, en-tête absent,
mauvais secret — et elle se comporte correctement dans chacun. En revanche
je **n'ai pas pu tester le dialogue réel avec Stripe** : cela demande un
compte et des clés. C'est le point à vérifier en premier chez vous, en mode
test, avant d'ouvrir les paiements.

### Avant d'encaisser le premier franc

`conditions.html` est une trame, pas un avis juridique. Faites-la relire.
Il vous faut au minimum : votre identité complète et votre adresse, la
mention de la TVA si vous y êtes assujetti, une position claire sur le droit
de rétractation selon que vous vendez ou non dans l'Union européenne, et un
for juridique. La page de confidentialité mentionne désormais Stripe comme
destinataire ; complétez-y les durées entre crochets.

## Mes résultats, pour la dictée

Chaque correction enregistre un essai, rattaché à la dictée quand elle est
enregistrée. L'écran « Mes résultats » regroupe les essais par texte et les
montre dans l'ordre, du plus ancien au plus récent : un carré vert pour un
sans-faute, ambre pour quelques fautes, rouge au-delà de 15 % des mots. Une
ligne indique l'écart avec le premier essai — « 4 fautes de moins qu'au
premier essai » — car c'est cela qu'un enfant et ses parents veulent voir.

Les essais faits avant l'enregistrement d'une dictée, ou sur un texte non
enregistré, sont regroupés par titre : rien n'est perdu.


## Se connecter avec Google

L'inscription par adresse et mot de passe reste inchangée ; Google s'y
ajoute, sans la remplacer.

### Mise en place

Dans la console Google Cloud, créez un projet, puis un identifiant OAuth de
type « Application Web ».

**Le point qui bloque neuf fois sur dix** : la section *Origines JavaScript
autorisées*. Il faut y inscrire l'adresse exacte du site, sans barre oblique
finale ni chemin :

```
https://teaching.mondomaine.ch
```

Sans cela, Google refuse avec « no registered origin » et « Erreur 401 :
invalid_client ». La section *URI de redirection* peut rester vide : le
bouton utilisé ici ne redirige pas, il reçoit un jeton dans la page. Comptez
quelques minutes avant que la modification soit prise en compte.

Reportez ensuite l'identifiant dans `google_client_id` de `api/config.php`,
**sur une seule ligne**. Un retour à la ligne au milieu de la valeur la
rendrait invalide ; le code le supprime désormais, et `api/index.php?a=diagnostic`
signale le cas dans sa section `google`. Il n'y a pas de secret à conserver : cet identifiant est
public et visible dans la page.

Laissez le champ vide et rien ne change : le bouton n'apparaît pas, et
aucune requête ne part vers Google. C'est aussi ce qui se produit si la
bibliothèque de Google est inaccessible — le formulaire par mot de passe
reste alors seul, sans message d'erreur.

### Ce qui se joue à la vérification

Le navigateur reçoit de Google un jeton signé et nous le transmet. Un jeton
accepté sans contrôle permettrait à n'importe qui d'entrer dans n'importe
quel compte en fabriquant le sien. `verifierJetonGoogle()` contrôle donc, en
plus de la signature RS256 faite avec les clés publiques de Google :
l'algorithme déclaré, l'émetteur, le destinataire — le jeton doit viser
*votre* application —, les dates d'émission et d'expiration, et le fait que
l'adresse soit vérifiée par Google.

J'ai éprouvé cette fonction sur onze cas, avec de vraies clés RSA générées
pour l'occasion : jeton authentique, jeton signé par une autre clé, charge
modifiée après signature, algorithme `none`, jeton destiné à une autre
application, émetteur inattendu, jeton expiré, jeton émis dans le futur,
adresse non vérifiée, clé inconnue, jeton tronqué. Seul le premier est
accepté.

Les clés publiques de Google sont mises en cache une demi-journée dans
`data/`. Si Google renouvelle ses clés entre deux, la vérification les
recharge d'elle-même avant d'échouer.

### Comment les comptes se rattachent

Trois cas, vérifiés contre le serveur. Un profil Google déjà connu ouvre
directement son compte. Un profil inconnu dont l'adresse correspond à un
compte existant s'y rattache, sans créer de doublon — c'est sans danger,
puisque Google garantit que l'adresse appartient bien à la personne. Un
profil entièrement nouveau crée un compte, sans mot de passe : la colonne
reste vide et aucune vérification de mot de passe ne peut aboutir dessus.
Son titulaire peut s'en créer un quand il veut par « mot de passe oublié ».


## Le retour au portail

Le bandeau s'ouvre par un lien vers `https://needhelpapp.com/`, séparé du
reste par un trait : c'est une sortie de l'application, pas un déplacement à
l'intérieur. Le pied de page y mène aussi.

Depuis un sous-domaine, l'adresse du portail n'est pas devinable. Sans ce
lien, on y revient par le bouton « précédent » — ou pas du tout. Toute
application branchée sur NeedHelpApp doit donc le porter.

Sur petit écran, il ouvre le panneau déroulant, en tête.

## Le bandeau de navigation

Les liens vers les applications vivent dans un bandeau propre, tout en haut
de l'écran, qui occupe toute la largeur et reste visible au défilement. Son
contenu, lui, s'aligne sur celui de la page.

Les liens sont **centrés** et le compte tenu à droite, au moyen d'une grille
à trois colonnes. Avec une simple mise en ligne, la largeur du nom du compte
aurait décalé les liens : ils auraient paru centrés pour un prénom court et
de travers pour un long.

Le contenu s'affiche sur 1320 px au lieu de 1060, ce qui laisse respirer les
grilles à quatre ou cinq colonnes.

## Un en-tête et un pied identiques partout

Les huit pages portent la même barre du haut — les liens vers les trois
autres applications, puis le menu du compte — et le même pied, qui mène à
tout le reste : abonnement, profil, conditions, confidentialité. Les pages
légales, qui n'avaient ni l'un ni l'autre, les ont désormais aussi : rien
n'est plus déroutant que de se retrouver sur une page d'où l'on ne peut plus
revenir.

Chaque page omet le lien vers elle-même, et la note qui ouvre le pied reste
propre à l'application — la dictée parle de la voix du navigateur, le
vocabulaire de ses listes.

Les feuilles de style sont surveillées elles aussi. Chacune déclare sa
version dans une variable CSS `--css-version`, que le script relit au
chargement. Une feuille restée en arrière produit des mises en page
incompréhensibles — une colonne qui déborde, un bouton qui passe à la ligne —
et c'est la panne la plus difficile à diagnostiquer de loin. Le bandeau la
nomme désormais explicitement, avec les deux versions en présence.

Si le menu du compte n'apparaît pas, ouvrez la console du navigateur : quand
`assets/menu.js` manque, `compte.js` l'écrit explicitement plutôt que de
laisser une barre vide sans explication.

## Tablette et téléphone

Trois seuils, choisis d'après ce que le contenu impose et non d'après des
tailles d'appareils : **860 px**, où deux colonnes ne tiennent plus ;
**620 px**, où les marges et les titres doivent maigrir ; **480 px**, où
chaque mot compte.

Sous 860 px, les liens vers les applications se replient dans un bouton
« Menu ». C'était nécessaire : trois liens plus le compte s'entassaient sur
deux rangées où l'on ne distinguait plus la navigation du compte. Les
onglets des applications, eux, défilent horizontalement au lieu de se
replier sur trois lignes, avec accrochage. Sous 480 px, le mot « Menu »
disparaît au profit du seul pictogramme, et le prénom cède la place à la
pastille.

Un seul panneau s'ouvre à la fois : ouvrir le menu referme le compte, et
réciproquement. Deux panneaux superposés sur un écran de téléphone seraient
illisibles.

Les règles sont vérifiées par un analyseur qui relit les feuilles de style et
demande, pour une largeur donnée, quelle valeur reçoit telle propriété. Onze
contrôles portent sur les points sensibles.

## La barre du haut

Elle est la même sur toutes les pages et vit dans `assets/menu.js`. À gauche
le nom de l'application, à droite les liens vers les autres applications puis
le menu du compte : une pastille avec l'initiale, le prénom, et un tiroir qui
s'ouvre sur *Mon profil et mes données*, *Mon abonnement* et *Se déconnecter*.

Les deux couches de compte — celle de la dictée, historique, et
`assets/compte.js` pour le reste — appellent la même fonction
`MenuCompte.peindre(utilisateur, abonné, serveurDisponible)`. Il n'y a donc
qu'un seul endroit à modifier pour changer ce menu.

## La page de profil

`profil.html` réunit ce qu'un utilisateur cherche quand il pense « mon
compte » : son adresse, sa date d'inscription, son mode de connexion — mot de
passe, Google, ou les deux —, l'état de son abonnement, le décompte de ses
données, et trois actions.

Changer son prénom. Changer son mot de passe : l'ancien est exigé, sauf pour
un compte ouvert avec Google, qui n'en a pas encore et peut donc s'en définir
un. Le changement incrémente `pwd_version`, ce qui déconnecte les autres
appareils — utile en cas de doute.

Exporter toutes ses données, enfin : dictées, listes et résultats dans un
fichier JSON. Cet export reste accessible **sans abonnement**, parce que ces
données appartiennent à la personne qui les a créées, pas au service. C'est
aussi ce qu'exigent la LPD et le RGPD en matière de portabilité.

La suppression du compte est là également, derrière deux confirmations.

## Le vocabulaire

Troisième application, bâtie sur les mêmes principes que les deux autres :
les exercices sont ouverts à tous, garder et partager demandent un compte
abonné.

### Les langues

Quatre pour commencer — français, allemand, anglais, italien —, déclarées
dans la constante `LANGUES` de `api/db.php` et dans son équivalent
JavaScript. En ajouter une ne demande rien d'autre : ni la base ni
l'interface ne mentionnent une langue en particulier.

Chaque liste porte sa langue maternelle et sa langue apprise. Les deux ne
peuvent pas être identiques, et le serveur refuse un code inconnu. Le choix
est retenu d'une visite à l'autre, dans les réglages du compte quand il
existe, dans le navigateur sinon.

### Trois tables

`vocab_lists` porte le nom, le chapitre, les deux langues, et les mêmes
colonnes de partage que les dictées : publication, signalement, reprise,
jeton. `vocab_words` porte **un mot par ligne** — c'est ce qui permettra plus
tard de chercher, de compter, et de suivre la réussite mot par mot, ce qu'un
champ unique interdirait. `vocab_attempts` garde les séries.

Le champ `chapter` est libre et non normalisé : « Chapitre 2 », « Unité 3 »,
« Lektion 4 » selon le manuel de la classe. C'était la demande, et
normaliser aurait exclu la moitié des méthodes.

La note de chaque mot — l'article, le pluriel — est affichée à la correction
mais **jamais demandée** : elle informe sans piéger.

### Les déterminants

En allemand comme en français, le genre s'apprend avec le mot : « die
Mutter », pas « Mutter ». La correction rend donc **trois** verdicts et non
deux — juste, « le mot est bon mais le déterminant manque ou se trompe », et
faux. La distinction compte : l'enfant qui écrit `Mutter` n'a pas commis la
même erreur que celui qui écrit `Vater`, et le lui dire de la même façon
serait injuste autant qu'inutile.

L'exigence se désactive par une case, pour les listes où l'article n'a pas
de sens — des verbes, des adverbes. Écrivez l'article dans la colonne du mot
(« die Mutter »), et réservez la note au pluriel ou à une remarque.

### L'import d'un fichier

CSV et TSV, avec détection automatique du séparateur — tabulation,
point-virgule, virgule, barre verticale —, respect des guillemets, marque
d'ordre des octets d'Excel, et reconnaissance d'une ligne d'en-têtes. Cinq
formats sont éprouvés, dont l'export type d'un Excel suisse.

Les `.xlsx` ne sont pas lus directement : ce format est une archive
compressée, dont la lecture demanderait une bibliothèque chargée depuis
Internet, pour un gain nul — « Enregistrer sous → CSV » prend deux secondes
et fonctionne partout, hors ligne compris. Le message le dit et donne le
chemin exact dans Excel.

### La correction

Tolérante sur ce qui n'est pas le mot : la casse, les espaces, la
ponctuation, et l'article initial que l'on oublie souvent — « die Mutter »
ou « Mutter » sont acceptés indifféremment. Stricte sur le mot lui-même :
`funf` n'est pas `fünf`, `grosse` n'est pas `große`. Une entrée peut porter
plusieurs traductions séparées par `/` ou par une virgule, toutes acceptées.
Quinze cas sont éprouvés.

### Les cartes

Un mode de révision distinct de l'exercice écrit. La carte montre le mot, un
clic la retourne — pivot sur l'axe vertical, deux faces superposées —, puis
l'on se juge : « je savais » écarte la carte, « à revoir » la met de côté.
Le bilan propose de reprendre celles-là seulement, ou de passer à l'exercice
écrit avec elles.

Le clavier fait tout : espace ou entrée retourne, flèche droite pour « je
savais », flèche gauche pour « à revoir ». Une révision se fait vite, et la
souris ralentit.

**Les cartes ne sont pas enregistrées dans « Mes résultats »**, et l'écran le
dit : on s'y note soi-même, et une note qu'on se donne ne mesure rien. Le
suivi reste alimenté par l'exercice écrit, où la réponse est comparée à
l'attendu.

L'animation est supprimée si le système déclare préférer moins de mouvement
(`prefers-reduced-motion`).

### Choisir les mots à travailler

Chaque ligne porte une case. L'exercice et la feuille imprimée ne prennent
que les mots cochés ; le compteur dit lesquels — « 12 mots retenus sur 24.
Seuls ceux-là seront demandés. »

La distinction compte : on saisit une leçon entière une fois, puis on
travaille le tiers du jour. **La liste enregistrée reste entière** : la
sélection ne vaut que pour la séance et n'est pas conservée. Enregistrer une
liste après avoir décoché la moitié de ses mots ne les efface pas.

Les mots venus d'ailleurs — import, collage, liste toute prête, liste
partagée — arrivent cochés : c'est le cas le plus fréquent, et décocher est
plus rapide que tout cocher.

### La feuille imprimable du vocabulaire

Même principe que pour la conjugaison, et même piège : `#feuille` doit rester
**fille directe de `<body>`**. Au-delà de quinze mots, les questions passent
sur deux colonnes — une feuille au lieu de deux. Le corrigé porte les
déterminants et les notes.

### On ne peut plus tomber sur un écran vide

L'onglet « S'entraîner » était accessible sans avoir composé : on arrivait
sur une question sans mot, sans rien pour comprendre. Désormais, s'il y a des
mots à l'écran, la série démarre ; sinon on est renvoyé sur « Composer » avec
la raison écrite. Un écran vide n'explique rien.

### Sans compte

`assets/vocab-listes.js` embarque huit listes toutes prêtes — allemand,
anglais, italien — soit 69 mots. Avec la saisie directe et le collage d'une
liste depuis un manuel, cela suffit pour travailler sans rien créer.


## Les rôles

Quatre situations, portées par une seule colonne `users.role` et par l'état
de l'abonnement :

| | Application | Enregistrer, partager, suivre | Administration |
|---|---|---|---|
| **Visiteur** | oui | non | non |
| **Membre abonné** | oui | oui, tant qu'il paie | non |
| **Modérateur** | oui | oui, sans payer | non |
| **Administrateur** | oui | oui, sans payer | oui |

Le mot « visiteur » recouvre aussi bien celui qui n'a pas de compte que le
membre non abonné : ils ont exactement les mêmes droits, et distinguer les
deux dans le code n'aurait servi à rien.

### Comment cela s'applique

Tout passe par `abonnementActif()`, la fonction déjà utilisée partout pour
décider de l'accès. Elle répond désormais « oui » d'emblée pour un
administrateur ou un modérateur. Il n'y a donc **rien de dupliqué** : les
sept actions qui gardaient déjà l'abonnement gardent les rôles du même coup.

`requireAdmin()` protège les sept actions d'administration, et relit le rôle
**en base** à chaque appel. Masquer un bouton ne protège rien : un abonné
ordinaire qui appelle `admin_depublier` à la main reçoit un refus, ce qui est
vérifié.

### Nommer le premier administrateur

Il n'existe volontairement aucun moyen de se promouvoir depuis
l'application. Le premier administrateur se désigne à la main, une seule
fois, après avoir créé son compte normalement :

```sql
UPDATE users SET role = 'admin' WHERE email = 'vous@exemple.ch';
```

Ensuite, tout se fait depuis `admin.html`.

### Deux garde-fous

Un administrateur ne peut pas se retirer son propre rôle, et le dernier
administrateur ne peut pas être rétrogradé par un autre. Sans cela, une
fausse manœuvre laisserait le site sans personne pour y accéder, et il
faudrait repasser par phpMyAdmin. Les deux cas sont éprouvés.

Chaque changement de rôle et chaque dépublication laissent une trace dans le
journal du serveur, avec l'auteur de l'opération.

### La zone d'administration

Trois vues. **Les comptes** : recherche, filtres — abonnés, paiements en
échec, rôles particuliers —, et le rôle modifiable par une liste déroulante.
**Les contenus publiés** : dictées, listes de verbes, listes de vocabulaire,
triés par nombre de signalements, avec dépublication et effacement d'un
signalement infondé. **La facturation** : les quarante dernières
notifications reçues du prestataire de paiement, utile pour comprendre un
abonnement qui ne s'ouvre pas.

La dépublication retire de la bibliothèque **sans effacer** : le contenu
reste chez son auteur. Retirer d'une vitrine n'est pas confisquer, et une
administration ne devrait pas pouvoir détruire le travail de quelqu'un d'un
clic.


## Les mathématiques

Quatrième application, sur les mêmes principes : exercices ouverts à tous,
garder et partager demandent un compte abonné.

### Trente-trois familles, en six chapitres

Les chapitres suivent les axes du plan d'études romand.

**Calcul mental** (7) : livrets, compléments, tables de division, calculs à
trous, progressions, carrés, doubles.

**Les opérations posées** (4) : addition, soustraction, multiplication,
division — l'ordre de grandeur et les décimales commandent la difficulté.

**Les nombres** (6) : priorités, entiers relatifs, fractions, diviseurs et
multiples, notation scientifique, arrondis.

**Grandeurs et mesures** (6) : changements d'unités, pourcents, durées,
vitesse-distance-temps, échelles, intérêts.

**Fonctions et algèbre** (5) : calcul littéral, proportionnalité, fonctions
affines, produits de binômes, équations du 2e degré.

**L'espace** (5) : aires et périmètres, volumes, Pythagore, angles,
trigonométrie.

Ce qui ne s'y trouve pas est délibéré : les constructions à la règle et au
compas ne se corrigent pas à l'écran. Seule la géométrie qui se calcule est
proposée.

Les nombres sont choisis pour tomber juste — triplets pythagoriciens pour
Pythagore et la trigonométrie, π à 3,14 comme au cours, bases paires pour les
triangles. Une question qui demande un arrondi porte sa tolérance, de sorte
qu'une réponse au centième près ne soit pas comptée fausse.

Le vocabulaire est celui de l'école romandeLe vocabulaire est celui de l'école romande — « livret » plutôt que « table », « sauts » pour les
progressions — pour qu'un élève retrouve ce que dit son enseignant.

Le découpage s'inspire de la progression de GoMaths, qui est le site de
référence dans le canton. **Rien n'en a été copié** : les générateurs sont
écrits ici, et les faits arithmétiques n'appartiennent à personne. Reprendre
leur formulation ou leur structure aurait été une autre affaire.

### Une série est un réglage, pas une liste

C'est la différence avec le vocabulaire, et elle est structurante : une série
enregistrée contient la famille et ses paramètres — « livrets de 6, 7 et 8,
jusqu'à 12 » —, jamais les questions. Celles-ci sont tirées à chaque séance.

Deux conséquences heureuses : refaire une série ne donne jamais deux fois les
mêmes calculs, et une série publiée reste utile indéfiniment. Il n'y a donc
pas de table des questions.

### L'exactitude

`assets/maths.js` ne dépend d'aucune interface et se teste seul. Un banc
d'essai recalcule chaque réponse **indépendamment du générateur**, à partir
du seul énoncé : 700 questions vérifiées sur les sept familles, aucune
fausse. Treize contrôles portent en outre sur le respect des réglages — le
livret demandé apparaît bien, les moitiés tombent juste, les progressions
suivent le saut choisi.

### Les écritures acceptées au cycle 3

Une fraction se compare par sa valeur, dans les deux sens : 6/8 vaut 3/4, et
4/2 vaut 2.

**Trois verdicts, et non deux.** Une fraction exacte mais non réduite compte
juste — ce n'est pas une erreur de calcul —, mais l'élève ne repart pas sans
savoir : « Juste. Mais 6/8 peut encore se simplifier : 3/4. Divise le haut et
le bas par 2. » Le verdict s'affiche dans une couleur intermédiaire, ni
verte ni rouge, et le bilan les regroupe sous « Justes, mais à simplifier ».

Sanctionner aurait été injuste ; se taire n'aurait rien appris. Le signe moins vaut sous toutes ses formes
typographiques. Le pour-cent peut être omis, puisqu'il figure déjà dans la
question. Et « x = 5 » vaut « 5 ».

### La virgule

Tous les calculs décimaux se font sur des entiers, puis on replace la
virgule. Additionner 0,1 et 0,2 en virgule flottante donne
0,30000000000000004 — ce qu'un élève aurait du mal à écrire.

La division avec reste attend « 12 reste 3 », mais accepte aussi « 12 r 3 »
et « 12R3 » : la forme importe moins que le résultat.

### La comparaison des réponses

L'espace pose un conflit réel : il sépare les milliers dans « 1 000 » et les
termes dans « 12 15 ». On tranche d'après la réponse attendue — si elle
comporte plusieurs termes, l'espace sépare ; sinon il ne compte pas. Sont
également acceptés l'apostrophe suisse des milliers, la virgule décimale, et
le signe moins typographique.


## La conjugaison anglaise

L'interface reste en français : ce sont les formes et les noms des temps qui
sont anglais, comme au cours. « Present perfect » ne se traduit pas, et
l'élève doit reconnaître le terme que son enseignant emploie.

### Deux moteurs, une seule interface

`MOTEURS` associe à chaque langue son moteur et sa liste. Le reste de la page
ignore lequel est actif — c'est ce qui a permis d'ajouter l'anglais sans
toucher aux exercices, au bilan ni aux séries enregistrées. Changer de langue
remet tout à zéro : mélanger un verbe anglais avec le subjonctif français
n'aurait aucun sens.

Chaque sélection enregistrée porte sa langue, et la retrouve à l'ouverture.

### Ce qui fait la difficulté de l'anglais

Trois règles orthographiques, et elles seules :

- le **-s** de la troisième personne : *carries*, *goes*, *watches* ;
- le **-ing** : *making*, *running*, *lying*, *dyeing* — et non *dying*, qui
  est un autre verbe ;
- le **-ed** : *carried*, *stopped*, *travelled*, *panicked*.

Le redoublement de la consonne finale dépend de l'accent tonique, que rien
dans l'écriture ne révèle. On applique donc ce qui est sûr — les
monosyllabes —, la règle britannique du **-l** (*travelled*, *cancelled*,
puisque c'est l'anglais enseigné ici), et une liste explicite pour le reste
(*begin*, *prefer*, *admit*…).

Les 149 verbes irréguliers ne se calculent pas : ils sont dans une table, et
les composés s'en déduisent — *misunderstand* de *understand*, *rewrite* de
*write*.

### L'exactitude

Même méthode que pour le français : un banc d'essai recompose chaque forme
**indépendamment du moteur**, à partir des trois formes primitives.
**10 042 formes vérifiées, aucune erreur.** Vingt-deux verbes sont en outre
contrôlés un à un contre une réponse connue, et les 332 verbes de la liste
engendrent 29 548 formes sans anomalie.

### Une différence assumée avec le français

En français, un mot qui ne suit aucune règle est refusé. En anglais,
n'importe quel mot se conjugue comme un régulier : une faute de frappe
passerait donc sans bruit. Elle est signalée — « pasunverbe ne figure pas
dans la liste : il sera conjugué comme un régulier » — sans être interdite,
car un verbe régulier absent de la liste se conjugue tout de même juste.


## La conjugaison italienne

Troisième moteur, même interface. 222 verbes, 17 temps, du *presente* au
*congiuntivo trapassato*.

### Ce qui se calcule, ce qui se sait

Trois conjugaisons — *-are*, *-ere*, *-ire* — plus la variante en *-isc-*
(*finisco*), majoritaire parmi les *-ire*. Le reste se déduit avec économie :
le subjonctif présent naît de la première personne du présent (*io vado* →
*che io vada*), le conditionnel partage le radical du futur, et la plupart des
passés simples irréguliers suivent le schéma 1-3-3 — irréguliers aux
première et troisième personnes, réguliers ailleurs : *presi, prendesti,
prese, prendemmo, prendeste, presero*.

Cette économie a permis de couvrir 76 verbes irréguliers avec des tables
courtes plutôt qu'avec des listes de 102 formes chacune.

### Les pièges traités

**L'orthographe.** *cercare* garde son [k] (*cerchi*, *cercherò*),
*mangiare* perd son i devenu inutile (*mangi*, *mangerò*). Mais attention :
le futur ne suit pas la règle du présent — *mangiare* donne *mangerò* alors
que *studiare* donne *studierò*, car le i s'y prononce. Confondre les deux
est la faute classique.

**Les futurs syncopés.** *vedere* donne *vedrò*, mais *credere* donne
*crederò*. Cela ne se devine pas : la liste est explicite.

**Les infinitifs disparus.** *fare* vient de *facere* : ses personnes
régulières en gardent la trace (*facesti*, *facemmo*). Ma déduction donnait
« fasti » ; les quatre verbes concernés — *fare*, *dire*, *bere*, *tradurre* —
ont donc leur passé simple écrit en toutes lettres.

**L'auxiliaire.** Le choix entre *essere* et *avere* tient au sens, pas à la
forme : la liste est explicite, et le participe s'accorde — *siamo andati*.

**Les verbes défectifs.** *potere* et *dovere* n'ont pas d'impératif : on ne
commande pas à quelqu'un de pouvoir. Le tiret le dit, et l'exercice les
écarte.

### L'exactitude

Même méthode que pour les deux autres langues : 5 664 contrôles où chaque
temps composé est recomposé indépendamment du moteur, 78 formes vérifiées une
à une contre une réponse connue, et les 222 verbes engendrent 18 870 formes
sans anomalie. Aucune erreur.


## La conjugaison allemande

Quatrième moteur, et le plus difficile — quatre difficultés qui se cumulent,
là où l'anglais n'en avait qu'une. 247 verbes, 13 temps.

### Les quatre difficultés, traitées séparément

**Les verbes forts changent de voyelle.** *geben* → *du gibst, er gibt*,
*fahren* → *du fährst*. Une table de 104 verbes donne le radical des
deuxième et troisième personnes, celui du prétérit et le participe.

**Les préfixes.** Séparables, ils partent en fin de proposition — *ich stehe
auf* — et le *ge-* du participe se glisse entre le préfixe et le radical :
*aufgestanden*. Inséparables, rien ne bouge et le participe n'a pas de *ge-*
du tout : *besucht*, *verstanden*. Certains — *über*, *um*, *unter*,
*durch* — sont tantôt l'un tantôt l'autre selon le verbe : une liste tranche,
car deviner produirait des formes fausses une fois sur deux.

**L'auxiliaire.** *stehen* prend *haben*, mais *aufstehen* prend *sein* : on
se lève d'un lieu vers un autre. L'auxiliaire du composé prime donc sur celui
du verbe simple, et la liste est explicite.

**Le Konjunktiv II a deux formes concurrentes.** La forme simple là où elle
s'emploie vraiment — *wäre*, *hätte*, *käme*, *ginge*, une trentaine de
verbes — et *würde* + infinitif partout ailleurs. Pour un verbe faible, la
forme simple se confondrait avec le prétérit : c'est précisément pourquoi
l'allemand recourt à *würde*. Les deux sont acceptées à la correction quand
les deux sont correctes.

### Les pièges d'orthographe

L'insertion du *-e-* après *d*, *t*, *-chn*, *-ffn*, *-gn* — *du arbeitest* —,
la fusion du *s* après une sifflante — *du reist*, *du heißt* —, et la chute
du *e* des verbes en *-eln* : *ich sammle*.

Attention : avec changement de voyelle, le *-e-* de liaison ne s'insère pas.
*du lädst*, et non « du lädest ». C'est une faute que produisent beaucoup de
moteurs, et la mienne l'a produite avant correction.

**L'impératif.** Seuls les verbes en *e → i* changent de voyelle : *gib !*,
*iss !*, *sprich !*. Jamais ceux en *a → ä* : on dit *fahr !*, jamais
« fähr ! ». Autre faute classique, également corrigée.

### L'exactitude

5 891 contrôles où chaque temps composé est recomposé indépendamment du
moteur, 64 formes vérifiées une à une contre une réponse connue, et les 247
verbes engendrent 14 820 formes sans anomalie. Aucune erreur.

Le banc d'essai a révélé, entre autres, trois entrées en double dans ma table
des verbes forts, un présent qui perdait son préfixe inséparable
(« besuchen » donnait « suche »), et un *aufstehen* conjugué avec *haben*.


## Les intitulés : dire ce qu'on fait

« Créer une dictée » pendant qu'on en modifie une déjà écrite laisse croire
qu'on en fabrique une seconde. L'onglet nomme donc l'action en cours, et de
la même façon dans les quatre applications :

| | Rien d'ouvert | La sienne | Reprise de la bibliothèque |
|---|---|---|---|
| Dictée | Créer une dictée | Modifier la dictée | Modifier la dictée |
| Vocabulaire | Créer une liste | Modifier la liste | Modifier la liste |
| Conjugaison | Créer une sélection | Modifier la sélection | Modifier la sélection |
| Mathématiques | Créer une série | Modifier la série | Modifier la série |

Dans la dictée, l'onglet « Créer une dictée » disparaît tant qu'on en
modifie une : on ne fait pas les deux à la fois.

### Adapter plutôt que subir

Un contenu repris dans une bibliothèque n'est plus en lecture seule. On peut
le modifier : la copie personnelle **devient alors la sienne** et cesse
d'être une reprise. L'originale n'est pas touchée — c'est vérifié.

Une limite subsiste, et elle est volontaire : **une adaptation ne peut pas
être republiée**. Adapter le travail d'un autre pour son usage est une chose,
le rediffuser sous son nom en est une autre. La trace de l'auteur d'origine
(`origin_owner`) survit à l'adaptation et sert de garde-fou côté serveur.


## Les avis : deux formes, deux besoins

`assets/avis.js` les fournit à toute l'application.

**Une fenêtre** quand on ne peut pas continuer. Elle nomme le problème,
l'explique, et propose les chemins qui en sortent — trois au plus. Cliquer
sur « S'entraîner » sans avoir de mots ouvre ainsi : *Il n'y a encore rien à
travailler* → « Créer une liste », « Mes listes », « La bibliothèque ». Elle
demande un clic, ce qui est justifié : on était bloqué. Le premier bouton
prend le clavier, Échap ferme.

**Un bandeau** quand une action a réussi. Il s'affiche en bas, bien en vue,
et s'efface seul — plus lentement pour une erreur, qu'on veut avoir le temps
de lire.

C'est un choix que j'assume : demander un clic pour confirmer chaque
enregistrement lasserait vite, puisqu'on enregistre vingt fois par séance.
Le bandeau se remarque autant qu'une fenêtre, mais n'interrompt pas.

Les points contrôlés dans les quatre applications : lancer un exercice sans
contenu, lancer les cartes sans mots, enregistrer sans compte, enregistrer
sans titre, enregistrer sans contenu, et l'issue de chaque enregistrement.


## Le rattachement au portail NeedHelpApp

Depuis que needhelpapp.com existe, l'identité ne vient plus de teaching :
elle vient du portail, et sa session vaut pour tous les sous-domaines.

### Ce que teaching garde, et pourquoi

Sa table `users` **reste**. Ce n'est pas un doublon : dictées, listes,
séries et résultats y sont rattachés par une clé étrangère. Elle devient un
point d'ancrage local, relié au compte central par une nouvelle colonne
`account_id`.

Tout aurait pu être réécrit pour pointer vers `accounts`, mais cela aurait
supposé de modifier onze tables et leurs contraintes, sur des données
existantes, pour un résultat identique. Une colonne suffit.

### Ce qui se passe à la première visite

`api/nha.php` lit le cookie du portail, obtient le compte, puis cherche la
ligne locale dans cet ordre :

1. par `account_id`, si le rattachement a déjà eu lieu ;
2. **par adresse e-mail**, ce qui retrouve les comptes teaching antérieurs au
   portail et les relie sans rien perdre — rôle d'administrateur compris ;
3. à défaut, la ligne est créée.

Rien à faire à la main, et aucun doublon : c'est vérifié, y compris au
second passage.

### L'abonnement

Il vient du portail, jamais des colonnes locales : un abonnement pris depuis
une autre application vaut ici. Les deux vocabulaires diffèrent — le portail
dit `plan` et `status`, teaching raisonnait en `plan_statut` — et la
traduction est éprouvée sur onze cas, dont l'essai, le résilié non échu, et
le paiement en échec.

### Un seul rôle, celui du portail

Le rôle vient de `accounts.role`, jamais de la table locale. Il n'existe pas
d'« administrateur de teaching » : un administrateur l'est pour toutes les
applications.

C'était une contradiction en attente. Nommer quelqu'un administrateur depuis
le portail laissait teaching l'ignorer, et l'inverse était vrai aussi. Deux
vérités concurrentes finissent toujours par diverger.

Changer un rôle depuis l'administration de teaching écrit donc dans le
compte central, avec les mêmes garde-fous qu'avant — on ne se rétrograde pas
soi-même, on ne retire pas le dernier administrateur —, mais comptés
globalement. L'opération est consignée dans `audit_log`.

La liste des comptes lit le rôle, l'abonnement et la vérification d'adresse
directement dans le portail, en une seule requête. Un compte pas encore
rattaché — qui n'a pas revisité teaching depuis la bascule — a son sélecteur
désactivé, avec l'explication.

**Ce qui reste à teaching** : la modération de ses contenus. Dictées et
listes publiées, signalements, dépublication. Ces données vivent ici, et les
traiter suppose de savoir ce qu'est une dictée — le portail n'a pas à
l'apprendre.

### Si le portail est absent

`nhaDisponible()` le vérifie, et teaching retombe sur son propre système de
comptes. C'est utile en développement, et cela évite qu'une copie oubliée
mette le site à terre. Une base centrale injoignable est consignée dans le
journal, pas affichée en page blanche.

### On se connecte depuis l'application qu'on utilise

Personne n'a à quitter teaching pour ouvrir une session. Le formulaire reste
ici ; c'est le serveur qui, derrière, crée le compte **central** et ouvre la
session **du portail**. La connexion vaut donc aussitôt partout, sans avoir
renvoyé l'utilisateur ailleurs.

C'est le rôle même de `includes/nha-core.php`, « déposé à l'identique dans
chaque application » : chacune sait ouvrir la session commune. Teaching
appelle `nha_register()` pour l'inscription, vérifie le mot de passe contre
`accounts.password_hash` pour la connexion, et `nha_login_google()` pour
Google — puis `nha_start_session()` dans les trois cas.

Une adresse déjà connue ne crée jamais de doublon : le message dit où le
compte a été créé — « Cette adresse a déjà un compte, créé via
L'apprentissage scolaire » — et invite à se connecter.

**Deux exceptions**, et elles sont volontaires :

*Le mot de passe oublié* renvoie au portail, qui détient les jetons et les
courriels de réinitialisation. En tenir un second ici ferait deux mécanismes
à garder d'accord.

*L'abonnement* se prend sur le portail, qui facture pour toutes les
applications.

### Une seule source d'identité, dans les deux sens

Le portail sait ouvrir et fermer la session pour tout le domaine. Encore
faut-il que teaching ne fasse rien dans son coin, sans quoi la connexion ne
vaut que dans un sens.

Trois portes étaient restées ouvertes, et chacune produisait le même
symptôme — connecté sur teaching, inconnu sur le portail :

**Le repli sur la session locale.** `currentUser()` interrogeait le portail
puis, à défaut, la session locale. Une session héritée d'avant la bascule
continuait donc de valoir ici seulement. Quand le portail est disponible, il
est désormais la **seule** source : le repli local ne subsiste que pour une
installation sans portail.

**La connexion Google.** J'avais fermé les formulaires de teaching, mais pas
son bouton Google : il ouvrait encore une session purement locale. Il est
maintenant écarté côté serveur et n'est plus affiché, le portail ayant le
sien.

**La déconnexion.** Elle ne vidait que la session de teaching. Elle appelle
maintenant `nha_logout()`, qui ferme la session commune, puis renvoie sur
needhelpapp.com pour que sa page d'accueil le reflète aussi.

### Voir la vraie raison d'un échec

« Service momentanément indisponible » protège l'utilisateur d'un jargon
qui ne le concerne pas, mais empêche celui qui installe le site de savoir ce
qui cloche. Le temps de brancher le portail, mettez dans `api/config.php` :

    'portail_debug' => true,

Le message devient alors, par exemple : *service momentanément indisponible
— SQLSTATE[42000] : commande refusée à l'utilisateur…*, ce qui désigne la
cause en une ligne. **Retirez-le ensuite** : ces messages ne regardent pas
les utilisateurs.

La même raison est de toute façon écrite dans le journal d'erreurs PHP,
préfixée `[teaching]`.

### Quand cela ne marche pas

Ouvrez, **depuis un navigateur où vous êtes déjà connecté sur
needhelpapp.com** :

    https://teaching.needhelpapp.com/api/portail-test.php?cle=…

La clé est celle de `maintenance_token` dans `api/config.php`, la même que
pour `api/migrer.php`. Sans elle, la page reste fermée : elle décrit
l'intérieur du serveur, et il n'y a aucune raison de l'offrir à qui passe.

Il suit la chaîne dans l'ordre où elle peut rompre — transport, cookie,
fichiers copiés, code d'application, base centrale, session, ancrage local,
droits, écritures nécessaires à une connexion, identifiant Google — et s'arrête au premier maillon cassé plutôt que d'enchaîner des
erreurs sans rapport. Chaque échec est accompagné de ce qu'il faut faire.

Deux causes méritent d'être connues d'avance, parce qu'elles ne produisent
aucun message :

**Le droit d'écriture.** Reconnaître un visiteur ne se contente pas de lire :
le socle met à jour la date de dernière visite et rattache l'application. Un
utilisateur MySQL en lecture seule sur `6l3nq9_core` fait donc échouer toute
la connexion, silencieusement.

**Le domaine du cookie.** Dans les outils de développement, le cookie
`nha_session` doit porter le domaine `.needhelpapp.com`, **avec le point
initial**. Sans lui, aucun sous-domaine ne le reçoit. Si le point manque,
déconnectez-vous, videz les cookies du domaine et reconnectez-vous.

### À faire pour que cela fonctionne

1. Copier `includes/nha-core.php` et `config/nha.php` depuis le portail
   (voir `includes/LISEZ-MOI.md`).
2. Ajouter `SetEnv NHA_APP teaching` au `.htaccess` du sous-domaine — sans
   quoi les droits seraient lus pour « portail ». Un exemple complet se
   trouve dans `.htaccess.exemple`.
3. Passer `sql/migration-portail.sql`.
4. Donner à l'utilisateur MySQL de teaching les droits sur `6l3nq9_core`.
5. Déclarer `https://teaching.needhelpapp.com` dans les origines autorisées
   de la console Google Cloud.
