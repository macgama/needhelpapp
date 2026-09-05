-- =====================================================================
-- FamilyShop — la base 6l3nq9_familyshop
--
-- Le foyer est l'unité de partage : tout ce qui compte lui appartient,
-- pas à la personne. Un conjoint qui coche un article au magasin doit le
-- faire disparaître chez l'autre — c'est la raison d'être de l'application.
--
-- L'identité vient du portail NeedHelpApp (base 6l3nq9_core). La table
-- `users` locale n'est qu'un point d'ancrage, comme dans teaching.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id INT UNSIGNED NULL,
    email      VARCHAR(190) NOT NULL,
    name       VARCHAR(120) NOT NULL DEFAULT '',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_account (account_id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Le foyer
--
-- `version` est un compteur incrémenté à chaque écriture. Les navigateurs
-- ouverts le demandent toutes les quelques secondes : s'il a bougé, ils
-- rechargent. C'est une synchronisation modeste, mais elle tient sur un
-- hébergement mutualisé, là où des WebSockets ne tiendraient pas.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(80)  NOT NULL DEFAULT 'Ma famille',
    join_code  CHAR(8)      NOT NULL,
    couverts   TINYINT UNSIGNED NOT NULL DEFAULT 4,
    version    INT UNSIGNED NOT NULL DEFAULT 1,
    created_by INT UNSIGNED NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_households_code (join_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS household_members (
    household_id INT UNSIGNED NOT NULL,
    user_id      INT UNSIGNED NOT NULL,
    role         VARCHAR(16)  NOT NULL DEFAULT 'membre',
    joined_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (household_id, user_id),
    KEY idx_members_user (user_id),
    CONSTRAINT fk_members_household FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE,
    CONSTRAINT fk_members_user      FOREIGN KEY (user_id)      REFERENCES users (id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipes (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    household_id INT UNSIGNED NOT NULL,
    user_id      INT UNSIGNED NULL,
    name         VARCHAR(120) NOT NULL,
    couverts     TINYINT UNSIGNED NOT NULL DEFAULT 4,
    minutes      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    categorie    VARCHAR(24)  NOT NULL DEFAULT 'plat',
    notes        TEXT         NULL,
    favori       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_recipes_household (household_id, name),
    CONSTRAINT fk_recipes_household FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un ingrédient par ligne : c'est ce qui permet de consolider.
CREATE TABLE IF NOT EXISTS recipe_items (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    recipe_id INT UNSIGNED NOT NULL,
    position  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    label     VARCHAR(80)  NOT NULL,
    quantite  DECIMAL(9,3) NULL,
    unite     VARCHAR(12)  NOT NULL DEFAULT '',
    rayon     VARCHAR(24)  NOT NULL DEFAULT 'divers',
    PRIMARY KEY (id),
    KEY idx_items_recipe (recipe_id, position),
    CONSTRAINT fk_items_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Le menu de la semaine
-- Chaque repas porte son nombre de couverts : on n'est pas toujours
-- le même nombre à table.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_entries (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    household_id INT UNSIGNED NOT NULL,
    jour         DATE         NOT NULL,
    repas        VARCHAR(8)   NOT NULL DEFAULT 'soir',
    recipe_id    INT UNSIGNED NULL,
    libelle      VARCHAR(120) NOT NULL DEFAULT '',
    couverts     TINYINT UNSIGNED NOT NULL DEFAULT 4,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_plan (household_id, jour, repas),
    CONSTRAINT fk_plan_household FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_recipe    FOREIGN KEY (recipe_id)    REFERENCES recipes (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- La liste de courses
--
-- Deux origines : ce qui vient du menu, recalculé à chaque changement,
-- et ce qu'on ajoute à la main, qui ne doit jamais être effacé par un
-- recalcul — c'est le principal piège de ce genre d'application.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS list_items (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    household_id INT UNSIGNED NOT NULL,
    label        VARCHAR(80)  NOT NULL,
    cle          VARCHAR(80)  NOT NULL,
    quantite     DECIMAL(9,3) NULL,
    unite        VARCHAR(12)  NOT NULL DEFAULT '',
    rayon        VARCHAR(24)  NOT NULL DEFAULT 'divers',
    origine      VARCHAR(8)   NOT NULL DEFAULT 'menu',
    detail       VARCHAR(190) NOT NULL DEFAULT '',
    coche_le     DATETIME     NULL,
    coche_par    INT UNSIGNED NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_list (household_id, rayon, label),
    KEY idx_list_cle (household_id, cle),
    CONSTRAINT fk_list_household FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ce que le foyer achète souvent : les suggestions
CREATE TABLE IF NOT EXISTS habitudes (
    household_id INT UNSIGNED NOT NULL,
    cle          VARCHAR(80)  NOT NULL,
    label        VARCHAR(80)  NOT NULL,
    rayon        VARCHAR(24)  NOT NULL DEFAULT 'divers',
    unite        VARCHAR(12)  NOT NULL DEFAULT '',
    fois         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    dernier      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (household_id, cle),
    KEY idx_habitudes (household_id, fois),
    CONSTRAINT fk_habitudes_household FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
