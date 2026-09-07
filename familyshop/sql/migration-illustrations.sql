-- Les illustrations de recettes, sur une base déjà en service.
-- À jouer une fois dans phpMyAdmin. Sans effet si la table existe déjà.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS illustrations (
    cle        VARCHAR(80)  NOT NULL,
    fichier    VARCHAR(80)  NOT NULL,
    libelle    VARCHAR(120) NOT NULL DEFAULT '',
    prompt     VARCHAR(500) NOT NULL DEFAULT '',
    source     VARCHAR(24)  NOT NULL DEFAULT 'televerse',
    largeur    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    hauteur    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    octets     INT UNSIGNED NOT NULL DEFAULT 0,
    cree_par   INT UNSIGNED NULL,
    cree_le    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cle),
    KEY idx_illustrations_date (cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
