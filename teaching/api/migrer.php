<?php
declare(strict_types=1);

/**
 * Mise à jour de la base de données.
 *
 * Les fichiers de migration se rejouent mal : une migration déjà passée à
 * moitié s'arrête sur la première instruction déjà appliquée, et l'on ne
 * sait plus où l'on en est. Ce script regarde la base telle qu'elle est et
 * ne produit que les instructions manquantes.
 *
 * Deux usages :
 *   api/migrer.php              affiche le SQL à coller dans phpMyAdmin
 *   api/migrer.php?executer=1&cle=…   l'applique directement
 *
 * La clé est celle de 'maintenance_token' dans config.php. Sans elle, le
 * script se contente d'afficher : il ne touche à rien.
 */

require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$sqlite = (config()['driver'] ?? 'mysql') === 'sqlite';

/** Colonnes présentes dans une table, tableau vide si la table n'existe pas. */
function colonnes(string $table): array
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $sqlite = (config()['driver'] ?? 'mysql') === 'sqlite';
    try {
        if ($sqlite) {
            $st = db()->query('PRAGMA table_info(' . $table . ')');
            $cache[$table] = array_column($st->fetchAll(), 'name');
        } else {
            $st = db()->query('SHOW COLUMNS FROM `' . $table . '`');
            $cache[$table] = array_column($st->fetchAll(), 'Field');
        }
    } catch (Throwable $e) {
        $cache[$table] = [];
    }
    return $cache[$table];
}

function tableExiste(string $t): bool { return colonnes($t) !== []; }
function colonneExiste(string $t, string $c): bool { return in_array($c, colonnes($t), true); }

$mysql = !$sqlite;
$instructions = [];
$ajouter = static function (string $sql) use (&$instructions): void { $instructions[] = $sql; };

/* ---------------------------------------------------------------
   1. Tables entières
   --------------------------------------------------------------- */
$moteur = ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

if (!tableExiste('password_resets')) {
    $ajouter($mysql
        ? "CREATE TABLE password_resets (
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
)" . $moteur
        : "CREATE TABLE password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
}

if (!tableExiste('reports')) {
    $ajouter($mysql
        ? "CREATE TABLE reports (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dictation_id  INT UNSIGNED NOT NULL,
    ip            VARCHAR(45)  NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_report_once (dictation_id, ip),
    CONSTRAINT fk_reports_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE CASCADE
)" . $moteur
        : "CREATE TABLE reports (id INTEGER PRIMARY KEY AUTOINCREMENT, dictation_id INTEGER NOT NULL REFERENCES dictations(id) ON DELETE CASCADE, ip TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (dictation_id, ip))");
}

if (!tableExiste('verb_lists')) {
    $ajouter($mysql
        ? "CREATE TABLE verb_lists (
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
)" . $moteur
        : "CREATE TABLE verb_lists (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, verbs TEXT NOT NULL, share_token TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
}

if (!tableExiste('billing_events')) {
    $ajouter($mysql
        ? "CREATE TABLE billing_events (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id    VARCHAR(80)  NOT NULL,
    type        VARCHAR(60)  NOT NULL,
    user_id     INT UNSIGNED NULL,
    resume      VARCHAR(255) NOT NULL DEFAULT '',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_billing_event (event_id),
    KEY idx_billing_user (user_id, created_at)
)" . $moteur
        : "CREATE TABLE billing_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, type TEXT NOT NULL, user_id INTEGER, resume TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
}

/* ---------------------------------------------------------------
   2. Colonnes
   --------------------------------------------------------------- */
$colonne = static function (string $table, string $col, string $mysqlType, string $sqliteType) use ($ajouter, $mysql): void {
    if (colonneExiste($table, $col) || !tableExiste($table)) {
        return;
    }
    $ajouter('ALTER TABLE ' . $table . ' ADD COLUMN ' . $col . ' ' . ($mysql ? $mysqlType : $sqliteType));
};

// mot de passe
$colonne('users', 'pwd_version', 'INT UNSIGNED NOT NULL DEFAULT 0', 'INTEGER NOT NULL DEFAULT 0');
$colonne('login_attempts', 'kind', "VARCHAR(16) NOT NULL DEFAULT 'login'", "TEXT NOT NULL DEFAULT 'login'");

// bibliothèque : le renommage n'a lieu que s'il reste à faire
if (tableExiste('dictations') && colonneExiste('dictations', 'name') && !colonneExiste('dictations', 'title')) {
    $ajouter($mysql
        ? 'ALTER TABLE dictations CHANGE name title VARCHAR(120) NOT NULL'
        : 'ALTER TABLE dictations RENAME COLUMN name TO title');
}
$colonne('dictations', 'author',       "VARCHAR(120) NOT NULL DEFAULT ''", "TEXT NOT NULL DEFAULT ''");
$colonne('dictations', 'level',        "VARCHAR(8) NOT NULL DEFAULT ''",   "TEXT NOT NULL DEFAULT ''");
$colonne('dictations', 'word_count',   'INT UNSIGNED NOT NULL DEFAULT 0',  'INTEGER NOT NULL DEFAULT 0');
$colonne('dictations', 'is_public',    'TINYINT(1) NOT NULL DEFAULT 0',    'INTEGER NOT NULL DEFAULT 0');
$colonne('dictations', 'share_token',  'CHAR(32) NULL',                    'TEXT');
$colonne('dictations', 'reports',      'SMALLINT UNSIGNED NOT NULL DEFAULT 0', 'INTEGER NOT NULL DEFAULT 0');
$colonne('dictations', 'published_at', 'DATETIME NULL',                    'TEXT');

// emprunts
$colonne('dictations', 'borrowed',     'TINYINT(1) NOT NULL DEFAULT 0',    'INTEGER NOT NULL DEFAULT 0');
$colonne('dictations', 'origin_token', 'CHAR(32) NULL',                    'TEXT');
$colonne('dictations', 'origin_owner', "VARCHAR(80) NOT NULL DEFAULT ''",  "TEXT NOT NULL DEFAULT ''");

// abonnement
$colonne('users', 'plan',          "VARCHAR(16) NOT NULL DEFAULT 'gratuit'", "TEXT NOT NULL DEFAULT 'gratuit'");
$colonne('users', 'plan_statut',   "VARCHAR(16) NOT NULL DEFAULT 'aucun'",   "TEXT NOT NULL DEFAULT 'aucun'");
$colonne('users', 'plan_fin',      'DATETIME NULL',                          'TEXT');
$colonne('users', 'payeur_id',     'VARCHAR(64) NULL',                       'TEXT');
$colonne('users', 'abonnement_id', 'VARCHAR(64) NULL',                       'TEXT');
$colonne('attempts', 'dictation_id', 'INT UNSIGNED NULL',                    'INTEGER');

// Google
$colonne('users', 'google_sub', 'VARCHAR(64) NULL', 'TEXT');

/* ---------------------------------------------------------------
   3. Index et contraintes, tolérants s'ils existent déjà
   --------------------------------------------------------------- */
$optionnels = [];
if ($mysql) {
    if (!colonneExiste('dictations', 'share_token')) {
        // rien : la colonne vient d'être créée, l'index suit ci-dessous
    }
    $optionnels[] = 'ALTER TABLE dictations ADD UNIQUE KEY uk_dictations_share (share_token)';
    $optionnels[] = 'ALTER TABLE dictations ADD KEY idx_dictations_public (is_public, level, published_at)';
    $optionnels[] = 'ALTER TABLE dictations ADD KEY idx_dictations_origin (user_id, origin_token)';
    $optionnels[] = 'ALTER TABLE users ADD UNIQUE KEY uk_users_google (google_sub)';
    $optionnels[] = 'ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT \'\'';
    $optionnels[] = 'ALTER TABLE attempts ADD KEY idx_attempts_dictation (user_id, dictation_id)';
    $optionnels[] = 'ALTER TABLE attempts ADD CONSTRAINT fk_attempts_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE SET NULL';
    $optionnels[] = 'DROP INDEX idx_login_ip ON login_attempts';
    $optionnels[] = 'CREATE INDEX idx_login_ip ON login_attempts (ip, kind, created_at)';
} else {
    $optionnels[] = 'CREATE UNIQUE INDEX IF NOT EXISTS uk_dictations_share ON dictations (share_token)';
    $optionnels[] = 'CREATE INDEX IF NOT EXISTS idx_dictations_public ON dictations (is_public, level, published_at)';
    $optionnels[] = 'CREATE UNIQUE INDEX IF NOT EXISTS uk_users_google ON users (google_sub)';
    $optionnels[] = 'CREATE INDEX IF NOT EXISTS idx_attempts_dictation ON attempts (user_id, dictation_id)';
}

/* ---------------------------------------------------------------
   Affichage, ou exécution
   --------------------------------------------------------------- */
$cle = (string) (config()['maintenance_token'] ?? '');
$demandeExecution = !empty($_GET['executer']);
$cleFournie = (string) ($_GET['cle'] ?? '');

if (!$instructions) {
    echo "La base est à jour : rien à faire.\n";
    echo "\nLes index et contraintes secondaires peuvent être vérifiés en exécutant\n";
    echo "ce script avec ?executer=1 ; ceux qui existent déjà seront ignorés.\n";
    if (!$demandeExecution) {
        exit;
    }
}

if (!$demandeExecution) {
    echo "-- Dialecte : " . ($mysql ? 'MySQL / MariaDB' : 'SQLite') . "\n";
    echo "-- Ce SQL ne vaut que pour ce dialecte : ne le collez pas dans l'autre.\n\n";
    echo "Mise à jour de la base : " . count($instructions) . " instruction(s) à appliquer.\n";
    echo "Copiez ce qui suit dans phpMyAdmin, onglet SQL, puis exécutez.\n";
    echo str_repeat('-', 68) . "\n\n";
    foreach ($instructions as $sql) {
        echo rtrim($sql, ';') . ";\n\n";
    }
    echo "-- Index et contraintes. Certains existent peut-être déjà :\n";
    echo "-- une erreur « Duplicate key name » sur l'une de ces lignes est sans gravité.\n\n";
    foreach ($optionnels as $sql) {
        echo rtrim($sql, ';') . ";\n";
    }
    echo "\n" . str_repeat('-', 68) . "\n";
    echo "Pour que ce script applique tout lui-même, ajoutez dans config.php\n";
    echo "   'maintenance_token' => 'un-mot-de-passe-que-vous-choisissez',\n";
    echo "puis ouvrez : api/migrer.php?executer=1&cle=ce-mot-de-passe\n";
    exit;
}

if ($cle === '' || !hash_equals($cle, $cleFournie)) {
    http_response_code(403);
    echo "Clé de maintenance absente ou incorrecte.\n";
    echo "Ajoutez 'maintenance_token' dans config.php, puis rappelez cette page\n";
    echo "avec ?executer=1&cle=votre-clé\n";
    exit;
}

echo "Application des modifications.\n" . str_repeat('-', 68) . "\n";
$faits = 0;
$echecs = 0;

foreach ($instructions as $sql) {
    try {
        db()->exec($sql);
        $faits++;
        echo "OK      " . substr(preg_replace('/\s+/', ' ', $sql), 0, 90) . "\n";
    } catch (Throwable $e) {
        $echecs++;
        echo "ÉCHEC   " . substr(preg_replace('/\s+/', ' ', $sql), 0, 60) . "\n";
        echo "        " . $e->getMessage() . "\n";
    }
}

echo "\nIndex et contraintes (les doublons sont normaux et sans effet) :\n";
foreach ($optionnels as $sql) {
    try {
        db()->exec($sql);
        echo "OK      " . substr(preg_replace('/\s+/', ' ', $sql), 0, 90) . "\n";
    } catch (Throwable $e) {
        echo "ignoré  " . substr(preg_replace('/\s+/', ' ', $sql), 0, 70) . "\n";
    }
}

echo "\n" . str_repeat('-', 68) . "\n";
echo $faits . " modification(s) appliquée(s), " . $echecs . " échec(s).\n";
echo "Vérifiez maintenant : api/index.php?a=diagnostic\n";
