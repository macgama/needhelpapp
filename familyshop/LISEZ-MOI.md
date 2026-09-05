# FamilyShop — menus de la semaine et liste de courses partagée

Sous-domaine `familyshop.needhelpapp.com`. Quatrième application
NeedHelpApp, après le portail et l'apprentissage scolaire.

## L'idée, et pourquoi elle tient

Les applications existantes font bien l'une des deux moitiés :

- **Bring!** excelle au partage — temps réel, tri par rayon, invitation
  en un lien — mais n'a pas de planification de menus.
- **Jow** part des recettes et engendre la liste, mais son partage est
  reconnu comme le point faible.

FamilyShop fait les deux : on choisit les plats de la semaine, la liste
se compose toute seule, et elle est commune au foyer.

## Ce qui est fait

### La base — `sql/schema.sql`

Huit tables. Le **foyer** est l'unité de partage : recettes, menu et
liste lui appartiennent, pas à la personne. Un conjoint qui coche un
article au magasin doit le faire disparaître chez l'autre — c'est la
raison d'être de l'application.

`households.version` est un compteur incrémenté à chaque écriture. Les
navigateurs ouverts le demandent toutes les quelques secondes et
rechargent s'il a bougé. C'est une synchronisation modeste, mais elle
tient sur un hébergement mutualisé, là où des WebSockets ne tiendraient
pas.

### Le catalogue — `assets/ingredients.js`

190 produits, 12 rayons dans l'ordre d'un supermarché romand. Il sert à
deviner le rayon d'un produit saisi librement : « filet de poulet » va à
la boucherie, « gruyère râpé » à la crémerie.

C'est ce qui permet une liste triée par rayon — la fonction qui fait la
valeur de Bring!. Une liste triée se fait en un passage ; une liste dans
l'ordre où l'on a pensé aux choses fait trois fois l'aller-retour entre
les légumes et la crémerie.

Chaque produit porte aussi son unité usuelle : « 2 oignons » plutôt que
« 200 g d'oignons ».

### La consolidation — `assets/consolider.js`

Le cœur, et la seule vraie difficulté. Trois recettes demandent
« 2 oignons », « 200 g d'oignons » et « 1 oignon ». La liste porte une
seule ligne :

    oignon : 3 pièce + 200 g   (pour Lasagnes, Curry, Soupe)

**On additionne ce qui se convertit** — les masses entre elles, les
volumes entre eux — **et l'on juxtapose le reste**. « 3 pièces + 200 g »
est honnête ; « 203 » serait faux et ferait acheter n'importe quoi.

Le résultat se présente dans l'unité la plus lisible : 1800 g deviennent
1,8 kg, 800 ml deviennent 8 dl.

La mise à l'échelle suit les couverts, sauf pour ce qui n'a pas de
quantité : on n'a pas besoin de quatre fois plus de sel.

25 cas éprouvés, aucun écart.

### L'API — `api/`

`nha.php` est le pont vers le portail, repris de teaching où il a fait ses
preuves. `db.php` porte la connexion et le foyer. `lectures.php` porte les
lectures et la régénération. `index.php` expose les actions.

**Le foyer se crée tout seul.** Personne ne doit « ouvrir un foyer » avant
d'écrire sa première liste : on lui en donne un, qu'il pourra renommer et
partager. Le code d'invitation évite O, 0, I et 1 : un code se dicte au
téléphone.

**Rejoindre un foyer fait quitter le sien.** Appartenir à deux foyers
doublerait les listes sans que personne comprenne pourquoi. Un foyer que
plus personne n'habite est supprimé.

**Un seul appel, `?a=tout`**, rapporte foyer, membres, recettes, menu,
liste et habitudes. Sur un téléphone en 3G au magasin, un aller-retour
plutôt que six se remarque.

**La synchronisation** passe par `?a=version`, qui ne lit qu'une ligne.
Les navigateurs ouverts la comparent à la leur toutes les quelques
secondes. `toucher()` incrémente le compteur après chaque écriture :
l'oublier laisserait l'autre membre devant une liste périmée sans qu'il
le sache.

### La régénération, et ses trois précautions

Chacune répond à un agacement réel :

1. **Les articles ajoutés à la main ne sont jamais touchés.** Effacer la
   liste libre en recalculant le menu est le défaut classique du genre.
2. **Ce qui était coché le reste**, s'il revient. On ne recoche pas vingt
   articles parce que quelqu'un a changé le repas de jeudi.
3. **Seuls les repas à venir comptent.** La liste sert aux courses, pas
   aux repas déjà mangés.

Le tri suit l'ordre du magasin, pas l'alphabet, et ce qui reste à prendre
passe avant ce qui est coché.

### Éprouvé de bout en bout

Un foyer, deux membres, deux recettes, trois repas dont un pour six
couverts et un pour deux. La liste obtenue :

    LÉGUMES     oignon 3 pièce · oignon 300 g
    BOUCHERIE   poulet 900 g · viande hachée 750 g
    CRÉMERIE    lait 7,5 dl
    ÉPICERIE    curry 3 cc · farine 75 g · lait de coco 1,5 boîte ·
                riz 450 g · sel — · tomate pelée 3 boîte

900 g de poulet pour six couverts au lieu de quatre, 750 g de viande pour
deux services de lasagnes dont un réduit. Article libre conservé après
recalcul, articles cochés toujours cochés.

### Les quatre écrans — `index.html`, `assets/familyshop.js`

Une page, quatre écrans, et un principe : **l'état vient du serveur,
jamais de l'écran**. Chaque écriture renvoie l'état à jour, et l'on
repeint. C'est un peu plus de données sur le réseau, mais cela supprime
toute une famille de bogues où l'affichage et la base se contredisent.

**La liste.** Rangée par rayon dans l'ordre du magasin, ce qui reste à
prendre avant ce qui est coché. On coche en touchant la ligne — la case
se remplit **avant** la réponse du serveur, car au magasin une case qui
met une seconde à réagir donne l'impression que l'application n'a pas
entendu ; on rétablit si l'appel échoue. L'ajout rapide propose l'unité
usuelle et complète le nom pendant la frappe. « Souvent chez vous »
rappelle ce que le foyer achète le plus.

**La semaine.** Sept jours, midi et soir. On pose un plat, ses
ingrédients rejoignent la liste. Chaque repas porte son nombre de
couverts : le même plat pour six ne demande pas les mêmes quantités.
On peut aussi écrire « restaurant » ou « chez mamie » — un repas sans
recette ne remplit rien, ce qui est exactement ce qu'on veut.

**Les recettes.** Le rayon et l'unité se devinent **pendant** la frappe :
les proposer après coup obligerait à revenir sur chaque ligne.

**Le foyer.** Le code d'invitation, les membres, et le moyen d'en
rejoindre un autre — avec un avertissement, car on quitte le sien.

### Un seul chemin vers le serveur

Tous les appels passent par `Compte.appel()`, la couche déjà écrite pour
teaching. Elle tient le jeton anti-rejeu à jour et rejoue la requête quand
la session vient d'être renouvelée.

La première version refaisait ce travail à côté, avec `fetch`, et appelait
un `Compte.csrf()` qui n'existe pas : tout enregistrement échouait. Deux
implémentations d'une même chose finissent toujours par diverger — ici, dès
la première écriture.

Un contrôle vérifie désormais que **chaque fonction appelée sur une couche
partagée existe vraiment**. C'est une faute qu'un contrôle d'identifiants ne
voit pas : le nom du module est bon, la fonction ne l'est pas.

### La synchronisation

`?a=version` ne lit qu'une ligne. Les navigateurs la comparent à la leur
toutes les cinq secondes et ne rechargent que si elle a bougé : un foyer
inactif ne coûte presque rien. Le sondage s'arrête quand l'onglet passe
en arrière-plan — un téléphone dans une poche n'a aucune raison
d'interroger le serveur — et rattrape aussitôt au retour.

## L'installation

1. Créer le sous-domaine `familyshop.needhelpapp.com` et la base
   `6l3nq9_familyshop`.
2. Exécuter `sql/schema.sql` sur cette base.
3. Exécuter `sql/application.sql` sur `6l3nq9_core`.
4. Copier `includes/nha-core.php` et `config/nha.php` depuis le portail.
5. Renommer `.htaccess.exemple` en `.htaccess` — il porte
   `SetEnv NHA_APP familyshop`.
6. Copier `api/config.example.php` en `api/config.php` et le remplir.
7. Donner à l'utilisateur MySQL les droits sur sa base **et** sur
   `6l3nq9_core`.

## Les trente recettes de départ — `assets/recettes-depart.js`

Un foyer neuf n'a rien à se mettre sous la dent : composer sa semaine
suppose d'avoir déjà saisi des recettes, et saisir des recettes sans voir
à quoi cela sert décourage. Un bouton propose donc trente plats de tous
les jours — gratin, lasagnes, curry, papet vaudois, rösti, crêpes.

Ils **deviennent les recettes du foyer** : modifiables, supprimables. Un
catalogue en lecture seule aurait obligé à distinguer deux sortes de
recettes partout dans le code, pour un bénéfice nul.

Un second import ne double rien : les noms déjà présents sont sautés.

### Pourquoi elles sont écrites ici

La jurisprudence est constante : une recette, en tant que méthode et liste
d'ingrédients, n'est pas une œuvre de l'esprit et ne relève pas du droit
d'auteur. Mais **sa rédaction l'est** — les notes d'introduction, la
formulation des instructions — et un recueil est protégé en tant que
collection, même quand chaque recette prise isolément est libre.

Reprendre les textes d'un site ou d'un livre de cuisine aurait donc été
une copie. Ces trente-là sont écrites dans nos mots, avec les tours de
main qui font la différence : laisser les oignons blondir vingt-cinq
minutes pour la soupe, ne jamais faire bouillir les saucisses du papet,
assaisonner les lentilles tièdes.

210 ingrédients, tous reconnus par le catalogue : aucun ne tombe au rayon
« divers ».

### Un détail que le magasin impose

La mise à l'échelle produit des « 1,75 citron » dès qu'un repas change de
nombre de couverts. On n'achète pas trois quarts de citron : ce qui se
compte à l'unité — pièce, gousse, tranche, botte, boîte — est **arrondi
vers le haut**. Mieux vaut un citron de trop que la recette ratée. Les
masses et les volumes gardent leurs décimales, eux.

## L'identité

Le compte est celui du portail, mais **le formulaire reste ici** :
personne n'a à quitter l'application qu'il utilise pour se connecter.
`register`, `login` et `google` appellent le socle du portail, qui crée le
compte central et ouvre la session commune. La connexion vaut donc aussitôt
sur needhelpapp.com et sur les autres applications.

**La déconnexion ferme la session partout.** Elle appelle `nha_logout()`,
qui efface la session commune à tout le domaine, puis renvoie vers le
portail. Ne vider que la session locale laissait connecté ailleurs — et
donc reconnecté ici au premier rechargement, ce qui donne l'impression
que rien ne marche.

**Le mot de passe oublié mène au portail**, avec l'adresse déjà remplie.
Lui seul détient les jetons et les courriels de réinitialisation ; en tenir
un second ici ferait deux mécanismes à garder d'accord.

### Ce qui manquait, et pourquoi c'était invisible

Ces cinq actions n'existaient pas côté serveur. Le navigateur les
appelait, le serveur répondait « action inconnue », et l'erreur était
avalée sans rien afficher : on paraissait déconnecté de familyshop tout en
restant connecté ailleurs.

Un contrôle vérifie désormais que **chaque action appelée par un script
existe dans l'API**, pour familyshop comme pour teaching. Vingt-et-une
demandées ici, soixante-six là, toutes présentes.

Un second défaut tenait à une seule ligne : « Mot de passe oublié » est un
**bouton**, et lui poser un `href` ne fait rien du tout. Il n'a jamais mené
nulle part, ni ici ni dans teaching.

## L'impression

Une liste de courses se tient d'une main dans un magasin. La feuille est
donc en deux colonnes, avec de grandes cases à cocher au stylo, et rien
d'autre : pas d'en-tête décoratif, pas de logo. Chaque centimètre pris est
une ligne de moins.

Les articles déjà pris y figurent, barrés : un conjoint parti avec la
feuille doit voir ce que l'autre a rapporté.

`#feuille` est **fille directe de `<body>»** — la règle d'impression masque
tous les enfants de `body` sauf elle, et l'imbriquer donnerait une page
blanche. C'est une erreur que nous avons déjà commise sur teaching.

## Le nombre à table

Le nombre de couverts change plus souvent que le plat : garde alternée,
invités, quelqu'un qui rentre tard. Un réglage « − 4 couverts + » figure
donc sous chaque repas posé, et recompose la liste aussitôt. Ouvrir une
fenêtre pour cela aurait découragé de le faire — et une quantité fausse
vaut moins qu'une quantité qu'on n'ajuste plus.

Chaque repas garde son nombre propre : le même plat servi deux fois dans
la semaine ne demande pas les mêmes quantités.

## L'import depuis une adresse web

### Ce qu'on rapporte, et ce qu'on laisse

**On rapporte** le nom, le nombre de couverts, la durée et les
ingrédients avec leurs quantités. Ce sont des faits, que le droit d'auteur
ne protège pas.

**On ne rapporte pas les instructions.** Leur rédaction appartient à son
auteur, et la recopier dans notre base serait une reproduction. On garde
l'adresse, ajoutée aux notes — ce qui est d'ailleurs plus honnête envers
le site que de le recopier en silence.

La fenêtre le dit avant l'import, pour que personne ne s'attende à
retrouver la préparation.

### Comment cela marche

La quasi-totalité des sites de cuisine publient un bloc `JSON-LD` au
format `schema.org/Recipe`, parce que les moteurs de recherche le
demandent. C'est autrement plus fiable que de lire la mise en page, qui
change tous les six mois.

L'analyse des ingrédients est faite pour le français : « 3 cuillères à
soupe d'huile d'olive » devient `3 · cs · huile d'olive`, « 1 ½ litre de
lait » devient `1,5 · l · lait`, et « 4 à 6 tomates » retient 6 — mieux
vaut en avoir trop. Vingt formulations éprouvées, toutes justes.

**Rien n'est enregistré sans relecture** : l'éditeur s'ouvre pré-rempli,
avec un avertissement que la lecture automatique se trompe parfois.

### La sécurité

Un serveur qui va chercher l'adresse qu'on lui donne peut être retourné
contre le réseau interne de l'hébergeur. On n'accepte donc que `http` et
`https`, on refuse les adresses privées — y compris après redirection —,
et l'on borne la durée à douze secondes et la taille à deux mégaoctets.
Six adresses dangereuses éprouvées, toutes refusées.

## Ce qui reste à faire

- Une application installable sur l'écran d'accueil du téléphone.
- L'historique : ce qu'on a mangé le mois dernier, pour s'en inspirer.
