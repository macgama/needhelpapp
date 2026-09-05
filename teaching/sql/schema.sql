-- =====================================================================
-- La dictée — structure de la base (MySQL / MariaDB, Infomaniak)
-- À exécuter une fois dans phpMyAdmin, sur la base créée au préalable.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- identifiant du compte central NeedHelpApp (base 6l3nq9_core)
    account_id     INT UNSIGNED NULL,
    email          VARCHAR(190) NOT NULL,
    name           VARCHAR(60)  NOT NULL DEFAULT '',
    password_hash  VARCHAR(255) NOT NULL DEFAULT '',
    -- identifiant Google, pour les comptes ouverts avec « Continuer avec Google »
    google_sub     VARCHAR(64)  NULL,
    settings       TEXT         NULL,
    pwd_version    INT UNSIGNED NOT NULL DEFAULT 0,
    -- 'membre', 'moderateur' ou 'admin' : voir migration-roles.sql
    role           VARCHAR(16)  NOT NULL DEFAULT 'membre',
    -- abonnement : 'gratuit', 'mensuel' ou 'annuel'
    plan           VARCHAR(16)  NOT NULL DEFAULT 'gratuit',
    -- 'actif', 'resilie' (payé jusqu'à la fin de la période), 'impaye', 'aucun'
    plan_statut    VARCHAR(16)  NOT NULL DEFAULT 'aucun',
    plan_fin       DATETIME     NULL,
    payeur_id      VARCHAR(64)  NULL,
    abonnement_id  VARCHAR(64)  NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at  DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_google (google_sub),
    UNIQUE KEY uk_users_account (account_id),
    KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dictations (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    title        VARCHAR(120) NOT NULL,
    author       VARCHAR(120) NOT NULL DEFAULT '',
    -- niveau normalisé n1 à n9 : n1 vaut 3H en Suisse, CP en France,
    -- P1 en Belgique, 1re année au Québec. La correspondance vit côté
    -- navigateur, la base ne connaît que le code.
    level        VARCHAR(8)   NOT NULL DEFAULT '',
    lang         CHAR(2)      NOT NULL DEFAULT 'fr',
    body         MEDIUMTEXT   NOT NULL,
    word_count   INT UNSIGNED NOT NULL DEFAULT 0,
    is_public    TINYINT(1)   NOT NULL DEFAULT 0,
    share_token  CHAR(32)     NULL,
    reports      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    -- dictée reprise chez un autre utilisateur : consultable, non modifiable
    borrowed     TINYINT(1)   NOT NULL DEFAULT 0,
    origin_token CHAR(32)     NULL,
    -- nom du compte qui l'a composée, distinct de `author` qui désigne
    -- l'auteur du texte lui-même : Maupassant n'a pas de compte ici
    origin_owner VARCHAR(80)  NOT NULL DEFAULT '',
    published_at DATETIME     NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_dictations_share (share_token),
    KEY idx_dictations_user (user_id, updated_at),
    KEY idx_dictations_public (is_public, level, published_at),
    CONSTRAINT fk_dictations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Listes de verbes composées par les utilisateurs (application Conjugaison)
CREATE TABLE IF NOT EXISTS verb_lists (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED NOT NULL,
    name         VARCHAR(120) NOT NULL,
    verbs        TEXT         NOT NULL,
    tenses       TEXT         NOT NULL DEFAULT '',
    langue       CHAR(2)      NOT NULL DEFAULT 'fr',
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
    UNIQUE KEY uk_lists_share (share_token),
    KEY idx_lists_user (user_id, updated_at),
    KEY idx_lists_public (is_public, published_at),
    CONSTRAINT fk_lists_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attempts (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        INT UNSIGNED NOT NULL,
    dictation_id   INT UNSIGNED NULL,
    label          VARCHAR(120) NOT NULL DEFAULT 'Dictée',
    words          INT UNSIGNED NOT NULL DEFAULT 0,
    correct_words  INT UNSIGNED NOT NULL DEFAULT 0,
    errors         INT UNSIGNED NOT NULL DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_attempts_user (user_id, id),
    KEY idx_attempts_dictation (user_id, dictation_id),
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un signalement par dictée et par adresse : une seule personne ne peut
-- pas faire retirer une dictée à elle seule en cliquant plusieurs fois.
CREATE TABLE IF NOT EXISTS reports (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dictation_id  INT UNSIGNED NOT NULL,
    ip            VARCHAR(45)  NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_report_once (dictation_id, ip),
    CONSTRAINT fk_reports_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip          VARCHAR(45)  NOT NULL,
    kind        VARCHAR(16)  NOT NULL DEFAULT 'login',
    email       VARCHAR(190) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_login_ip (ip, kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Journal des évènements de facturation reçus du prestataire de paiement.
-- L'identifiant de l'évènement est unique : un même message rejoué deux fois
-- ne sera traité qu'une seule fois.
CREATE TABLE IF NOT EXISTS billing_events (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id    VARCHAR(80)  NOT NULL,
    type        VARCHAR(60)  NOT NULL,
    user_id     INT UNSIGNED NULL,
    resume      VARCHAR(255) NOT NULL DEFAULT '',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_billing_event (event_id),
    KEY idx_billing_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
