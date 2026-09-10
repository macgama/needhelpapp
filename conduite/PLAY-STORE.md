# Déposer Conduite sur le Play Store

Tout ce qu'il faut écrire, et dans quel ordre. Les textes sont prêts à
copier ; ce qui demande une décision est signalé.

> **Rien de ce document ne peut être exécuté tant que l'application ne
> compile pas.** La vidéo doit montrer la vraie application, en vrai
> fonctionnement — pas une maquette. Ouvrez d'abord Android Studio.

---

## 1. La fiche

### Nom (30 caractères)

```
Conduite
```

Court, mémorisable, cohérent avec la famille NeedHelpApp. Si vous voulez
que le nom porte la promesse dans les résultats de recherche :

```
Conduite — au volant, silence
```

29 caractères. Les deux fonctionnent ; le premier vieillit mieux.

### Description courte (80 caractères)

```
Votre téléphone se tait pendant que vous roulez. Sans compte, sans publicité.
```

77 caractères. C'est le texte que 90 % des visiteurs liront, et le seul
que voit un utilisateur qui parcourt une liste. Il dit ce que fait
l'application, puis ce qui la distingue.

### Description longue (4 000 caractères)

```
Conduite détecte toute seule que vous roulez, et fait disparaître les
applications qui vous détournent de la route. Vous n'avez rien à lancer,
rien à activer au départ, rien à couper à l'arrivée.

CE QU'ELLE FAIT

Dès que votre véhicule roule, les applications que vous avez choisies
sont recouvertes. Elles réapparaissent à l'arrêt. Entre les deux, votre
téléphone ne réclame plus rien.

Le blocage reste actif au feu rouge. C'est délibéré : c'est précisément
à l'arrêt, dans le trafic, que la tentation de saisir son téléphone est
la plus forte. Il faut deux minutes d'immobilité — ou la preuve que vous
marchez — pour que le trajet soit déclaré fini.

VOITURE, MOTO, VÉLO, TROTTINETTE

Un seul jeu de seuils ne peut pas couvrir une voiture et une trottinette.
Vous cochez ce que vous conduisez, et la détection s'adapte :

• Voiture, camionnette — se déclenche au-delà de 15 km/h
• Moto, scooter, vélomoteur — mêmes vitesses, autres pièges
• Vélo, trottinette, monoroue — dès 10 km/h

Les profils s'additionnent : la même personne prend sa voiture en semaine
et son vélo le samedi.

VOTRE VOITURE, RECONNUE

Si vous désignez l'autoradio de votre véhicule, Conduite sait qu'il
s'agit du vôtre — ni un bus, ni un tram, ni la voiture d'un autre. Le
blocage s'établit plus vite, et la coupure du contact termine le trajet
sur-le-champ.

VOUS ÊTES PASSAGER ?

Un bouton lève le blocage. Il demande trois secondes de doigt posé : un
conducteur ne tient pas trois secondes sur un bouton sans quitter la
route des yeux. La déclaration ne vaut que pour le trajet en cours.

CE QU'ELLE NE FAIT PAS, ET NOUS PRÉFÉRONS LE DIRE

Aucune application Android ne peut confisquer un téléphone. Le bouton
d'accueil, les applications récentes et le volet des notifications
restent accessibles — et c'est heureux : une application capable de les
neutraliser serait un rançongiciel.

Conduite ne vous enferme pas. Elle fait échouer le geste réflexe, et le
réflexe s'éteint. Pour qui veut décrocher, c'est suffisant. Pour qui veut
contourner, rien ne suffira jamais.

Le téléphone, les réglages d'Android et l'écran d'accueil ne sont jamais
bloqués. Vous pouvez toujours appeler les secours.

VOS DÉPLACEMENTS NE NOUS REGARDENT PAS

Conduite ne déclare aucune permission d'accès à Internet. Ce n'est pas
une promesse, c'est une contrainte technique que vous pouvez vérifier
dans la liste des autorisations : l'application ne PEUT pas envoyer quoi
que ce soit, à qui que ce soit.

Votre position est lue pour en tirer une vitesse, puis jetée. La distance
d'un trajet est calculée en intégrant la vitesse, jamais en additionnant
des positions : l'application ne sait pas où vous êtes allé, et ne peut
pas le savoir. L'historique — durée, distance, vitesse maximale — reste
sur votre téléphone et n'entre pas dans les sauvegardes automatiques.

Aucun compte à créer. Aucune publicité. Aucun traqueur.

L'ESSAI, PUIS UN ACHAT UNIQUE

Quinze jours ET au moins dix trajets, gratuitement. Les deux conditions,
parce qu'une seule punit toujours quelqu'un : en jours seuls, celui qui
ne prend pas la voiture de la semaine paierait sans avoir rien vu.

Ensuite, un achat unique. Pas d'abonnement, pas de reconduction. L'achat
est rattaché à votre compte Google : changer de téléphone n'y change
rien.

À l'expiration de l'essai, la protection s'arrête et l'application vous
le dit clairement. Elle ne fait jamais semblant de veiller.
```

> **À adapter avant dépôt** : si la bibliothèque de facturation ajoute la
> permission `INTERNET` au manifeste, le paragraphe « Vos déplacements ne
> nous regardent pas » devient faux et doit être réécrit — ici, dans le
> `LISEZ-MOI` et dans `conduite-confidentialite.php`. Le rapport de
> fusion du manifeste vous le dira au premier assemblage.

### Le reste de la fiche

| Champ | Valeur |
|---|---|
| Catégorie | Auto et véhicules *(plutôt que Outils : le classement y est moins encombré et le public plus juste)* |
| Adresse de la politique de confidentialité | `https://needhelpapp.com/conduite-confidentialite.php` |
| Courriel de contact | `contact@needhelpapp.com` |
| Public cible | 18 ans et plus |

---

## 2. Sécurité des données

Le formulaire le plus facile de tout le dossier, et probablement celui
qui fera passer le reste.

| Question | Réponse |
|---|---|
| L'application collecte-t-elle des données ? | **Non** |
| L'application partage-t-elle des données ? | **Non** |
| Les données sont-elles chiffrées en transit ? | Sans objet — aucune donnée n'est transmise |
| L'utilisateur peut-il demander la suppression ? | Sans objet — désinstaller suffit |

« Collecte » signifie, pour Google, transmettre hors de l'appareil. La
position est lue mais jamais transmise : c'est bien « aucune collecte ».

> Le relecteur qui examinera votre demande de position en arrière-plan
> verra d'abord cette page. Une application qui demande beaucoup et
> n'envoie rien est un dossier bien plus facile à défendre qu'une
> application qui demande la même chose avec une régie publicitaire
> embarquée.

---

## 3. La déclaration « position en arrière-plan »

**C'est l'étape qui peut tout arrêter.** Formulaire, vidéo, relecture par
un humain, plusieurs semaines. Un refus est possible.

### Quelle est la fonctionnalité principale qui exige cette autorisation ?

```
Conduite bloque l'usage du téléphone pendant la conduite. Pour cela, elle
doit détecter en continu qu'un véhicule roule, en s'appuyant sur la
vitesse fournie par le service de localisation.

La détection doit fonctionner sans que l'application soit à l'écran, car
c'est la situation normale d'un conducteur : le téléphone est dans un
support ou dans une poche, l'écran est éteint, et l'utilisateur ne
regarde pas l'application — c'est précisément l'état que le produit
cherche à préserver.

La position n'est utilisée que pour en dériver une vitesse instantanée.
Les coordonnées ne sont ni conservées ni transmises : l'application ne
déclare aucune permission d'accès au réseau et ne peut donc rien envoyer.
```

### Pourquoi la localisation au premier plan ne suffit-elle pas ?

```
Avec la seule localisation au premier plan, l'application ne
fonctionnerait que pendant que l'utilisateur la regarde. Or un conducteur
qui regarde l'application de sécurité routière regarde déjà son
téléphone : le danger que le produit combat s'est déjà produit.

L'application devrait alors être ouverte et maintenue à l'écran pendant
tout le trajet, ce qui est à la fois impraticable et contraire à son
objet.
```

### Divulgation dans l'application

Elle existe déjà : l'écran « Autorisations » présente la ligne
« Position en arrière-plan » avec son explication complète **avant** tout
dialogue système. C'est ce que la vidéo doit montrer en premier.

---

## 4. Le script de la vidéo

Soixante à quatre-vingt-dix secondes. Sans montage habile : le relecteur
veut voir un enchaînement crédible, pas une publicité.

> **Ne filmez pas au volant.** Il serait absurde de commettre l'infraction
> que l'application combat pour démontrer qu'elle la combat. Les plans en
> roulant se filment **en passager**, avec un conducteur qui conduit —
> dites-le d'ailleurs dans la vidéo, cela joue en votre faveur.

| Temps | Plan | Ce qu'on montre | Sous-titre |
|---|---|---|---|
| 0:00–0:08 | Écran du téléphone | L'accueil de Conduite, interrupteur éteint | « Conduite bloque les applications qui distraient pendant que vous roulez. » |
| 0:08–0:28 | Écran | L'écran Autorisations. **On s'arrête sur la ligne « Position en arrière-plan » et on laisse lire son explication en entier.** | « L'application explique pourquoi elle demande la position en arrière-plan, avant de la demander. » |
| 0:28–0:42 | Écran | On touche « Accorder », le dialogue Android apparaît, on ouvre les réglages et on choisit **Toujours autoriser** | « L'utilisateur choisit lui-même "Toujours autoriser". » |
| 0:42–0:52 | Écran | Retour à l'accueil, on allume l'interrupteur, l'état passe à « En veille ». **Puis on quitte l'application par le bouton d'accueil, et on éteint l'écran.** | « L'application est fermée. L'écran est éteint. » |
| 0:52–1:10 | Plan large | Le téléphone posé sur son support, le véhicule démarre et roule. *Filmé en passager.* | « Vingt secondes après le départ, la détection se confirme. » |
| 1:10–1:25 | Écran | On ouvre l'application de réseau social choisie : **la superposition apparaît** | « L'application est recouverte tant que le véhicule roule. » |
| 1:25–1:35 | Écran | Le véhicule est à l'arrêt ; carton « deux minutes plus tard » ; la superposition a disparu | « À l'arrêt prolongé, le téléphone est rendu. » |

**Trois choses que le relecteur cherche**, et qu'il faut donc montrer
sans coupure :

1. la divulgation dans l'application **avant** le dialogue système ;
2. le choix explicite de « Toujours autoriser » par l'utilisateur ;
3. la fonction qui marche **application fermée et écran éteint** — c'est
   le plan 0:42–1:10, et c'est le seul qui prouve que l'arrière-plan est
   nécessaire.

Déposez la vidéo en non répertoriée sur YouTube et collez le lien dans le
formulaire. Pas de musique, pas d'effets.

---

## 5. La déclaration des services d'avant-plan

Obligatoire depuis Android 14, et bien plus simple que la précédente.

| Champ | Réponse |
|---|---|
| Type déclaré | `location` |
| Fonctionnalité | Détecter en continu qu'un véhicule roule, à partir de la vitesse |
| Pourquoi un service d'avant-plan | La détection doit survivre à l'écran éteint pendant tout le trajet |
| Alternative envisagée | `WorkManager` a été écarté : il ne garantit pas d'exécution continue, et une détection qui s'endort pendant dix minutes ne protège de rien |

La même vidéo peut servir pour les deux déclarations.

---

## 6. Classification du contenu

Questionnaire standard. Aucune violence, aucun contenu sexuel, aucun jeu
d'argent, aucun échange entre utilisateurs, aucun partage de position.
Vous devriez obtenir **PEGI 3 / Tout public**, malgré un public cible
majeur.

---

## 7. Les images à préparer

| Élément | Format | Note |
|---|---|---|
| Icône | 512 × 512 PNG | Le volant vectoriel actuel est un substitut, pas un dessin |
| Image de présentation | 1024 × 500 | Affichée en tête de la fiche |
| Captures téléphone | 2 à 8, min. 1080 px | L'accueil en trajet, l'écran de blocage, les profils de véhicule, les trajets |

L'écran de blocage est la capture qui vend l'application. C'est aussi
celui dont les boutons sortent encore du thème par défaut — à reprendre
avant de le photographier.

---

## 8. L'ordre des opérations

1. **Compiler**, corriger, faire tourner sur un vrai téléphone.
2. Vérifier le manifeste fusionné : `INTERNET` est-elle apparue ?
3. Créer le compte développeur et la clé de signature.
4. Créer le produit `conduite_complet` — achat unique, pas abonnement.
5. Remplir la fiche et Sécurité des données.
6. **Lancer le test fermé** : douze testeurs, quatorze jours. C'est la
   plus longue horloge, et elle ne s'achète pas. Démarrez-la avant tout
   le reste de ce qui peut attendre.
7. Filmer la vidéo, déposer les deux déclarations.
8. Attendre. Plusieurs semaines pour la position en arrière-plan.
