# Les images du portail

Mon atelier n'a pas accès au domaine d'Artlist : je ne peux pas déposer
les images moi-même. Téléchargez-les depuis le panneau de résultats de la
conversation et enregistrez-les ici, sous ces noms exacts.

| Fichier attendu | Ce que c'est | Format |
|---|---|---|
| `accueil-table.png` | La table de famille, lumière de fenêtre, tiers gauche vide | 21:9, 2K |

Le nom compte : `index.php` s'y réfère. Sans le fichier, la bannière reste
lisible — le texte se pose sur un fond de lin uni — mais elle perd sa
photographie.

## Alléger avant de mettre en ligne

Un PNG de 2K pèse plusieurs mégaoctets ; c'est trop pour une page
d'accueil. Convertissez-le en WebP, qui divise le poids par cinq sans
différence visible :

    cwebp -q 82 accueil-table.png -o accueil-table.webp

Puis déposez les deux fichiers : la page sert le WebP aux navigateurs qui
le comprennent, et le PNG aux autres.
