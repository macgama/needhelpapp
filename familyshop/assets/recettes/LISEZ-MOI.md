# Les illustrations de recettes

Ce dossier reçoit les images des plats. Il est **vide dans le dépôt** :
les images sont déposées par un administrateur depuis l'application, et
le déploiement ne les touche pas — `deploiement.yml` exclut `assets/img/`
et ce dossier suit la même règle.

Trois choses à savoir :

- **Le nom du fichier est fabriqué par le serveur**, jamais celui du
  téléversement. Il dérive de la clé du plat, avec un suffixe aléatoire
  pour qu'un remplacement ne soit pas servi depuis le cache.
- **Chaque image est réencodée en WebP** par GD. C'est ce qui garantit
  qu'il s'agit bien d'une image : un fichier déguisé ne survit pas à
  l'aller-retour. Cela retire au passage les données EXIF, dont la
  position GPS de la photo.
- **Une image vaut pour toutes les familles** qui ont ce plat. Elle est
  rattachée au nom normalisé, pas à une recette : sans cela, la même
  photographie de lasagnes serait payée autant de fois qu'il y a de
  foyers qui en font.

Pensez à sauvegarder ce dossier : il n'est pas dans le dépôt, et une
image perdue se repaie.
