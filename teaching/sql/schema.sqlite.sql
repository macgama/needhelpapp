-- Même structure, en SQLite : pratique pour essayer l'application
-- sur son ordinateur avant de la mettre en ligne.
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id    INTEGER UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    google_sub    TEXT UNIQUE,
    settings      TEXT,
    pwd_version   INTEGER NOT NULL DEFAULT 0,
    role          TEXT NOT NULL DEFAULT 'membre',
    plan          TEXT NOT NULL DEFAULT 'gratuit',
    plan_statut   TEXT NOT NULL DEFAULT 'aucun',
    plan_fin      TEXT,
    payeur_id     TEXT,
    abonnement_id TEXT,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS dictations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    author       TEXT NOT NULL DEFAULT '',
    level        TEXT NOT NULL DEFAULT '',
    lang        TEXT NOT NULL DEFAULT 'fr',
    body         TEXT NOT NULL,
    word_count   INTEGER NOT NULL DEFAULT 0,
    is_public    INTEGER NOT NULL DEFAULT 0,
    share_token  TEXT UNIQUE,
    reports      INTEGER NOT NULL DEFAULT 0,
    borrowed     INTEGER NOT NULL DEFAULT 0,
    origin_token TEXT,
    origin_owner TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dictations_public ON dictations (is_public, level, published_at);
CREATE INDEX IF NOT EXISTS idx_dictations_user ON dictations (user_id, updated_at);
CREATE TABLE IF NOT EXISTS verb_lists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    verbs       TEXT NOT NULL,
    tenses      TEXT NOT NULL DEFAULT '',
    langue      TEXT NOT NULL DEFAULT 'fr',
    is_public   INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    reports     INTEGER NOT NULL DEFAULT 0,
    borrowed    INTEGER NOT NULL DEFAULT 0,
    origin_token TEXT,
    origin_owner TEXT NOT NULL DEFAULT '',
    share_token TEXT UNIQUE,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lists_user ON verb_lists (user_id, updated_at);
CREATE TABLE IF NOT EXISTS attempts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dictation_id  INTEGER REFERENCES dictations(id) ON DELETE SET NULL,
    label         TEXT NOT NULL DEFAULT 'Dictée',
    words         INTEGER NOT NULL DEFAULT 0,
    correct_words INTEGER NOT NULL DEFAULT 0,
    errors        INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts (user_id, id);
CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    dictation_id INTEGER NOT NULL REFERENCES dictations(id) ON DELETE CASCADE,
    ip           TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (dictation_id, ip)
);
CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'login',
    email      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip, kind, created_at);
CREATE TABLE IF NOT EXISTS password_resets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at    TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_resets (user_id);

CREATE TABLE IF NOT EXISTS billing_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   TEXT NOT NULL UNIQUE,
    type       TEXT NOT NULL,
    user_id    INTEGER,
    resume     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocab_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, chapter TEXT NOT NULL DEFAULT '',
    lang_source TEXT NOT NULL DEFAULT 'fr', lang_target TEXT NOT NULL DEFAULT 'de',
    is_public INTEGER NOT NULL DEFAULT 0, published_at TEXT,
    reports INTEGER NOT NULL DEFAULT 0, borrowed INTEGER NOT NULL DEFAULT 0,
    origin_token TEXT, origin_owner TEXT NOT NULL DEFAULT '', share_token TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vocab_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES vocab_lists(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL, target TEXT NOT NULL, note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_words_list ON vocab_words (list_id, position);
CREATE TABLE IF NOT EXISTS vocab_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id INTEGER REFERENCES vocab_lists(id) ON DELETE SET NULL,
    label TEXT NOT NULL DEFAULT '', direction TEXT NOT NULL DEFAULT 'vers',
    asked INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS math_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, chapter TEXT NOT NULL DEFAULT '',
    famille TEXT NOT NULL, reglages TEXT NOT NULL,
    nb_questions INTEGER NOT NULL DEFAULT 20,
    is_public INTEGER NOT NULL DEFAULT 0, published_at TEXT,
    reports INTEGER NOT NULL DEFAULT 0, borrowed INTEGER NOT NULL DEFAULT 0,
    origin_token TEXT, origin_owner TEXT NOT NULL DEFAULT '', share_token TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS math_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id INTEGER REFERENCES math_lists(id) ON DELETE SET NULL,
    label TEXT NOT NULL DEFAULT '', famille TEXT NOT NULL DEFAULT '',
    asked INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0, secondes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
