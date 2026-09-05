-- =====================================================================
-- Le vocabulaire : des listes bilingues, leurs mots, leurs résultats.
-- À exécuter ligne par ligne ; « déjà utilisé » signifie que c'est fait.
-- =====================================================================

CREATE TABLE IF NOT EXISTS vocab_lists (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    name         VARCHAR(120) NOT NULL,
    chapter      VARCHAR(80)  NOT NULL DEFAULT '',
    -- codes de langue à deux lettres : fr, de, en, it
    lang_source  CHAR(2)      NOT NULL DEFAULT 'fr',
    lang_target  CHAR(2)      NOT NULL DEFAULT 'de',
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
    UNIQUE KEY uk_vocab_share (share_token),
    KEY idx_vocab_user (user_id, updated_at),
    KEY idx_vocab_public (is_public, lang_target, published_at),
    CONSTRAINT fk_vocab_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un mot par ligne : c'est ce qui permet de chercher, de compter et de
-- suivre les réussites mot par mot, ce qu'un champ unique interdirait.
CREATE TABLE IF NOT EXISTS vocab_words (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    list_id   INT UNSIGNED NOT NULL,
    position  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    source    VARCHAR(120) NOT NULL,   -- dans la langue maternelle
    target    VARCHAR(120) NOT NULL,   -- dans la langue apprise
    note      VARCHAR(80)  NOT NULL DEFAULT '',  -- article, pluriel, remarque
    PRIMARY KEY (id),
    KEY idx_words_list (list_id, position),
    CONSTRAINT fk_words_list FOREIGN KEY (list_id) REFERENCES vocab_lists (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vocab_attempts (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    INT UNSIGNED NOT NULL,
    list_id    INT UNSIGNED NULL,
    label      VARCHAR(120) NOT NULL DEFAULT '',
    direction  VARCHAR(12)  NOT NULL DEFAULT 'vers',
    asked      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    correct    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    errors     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_vattempts_user (user_id, id),
    CONSTRAINT fk_vattempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_vattempts_list FOREIGN KEY (list_id) REFERENCES vocab_lists (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
