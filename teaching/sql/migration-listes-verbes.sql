-- =====================================================================
-- À exécuter sur une base déjà installée, pour permettre aux
-- utilisateurs de composer et de partager leurs listes de verbes.
-- Sur une base neuve, schema.sql contient déjà cette table.
-- =====================================================================

CREATE TABLE IF NOT EXISTS verb_lists (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    name         VARCHAR(120) NOT NULL,
    verbs        TEXT         NOT NULL,
    share_token  CHAR(32)     NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_lists_share (share_token),
    KEY idx_lists_user (user_id, updated_at),
    CONSTRAINT fk_lists_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
