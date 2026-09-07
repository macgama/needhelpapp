# Déposer le site sur Infomaniak depuis GitHub

Deux fichiers dans `.github/workflows/` s'en chargent :

| Fichier | Rôle |
|---|---|
| `controles.yml` | Vérifie le code à chaque envoi. Tourne tout seul. |
| `deploiement.yml` | Dépose sur Infomaniak. Automatique sur `main`, ou à la main. |

Le réglage se fait une seule fois, et presque entièrement depuis le
navigateur. Comptez vingt minutes.

---

## 1. Côté Infomaniak : ouvrir l'accès SSH

Manager Infomaniak → votre hébergement → **FTP/SSH** → activez l'accès
SSH sur le compte que vous utiliserez.

Notez au passage **le nom du serveur** et **le nom d'utilisateur**. Ils
ressemblent à `xxxxx.ftp.infomaniak.com` et `xxxxx_nom`.

## 2. Fabriquer une clé

C'est la seule étape qui demande un terminal, une fois. Sur votre machine :

```
ssh-keygen -t ed25519 -C "deploiement github" -f ~/.ssh/needhelpapp_deploiement -N ""
```

Deux fichiers apparaissent :

- `needhelpapp_deploiement.pub` — la clé **publique**, à donner à Infomaniak ;
- `needhelpapp_deploiement` — la clé **privée**, à donner à GitHub, et à
  personne d'autre.

Dans le Manager, FTP/SSH → votre utilisateur → **Clés SSH** → collez le
contenu du fichier `.pub`.

Vérifiez que ça marche :

```
ssh -i ~/.ssh/needhelpapp_deploiement votre_utilisateur@votre_serveur.ftp.infomaniak.com
```

Une fois connecté, tapez `ls` puis `pwd` : vous avez besoin du **chemin
absolu** de la racine de chaque site. Chez Infomaniak, ils ressemblent à
`/home/clients/xxxx/sites/needhelpapp.com/web`. Ne les devinez pas,
lisez-les.

## 3. Côté GitHub : le secret et les variables

Dépôt → **Settings** → **Secrets and variables** → **Actions**.

Onglet **Secrets**, bouton *New repository secret* — un seul :

| Nom | Contenu |
|---|---|
| `INFOMANIAK_CLE_SSH` | Tout le contenu du fichier de clé **privée**, `-----BEGIN` et `-----END` compris |

Onglet **Variables**, bouton *New repository variable* :

| Nom | Contenu |
|---|---|
| `INFOMANIAK_HOTE` | `xxxxx.ftp.infomaniak.com` |
| `INFOMANIAK_UTILISATEUR` | votre nom d'utilisateur SSH |
| `INFOMANIAK_PORT` | `22` — facultatif |
| `CHEMIN_PORTAIL` | le chemin absolu de la racine de needhelpapp.com |
| `CHEMIN_TEACHING` | celui de teaching.needhelpapp.com |
| `CHEMIN_FAMILYSHOP` | celui de familyshop.needhelpapp.com |
| `CHEMIN_BUDGET` | **laissez-le vide tant que le sous-domaine n'existe pas** |

Le mot de passe et la clé de chiffrement ne passent jamais par GitHub :
ils vivent dans `config.php` sur le serveur, et le déploiement n'y touche
pas. C'est le sens de la liste d'exclusions.

Une application dont le chemin n'est pas déclaré est ignorée. C'est ainsi
qu'on laisse budget de côté tant que son sous-domaine n'existe pas : on
ne déclare pas `CHEMIN_BUDGET`.

> **Mais si AUCUN chemin n'est déclaré, le déploiement s'arrête en
> erreur** et vous dit ce qui manque. C'est arrivé : trois exécutions se
> sont succédé, vertes, en sautant chaque transfert faute de variables —
> et le serveur n'avait jamais reçu une ligne. Une coche verte qui ne
> veut rien dire est pire que pas de coche du tout.

## 4. Déposer

**Automatiquement** — tout envoi sur `main` dépose les applications dont
un fichier a changé. Une correction qui ne touche que `teaching/` ne
retransfère pas le portail.

**À la main** — onglet **Actions** → *Déploiement sur Infomaniak* → bouton
*Run workflow*. Vous choisissez l'application, et **la simulation est
cochée par défaut** : le premier essai ne fait qu'afficher ce qui serait
transféré. Décochez-la quand la liste vous convient.

> **Le bouton n'apparaît que si le fichier est sur la branche par
> défaut.** C'est une règle de GitHub, pas une erreur de réglage :
> fusionnez d'abord dans `main`.

---

## Ce qui n'est jamais déposé

La liste est le cœur de la sûreté du déploiement. Ces motifs sont exclus,
donc ni transférés **ni effacés** — ils protègent tout ce qui vit sur le
serveur sans être dans le dépôt :

| Exclu | Pourquoi |
|---|---|
| `config.php`, `api/config.php`, `config/nha.php` | Mots de passe et clé de chiffrement. Les écraser couperait le site. |
| `assets/fonts/`, `assets/img/` | Déposés à la main, absents du dépôt. |
| `data/`, `*.sqlite` | Données de production. |
| `sql/` | Les schémas n'ont rien à faire sur le web. |
| `*.md` | Documentation interne. |
| `.htaccess.exemple` | À renommer à la main, une fois. |

## L'option « supprimer » — à manier avec précaution

Par défaut, le déploiement **ajoute et remplace, sans jamais effacer**.
Un fichier retiré du dépôt reste donc sur le serveur.

C'est délibéré. Effacer sur un site en production est l'opération
dangereuse, et un dépôt additif ne casse rien. La case *supprimer*
existe pour faire le ménage quand vous en avez besoin — lancez-la
**toujours en simulation d'abord**, et lisez la liste des suppressions
avant de recommencer sans la simulation.

## Si rsync manque sur le serveur

Le déploiement le vérifie et le dit clairement plutôt que d'échouer sur
un message obscur. Si votre offre ne le fournit pas, remplacez l'étape
« Déposer » par un miroir SFTP :

```
sudo apt-get install -y lftp
lftp -u "$UTIL," -e "set net:max-retries 2; \
  mirror -R --exclude-glob .git* --exclude-glob *.md \
         --exclude-glob config.php --exclude-glob nha.php \
         --exclude sql/ --exclude data/ \
         needhelpapp/ $CIBLE/; bye" \
  sftp://$HOTE
```

Moins fin — pas de simulation lisible, pas de transfert différentiel —
mais il ne demande que du SFTP, toujours disponible.

---

## La première fois : l'ordre qui évite les ennuis

1. **Sauvegardez la base** depuis phpMyAdmin. Le déploiement ne touche
   pas à la base, mais on ne déploie jamais sans filet.
2. Vérifiez que `controles.yml` est au vert sur votre dernier envoi.
3. Lancez le déploiement **en simulation**, application par application.
4. Lisez la liste. Cherchez-y un `config.php` : il ne doit **pas** y
   figurer. S'il y est, arrêtez-vous et dites-le-moi.
5. Relancez sans la simulation.
6. Ouvrez `https://needhelpapp.com/diagnostic.php?jeton=…` : tout doit
   être au vert, y compris « Cohérence du socle » et « Fichiers déposés »,
   qui sont là précisément pour repérer un dépôt à moitié fait.

> **Avant le premier déploiement du portail**, assurez-vous que le
> correctif de `includes/mailer.php` est bien dans ce qui part. Sans lui,
> toutes les pages répondent en erreur 500. `controles.yml` le vérifie à
> chaque envoi — c'est la raison d'être de ce fichier.
