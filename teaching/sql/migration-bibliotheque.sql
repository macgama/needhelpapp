-- =====================================================================
-- À exécuter sur une base déjà installée, pour ajouter les métadonnées
-- des dictées, le partage et la bibliothèque publique.
-- Sur une base neuve, schema.sql contient déjà tout ceci.
-- =====================================================================

ALTER TABLE dictations
    CHANGE name title VARCHAR(120) NOT NULL,
    ADD COLUMN author       VARCHAR(120) NOT NULL DEFAULT '' AFTER title,
    ADD COLUMN level        VARCHAR(8)   NOT NULL DEFAULT '' AFTER author,
    ADD COLUMN word_count   INT UNSIGNED NOT NULL DEFAULT 0  AFTER body,
    ADD COLUMN is_public    TINYINT(1)   NOT NULL DEFAULT 0  AFTER word_count,
    ADD COLUMN share_token  CHAR(32)     NULL                AFTER is_public,
    ADD COLUMN reports      SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER share_token,
    ADD COLUMN published_at DATETIME     NULL                AFTER reports,
    ADD UNIQUE KEY uk_dictations_share (share_token),
    ADD KEY idx_dictations_public (is_public, level, published_at);

-- Les dictées déjà enregistrées gardent leur titre et restent privées.

CREATE TABLE IF NOT EXISTS reports (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dictation_id  INT UNSIGNED NOT NULL,
    ip            VARCHAR(45)  NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_report_once (dictation_id, ip),
    CONSTRAINT fk_reports_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
