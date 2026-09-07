# Budget — les comptes du ménage

Sous-domaine `budget.needhelpapp.com`. Cinquième application NeedHelpApp,
après le portail, l'apprentissage scolaire et les courses.

PHP 8.1+, MariaDB, aucune dépendance, aucun outil de build.

## Où en est ce dossier

Ce qui est écrit et éprouvé :

| Fichier | Ce qu'il fait |
|---|---|
| `sql/schema.sql` | Les douze tables, chargées sans erreur sur MariaDB 10.11 |
| `api/coffre.php` | Le chiffrement des colonnes sensibles |
| `api/amortissement.php` | Le calcul des échéanciers, cinq modes |
| `api/calcul-test.php` | 73 contrôles sur les deux précédents |
| `api/config.example.php` | À copier en `config.php` |

Ce qui reste à écrire : `api/db.php` (session et rattachement au
portail), `api/index.php` (l'API), l'interface, et la page qui explique
tout cela aux utilisateurs.

Lancez `php api/calcul-test.php` avant toute mise en ligne. Il ne touche
ni à la base ni au réseau.

## La sécurité, sans exagération

C'est la seule application de NeedHelpApp qui manipule des revenus, des
dettes et du patrimoine. Elle mérite mieux que le socle commun, et elle
mérite surtout qu'on dise exactement ce qu'elle protège.

### Ce qui est chiffré

Les montants, les libellés, les notes, les noms de comptes et de
catégories, le nom du prêteur, le capital et le taux d'un emprunt.
AES-256-GCM, une clé de 32 octets qui vit dans `api/config.php` et jamais
dans la base.

GCM plutôt que CBC parce qu'il authentifie : une valeur modifiée dans la
base ne se déchiffre pas silencieusement en autre chose, elle lève une
exception. Chaque paquet est de plus lié à sa colonne et à son livre —
recopier le montant chiffré d'un ménage dans celui d'un autre échoue.

### Ce qui reste lisible, et pourquoi

Les dates, les identifiants de compte et de catégorie, le sens d'une
opération et son pointage. Il le faut pour indexer, filtrer et joindre :
une base dont rien n'est lisible n'est plus une base de données.

**La structure est visible, le contenu ne l'est pas.** Quelqu'un qui vole
un dump apprend qu'un ménage a enregistré dix-sept sorties en mars sur la
catégorie n° 7. Il n'apprend ni que la catégorie 7 s'appelle « Santé »,
ni les montants.

### Ce que cela ne protège pas

Un accès complet au serveur donne aussi la clé. Nous l'écrivons aux
utilisateurs plutôt que de laisser croire à une inviolabilité que ce
chiffrement ne donne pas.

Le seul modèle qui résisterait — la clé dérivée d'une phrase de passe qui
ne quitte jamais le navigateur — a été écarté en connaissance de cause :
une phrase oubliée y signifie la perte définitive de tout l'historique,
sans recours possible. Pour un outil familial, c'est un risque plus
grand que celui dont il protège.

### La conséquence à connaître avant d'écrire une requête

`SUM()` ne fonctionne plus sur une colonne chiffrée. **On filtre en SQL
sur le livre et les dates, on agrège en PHP.** Dix ans de budget familial
font vingt-cinq mille lignes, soit une cinquantaine de millisecondes : ce
n'est pas un problème de volume, c'est une manière d'écrire.

### Perdre la clé, c'est perdre les données

Aucune sauvegarde de la base ne sera lisible sans elle. Elle se met dans
un gestionnaire de mots de passe le jour où on la produit, pas plus tard.

Pour en changer, ajoutez la nouvelle sous un numéro suivant et déplacez
`coffre_cle_active`. L'octet de version en tête de chaque paquet dit avec
quelle clé il a été écrit : les anciennes lignes restent lisibles tant
que leur clé figure encore dans la configuration.

## Les emprunts et les hypothèques

Un emprunt n'est pas un solde négatif. C'est un capital, un taux, une
durée et une manière de rembourser — d'où les tables `emprunts` et
`echeances`, et cinq modes d'amortissement.

Trois sont universels : mensualité constante (`annuites`), amortissement
constant (`constant`), remboursement du capital à la fin (`infine`).

Deux sont là parce que nous sommes en Suisse, et c'est le point qu'un
outil étranger modélise mal :

- **`direct`** — la dette diminue réellement, les intérêts suivent le
  solde.
- **`indirect`** — le capital NE BAISSE PAS. On ne verse que les intérêts
  à la banque, l'amortissement va sur un 3e pilier nanti qui remboursera
  le capital à l'échéance. L'intérêt reste donc constant et la déduction
  fiscale est maintenue.

Traiter l'indirect comme du direct ferait décroître une dette qui ne
décroît pas, et ferait disparaître du patrimoine un 3e pilier qui est un
**actif**. Le ménage se croirait deux fois plus riche qu'il n'est. Le
versement au 3a ne figure donc pas dans l'échéancier : il est rendu à
part, à créer comme un virement vers le compte de prévoyance.

Les montants sont des entiers de centimes, les taux des entiers de points
de base — 1.50 % s'écrit 150. Un taux gardé en flottant vaut
1.4899999999 au bout de trois multiplications, et l'écart ne se voit qu'à
la dernière échéance, quand il est trop tard.

L'invariant est vérifié sur 960 combinaisons de mode, périodicité, taux,
capital et durée : la somme des parts de capital vaut exactement le
capital emprunté, le solde après la dernière échéance vaut zéro, et la
dette ne remonte jamais.

## Mise en ligne

1. Créer le sous-domaine `budget.needhelpapp.com` dans le Manager,
   PHP 8.3, et y déposer ce dossier.
2. Renommer `.htaccess.exemple` en `.htaccess`.
3. Créer la base et y charger `sql/schema.sql`.
4. Copier `api/config.example.php` en `api/config.php`, renseigner la
   base **et produire la clé de chiffrement**.
5. Copier depuis le portail `includes/nha-core.php` et `config/nha.php`,
   comme pour teaching et familyshop.
6. Lancer `php api/calcul-test.php` : tout doit être au vert.
7. Activer le certificat SSL.
8. Déclarer l'application au portail :
   `UPDATE apps SET status = 'en_ligne' WHERE code = 'budget';`

**Tant que le point 8 n'est pas fait, laissez `status` à
`construction`.** Le catalogue est lu par la page d'accueil du portail :
une application « en ligne » qui n'existe pas encore envoie les visiteurs
sur une erreur.
