# Conduite — le téléphone se tait pendant qu'on roule

Application Android. Elle détecte toute seule qu'un véhicule roule et
recouvre les applications choisies jusqu'à l'arrêt.

Pas de compte, pas de serveur, pas de réseau. Rien de ce qu'elle mesure
ne quitte le téléphone.

---

## Ce qu'elle peut, et ce qu'elle ne peut pas

Autant le dire tout de suite, parce que c'est ce qui distingue une
application honnête d'une promesse creuse.

**Android ne permet à aucune application tierce de confisquer un
téléphone.** Le bouton d'accueil, les applications récentes et le volet
des notifications restent hors d'atteinte. C'est très bien ainsi : une
application capable de les neutraliser serait un rançongiciel, et Google
la retirerait du catalogue le jour même.

Ce que fait celle-ci est donc précis :

- l'application interdite est **recouverte** tant qu'elle est devant ;
- elle se découvre dès qu'on la quitte, et se recouvre si on y revient ;
- les notifications se taisent, si vous l'y autorisez.

Le mécanisme n'est pas la prison, c'est la **friction**. Le geste réflexe
échoue, et le réflexe s'éteint. Pour un conducteur qui *veut* décrocher,
c'est suffisant. Pour un conducteur qui veut contourner, rien ne suffira
jamais — il désinstallera l'application en dix secondes, et aucune
autorisation Android ne l'en empêchera.

**Et iOS ?** Rien de tout cela n'y est possible. Apple ne laisse pas une
application tierce en recouvrir une autre. Deux voies existent — le mode
de concentration « Conduite » piloté par une automatisation Raccourcis,
facile et contournable ; ou l'API Screen Time, qui bloque réellement mais
exige une autorisation spéciale demandée à Apple, réservée au contrôle
parental, avec plusieurs semaines de délai et un refus possible. Ce
dossier ne traite que d'Android.

---

## Comment elle décide que vous conduisez

Deux capteurs, et un automate qui les arbitre.

| Signal | Ce qu'il apporte | Ce qu'il coûte |
|---|---|---|
| Vitesse GPS | Réactif, précis, disponible partout | Bruité en ville, muet en tunnel |
| Reconnaissance d'activité | Distingue voiture, vélo et marche | Lente, et absente sans les services Google |
| Bluetooth du véhicule | Sait de **quel** véhicule il s'agit | Facultatif, et il faut le désigner une fois |

L'automate a **quatre états**, et le troisième est celui qui fait tout
l'intérêt de l'ensemble :

```
   ARRET ──vitesse ou activité──▶ SUSPICION ──20 à 30 s──▶ CONDUITE ◀──┐
     ▲                                │                       │        │
     │                            démenti              sous le seuil   │ au-dessus
     │                                ▼                       ▼        │
     └────── 2 min à l'arrêt ──────────────────────────────  PAUSE ─────┘
                 ou « à pied »
```

Les seuils et le délai de confirmation ne sont pas des constantes : ils
viennent du **profil de véhicule** (voir plus bas).

- **SUSPICION** absorbe les points GPS aberrants — ils sont fréquents en
  ville, entre deux immeubles, et durent une seconde ou deux. Vingt
  secondes de confirmation coûtent quelques centaines de mètres de route
  non couverts ; un blocage intempestif coûte une désinstallation.

- **PAUSE**, c'est le feu rouge. **Le blocage y reste actif.** C'est
  précisément à l'arrêt, dans le trafic, que la tentation de saisir son
  téléphone est la plus forte : une application qui rendrait la main là
  ne servirait à rien. Il faut deux minutes d'immobilité — ou la preuve
  qu'on marche — pour que le trajet soit déclaré fini.

- **Le doute maintient le blocage.** Un capteur qui se tait n'est pas un
  capteur qui dit « à l'arrêt » : sous un tunnel, le véhicule roule
  toujours. On ne débloque donc pas faute de signal — mais pas
  indéfiniment non plus, sinon un GPS en panne confisquerait le téléphone
  de la soirée. Cinq minutes.

### Les profils de véhicule

C'est le réglage le plus lourd de conséquences de l'application, parce
qu'un seul jeu de seuils ne peut pas couvrir une voiture et une
trottinette.

| Profil | Se déclenche au-delà de | Confirmation | Ce qui lève le blocage |
|---|---|---|---|
| Voiture, camionnette | 15 km/h | 20 s | à pied, **à vélo** |
| Moto, scooter, vélomoteur | 15 km/h | 20 s | à pied |
| Vélo, trottinette, monoroue | **10 km/h** | **30 s** | à pied |

Deux choses méritent l'attention.

**« À vélo » ne peut pas rester un démenti universel.** La première
version l'utilisait pour annuler un blocage — un cycliste ne tient pas de
volant. Pour qui veut justement protéger les cyclistes, c'est le signal
exactement à l'envers. Le profil moto ne l'accepte pas davantage : en
ville, la reconnaissance d'activité confond volontiers un scooter avec un
vélo, même allure, mêmes accélérations.

**Les profils s'additionnent, ils ne s'excluent pas.** La même personne
prend sa voiture en semaine et son vélo le samedi. Le moteur retient donc
le seuil d'entrée **le plus bas** — il suffit qu'un profil s'applique
pour qu'il y ait un danger — et **l'intersection** des démentis : une
activité ne disculpe que si elle disculpe pour tous les profils actifs à
la fois. C'est ce second point qui règle la contradiction : « voiture »
et « vélo » cochés ensemble, et « à vélo » cesse de lever le blocage.

Le délai de confirmation, lui, dépend de la **vitesse** et non des cases
cochées. À 12 km/h on ne distingue pas une trottinette d'un coureur, et
les trente secondes laissent au système le temps de dire « à pied ». À
60 km/h la question ne se pose plus, et vingt secondes suffisent —
au-delà, ce ne serait que de la route non couverte.

> **Le coureur reste le cas limite assumé.** Un jogging soutenu tient
> 12 à 15 km/h sans peine. Avec le profil léger actif, il peut être
> bloqué quelques dizaines de secondes, le temps que la reconnaissance
> d'activité le disculpe. Le bouton « je ne conduis pas » est là pour les
> fois où elle se tait.

### Le Bluetooth, ou le seul signal qui ne vienne pas d'un capteur

Un GPS dit qu'on va à 50 km/h. Il ne sait pas si c'est en voiture, en
bus, en tram ou en car postal — et c'est toute la difficulté. Un
appairage, lui, sait de **quel** véhicule il s'agit : celui dont vous
avez désigné l'autoradio, une fois, dans une liste.

D'où deux usages, et seulement ces deux-là :

- la confirmation passe de **vingt à huit secondes**, puisqu'il n'y a
  plus ni bus, ni tram, ni vélo à écarter ;
- **la coupure du contact termine le trajet sur-le-champ.** L'autoradio
  s'éteint avec le moteur : c'est un signal de fin bien plus net que
  n'importe quelle absence de mouvement, et il arrive à la seconde là où
  l'attente de deux minutes tâtonne.

Ce qu'il ne fait **pas** : déclencher un blocage à lui seul. Une voiture
garée, contact mis, reste connectée — devant une école, dans un
embouteillage, ou dans un garage.

L'application ne cherche aucun appareil autour de vous, n'échange rien
par Bluetooth, et ne lit la liste des appareils appairés qu'au moment où
vous ouvrez l'écran de choix.

Tout cela vit dans `moteur/`, en Kotlin pur, **sans une seule référence à
Android**. C'est la décision qui compte le plus dans ce produit ; elle
s'éprouve donc sur une machine de bureau, en quelques millisecondes, sans
téléphone et sans voiture :

```
cd conduite
./gradlew -p moteur test
```

Quarante-quatre scénarios, nommés comme on les raconterait : « le feu rouge
ne débloque pas le téléphone », « une vitesse absente n'est pas une
vitesse nulle », « couper le contact termine le trajet sur-le-champ »,
« le même vélo est bloqué dès que le profil vélo est actif »,
« la déclaration de passager ne vaut que pour le trajet en cours ». Ils
tournent aussi à chaque envoi, dans `controles.yml`.

## Le banc d'essai

Le moteur s'éprouve sans Android. Tout ce qui l'entoure — la
superposition qui recouvre vraiment une application, le Ne pas déranger
qui coupe vraiment les notifications, le service qui survit vraiment à
l'écran éteint, la surcouche du constructeur qui le tue quand même — ne
se vérifie que sur l'appareil. Jusqu'ici, la seule façon de le faire
était de prendre la voiture.

La variante de développement porte donc un **banc d'essai** (Réglages →
Développement) qui rejoue les mêmes scénarios sur le vrai service :
départ, feu rouge, arrêt prolongé, tunnel, descente du véhicule, voiture
reconnue, cycliste. Il injecte des signaux fabriqués dans le canal que le
service écoute déjà — **aucune ligne du service n'a été modifiée pour
lui**, et c'est cette propriété qui rend l'essai honnête : il ne voit pas
la différence avec un vrai point GPS.

Tout s'y joue en temps réel. On pourrait accélérer en fabriquant des
instants dans le futur, mais le service émet ses propres battements à
l'heure réelle, et deux horloges qui se contredisent donneraient des
délais négatifs. Un feu rouge dure donc ses deux minutes et demie.

---

## Le passager

Une application qui bloque le téléphone d'un passager est une application
qu'on désinstalle. Il y a donc un bouton — mais il demande **trois
secondes de doigt posé**.

La friction *est* le mécanisme. Un conducteur ne tient pas trois secondes
sur un bouton sans quitter la route des yeux, et il le sent
physiquement ; un passager ne remarque même pas l'attente. Un simple
appui, lui, se donnerait au feu rouge sans y penser.

La déclaration ne vaut que **pour le trajet en cours**. La reconduire
d'un trajet à l'autre transformerait un aveu ponctuel en désactivation
permanente, ce que personne ne choisirait consciemment.

---

## L'achat

Gratuite à l'installation, débloquée par un **achat unique**. Pas
d'abonnement : un outil qu'on installe et qu'on oublie se prête mal à une
reconduction mensuelle, et la reconduction est ce qui fait désinstaller.

**L'essai dure quinze jours ET au moins dix trajets.** Les deux
conditions, parce qu'une seule punit toujours quelqu'un : en jours seuls,
celui qui ne prend pas la voiture de la semaine paierait sans avoir rien
vu ; en trajets seuls, le livreur aurait épuisé son essai le premier
après-midi. Il faut avoir eu le temps **et** l'occasion.

Cette règle est du calcul pur, dans `moteur/Licence.kt` — donc éprouvée
en une milliseconde plutôt qu'en quinze jours.

### Ce qui se passe à l'expiration

La protection s'arrête, et l'application le dit **fort** : notification,
carte rouge sur l'écran d'accueil, interrupteur de surveillance éteint et
verrouillé. Le service refuse de démarrer plutôt que de tourner à vide.

C'est délibéré et ce n'est pas négociable : une application de sécurité
qui affiche « en veille » pendant que rien ne tourne est pire que pas
d'application du tout, parce que l'utilisateur, lui, continue de se
croire couvert.

### Trois règles qui valent de l'argent

1. **Acquitter sous trois jours.** Un achat non acquitté est
   automatiquement remboursé par Google au bout de soixante-douze heures.
   L'utilisateur a payé, l'application est débloquée, et l'argent repart
   tout seul — cela ne se voit qu'au relevé du mois suivant.
2. **Ne jamais révoquer sur un silence.** Réseau coupé, Play Store en
   mise à jour, mode avion, tunnel : le magasin ne répond pas. En
   conclure que l'achat n'existe pas couperait la protection d'un client
   qui a payé, au moment précis où il roule. On n'écrit « non acheté »
   que sur une réponse explicite.
3. **Ne jamais écrire le prix dans le code.** Il vient de Play, déjà
   formaté dans la monnaie de l'acheteur.

La vérification est purement locale : pas de serveur, donc pas de
validation du jeton d'achat côté serveur, et un téléphone déverrouillé
peut la contourner. C'est un choix assumé — l'alternative demanderait un
serveur, un compte et la permission réseau, c'est-à-dire de renoncer à
tout ce qui fait la valeur de cette application.

> **Un point à vérifier au premier assemblage.** La bibliothèque de
> facturation fusionne son propre manifeste dans le nôtre. Si elle y
> ajoute `INTERNET`, la phrase « elle ne peut matériellement rien
> envoyer » devient fausse, et doit être réécrite ici **et** dans
> `roadsecurity/confidentialite.html`. On ne laisse pas une promesse survivre
> à ce qui la rendait vraie.

## Ce qui n'est jamais bloqué

Quel que soit le réglage, y compris en mode strict :

| Toujours accessible | Pourquoi |
|---|---|
| Le composeur téléphonique | Une application qui empêcherait d'appeler les secours depuis le bord de la route serait pire que le problème qu'elle résout. |
| Les réglages d'Android | Sinon un faux positif enferme l'utilisateur, sans moyen de rien désactiver. |
| **L'écran d'accueil** | Un lanceur recouvert, c'est un téléphone d'où l'on ne peut plus rien ouvrir — pas même l'application de navigation qu'on vient d'autoriser. Le blocage se retournerait contre son but. |
| L'interface système | Barre d'état, volet des notifications. |

La liste n'est pas écrite en dur : elle est demandée à Android, parce que
le nom du composeur ou du lanceur change d'un constructeur à l'autre.

---

## Les autorisations, ou le vrai obstacle

Ce n'est pas la détection qui est difficile, c'est le mur d'autorisations.
Une application qui surveille la position en arrière-plan et dessine
par-dessus les autres touche à peu près tout ce qu'Android a passé dix
versions à verrouiller.

**Indispensable — sans ça, rien ne fonctionne :**

| Autorisation | Ce qui s'arrête sans elle |
|---|---|
| Position | Tout. La vitesse vient de là. |
| Affichage par-dessus les autres applications | La détection marche, mais rien ne se passe à l'écran. |
| Accès aux données d'usage | On ne sait plus quelle application est affichée. |

**Fortement recommandé :**

| Autorisation | Ce qu'on perd sans elle |
|---|---|
| Position **en arrière-plan** | La détection s'arrête dès que l'écran s'éteint — c'est-à-dire toujours, puisqu'un conducteur n'a pas l'application ouverte. Depuis Android 11, le dialogue n'existe plus : il faut choisir « Toujours autoriser » dans les réglages. |
| Reconnaissance d'activité | Le démarrage sans GPS (parking souterrain), et le démenti qui épargne le cycliste rapide — au-delà de 15 km/h, la seule vitesse le ferait bloquer à tort. |
| Notifications | Android exige une notification permanente pour laisser le service tourner. |

**Facultatif :** le Bluetooth (pour désigner votre voiture) et Ne pas
déranger.

> **Il n'y a PAS de service d'accessibilité**, et c'est un choix. Une
> première version en proposait un, facultatif, pour connaître
> instantanément l'application affichée au lieu de sonder toutes les
> 700 ms. Il a été retiré : le Play Store traite comme suspecte toute
> application qui réclame l'accessibilité hors de son objet, et c'est un
> motif de refus classique pour ce genre d'outil. Sept cents
> millisecondes sur un écran de blocage ne se voient pas ; un refus au
> dépôt, si.

> **La panne la plus fréquente ne vient pas du code.** Xiaomi, Huawei,
> Oppo — et Samsung dans une moindre mesure — tuent les services
> d'arrière-plan au bout de quelques minutes d'écran éteint, quelles que
> soient les autorisations. L'écran des autorisations mène directement au
> réglage des optimisations de batterie ; c'est le remède.

---

## Vie privée

Ce n'est pas une promesse écrite dans une politique de confidentialité,
c'est une contrainte que le code s'impose à la source.

- **La coordonnée n'est jamais gardée.** Le point GPS est lu, sa vitesse
  et sa précision en sont extraites, et l'objet est jeté. Rien dans
  l'application ne sait où vous êtes allé.
- La distance d'un trajet est obtenue **en intégrant la vitesse**, pas en
  additionnant des positions. Quelques pour cent d'écart, et aucun
  itinéraire.
- L'historique — durée, distance, vitesse maximale, nombre
  d'interceptions — vit dans une base locale, **exclue des sauvegardes
  automatiques** (`res/xml/regles_sauvegarde.xml`).
- Pendant un trajet seulement, l'application lit le **nom du paquet**
  affiché — jamais un titre de fenêtre, jamais le contenu d'un écran.
- Aucune permission réseau n'est déclarée. L'application ne peut
  matériellement rien envoyer. C'est vérifiable dans la fiche Play Store
  comme dans les réglages du téléphone.
- La politique de confidentialité qui dit tout cela au public est
  `roadsecurity/confidentialite.html`, et chacune de ses affirmations
  renvoie à une ligne de code précise. La vitrine de l'application vit
  dans le même dossier, sur roadsecurity.needhelpapp.com.

---

## Organisation du code

```
conduite/
├── moteur/          Kotlin pur, sans Android. La décision, et ses tests.
│   ├── Signaux.kt           ce qui entre : position, activité, battement
│   ├── Reglages.kt          les seuils dérivés des profils
│   ├── ProfilVehicule.kt    voiture, moto, vélo — et leurs pièges
│   ├── Licence.kt           essai et achat, en calcul pur
│   ├── MoteurDecision.kt    l'automate à quatre états
│   └── PolitiqueBlocage.kt  qui a le droit de s'afficher
└── app/             L'application Android.
    ├── detection/     lecture des capteurs, traduction en signaux
    ├── surveillance/  quelle application est devant
    ├── banc/          les scénarios du banc d'essai
    ├── facturation/  l'achat unique, par Play et par lui seul
    ├── blocage/       la superposition, le Ne pas déranger
    ├── service/       le service d'avant-plan qui orchestre
    ├── donnees/       réglages (DataStore) et trajets (Room)
    └── ui/            Compose
```

La règle qui tient l'ensemble : **le service orchestre, il ne calcule
rien**. Tous les signaux passent par un canal qu'une seule coroutine
vide, si bien que le moteur voit exactement la même file ordonnée qu'en
test — et n'a jamais besoin d'être thread-safe.

---

## Compiler

Il faut Android Studio, ou le SDK Android en ligne de commande.

```
cd conduite
./gradlew :app:assembleDebug
```

Le moteur seul, lui, ne demande **qu'un JDK 17 ou plus récent** :

```
./gradlew -p moteur test
```

C'est volontaire : `moteur/` est une compilation Gradle à part, incluse
par `includeBuild`. On peut l'ouvrir, le lire et l'éprouver sans les deux
gigaoctets du SDK.

`controles.yml` ne compile pas l'application — cela demanderait de
télécharger le SDK à chaque envoi. Il éprouve la logique, pas
l'assemblage. C'est un choix assumé.

---

## Ce dossier n'est pas déployé

`deploiement.yml` a une liste explicite d'applications web à déposer sur
Infomaniak. `conduite/` n'y figure pas et n'a rien à y faire : une
application Android se publie sur le Play Store, pas par rsync.

---

## Ce qui reste à faire

- **Le produit dans la Play Console.** Le code attend un achat unique
  d'identifiant `conduite_complet` (Produits → Produits intégrés à
  l'application). Sans lui, l'écran de déblocage affiche « le magasin ne
  répond pas » — ce qui est exact, mais peu utile.
- **Éprouver la facturation.** Elle ne se teste ni en émulateur ni hors
  du magasin : il faut une piste de test fermée et des comptes
  testeurs licence. C'est aussi là qu'on vérifiera l'acquittement, en
  laissant passer trois jours sur un achat de test.
- **Le dossier Play.** Textes de la fiche, réponses au formulaire
  « Sécurité des données », déclarations et script de la vidéo :
  `PLAY-STORE.md`, prêt à copier.
- **Signature et publication.** Aucune clé n'est dans le dépôt, et il ne
  faut pas en mettre. La position en arrière-plan demande une
  justification vidéo au dépôt sur le Play Store, et une revue humaine
  qui prend des semaines : c'est le vrai chemin critique. Les services
  d'avant-plan demandent leur propre déclaration.
- **Douze testeurs, quatorze jours.** Un compte développeur personnel
  (par opposition à un compte d'organisation) doit faire tourner un test
  fermé avant de pouvoir demander l'accès à la production. À lancer tôt :
  cela ne s'achète pas, cela s'attend.
- **Icône.** Le volant vectoriel est un substitut correct, pas un
  dessin.
- **Mode surveillé.** Un parent qui règle le téléphone d'un conducteur
  débutant voudrait un mode qu'on ne peut pas éteindre sans code. C'est
  le seul endroit où un compte NeedHelpApp — et un abonnement — auraient
  vraiment un sens, puisqu'il faut relier deux téléphones. C'est un autre
  produit, avec d'autres questions, et il coûterait la permission réseau.
