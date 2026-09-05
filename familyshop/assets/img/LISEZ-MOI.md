# Les images de FamilyShop

Mon atelier n'a pas accès au domaine d'Artlist : téléchargez l'image
depuis le panneau de résultats de la conversation et enregistrez-la ici,
sous ce nom exact.

| Fichier attendu | Ce que c'est |
|---|---|
| `marche.png` | L'étal de marché, légumes sur lin, panier d'osier |

Le nom compte : `index.html` s'y réfère. Sans le fichier, la bannière
reste lisible — le texte se pose sur un fond de lin — mais elle perd sa
photographie.

## Alléger avant la mise en ligne

    cwebp -q 82 marche.png -o marche.webp

Déposez les deux : la page sert le WebP aux navigateurs qui le
comprennent, le PNG aux autres.

Cette image ne s'affiche qu'**avant** connexion. Une fois dans
l'application, on vient travailler : elle ne pèsera jamais sur une
séance de courses.
