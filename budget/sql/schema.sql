-- =====================================================================
-- NeedHelpApp — budget.needhelpapp.com
-- La base 6l3nq9_budget. MariaDB 10.11, utf8mb4.
--
-- Ce fichier remplace le premier jet posé directement sur le serveur.
-- Deux différences de fond, et elles ne se rattrapent pas après coup :
--
--   1. Les montants et les libellés sont CHIFFRÉS. Ils ne sont donc plus
--      des entiers ni du texte, mais du binaire : varbinary. C'est le
--      prix à payer pour qu'un dump de cette base ne dise ni ce que
--      quelqu'un gagne, ni ce qu'il doit, ni chez qui il dépense.
--
--   2. Les emprunts et les hypothèques ont leurs propres tables. Un
--      solde négatif sur un compte ne fait pas un emprunt : il manque le
--      taux, la durée, le mode d'amortissement et l'échéancier.
--
-- CE QUI RESTE EN CLAIR, ET POURQUOI
--
-- La STRUCTURE est visible, le CONTENU ne l'est pas. Restent lisibles
-- les dates, les identifiants de compte et de catégorie, le sens d'une
-- opération (entrée ou sortie) et son pointage. Il le faut pour indexer,
-- filtrer et joindre : une base dont rien n'est lisible n'est plus une
-- base de données.
--
-- Concrètement, quelqu'un qui vole ce fichier apprend qu'un ménage a
-- enregistré dix-sept sorties en mars sur la catégorie n° 7. Il
-- n'apprend ni que la catégorie 7 s'appelle « Santé », ni les montants.
-- C'est ce que nous écrivons aux utilisateurs, mot pour mot : promettre
-- davantage serait mentir, et une promesse invérifiable détruit la
-- confiance qu'elle cherchait à établir.
--
-- LE CALCUL DES TOTAUX
--
-- SUM() ne fonctionne plus sur une colonne chiffrée : les totaux se
-- calculent en PHP, après déchiffrement des lignes du livre concerné.
-- Ce n'est pas un problème de volume — dix ans de budget familial font
-- vingt-cinq mille lignes, soit une cinquantaine de millisecondes — mais
-- c'est une contrainte à connaître avant d'écrire une requête : on
-- filtre en SQL sur le livre et sur les dates, on agrège en PHP.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Le livre est l'unité de partage, comme le foyer dans familyshop.
-- Un ménage tient un livre ; chacun de ses membres y voit tout.
--
-- 'version' est incrémenté à chaque écriture : les navigateurs ouverts
-- le demandent toutes les quelques secondes et rechargent s'il a bougé.
-- Synchronisation modeste, mais qui tient sur un hébergement mutualisé.
--
-- 'cle_version' dit avec QUELLE clé les données de ce livre sont
-- chiffrées. Sans ce numéro, changer de clé obligerait à tout
-- redéchiffrer d'un coup, donc en pratique à ne jamais en changer.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `livres` (
  `id`          int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`         varbinary(255) DEFAULT NULL,
  `join_code`   char(8) NOT NULL,
  `devise`      char(3) NOT NULL DEFAULT 'CHF',
  `jour_debut`  tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `cle_version` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `version`     int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_by`  int(10) UNSIGNED DEFAULT NULL,
  `created_at`  datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_livres_code` (`join_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Le miroir local du compte central. Comme dans teaching et familyshop :
-- l'identité vit dans 6l3nq9_core, cette table ne sert qu'à rattacher
-- les données locales sans requête inter-bases à chaque page.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` int(10) UNSIGNED DEFAULT NULL,
  `email`      varchar(190) NOT NULL,
  `name`       varchar(120) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_account` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `livre_membres` (
  `livre_id`  int(10) UNSIGNED NOT NULL,
  `user_id`   int(10) UNSIGNED NOT NULL,
  `role`      varchar(16) NOT NULL DEFAULT 'membre',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`livre_id`,`user_id`),
  KEY `idx_membres_user` (`user_id`),
  CONSTRAINT `fk_membres_livre` FOREIGN KEY (`livre_id`) REFERENCES `livres` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_membres_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les comptes.
--
-- 'type' distingue ce qui se comporte différemment, pas ce qui porte un
-- nom différent : un compte courant et un compte d'épargne tiennent le
-- même rôle dans un budget. 'bien' est un actif qu'on ne fait
-- qu'estimer — un appartement, une voiture — dont la valeur ne bouge que
-- si on la corrige à la main, d'où 'valeur' et 'valeur_le'.
-- 'dette' porte le solde d'un emprunt : la table emprunts en tient les
-- conditions.
--
-- 'solde_initial' est chiffré comme le reste : c'est un montant.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comptes` (
  `id`            int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`      int(10) UNSIGNED NOT NULL,
  `nom`           varbinary(255) NOT NULL,
  `type`          enum('courant','epargne','especes','carte','placement','bien','dette','prevoyance') NOT NULL DEFAULT 'courant',
  `devise`        char(3) NOT NULL DEFAULT 'CHF',
  `solde_initial` varbinary(64) DEFAULT NULL,
  `valeur`        varbinary(64) DEFAULT NULL,
  `valeur_le`     date DEFAULT NULL,
  `iban_4`        char(4) DEFAULT NULL,
  `couleur`       char(7) NOT NULL DEFAULT '#2B3A55',
  `ordre`         smallint(6) NOT NULL DEFAULT 0,
  `archive`       tinyint(1) NOT NULL DEFAULT 0,
  `created_at`    datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_comptes_livre` (`livre_id`,`archive`,`ordre`),
  CONSTRAINT `fk_comptes_livre` FOREIGN KEY (`livre_id`) REFERENCES `livres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les catégories. Le nom est chiffré : « Santé », « Pension
-- alimentaire », « Avocat » en disent long sur une vie.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`        int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`  int(10) UNSIGNED NOT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `nom`       varbinary(255) NOT NULL,
  `sens`      enum('entree','sortie') NOT NULL DEFAULT 'sortie',
  `couleur`   char(7) NOT NULL DEFAULT '#7A7466',
  `emoji`     varchar(8) NOT NULL DEFAULT '',
  `ordre`     smallint(6) NOT NULL DEFAULT 0,
  `archive`   tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_categories_livre` (`livre_id`,`sens`,`ordre`),
  KEY `fk_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_livre`  FOREIGN KEY (`livre_id`)  REFERENCES `livres` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les opérations.
--
-- 'jour' reste en clair : c'est la colonne sur laquelle on filtre, et
-- une date seule ne dit rien. 'montant', 'libelle' et 'note' sont
-- chiffrés. 'sens' reste lisible — savoir qu'une ligne est une entrée
-- sans savoir de combien ni d'où ne renseigne personne, et cela évite de
-- déchiffrer toute la table pour compter les recettes d'un mois.
--
-- 'vers_compte_id' porte les virements internes : une seule ligne, pas
-- deux, sinon les totaux comptent deux fois le même franc.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `operations` (
  `id`             int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`       int(10) UNSIGNED NOT NULL,
  `compte_id`      int(10) UNSIGNED NOT NULL,
  `vers_compte_id` int(10) UNSIGNED DEFAULT NULL,
  `categorie_id`   int(10) UNSIGNED DEFAULT NULL,
  `emprunt_id`     int(10) UNSIGNED DEFAULT NULL,
  `jour`           date NOT NULL,
  `libelle`        varbinary(255) NOT NULL,
  `montant`        varbinary(64) NOT NULL,
  `sens`           enum('entree','sortie','virement') NOT NULL DEFAULT 'sortie',
  `note`           varbinary(512) DEFAULT NULL,
  `pointe`         tinyint(1) NOT NULL DEFAULT 0,
  `recurrence_id`  int(10) UNSIGNED DEFAULT NULL,
  `user_id`        int(10) UNSIGNED DEFAULT NULL,
  `created_at`     datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ops_livre_jour` (`livre_id`,`jour`),
  KEY `idx_ops_compte`     (`compte_id`,`jour`),
  KEY `idx_ops_categorie`  (`categorie_id`,`jour`),
  KEY `fk_ops_vers`        (`vers_compte_id`),
  KEY `fk_ops_emprunt`     (`emprunt_id`),
  CONSTRAINT `fk_ops_livre`     FOREIGN KEY (`livre_id`)       REFERENCES `livres` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_ops_compte`    FOREIGN KEY (`compte_id`)      REFERENCES `comptes` (`id`)    ON DELETE CASCADE,
  CONSTRAINT `fk_ops_vers`      FOREIGN KEY (`vers_compte_id`) REFERENCES `comptes` (`id`)    ON DELETE SET NULL,
  CONSTRAINT `fk_ops_categorie` FOREIGN KEY (`categorie_id`)   REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Le budget par enveloppe : combien on s'accorde, par catégorie et par
-- mois. 'mois' est au format AAAA-MM.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enveloppes` (
  `livre_id`     int(10) UNSIGNED NOT NULL,
  `categorie_id` int(10) UNSIGNED NOT NULL,
  `mois`         char(7) NOT NULL,
  `montant`      varbinary(64) NOT NULL,
  PRIMARY KEY (`livre_id`,`categorie_id`,`mois`),
  KEY `fk_env_categorie` (`categorie_id`),
  CONSTRAINT `fk_env_livre`     FOREIGN KEY (`livre_id`)     REFERENCES `livres` (`id`)     ON DELETE CASCADE,
  CONSTRAINT `fk_env_categorie` FOREIGN KEY (`categorie_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les ordres permanents : loyer, salaire, prime d'assurance.
-- 'prochaine' reste en clair : c'est ce que la tâche planifiée
-- interroge pour savoir quoi produire, et une date ne trahit rien.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `recurrences` (
  `id`           int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`     int(10) UNSIGNED NOT NULL,
  `compte_id`    int(10) UNSIGNED NOT NULL,
  `categorie_id` int(10) UNSIGNED DEFAULT NULL,
  `libelle`      varbinary(255) NOT NULL,
  `montant`      varbinary(64) NOT NULL,
  `sens`         enum('entree','sortie') NOT NULL DEFAULT 'sortie',
  `frequence`    enum('mensuel','bimestriel','trimestriel','semestriel','annuel') NOT NULL DEFAULT 'mensuel',
  `jour_du_mois` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `debut`        date NOT NULL,
  `fin`          date DEFAULT NULL,
  `prochaine`    date NOT NULL,
  `active`       tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_recurrences` (`livre_id`,`active`,`prochaine`),
  KEY `fk_rec_compte` (`compte_id`),
  CONSTRAINT `fk_rec_livre`  FOREIGN KEY (`livre_id`)  REFERENCES `livres` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_rec_compte` FOREIGN KEY (`compte_id`) REFERENCES `comptes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- LES EMPRUNTS ET LES HYPOTHÈQUES
--
-- Ce qui manquait entièrement. Un emprunt n'est pas un solde négatif :
-- c'est un capital, un taux, une durée et une manière de rembourser.
--
-- 'mode' est le cœur, et le vocabulaire suisse compte ici :
--
--   annuites  — mensualité constante ; la part d'intérêt décroît, celle
--               de capital croît. C'est le prêt personnel, le leasing,
--               le crédit à la consommation.
--   constant  — amortissement constant : on rembourse chaque fois la
--               même part de capital, et l'intérêt décroît avec le
--               solde. La mensualité baisse donc dans le temps.
--   direct    — hypothèque à amortissement direct : le capital baisse
--               réellement, les intérêts se calculent sur le solde.
--   indirect  — hypothèque à amortissement indirect, propre à la
--               Suisse : le capital NE BAISSE PAS. On ne paie que les
--               intérêts à la banque, et l'amortissement est versé sur
--               un 3e pilier nanti, qui remboursera le capital à
--               l'échéance. L'intérêt reste donc constant, et la
--               déduction fiscale est maintenue. Modéliser cela comme un
--               amortissement direct fausserait à la fois l'échéancier
--               et le patrimoine : le 3a est un ACTIF, pas une
--               diminution de dette.
--   infine    — remboursement du capital en une fois à l'échéance,
--               intérêts seuls d'ici là.
--
-- 'taux_annuel' est en points de base (1 pour cent = 100), donc entier :
-- un taux stocké en flottant se met à valoir 1.4899999999 au bout de
-- trois calculs, et un échéancier faux ne se remarque qu'à la fin.
-- Il est chiffré comme le reste — un taux, croisé avec une date, en dit
-- long sur la solvabilité de quelqu'un.
--
-- 'compte_id' est le compte de type 'dette' qui porte le solde ;
-- 'compte_amortissement_id' le 3a nanti, en amortissement indirect.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `emprunts` (
  `id`                      int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`                int(10) UNSIGNED NOT NULL,
  `compte_id`               int(10) UNSIGNED NOT NULL,
  `compte_amortissement_id` int(10) UNSIGNED DEFAULT NULL,
  `bien_compte_id`          int(10) UNSIGNED DEFAULT NULL,
  `nom`                     varbinary(255) NOT NULL,
  `preteur`                 varbinary(255) DEFAULT NULL,
  `genre`                   enum('hypotheque','pret','leasing','credit','prive') NOT NULL DEFAULT 'pret',
  `mode`                    enum('annuites','constant','direct','indirect','infine') NOT NULL DEFAULT 'annuites',
  `capital_initial`         varbinary(64) NOT NULL,
  `taux_annuel`             varbinary(64) NOT NULL,
  `amortissement_periodique` varbinary(64) DEFAULT NULL,
  `periodicite`             enum('mensuel','trimestriel','semestriel','annuel') NOT NULL DEFAULT 'mensuel',
  `debut`                   date NOT NULL,
  `echeance`                date DEFAULT NULL,
  `duree_mois`              smallint(5) UNSIGNED DEFAULT NULL,
  `note`                    varbinary(512) DEFAULT NULL,
  `archive`                 tinyint(1) NOT NULL DEFAULT 0,
  `created_at`              datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_emprunts_livre` (`livre_id`,`archive`),
  KEY `fk_emprunts_compte` (`compte_id`),
  KEY `fk_emprunts_amort`  (`compte_amortissement_id`),
  KEY `fk_emprunts_bien`   (`bien_compte_id`),
  CONSTRAINT `fk_emprunts_livre`  FOREIGN KEY (`livre_id`)  REFERENCES `livres` (`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_emprunts_compte` FOREIGN KEY (`compte_id`) REFERENCES `comptes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_emprunts_amort`  FOREIGN KEY (`compte_amortissement_id`) REFERENCES `comptes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_emprunts_bien`   FOREIGN KEY (`bien_compte_id`)          REFERENCES `comptes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- L'échéancier, une ligne par échéance.
--
-- Il est CALCULÉ, pas saisi, et regénéré dès qu'une condition change.
-- On le stocke tout de même plutôt que de le recalculer à la volée, pour
-- une raison qui n'est pas la performance : une échéance peut être
-- pointée quand elle a réellement été payée, et un remboursement
-- anticipé rompt la suite. Un échéancier purement calculé oublierait ce
-- qui s'est passé.
--
-- 'numero' commence à 1. 'capital_restant' est celui APRÈS l'échéance.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `echeances` (
  `id`              int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `emprunt_id`      int(10) UNSIGNED NOT NULL,
  `numero`          smallint(5) UNSIGNED NOT NULL,
  `jour`            date NOT NULL,
  `montant`         varbinary(64) NOT NULL,
  `part_interet`    varbinary(64) NOT NULL,
  `part_capital`    varbinary(64) NOT NULL,
  `capital_restant` varbinary(64) NOT NULL,
  `operation_id`    int(10) UNSIGNED DEFAULT NULL,
  `paye_le`         date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_echeance` (`emprunt_id`,`numero`),
  KEY `idx_echeances_jour` (`emprunt_id`,`jour`),
  KEY `fk_ech_operation` (`operation_id`),
  CONSTRAINT `fk_ech_emprunt`   FOREIGN KEY (`emprunt_id`)  REFERENCES `emprunts` (`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_ech_operation` FOREIGN KEY (`operation_id`) REFERENCES `operations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les cours de change, pour un compte tenu dans une autre devise.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `taux` (
  `livre_id` int(10) UNSIGNED NOT NULL,
  `devise`   char(3) NOT NULL,
  `taux`     decimal(14,6) NOT NULL,
  `maj_le`   date NOT NULL,
  PRIMARY KEY (`livre_id`,`devise`),
  CONSTRAINT `fk_taux_livre` FOREIGN KEY (`livre_id`) REFERENCES `livres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Le journal du livre.
--
-- Un livre partagé sans journal est une pièce où l'on entend marcher
-- sans savoir qui. Il dit qui a ajouté, modifié ou supprimé quoi, et
-- quand — sans le contenu, qui reste dans les tables chiffrées.
--
-- Il sert aussi à répondre à « je n'ai pas touché à ça » : la question
-- se pose dans tous les budgets de couple, et un outil qui n'a pas la
-- réponse laisse la dispute sans arbitre.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `journal` (
  `id`         bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `livre_id`   int(10) UNSIGNED NOT NULL,
  `user_id`    int(10) UNSIGNED DEFAULT NULL,
  `action`     varchar(40) NOT NULL,
  `objet`      varchar(24) NOT NULL DEFAULT '',
  `objet_id`   int(10) UNSIGNED DEFAULT NULL,
  `ip`         varbinary(16) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_journal_livre` (`livre_id`,`created_at`),
  CONSTRAINT `fk_journal_livre` FOREIGN KEY (`livre_id`) REFERENCES `livres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
