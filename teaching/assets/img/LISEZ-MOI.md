# Les images de l'apprentissage

Mon atelier n'a pas accès au domaine d'Artlist : téléchargez les images
depuis le panneau de résultats de la conversation et enregistrez-les ici,
sous ces noms exacts.

| Fichier attendu | Ce que c'est |
|---|---|
| `cahier.png` | Le cahier ouvert, plume violette, lumière de fenêtre |

Le nom compte : `index.html` s'y réfère. Sans le fichier, la bannière
reste lisible — le texte se pose sur un fond crème — mais elle perd sa
photographie. C'est voulu : une page qui dépend d'une image pour être
comprise est mal faite.

## Alléger avant la mise en ligne

    cwebp -q 82 cahier.png -o cahier.webp

Déposez les deux : la page sert le WebP aux navigateurs qui le
comprennent, le PNG aux autres.
