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

| Capteur | Ce qu'il apporte | Ce qu'il coûte |
|---|---|---|
| Vitesse GPS | Réactif, précis, disponible partout | Bruité en ville, muet en tunnel |
| Reconnaissance d'activité | Distingue voiture, vélo et marche | Lente, et absente sans les services Google |

L'automate a **quatre états**, et le troisième est celui qui fait tout
l'intérêt de l'ensemble :

```
   ARRET ──vitesse ou activité──▶ SUSPICION ──20 s──▶ CONDUITE ◀──┐
     ▲                                │                   │       │
     │                            démenti               < 5 km/h  │ ≥ 15 km/h
     │                                ▼                   ▼       │
     └────── 2 min à l'arrêt ────────────────────────── PAUSE ─────┘
                 ou « à pied »
```

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

Tout cela vit dans `moteur/`, en Kotlin pur, **sans une seule référence à
Android**. C'est la décision qui compte le plus dans ce produit ; elle
s'éprouve donc sur une machine de bureau, en quelques millisecondes, sans
téléphone et sans voiture :

```
cd conduite
./gradlew -p moteur test
```

Vingt-trois scénarios, nommés comme on les raconterait : « le feu rouge
ne débloque pas le téléphone », « une vitesse absente n'est pas une
vitesse nulle », « la déclaration de passager ne vaut que pour le trajet
en cours ». Ils tournent aussi à chaque envoi, dans `controles.yml`.

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
| Accès aux données d'usage | On ne sait plus quelle application est affichée. Remplaçable par le service d'accessibilité. |

**Fortement recommandé :**

| Autorisation | Ce qu'on perd sans elle |
|---|---|
| Position **en arrière-plan** | La détection s'arrête dès que l'écran s'éteint — c'est-à-dire toujours, puisqu'un conducteur n'a pas l'application ouverte. Depuis Android 11, le dialogue n'existe plus : il faut choisir « Toujours autoriser » dans les réglages. |
| Reconnaissance d'activité | Le démarrage sans GPS (parking souterrain), et le démenti qui épargne le cycliste rapide — au-delà de 15 km/h, la seule vitesse le ferait bloquer à tort. |
| Notifications | Android exige une notification permanente pour laisser le service tourner. |

**Facultatif :** Ne pas déranger, et le service d'accessibilité.

> **Le service d'accessibilité est proposé, jamais imposé.** Il rend la
> détection instantanée au lieu d'un sondage toutes les 700 ms. Sa
> déclaration réclame le strict minimum : `canRetrieveWindowContent` est
> à **false**, donc il ne *peut pas* lire ce qui s'affiche, même s'il le
> voulait. C'est la différence entre un outil et un mouchard.

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
- Le service d'accessibilité ne remonte **que le nom du paquet affiché**.
- Aucune permission réseau n'est déclarée. L'application ne peut
  matériellement rien envoyer.

---

## Organisation du code

```
conduite/
├── moteur/          Kotlin pur, sans Android. La décision, et ses tests.
│   ├── Signaux.kt           ce qui entre : position, activité, battement
│   ├── Reglages.kt          les seuils, et la raison de chaque valeur
│   ├── MoteurDecision.kt    l'automate à quatre états
│   └── PolitiqueBlocage.kt  qui a le droit de s'afficher
└── app/             L'application Android.
    ├── detection/     lecture des capteurs, traduction en signaux
    ├── surveillance/  quelle application est devant (deux chemins)
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

- **Signature et publication.** Aucune clé n'est dans le dépôt, et il ne
  faut pas en mettre. La position en arrière-plan demande une
  justification vidéo au dépôt sur le Play Store ; le service
  d'accessibilité, une déclaration séparée — il est facultatif, ce qui
  est précisément ce qui rend la déclaration acceptable.
- **Icône.** Le volant vectoriel est un substitut correct, pas un
  dessin.
- **Compte NeedHelpApp.** Rien n'est branché sur le portail. Ce serait le
  moment de se demander si l'on veut vraiment qu'une application qui sait
  quand vous roulez ait aussi un compte en ligne.
- **Mode surveillé.** Un parent qui règle le téléphone d'un conducteur
  débutant voudrait un mode qu'on ne peut pas éteindre sans code. C'est
  un autre produit, avec d'autres questions.
