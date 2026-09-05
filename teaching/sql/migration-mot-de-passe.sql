-- =====================================================================
-- À exécuter UNIQUEMENT si la base a été créée avec la première version
-- de schema.sql, avant l'ajout de la récupération de mot de passe.
-- Sur une base neuve, schema.sql contient déjà tout ceci.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN pwd_version INT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE login_attempts
    ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'login';

DROP INDEX idx_login_ip ON login_attempts;
CREATE INDEX idx_login_ip ON login_attempts (ip, kind, created_at);

CREATE TABLE IF NOT EXISTS password_resets (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    token_hash  CHAR(64)     NOT NULL,
    expires_at  DATETIME     NOT NULL,
    used_at     DATETIME     NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reset_token (token_hash),
    KEY idx_reset_user (user_id),
    CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Les sessions ouvertes seront simplement redemandées à la prochaine visite.
