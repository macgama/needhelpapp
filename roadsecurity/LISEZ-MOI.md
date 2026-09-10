# RoadSecurity — la vitrine de Conduite

Deux pages statiques pour `roadsecurity.needhelpapp.com` : la
présentation de l'application Android, et sa politique de
confidentialité.

## Pourquoi un sous-domaine à part

La fiche du Play Store réclame une adresse publique qui décrive **cette**
application. Un lien vers un portail qui parle surtout d'autre chose fait
mauvais effet à la relecture — et c'est une relecture humaine qui décide
si l'application sort.

## Pourquoi c'est du HTML statique

Pas de PHP, pas de socle, pas de base. Il n'y a rien à personnaliser :
personne ne se connecte ici. `includes/nha-core.php` n'a donc pas à être
copié à la main, contrairement à teaching, familyshop et budget.

## Pourquoi aucune police distante

teaching et familyshop appellent Google Fonts. Ici ce serait
contradictoire : tout l'argument de l'application est qu'elle n'envoie
rien à personne. Un site qui la présente en faisant charger une police
depuis les serveurs de Google transmettrait l'adresse IP de chaque
visiteur à un tiers — exactement ce que la page de confidentialité promet
de ne pas faire.

**Ce site n'émet aucune requête vers l'extérieur.** Ni police, ni mesure
d'audience, ni bouton de réseau social, ni cookie. C'est vérifiable dans
l'onglet réseau du navigateur, et c'est écrit sur la page.

## Mise en ligne

1. Créer le sous-domaine `roadsecurity.needhelpapp.com` dans le Manager
   Infomaniak.
2. Déclarer la variable `CHEMIN_ROADSECURITY` dans GitHub avec le chemin
   absolu de sa racine — **lu en SSH, pas deviné** (voir `DEPLOIEMENT.md`).
3. Renommer `.htaccess.exemple` en `.htaccess` sur le serveur, une fois.
4. Activer le certificat SSL.

Le dépôt se fait ensuite tout seul à chaque envoi sur `main` qui touche
ce dossier.

## Ce qui doit rester vrai

La politique de confidentialité est la même que celle de
`conduite/` : chacune de ses affirmations renvoie à une ligne de code
précise. Si le code change — une donnée conservée, une permission
ajoutée, la permission réseau qu'apporterait peut-être la bibliothèque de
facturation — **cette page doit changer le même jour**, sans quoi elle
devient un engagement que le code ne tient plus.
