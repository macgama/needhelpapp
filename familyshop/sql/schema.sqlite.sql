-- FamilyShop — le même schéma, traduit pour SQLite.
-- Sert aux essais et au développement local ; la production est en MySQL.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NULL,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  created_at TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT  NOT NULL DEFAULT 'Ma famille',
  join_code  TEXT      NOT NULL,
  couverts   INTEGER NOT NULL DEFAULT 4,
  version    INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER NULL,
  created_at TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (join_code)
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  role         TEXT  NOT NULL DEFAULT 'membre',
  joined_at    TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (household_id, user_id),
  FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL,
  user_id      INTEGER NULL,
  name         TEXT NOT NULL,
  couverts     INTEGER NOT NULL DEFAULT 4,
  minutes      INTEGER NOT NULL DEFAULT 0,
  categorie    TEXT  NOT NULL DEFAULT 'plat',
  notes        TEXT         NULL,
  favori       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0,
  label     TEXT  NOT NULL,
  quantite  REAL NULL,
  unite     TEXT  NOT NULL DEFAULT '',
  rayon     TEXT  NOT NULL DEFAULT 'divers',
  FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL,
  jour         TEXT         NOT NULL,
  repas        TEXT   NOT NULL DEFAULT 'soir',
  recipe_id    INTEGER NULL,
  libelle      TEXT NOT NULL DEFAULT '',
  couverts     INTEGER NOT NULL DEFAULT 4,
  created_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL,
  label        TEXT  NOT NULL,
  cle          TEXT  NOT NULL,
  quantite     REAL NULL,
  unite        TEXT  NOT NULL DEFAULT '',
  rayon        TEXT  NOT NULL DEFAULT 'divers',
  origine      TEXT   NOT NULL DEFAULT 'menu',
  detail       TEXT NOT NULL DEFAULT '',
  coche_le     TEXT     NULL,
  coche_par    INTEGER NULL,
  created_at   TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habitudes (
  household_id INTEGER NOT NULL,
  cle          TEXT  NOT NULL,
  label        TEXT  NOT NULL,
  rayon        TEXT  NOT NULL DEFAULT 'divers',
  unite        TEXT  NOT NULL DEFAULT '',
  fois         INTEGER NOT NULL DEFAULT 1,
  dernier      TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (household_id, cle),
  FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE
);
