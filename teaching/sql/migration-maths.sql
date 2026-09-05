-- =====================================================================
-- Les mathématiques : des séries enregistrées et leurs résultats.
--
-- Une « série » n'est pas une liste d'exercices mais un RÉGLAGE :
-- la famille (livrets, compléments…) et ses paramètres. Les questions
-- sont engendrées à chaque fois, donc jamais deux séances identiques.
-- C'est pourquoi il n'y a pas de table des questions.
-- =====================================================================

CREATE TABLE IF NOT EXISTS math_lists (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    name         VARCHAR(120) NOT NULL,
    chapter      VARCHAR(80)  NOT NULL DEFAULT '',
    famille      VARCHAR(24)  NOT NULL,
    reglages     TEXT         NOT NULL,
    nb_questions SMALLINT UNSIGNED NOT NULL DEFAULT 20,
    is_public    TINYINT(1)   NOT NULL DEFAULT 0,
    published_at DATETIME     NULL,
    reports      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    borrowed     TINYINT(1)   NOT NULL DEFAULT 0,
    origin_token CHAR(32)     NULL,
    origin_owner VARCHAR(80)  NOT NULL DEFAULT '',
    share_token  CHAR(32)     NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_math_share (share_token),
    KEY idx_math_user (user_id, updated_at),
    KEY idx_math_public (is_public, famille, published_at),
    CONSTRAINT fk_math_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_attempts (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    list_id    INT UNSIGNED NULL,
    label      VARCHAR(120) NOT NULL DEFAULT '',
    famille    VARCHAR(24)  NOT NULL DEFAULT '',
    asked      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    correct    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    errors     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    secondes   INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mattempts_user (user_id, id),
    CONSTRAINT fk_mattempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_mattempts_list FOREIGN KEY (list_id) REFERENCES math_lists (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
