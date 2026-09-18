# Machines

Une collection de petites machines à jouer. Trois fichiers statiques par jeu,
aucune dépendance, aucune étape de build : ouvrez `index.html` dans un
navigateur, ou servez le dossier tel quel.

```
index.html              le hall : la vitrine des machines
css/arcade.css          le socle : palette, typographie, châssis, commandes
css/accueil.css         le hall
js/arcade.js            le socle : son, records, préférences
js/accueil.js           le hall
assets/favicon.svg      l'icône
assets/fonts/           les trois polices, déposées à la main
jeux/chute/             une machine
jeux/stack/             une machine
jeux/mot/               une machine
jeux/rebond/            une machine
jeux/tri/               une machine
jeux/anagrammes/        une machine
jeux/sillage/           une machine
jeux/echo/              une machine
jeux/fonderie/          une machine
jeux/quitte/            une machine
jeux/ricochet/          une machine
jeux/intrus/            une machine
jeux/cadence/           une machine
jeux/fonte/             une machine
```

Chaque jeu charge `css/arcade.css` puis sa propre feuille, qui redéfinit
`--signal` (son accent), `--signal-deep` et `--panel-w` (la largeur de son
plateau). Même chose côté script : `js/arcade.js` d'abord, le jeu ensuite.

## En ligne

La collection est la sixième application de NeedHelpApp. Elle est déclarée
dans le catalogue du portail (`needhelpapp/sql/applications.sql`, code
`machines`), apparaît sur la page d'accueil, et se dépose par
`.github/workflows/deploiement.yml` comme les autres — variable
`CHEMIN_MACHINES`, dossier source `minigames/`.

Elle reste pourtant à part, et c'est délibéré : **aucun compte, aucune base,
aucun réseau**. Le portail sait qu'elle existe ; elle ne sait rien du
portail, sinon un lien de retour dans le pied du hall. Rien à brancher, rien
à synchroniser, rien qui puisse tomber en panne à deux.

Son statut reste `construction` dans le catalogue tant que
`machines.needhelpapp.com` ne répond pas : une carte « en ligne » qui mène à
une erreur 404 est pire qu'une carte « en construction ».

### Les polices

Les quinze pages chargeaient Archivo, Bungee et IBM Plex Mono depuis
fonts.googleapis.com. Elles ne le font plus : cela transmet l'adresse IP de
chaque visiteur à Google, ce qui demande un consentement préalable sous nLPD
et RGPD — et le portail s'interdit déjà cette dépendance noir sur blanc.

Les fichiers se déposent une fois, à la main, dans `assets/fonts/` : le
déploiement écarte ce dossier. **Tant qu'ils n'y sont pas, tout reste
jouable** — chaque `font-family` porte une pile de repli et `font-display:
swap` laisse le texte s'afficher tout de suite. Seule l'allure change, et
surtout celle des titres : Bungee est une police d'affichage, son repli est
une linéale ordinaire. Voir `assets/fonts/LISEZ-MOI.txt`.

## Les machines

### Chute · accent orange

Grille 5 × 7. On vise une colonne, on lâche une tuile, elle tombe. Toute tuile
de même valeur qu'elle touche fusionne en une tuile doublée, la gravité tasse la
colonne, et les cascades s'enchaînent.

- Points d'une fusion : `valeur obtenue × (taille du groupe − 1) × combo`.
  Fusionner trois tuiles d'un coup rapporte plus que deux paires.
- **La montée** : tous les `max(8, 14 − palier)` coups, une rangée entière
  pousse par le bas et tout remonte d'un cran. C'est l'horloge de la partie. La
  jauge annonce le compte à rebours et vire à l'orange deux coups avant.
- La pioche est une **fenêtre glissante** : le plafond suit votre plus haute
  tuile (jusqu'à 64) et le plancher finit par retirer les petites valeurs, qui
  sinon encombreraient le plateau jusqu'à la fin.
- Fin de partie quand les cinq colonnes touchent le haut, ou quand une montée
  écrase une colonne déjà au plafond.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Viser | `←` `→`, `A` / `D` | glisser sur la grille |
| Lâcher | `Espace`, `↓`, `Entrée` | relâcher sur la colonne |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Stack · accent cyan

Une barre glisse au-dessus de la tour. Un appui la pose : ce qui dépasse du bloc
d'en dessous est coupé et tombe, et la barre repart de la largeur restante.

- Poser **pile-poil** (à 3,5 px près) ne coûte aucune largeur. À partir de la
  troisième pose parfaite d'affilée, la barre **regagne** 6 px par pose, sans
  jamais dépasser sa largeur de départ.
- La barre accélère avec l'altitude : `min(470, 130 + hauteur × 7)` px/s.
- Le ciel s'assombrit et les étoiles apparaissent à mesure que la tour monte.
- Fin de partie quand il ne reste plus rien à poser.
- Le record est la **hauteur**, pas un score : c'est ce que le jeu mesure.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Poser | `Espace`, `↓`, `Entrée` | toucher la tour, ou « Poser » |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Le Mot du Jour · accent vert

Un mot français de cinq lettres, six essais. Le même pour tout le monde, un seul
par jour : le mot se déduit de la date, sans serveur ni synchronisation.

- **Les accents ne comptent pas.** Tout est normalisé en majuscules sans
  diacritiques, à la saisie comme dans les listes : on tape `E` pour `É`.
- Les lettres en double sont jugées en **deux passes** : les bien placées
  d'abord, les autres piochent dans ce qu'il reste. Sans ça, `ELLES` contre un
  mot à un seul `E` afficherait deux `E` présents.
- La partie du jour, les statistiques et les réglages survivent au rechargement.
  La grille se partage en carrés emoji, par le presse-papiers ou, s'il est
  refusé, dans une zone de texte à copier.
- Le record de cette machine est la **meilleure série de jours consécutifs**.
- Clavier **AZERTY** à l'écran, et le clavier physique marche aussi.
- Un bouton **Contraste** remplace le couple vert / ambre par bleu / orange,
  lisible pour les daltonismes rouge-vert. L'état « présent » porte en plus un
  losange, pour que la couleur ne soit jamais seule à porter l'information.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Écrire | les lettres | clavier à l'écran |
| Valider | `Entrée` | touche « Entrée » |
| Effacer | `Retour arrière` | touche « ⌫ » |
| Couper le son | `M` | bouton « Son » |

#### Les listes de mots

`jeux/mot/mots.js` contient deux listes, en majuscules sans accent, concaténées
sans séparateur pour tenir en peu de place :

- **581 solutions**, soit 1,6 an de mots quotidiens, choisies à la main depuis un
  vivier classé par fréquence : uniquement des noms, adjectifs et infinitifs
  courants. Ni formes conjuguées, ni mots-outils, ni noms propres, ni
  vulgarités. L'ordre est mélangé pour qu'un jour ne trahisse pas le suivant.
- **6 721 formes acceptées** en proposition, formes conjuguées comprises, pour
  qu'un mot français valide ne soit jamais refusé.

Sources : [hbenbel/French-Dictionary](https://github.com/hbenbel/French-Dictionary)
et [Taknok/French-Wordlist](https://github.com/Taknok/French-Wordlist) pour les
formes, [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
(OpenSubtitles 2018) pour le classement par fréquence.

### Rebond · accent magenta

Une chute libre dans un puits. La bille tombe seule et rebondit sur les parois ;
le seul pouvoir du joueur est d'inverser son sens horizontal. Il faut être en
face du trou au moment d'atteindre la barre.

- Le réglage qui décide de tout est la **vitesse latérale**. À 1,55 fois la
  vitesse de chute, la bille traversait tout le puits entre deux barres : le
  joueur ne pouvait que subir les rebonds. À **0,62 fois**, elle parcourt six
  dixièmes de l'écart entre deux barres, de quoi viser sans pouvoir flâner.
- Les trous se décalent d'au plus **0,45 fois l'écart** d'une barre à l'autre,
  soit moins que le déplacement possible dans l'intervalle : aucun passage
  n'est impossible, et il reste de la marge pour se raviser. La première barre
  est toujours en face du départ.
- La difficulté ne vient donc jamais d'un tirage injouable, mais du trou qui
  rétrécit (118 px → 54) et du temps de réaction qui fond (la chute passe de
  190 à 430 px/s).
- Le record est la **profondeur en mètres**, un mètre valant dix pixels.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Inverser le sens | `Espace`, `Entrée`, `←` `→` | toucher le puits, ou « Inverser » |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

La partie ne démarre qu'au premier appui : on a le temps de lire le puits avant
de tomber.

### Tri · habillage en os

Des billes de couleur réparties dans des tubes. On verse la série du dessus d'un
tube vers un autre, si celui-ci est vide ou montre la même couleur. Gagné quand
chaque tube est vide, ou plein d'une seule couleur.

- **Chaque niveau est vérifié solvable avant d'être servi.** Le tirage est
  entièrement aléatoire, puis un parcours en profondeur avec mémoire des
  positions déjà vues confirme qu'une solution existe ; sinon on retire. Le
  joueur ne peut jamais s'acharner sur un mélange impossible.
- La première tentative mélangeait *à l'envers* depuis l'état résolu, ce qui
  garantit la solvabilité sans solveur. Mesuré, c'était nettement moins bon :
  un tube était déjà pur au départ une fois sur deux (0,52 contre 0,01) et les
  solutions étaient 40 % plus courtes (13 coups contre 22, à sept couleurs).
  Le tirage plein filtré par le solveur a remplacé cette approche.
- Le solveur coûte **204 nœuds au pire sur 2 400 tirages**, soit 2 ms : assez
  peu pour tourner à chaque génération de niveau.
- Deux paliers : jusqu'au niveau 12, le nombre de couleurs monte de 3 à 7 avec
  **deux tubes libres** ; à partir du niveau 13, il n'y en a plus qu'**un** et le
  nombre de couleurs repart de 5. Un tirage à un seul tube libre n'est solvable
  qu'une fois sur onze environ — d'où l'insistance de la boucle de génération,
  qui desserre d'un tube en dernier recours.
- **Annuler** est illimité : une erreur ne doit pas coûter le niveau entier.
- Chaque couleur porte un **glyphe** (● ▲ ■ ◆ ★ ✚ ⬢) : la teinte n'est jamais le
  seul moyen de distinguer deux billes. Et cette machine n'a pas de couleur
  d'accent à elle — son habillage est en os, pour que les seules couleurs
  saturées de l'écran soient celles qu'on doit ranger.
- Le record est le **niveau le plus haut rangé**.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Prendre / verser | `Entrée` sur un tube | toucher un tube, puis un autre |
| Annuler | — | bouton « Annuler » |
| Recommencer le niveau | — | bouton « Recommencer » |
| Couper le son | `M` | bouton « Son » |

### Anagrammes · accent violet

Sept lettres tirées d'un mot, quatre-vingt-dix secondes, le plus de mots
français possible. Chaque lettre du tirage ne sert qu'une fois par mot.

- Points : 3 lettres → 1, 4 → 2, 5 → 4, 6 → 7, 7 → 12. La courbe est
  volontairement raide : chercher un mot long paie plus que de ratisser les
  petits.
- Le tirage vient toujours d'un **vrai mot de sept lettres**, ce qui garantit
  un tirage riche — et donne au joueur quelque chose à viser.
- **Les solutions sont précalculées, grille par grille.** Le jeu n'embarque
  aucun dictionnaire complet : valider un mot revient à interroger un ensemble
  de quelques dizaines d'entrées. C'est ce qui ramène les données à 46 Ko au
  lieu des centaines de kilo-octets qu'aurait coûté un dictionnaire de 3 à 7
  lettres.
- Le record est le **meilleur score**.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Composer | les lettres | toucher les jetons |
| Valider | `Entrée` | bouton « Valider » |
| Effacer | `Retour arrière` | bouton « ⌫ » |
| Vider la ligne | `Échap` | — |
| Mélanger le tirage | `Espace` | bouton « ⇄ » |

#### Les grilles

`jeux/anagrammes/grilles.js` contient 230 tirages. Chaque ligne est une grille :
le premier mot est celui de sept lettres, les suivants sont tous les mots de
trois à sept lettres qu'on peut en tirer, du plus long au plus court.

- Vivier de 5 990 formes françaises retenues par fréquence, **plus sévèrement
  sur les mots courts** : les mots de trois lettres sont les plus bruités dans
  les sources (`BEU`, `KOI`, `ZEB`), donc seuls les 150 plus fréquents sont
  gardés, relus un à un pour en retirer prénoms, anglicismes et vulgarités.
- Deux mots de base anagrammes l'un de l'autre donneraient le même tirage :
  `SERPENT` et `PRESENT`, `TRAINER` et `TERRAIN`… 25 doublons ont été retirés.
- Score maximal médian d'une grille : 107 points, pour 34 mots trouvables.

Sources : mêmes que Le Mot du Jour.

### Sillage · accent or

On part de son territoire, on trace un sillage dans le vide, on revient : ce
qu'on referme devient à soi. Des rôdeurs patrouillent le vide ; s'ils touchent
le sillage avant le retour, une vie est perdue.

- **La règle de remplissage tient en une phrase :** après un retour, toute
  région du vide où ne se trouve aucun rôdeur est conquise. C'est elle qui rend
  les grandes boucles payantes, et qui interdit d'enfermer un rôdeur pour rien.
  Elle est vérifiée par un test sur des terrains construits à la main : rôdeur
  à droite, à gauche, un de chaque côté, et un rôdeur pile sur le sillage.
- Une prise d'au moins 60 cases en une seule boucle **vaut double** : c'est le
  pari du jeu, sortir loin plutôt que grignoter.
- Le premier niveau ne compte **qu'un seul rôdeur** : il doit enseigner la
  règle, pas la faire subir. Ensuite, un rôdeur de plus tous les deux niveaux
  jusqu'à cinq, et tout le monde accélère.
- Objectif : 70 % du terrain. Trois vies pour la partie entière ; mourir efface
  le sillage en cours mais garde le territoire.
- Quand une zone refermée contient un rôdeur, **le jeu le dit**. Sans ce
  message, ne rien gagner passe pour une panne.
- Le record est le **meilleur score**.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Diriger | flèches, `ZQSD` | glisser sur le terrain, ou la croix |
| Démarrer | `Espace` | toucher le terrain |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

Le demi-tour est interdit tant qu'on est dehors : on se couperait son propre
sillage.

### Écho · accent bleu

La machine joue une suite de touches et de notes. Il faut la rejouer **à
l'envers**.

- C'est toute la différence avec un Simon : à l'endroit, on peut répondre au
  fur et à mesure et la mémoire n'est jamais sollicitée d'un bloc. À l'envers,
  il faut avoir retenu la suite entière avant de poser le premier doigt.
- Chaque réussite ajoute une touche **à la fin** de la suite montrée, donc au
  **début** de la réponse. La difficulté monte là où la mémoire est la plus
  fraîche, ce qui rend la progression plus douce qu'il n'y paraît.
- Les neuf touches vont du grave, en bas à gauche, à l'aigu, en haut à droite.
  La hauteur se lit surtout à la clarté ; la teinte ne bouge que de 24 degrés
  (229° → 204°), pour que les neuf touches restent visiblement le même
  instrument. Les notes suivent une **pentatonique majeure** : n'importe quelle
  suite sonne juste.
- La cadence se resserre avec la longueur, de 640 ms à 300 ms par touche.
- Une erreur coûte une vie et **la même suite est rejouée** : on n'est jamais
  renvoyé au début pour un doigt qui a glissé. Trois vies.
- Une suite complète est rejouée à l'endroit, vite, en récompense — c'est
  l'écho qui revient.
- Le record est la **plus longue suite rejouée à l'envers**.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Jouer une touche | pavé numérique `1`-`9` | toucher la case |
| Commencer | `Espace` | toucher l'écran |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Fonderie · habillage en acier

Le client commande un alliage de **quatre doses** tirées d'un jeu de métaux. On
coule un essai, le laboratoire rend son rapport : combien de doses sont du bon
métal **à la bonne place**, combien sont du bon métal **mal placé**. On
recommence jusqu'à trouver la recette, ou jusqu'à épuiser les huit essais.

- C'est un Mastermind, et le décor n'est pas un habillage : **un rapport
  d'essai est littéralement ce retour-là**, quand des pions colorés n'en sont
  qu'une convention.
- Le cœur du jeu est le calcul du rapport, et c'est là que le genre se casse :
  sur les doses en double. Il se fait en **deux passes** — les doses à leur
  place d'abord, les autres piochent dans ce qui reste. Sans ça, un essai à
  deux doses de cuivre contre une cible qui n'en a qu'une en compterait deux.
- Points d'une commande : `(9 − essais utilisés) × 10`. Trouver en quatre
  essais vaut 50, en huit vaut 10.
- Le vivier s'élargit : cinq métaux à la première commande, six à la deuxième,
  sept ensuite. Manquer une commande termine la série.
- Chaque métal porte un **glyphe** (▲ ● ■ ◆ ★ ✚ ⬢) et un nom : la teinte n'est
  jamais le seul moyen de distinguer deux doses.
- Comme Tri, cette machine n'a **pas de couleur à elle** — Tri prend le registre
  chaud (os), Fonderie le registre froid (acier) — pour que les seules teintes
  franches de l'écran soient celles des métaux qu'on doit deviner.
- Le record est le **meilleur score** d'une série.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Ajouter une dose | `1` à `7` | toucher un métal |
| Retirer une dose | `Retour arrière` | toucher la dose dans le creuset |
| Couler l'essai | `Entrée` | bouton « Couler l'essai » |
| Recommencer | `R` | bouton « Nouvelle série » |
| Couper le son | `M` | bouton « Son » |

### Quitte · accent rouge braise

Cinq descentes. À chaque palier on tire une carte du puits : un **filon**
grossit la sacoche, un **grondement** arme son danger. Le **deuxième**
grondement d'un même danger fait s'effondrer la galerie — et met fin à la
**série entière**. Remonter met la sacoche à l'abri et ouvre la descente
suivante.

Le paquet compte 15 filons (de 1 à 17) et 4 dangers en 3 exemplaires. Le risque
affiché est **exact** : c'est le nombre de cartes mortelles restantes divisé par
le nombre de cartes restantes, et le tableau de bord montre les deux.

#### Le réglage vient d'une simulation faite avant l'interface

Deux versions ont été écrites, mesurées et **jetées** :

| Version | Ce que rapporte la lecture du puits |
| --- | --- |
| Effondrement = sacoche perdue, cinq descentes indépendantes | **+3 %** sur une règle aveugle |
| Idem, mais paquet persistant sur la série | **+6 %**, et *en retrait* au 99ᵉ centile |
| **Effondrement = série perdue** | **+15 %**, et +34 points d'écart avec la lecture naïve |

Les deux premières étaient des machines à sous : un joueur qui remonte
mécaniquement au palier 6, sans jamais regarder le puits, jouait à 3 % du
joueur attentif. La cause est structurelle — un effondrement ne coûtait que la
sacoche du moment, trop peu face au total d'une série.

La troisième version tient parce que le coût du risque devient **ce qu'on
sacrifie des descentes à venir**, donc un coût qui fond à mesure que la série
avance : prudent au début, gourmand à la fin. Trois faits mesurés :

- Les règles aveugles imposent un vrai dilemme : « palier 4 partout » donne la
  meilleure moyenne (55,9) mais « palier 7 partout » donne une **médiane de 0**
  et le meilleur 99ᵉ centile (197). Consistance contre record.
- **Ne lire que le risque immédiat est un piège actif : −19 %.** Le joueur qui
  oublie les descentes restantes joue moins bien qu'un automate.
- Lire le risque **et** ce qu'un effondrement ferait perdre : +15 %, et robuste
  (diviser ou doubler l'estimation ne coûte que 5 %).

C'est pourquoi le tableau de bord affiche le risque **et** les descentes
restantes : sans la seconde information, la première induit en erreur.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Descendre d'un palier | `↓`, `Espace` | bouton « Descendre » |
| Remonter et encaisser | `↑`, `Entrée` | bouton « Remonter » |
| Recommencer | `R` | bouton « Nouvelle série » |
| Couper le son | `M` | bouton « Son » |

### Ricochet · accent anis

On tire la bille en fronde ; elle rebondit sur les parois et les blocs, et
**traverse les cibles sans dévier** — un seul tir bien placé peut en ramasser
plusieurs. Autant de tirs que de cibles, un de moins passé le niveau 10, et
chaque tir épargné vaut 60 points.

- **La simulation tourne en unités fixes (320 × 430) et au pas fixe de 1/60 s**,
  quelle que soit la taille de l'écran. La trajectoire jouée est donc exactement
  celle qui a servi à vérifier le niveau — sans quoi la garantie ne vaudrait
  rien. La toile est mise à l'échelle au rendu, jamais la physique.
- **Un niveau n'est servi qu'une fois vérifié.** Chaque cible doit être
  atteignable par au moins un tir d'un balayage de 630 tirs. Et quand les tirs
  sont moins nombreux que les cibles, il faut en plus qu'un tir en ramasse deux :
  ce tir, plus un par cible restante, tient alors dans le budget. C'est ce qui
  rend la faisabilité **démontrable** plutôt que probable.
- Que les cibles ne dévient pas la bille n'est pas qu'un choix de confort :
  c'est ce qui rend la vérification décidable, puisque la trajectoire d'un tir
  ne dépend pas des cibles déjà ramassées.
- Mesuré : un niveau servi par tirage, en 20 ms environ, et **un tir au hasard
  touche une cible donnée 10 % du temps** — la visée compte sans que la cible
  soit une aiguille. Rebonds moyens : 1,8 au niveau 1, 3,1 au niveau 14.
- L'aperçu s'arrête au **premier rebond**. Au-delà, c'est au joueur de voir
  venir.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Viser et tirer | — | tirer en arrière puis relâcher |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Intrus · accent fuchsia

Une grille de pastilles identiques, sauf une. La trouver avant le sablier.

- **La différence change de nature d'une manche à l'autre** : teinte, clarté,
  pivot, taille, décalage. Ce n'est pas un caprice — une différence seulement
  colorée exclurait du jeu ceux qui distinguent mal les teintes. Ici la couleur
  n'est qu'une possibilité sur cinq.
- L'écart fond d'environ 9 % par manche jusqu'à un **plancher atteint vers la
  manche 15** ; au-delà, seuls le sablier et la taille de la grille se
  resserrent. Le jeu durcit sans fin mais ne devient jamais imperceptible.
- Les natures géométriques sont exprimées **en pixels rendus**, pas en
  pourcentage de la pastille. Une première version les exprimait en
  pourcentage : mesurée sur le rendu, elle descendait à **0,6 px de décalage**
  en grille 6 × 6, c'est-à-dire invisible, sans que le réglage l'annonce. La
  grille est donc bâtie en deux passes : toutes les pastilles identiques, on
  mesure celle qui est rendue, puis on applique l'écart dans la bonne unité.
- Le pivot lui-même est ramené au **déplacement d'un coin en pixels**, puis
  reconverti en degrés selon la taille réelle de la pastille.
- Après une erreur, l'intrus est désigné et sa nature annoncée : c'est comme ça
  que l'œil apprend.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Désigner | — | toucher la pastille |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Cadence · accent sarcelle

Quatre voies, des notes qui descendent, une ligne de frappe. La batterie donne
le pouls ; la mélodie, c'est le joueur qui la joue — chaque voie a sa note.

- **Une seule horloge, celle du son.** La position d'une note à l'écran et le
  jugement d'une frappe se calculent tous deux depuis
  `AudioContext.currentTime`. L'horloge des images ne sert qu'à décider quand
  redessiner, jamais à dater quoi que ce soit. Mesurée en conditions de test,
  la dérive entre les deux horloges allait de **−0,9 ms à −21 ms sur six
  secondes** selon la charge : de quoi transformer une frappe juste en frappe
  ratée si on datait sur la mauvaise.
- La batterie est **planifiée en avance à des instants absolus** du contexte
  audio, et les notes portent ces mêmes instants : ce qu'on entend et ce qu'on
  voit descendent du même nombre.
- Fenêtres de jugement : 45 ms pour un parfait, 90 ms pour un bien, 150 ms pour
  un passable.
- Le seuil de survie se lit dans les nombres : à −5 de justesse par note
  manquée et +2 par parfaite, il faut en toucher **un peu plus de sept sur
  dix** pour se maintenir. Un premier réglage à −9 en exigeait plus de huit sur
  dix, ce qui ne laissait pas le temps d'apprendre les voies.
- Frapper dans le vide coûte de la justesse : le martèlement ne paie pas.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Frapper une voie | `D` `F` `J` `K`, ou les flèches | toucher la voie |
| Recommencer | `R` | bouton « Nouvelle partie » |
| Couper le son | `M` | bouton « Son » |

### Fonte · accent ambre

Une fonderie qu'on lance à la main et qui finit par tourner seule. On pioche du
minerai, on le fond, on vend le lingot ; puis on achète les bâtiments qui le
feront à votre place, du mineur à l'aciérie. Et quand la courbe s'essouffle, on
refond tout pour repartir plus vite.

- **L'équilibrage est le jeu.** Une chaîne qui s'étrangle ou une courbe qui
  plafonne, et il n'y a rien à sauver. Les nombres ne sont donc pas devinés :
  ils sortent d'une simulation qui fait tourner une heure d'usine en quelques
  millisecondes, avec de vrais stocks et une politique d'achat qui comprend la
  chaîne (les écus d'abord, sinon les lingots, sinon le minerai).
- Ce que cette simulation a écarté : une première table où le premier
  convertisseur ne tombait qu'à la **43ᵉ minute** et la première aciérie à la
  **52ᵉ** — trente minutes sans rien de neuf à regarder. Puis, à l'autre bout,
  des tables assez généreuses pour ouvrir la chaîne en dix minutes mais qui
  finissaient à 10¹⁷ écus par seconde, avec trois cent cinquante exemplaires de
  chaque bâtiment.
- La table retenue : coûts en **1,12ⁿ**, production d'un type **doublée tous
  les neuf exemplaires**. Elle ouvre les cinq étages en dix-huit minutes et ne
  s'emballe pas.

  | | mesuré |
  | --- | --- |
  | premier four | 1,9 min |
  | premier lamineur | 4,0 min |
  | premier convertisseur | 13,2 min |
  | première aciérie | 17,6 min |
  | un million d'écus | 17,1 min |
  | cent millions | 21,6 min |
  | revenu après une heure | 4,5 milliards/s |
  | bâtiments après une heure | 198 / 180 / 179 / 153 / 123 |

- **L'or d'une refonte suit un logarithme**, pas une racine : les gains d'un jeu
  de ce genre montent plus vite que n'importe quelle puissance, et avec une
  racine carrée la troisième refonte était gratuite — la simulation donnait
  7 156 puis 7 879 339 d'or. Avec `15 × log₁₀(gagné / 10⁸)`, la boucle converge :
  +30, +24, +15, +6, +2, et le bonus se stabilise vers ×4.
- **Le banc d'essai joue contre le code livré**, pas contre une copie : la
  politique d'achat de la simulation pilote le vrai `tourner()` du jeu par
  `window.Fonte`. Les neuf jalons du tableau ci-dessus retombent au dixième de
  minute près. Sans cela, une table réglée hors ligne ne prouverait rien sur le
  jeu réellement servi.
- L'usine **continue sans vous**, à mi-régime et pour quatre heures au plus. Le
  rattrapage n'est pas une formule : c'est la même boucle de production,
  rejouée seconde par seconde au retour.
- La consigne d'accueil se déclenche sur une **usine à laquelle personne n'a
  touché**, pas sur l'absence de sauvegarde : ouvrir la page puis la fermer en
  crée une, et le conseil d'ouverture disparaissait avant d'avoir servi.
- La durée d'affichage d'un message ne passe pas par `Arcade.ms()`. Cette
  fonction écrase les durées à une frame quand le mouvement réduit est demandé,
  ce qui convient à une animation et jamais à un texte qu'il faut lire.

| Action | Clavier | Tactile / souris |
| --- | --- | --- |
| Piocher | `Espace` | le carreau de mine |
| Acheter un bâtiment | — | son bouton, par 1, 10 ou au maximum |
| Couper le son | — | bouton « Son » |

## Ce que le socle fournit

- **Le son**, entièrement synthétisé avec l'API Web Audio : aucun fichier audio
  dans le dépôt. Le contexte audio n'est créé qu'à la première interaction,
  comme l'exigent les navigateurs. Sa signature : chaque maillon d'un
  enchaînement monte d'un degré sur une échelle majeure, si bien qu'une longue
  série s'entend avant de se lire — les cascades dans Chute, les poses
  parfaites dans Stack.
- **Les records**, sous `arcade.record.<jeu>` dans le `localStorage`, lus par le
  hall pour afficher le meilleur de chaque machine, et **un état libre** par jeu
  (`Arcade.read` / `Arcade.write`) pour les parties en cours et les
  statistiques. Chaque accès est protégé : un navigateur qui refuse le stockage
  fait perdre la sauvegarde, pas la partie.
- **Le réglage du son**, commun à toute la collection : coupé ici, coupé partout.
- **La règle `[hidden] { display: none !important; }`**, posée une fois pour
  toutes. Sans elle, tout `display: flex` ou `grid` d'une feuille de jeu
  l'emporte sur le `display: none` par défaut du navigateur et l'élément reste
  visible. Le piège avait été rustiné douze fois, machine par machine, avant
  d'être corrigé à sa racine.
- **Le châssis** : rails, tableau de bord, jauge, pastilles de vies, écran de
  fin, boutons. Un composant remonte dans le socle dès qu'une deuxième machine
  s'en sert — les pastilles de vies y sont passées quand Écho a rejoint
  Sillage.

`prefers-reduced-motion` est respecté partout : les durées tombent à une frame
et les effets décoratifs (étincelles, ondes, secousses, débris) disparaissent.

## Notes d'implémentation

- **Chute** dessine en DOM : les tuiles sont des `div` positionnés en
  `transform: translate()` dans une couche unique, et les déplacements sont des
  transitions CSS dont la durée est calculée selon la distance de chute. Les
  fusions sont trouvées par remplissage par diffusion sur les valeurs
  identiques, ce qui gère les groupes de trois tuiles et plus.
- **Écho** fait démarrer la partie depuis son **voile d'attente**, pas depuis
  la grille : le voile recouvre les touches et capte les clics, si bien que
  « touchez une case pour commencer » ne déclenchait rien. Les machines à toile
  n'ont pas ce piège, leur écouteur étant posé sur le conteneur que le voile
  recouvre.
- **Sillage** nomme sa bulle de message `.annonce` et surtout pas `.flash` :
  le socle réserve cette classe à l'animation du score, et les deux se sont
  effectivement écrasées — le score disparaissait de sa tuile pour aller
  flotter en haut de la page. Une feuille de jeu ne réutilise jamais un nom de
  classe du socle pour autre chose.
- **Sillage** garde le terrain dans un `Uint8Array` de trois états (vide, terre,
  sillage) et le redessine case par case à chaque image. Le remplissage est un
  parcours en largeur amorcé depuis chaque rôdeur ; si la case d'un rôdeur est
  devenue terre au pixel près, l'amorce se reporte sur ses voisines, sans quoi
  il serait emmuré et sa région absorbée.
- **Anagrammes** vide la ligne de saisie **immédiatement** quand un mot est
  refusé, jamais après une temporisation : un vidage programmé pour plus tard
  avalait les lettres tapées entre-temps, et on tape vite dans ce jeu. Ses
  messages s'affichent dans la ligne de saisie et non à la place du chrono,
  qu'il ne faut jamais masquer.
- **Tri** dessine en DOM, comme Chute : une bille est un `div` positionné en
  `transform: translate()`, et un versement est une suite de trois transitions
  enchaînées (monter, franchir, descendre) décalées de 55 ms d'une bille à
  l'autre. Le diamètre est **mesuré sur une bille rendue**, jamais relu dans la
  feuille de style : `--bille` vaut `clamp(27px, 8.4vw, 36px)` et
  `getPropertyValue` rend la formule telle quelle, pas la valeur résolue.
- **Le Mot du Jour** n'anime que des classes CSS : la révélation d'une ligne est
  une suite de retournements décalés, déclenchés par minuterie.
- **Rebond** dessine lui aussi sur une toile, et borne le pas de temps à 33 ms :
  au-delà, la bille pourrait franchir une barre sans que la collision soit vue.
- **Stack** dessine sur une toile `canvas` : le ciel, les étoiles, la tour et
  les débris y sont peints à chaque frame. La tour est stockée en pixels et
  remise à l'échelle au redimensionnement.
- Les scripts sont des **scripts classiques, pas des modules ES** : c'est ce qui
  permet d'ouvrir le dossier par double-clic, les modules étant bloqués sur
  `file://`.
