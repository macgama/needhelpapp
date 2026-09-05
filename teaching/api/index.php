<?php
declare(strict_types=1);

/**
 * Point d'entrée unique de l'API.
 * Appelé par le navigateur sous la forme  api/index.php?a=action
 * Une seule porte d'entrée évite d'avoir à configurer des règles de
 * réécriture d'URL, souvent pénibles sur un hébergement mutualisé.
 */

require __DIR__ . '/db.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('[dictee] ' . $e->getMessage());

    // Une colonne ou une table absente veut presque toujours dire qu'une
    // migration n'a pas été exécutée. Autant le dire, plutôt que de laisser
    // chercher : « erreur interne » n'aide personne.
    $m = $e->getMessage();
    if (preg_match('/no such column|Unknown column|no such table|doesn\'t exist|Base table or view not found/i', $m)) {
        jsonOut([
            'error' => 'la base de données n\'est pas à jour : il manque une migration. '
                     . 'Ouvre api/index.php?a=diagnostic pour savoir laquelle exécuter.',
            'migration_requise' => true,
        ], 500);
    }
    jsonOut(['error' => 'erreur interne du serveur'], 500);
});

startSession();

$action = $_GET['a'] ?? '';
if (!is_string($action)) {
    fail('action inconnue', 404);
}

switch ($action) {

    /* ---------- diagnostic de la base ----------
       Ne renvoie que la structure attendue et ce qui manque : aucune donnée,
       aucun secret. De quoi savoir en dix secondes quelle migration lancer. */
    case 'diagnostic': {
        $attendu = [
            'users' => [
                'pwd_version'   => 'migration-mot-de-passe.sql',
                'plan'          => 'migration-abonnement.sql',
                'plan_statut'   => 'migration-abonnement.sql',
                'plan_fin'      => 'migration-abonnement.sql',
                'payeur_id'     => 'migration-abonnement.sql',
                'abonnement_id' => 'migration-abonnement.sql',
                'google_sub'    => 'migration-google.sql',
                'role'          => 'migration-roles.sql',
                'account_id'    => 'migration-portail.sql',
            ],
            'dictations' => [
                'title'        => 'migration-bibliotheque.sql',
                'author'       => 'migration-bibliotheque.sql',
                'level'        => 'migration-bibliotheque.sql',
                'is_public'    => 'migration-bibliotheque.sql',
                'share_token'  => 'migration-bibliotheque.sql',
                'reports'      => 'migration-bibliotheque.sql',
                'word_count'   => 'migration-bibliotheque.sql',
                'borrowed'     => 'migration-emprunts.sql',
                'origin_token' => 'migration-emprunts.sql',
                'origin_owner' => 'migration-emprunts.sql',
                'lang'         => 'migration-langues-dictee.sql',
            ],
            'attempts' => [
                'dictation_id' => 'migration-abonnement.sql',
            ],
            'verb_lists' => [
                'tenses'       => 'migration-listes-partagees.sql',
                'langue'       => 'migration-langue-verbes.sql',
                'is_public'    => 'migration-listes-partagees.sql',
                'borrowed'     => 'migration-listes-partagees.sql',
                'origin_owner' => 'migration-listes-partagees.sql',
            ],
            'login_attempts' => [
                'kind' => 'migration-mot-de-passe.sql',
            ],
        ];
        $tables = [
            'password_resets' => 'migration-mot-de-passe.sql',
            'reports'         => 'migration-bibliotheque.sql',
            'verb_lists'      => 'migration-listes-verbes.sql',
            'billing_events'  => 'migration-abonnement.sql',
            'vocab_lists'     => 'migration-vocabulaire.sql',
            'vocab_words'     => 'migration-vocabulaire.sql',
            'vocab_attempts'  => 'migration-vocabulaire.sql',
            'math_lists'      => 'migration-maths.sql',
            'math_attempts'   => 'migration-maths.sql',
        ];

        $sqlite = (config()['driver'] ?? 'mysql') === 'sqlite';
        $manque = [];

        /* D'abord la connexion, et rien d'autre.
           Sans ce contrôle, une base injoignable faisait apparaître TOUTES
           les tables comme manquantes : chaque « SHOW COLUMNS » échouait, et
           l'échec était pris pour une absence. On invitait alors à recréer
           un schéma qui existait déjà — pendant que la vraie cause, un
           identifiant erroné, restait invisible. */
        $c = config();
        try {
            db()->query('SELECT 1');
        } catch (Throwable $e) {
            jsonOut([
                'base_a_jour' => false,
                'connexion'   => false,
                'erreur'      => $e->getMessage(),
                'base_visee'  => (string) ($c['database'] ?? ''),
                'serveur'     => (string) ($c['host'] ?? ''),
                'message'     => 'La base de données est injoignable. Ce n\'est pas une migration '
                               . 'qui manque : tant que la connexion échoue, aucune table ne peut '
                               . 'être vue. Vérifie host, database, user et password dans '
                               . 'api/config.php. Ne lance aucun script SQL avant d\'avoir corrigé '
                               . 'ce point : tes données sont intactes.',
                'php'         => PHP_VERSION,
            ], 500);
        }

        $colonnes = static function (string $table) use ($sqlite): array {
            try {
                if ($sqlite) {
                    $st = db()->query('PRAGMA table_info(' . $table . ')');
                    return array_column($st->fetchAll(), 'name');
                }
                $st = db()->query('SHOW COLUMNS FROM `' . $table . '`');
                return array_column($st->fetchAll(), 'Field');
            } catch (Throwable $e) {
                return [];
            }
        };

        foreach ($attendu as $table => $cols) {
            $presentes = $colonnes($table);
            if (!$presentes) {
                $manque[] = ['objet' => 'table ' . $table, 'migration' => 'schema.sql'];
                continue;
            }
            foreach ($cols as $col => $migration) {
                if (!in_array($col, $presentes, true)) {
                    $manque[] = ['objet' => $table . '.' . $col, 'migration' => $migration];
                }
            }
        }
        foreach ($tables as $table => $migration) {
            if (!$colonnes($table)) {
                $manque[] = ['objet' => 'table ' . $table, 'migration' => $migration];
            }
        }

        $aExecuter = array_values(array_unique(array_column($manque, 'migration')));
        // Sur quelle base travaille-t-on, au juste ? Sans cette information,
        // impossible de voir qu'on modifie une base et qu'on en lit une autre.
        $nomBase = (string) ($c['database'] ?? '');
        if (!$sqlite) {
            try { $nomBase = (string) db()->query('SELECT DATABASE()')->fetchColumn(); } catch (Throwable $e) {}
        } else {
            $nomBase = (string) ($c['sqlite_path'] ?? '');
        }

        jsonOut([
            'base_a_jour' => count($manque) === 0,
            'connexion'   => true,
            'base_lue'    => $nomBase,
            'serveur'     => $sqlite ? 'sqlite' : ((string) ($c['host'] ?? '')),
            'manque'      => $manque,
            'a_executer'  => $aExecuter,
            'google'      => (function (): array {
                $id = googleClientId();
                $brut = (string) (config()['google_client_id'] ?? '');
                return [
                    'configure'   => $id !== '',
                    'format_ok'   => (bool) preg_match('/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i', $id),
                    'espaces_dans_config' => $id !== trim($brut),
                    'origine_a_declarer'  => siteUrl(),
                ];
            })(),
            'php'         => PHP_VERSION,
            'extensions'  => [
                'pdo'      => extension_loaded('pdo'),
                'mbstring' => extension_loaded('mbstring'),
                'curl'     => function_exists('curl_init'),
                'openssl'  => extension_loaded('openssl'),
            ],
        ]);
    }

    /* ---------- session en cours ---------- */
    case 'session': {
        require_once __DIR__ . '/nha.php';
        $u = currentUser();
        $sortie = ['user' => null, 'csrf' => $_SESSION['csrf']];
        if ($u) {
            $sortie['user'] = ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']];
            $sortie['abonnement'] = etatAbonnement($u);
            $sortie['user']['role'] = roleDe($u);
        }
        /* Une application fermée pour mise à jour le dit au navigateur,
           qui affiche une page d'attente plutôt qu'une erreur. */
        $sortie['ouverte'] = nhaOuverte();
        $sortie['offre'] = offrePublique();
        $sortie['google'] = googleClientId();

        /* Quand le portail est en place, teaching ne demande plus ni mot de
           passe ni adresse : il renvoie vers needhelpapp.com, où la connexion
           vaut pour toutes les applications. Le navigateur a besoin de le
           savoir pour afficher un lien plutôt qu'un formulaire. */
        if (nhaDisponible()) {
            $sortie['portail'] = [
                'actif'       => true,
                'connexion'   => nhaUrlConnexion(),
                'inscription' => nhaUrlInscription(),
                'profil'      => nhaUrl('/profil.php'),
                'abonnement'  => nhaUrl('/abonnement.php'),
                'deconnexion' => nhaUrl('/deconnexion.php'),
                'motdepasse'  => nhaUrlMotDePasse(),
            ];
        }
        jsonOut($sortie);
    }

    /* ---------- créer un compte ---------- */
    case 'register': {
        requirePost();

        $email = u_lower(str_field('email', 190));
        $password = (string) (body()['password'] ?? '');
        $name = str_field('name', 60);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('cette adresse e-mail n\'est pas valide');
        }
        if (u_len($password) < 8) {
            fail('le mot de passe doit faire au moins 8 caractères');
        }

        /* Le compte est créé sur le portail, pas ici : l'utilisateur reste
           dans l'application qu'il connaît, et son compte vaut partout. */
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            if (recentAttempts('register', 60) >= 8) {
                fail('trop de tentatives. Réessaie plus tard.', 429);
            }
            noteAttempt('register', $email);
            $r = nhaInscription($email, $password, $name);
            if (!$r['ok']) {
                jsonOut(['error' => $r['erreur'], 'existe' => !empty($r['existe'])], 400);
            }
            $u = currentUser();
            mailBienvenue($email, $name);
            jsonOut([
                'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
                'csrf' => $_SESSION['csrf'],
                'nouveau' => true,
            ]);
        }

        $st = db()->prepare('SELECT id FROM users WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) {
            fail('un compte existe déjà avec cette adresse');
        }

        $st = db()->prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
        $st->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT)]);

        $id = (int) db()->lastInsertId();
        openSessionFor($id, 0);
        mailBienvenue($email, $name);
        jsonOut([
            'user' => ['id' => $id, 'email' => $email, 'name' => $name],
            'csrf' => $_SESSION['csrf'],
            'nouveau' => true,      // le navigateur affiche le message d'accueil
        ]);
    }

    /* ---------- connexion avec Google ----------
       Le navigateur transmet le jeton signé reçu de Google. Rien de ce
       qu'il raconte n'est cru avant vérification de cette signature. */
    case 'google': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        if (recentAttempts('google', 15) >= 20) {
            fail('trop de tentatives. Réessaie dans un quart d\'heure.', 429);
        }
        noteAttempt('google', '');

        $jeton = (string) (body()['credential'] ?? '');
        if ($jeton === '') {
            fail('jeton manquant');
        }
        $g = verifierJetonGoogle($jeton);
        if (!$g) {
            fail('la connexion Google n\'a pas pu être vérifiée', 401);
        }

        /* Google mène au compte central, comme le formulaire : sans cela on
           ouvrirait une session locale que le portail ignorerait. */
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            /* verifierJetonGoogle() renvoie « nom », pas « name », et
               n'expose pas email_verified : elle a déjà refusé le jeton si
               l'adresse n'était pas vérifiée. Se tromper de clé passait un
               sub et une adresse vides au portail, qui refusait — d'où un
               « service momentanément indisponible » incompréhensible. */
            $r = nhaGoogle((string) $g['sub'], (string) $g['email'],
                           true, (string) ($g['nom'] ?? ''));
            if (!$r['ok']) {
                fail($r['erreur'], 401);
            }
            $u = currentUser();
            jsonOut([
                'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
                'csrf' => $_SESSION['csrf'],
                'nouveau' => false,
            ]);
        }

        // compte déjà rattaché à ce profil Google ?
        $st = db()->prepare('SELECT id, email, name, pwd_version FROM users WHERE google_sub = ?');
        $st->execute([$g['sub']]);
        $u = $st->fetch();

        if (!$u) {
            // même adresse, vérifiée par Google : on rattache au compte existant
            $st = db()->prepare('SELECT id, email, name, pwd_version FROM users WHERE email = ?');
            $st->execute([$g['email']]);
            $u = $st->fetch();
            if ($u) {
                db()->prepare('UPDATE users SET google_sub = ? WHERE id = ?')->execute([$g['sub'], $u['id']]);
            }
        }

        if (!$u) {
            // création : aucun mot de passe, la colonne reste vide
            $st = db()->prepare('INSERT INTO users (email, name, password_hash, google_sub) VALUES (?, ?, ?, ?)');
            $st->execute([$g['email'], u_cut($g['nom'], 60), '', $g['sub']]);
            $id = (int) db()->lastInsertId();
            openSessionFor($id, 0);
            mailBienvenue($g['email'], u_cut($g['nom'], 60));
            jsonOut([
                'user' => ['id' => $id, 'email' => $g['email'], 'name' => u_cut($g['nom'], 60)],
                'csrf' => $_SESSION['csrf'],
                'nouveau' => true,
            ]);
        }

        openSessionFor((int) $u['id'], (int) $u['pwd_version']);
        db()->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$u['id']]);
        jsonOut([
            'user' => ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name']],
            'csrf' => $_SESSION['csrf'],
        ]);
    }

    /* ---------- ouvrir une session ---------- */
    case 'login': {
        requirePost();

        $email = u_lower(str_field('email', 190));
        $password = (string) (body()['password'] ?? '');

        if (recentAttempts('login', 15) >= 10) {
            fail('trop d\'essais de connexion. Réessaie dans un quart d\'heure.', 429);
        }
        noteAttempt('login', $email);

        /* On vérifie le mot de passe contre le compte central, et la session
           ouverte est celle du portail : se connecter ici vaut partout. */
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            $r = nhaConnexion($email, $password);
            if (!$r['ok']) {
                fail($r['erreur'], 401);
            }
            $u = currentUser();
            jsonOut([
                'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
                'csrf' => $_SESSION['csrf'],
            ]);
        }

        $st = db()->prepare('SELECT id, email, name, password_hash, pwd_version FROM users WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();

        // même message dans les deux cas : on n'indique pas si l'adresse existe.
        // Un compte ouvert avec Google n'a pas de mot de passe : sa colonne est
        // vide, et password_verify échoue toujours dessus.
        if (!$u || $u['password_hash'] === '' || !password_verify($password, $u['password_hash'])) {
            fail('adresse ou mot de passe incorrect', 401);
        }
        if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
            $up = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $up->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
        }

        openSessionFor((int) $u['id'], (int) $u['pwd_version']);
        db()->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$u['id']]);

        jsonOut(['user' => ['id' => (int) $u['id'], 'email' => $u['email'], 'name' => $u['name']],
                 'csrf' => $_SESSION['csrf']]);
    }

    /* ---------- fermer la session ---------- */
    case 'logout': {
        requirePost();

        /* Se déconnecter depuis teaching doit fermer la session partout :
           elle est commune à tout le domaine. Ne vider que la session locale
           laissait l'utilisateur connecté sur needhelpapp.com — et donc
           reconnecté ici au premier rechargement. */
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            try {
                nha_logout();
            } catch (Throwable $e) {
                error_log('[teaching] déconnexion du portail impossible : ' . $e->getMessage());
            }
        }

        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        jsonOut([
            'user' => null,
            'csrf' => $_SESSION['csrf'],
            'portail' => nhaDisponible() ? nhaUrl('/') : null,
        ]);
    }

    /* ---------- réglages de lecture ---------- */
    case 'settings': {
        $u = requireUser();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
            $st = db()->prepare('SELECT settings FROM users WHERE id = ?');
            $st->execute([$u['id']]);
            $raw = (string) ($st->fetchColumn() ?: '');
            $decoded = $raw !== '' ? json_decode($raw, true) : null;
            jsonOut(['settings' => is_array($decoded) ? $decoded : null]);
        }
        requirePost();
        $settings = body()['settings'] ?? null;
        if (!is_array($settings)) {
            fail('réglages illisibles');
        }
        $json = json_encode($settings, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > MAX_PREFS) {
            fail('réglages trop volumineux');
        }
        db()->prepare('UPDATE users SET settings = ? WHERE id = ?')->execute([$json, $u['id']]);
        jsonOut(['saved' => true]);
    }

    /* ---------- liste des dictées ---------- */
    case 'dictations': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT id, title, author, level, lang, body AS text, word_count, is_public, share_token, borrowed, origin_owner
             FROM dictations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 200'
        );
        $st->execute([$u['id']]);
        jsonOut(['dictations' => array_map('shapeDictation', $st->fetchAll())]);
    }

    /* ---------- enregistrer une dictée ---------- */
    case 'dictation_save': {
        requirePost();
        $u = requireUser();
        $title  = str_field('title', MAX_NAME);
        $langue = langueValide((string) (body()['lang'] ?? 'fr')) ?: 'fr';
        $author = str_field('author', MAX_NAME);
        $level  = levelCode(str_field('level', 8));
        $text   = str_field('text', MAX_TEXT);
        $public = !empty(body()['is_public']);
        $id     = (int) (body()['id'] ?? 0);

        if ($text === '') {
            fail('le texte de la dictée est vide');
        }
        if ($title === '') {
            fail('il faut un titre');
        }
        $words = wordCount($text);

        // Une dictée publique doit pouvoir être ouverte par son lien.
        $token = $public ? bin2hex(random_bytes(16)) : null;
        $pubSql = $public ? 'CURRENT_TIMESTAMP' : 'NULL';

        if ($id > 0) {
            $st = db()->prepare('SELECT share_token, is_public, borrowed FROM dictations WHERE id = ? AND user_id = ?');
            $st->execute([$id, $u['id']]);
            $before = $st->fetch();
            if (!$before) {
                fail('dictée introuvable', 404);
            }
            /* Modifier une dictée reprise ne touche pas à l'originale : la copie
               qu'on a chez soi devient la sienne, et cesse d'être une reprise.
               Elle ne pourra pas être republiée pour autant : adapter le texte
               d'un autre pour son usage est une chose, le rediffuser sous son
               nom en est une autre. */
            $adaptee = ((int) $before['borrowed'] === 1);
            if ($adaptee) {
                $public = false;
                $token = null;
                $pubSql = 'NULL';
                db()->prepare('UPDATE dictations SET borrowed = 0 WHERE id = ? AND user_id = ?')
                    ->execute([$id, $u['id']]);
            }
            if (!$adaptee && $public && !empty($before['share_token'])) {
                $token = $before['share_token'];          // on garde le lien déjà distribué
            }
            if (!$adaptee && !$public) {
                $token = $before['share_token'];          // dépublier ne casse pas le lien direct
                $pubSql = 'NULL';
            }
            $st = db()->prepare(
                'UPDATE dictations SET title = ?, author = ?, level = ?, lang = ?, body = ?, word_count = ?,
                        is_public = ?, share_token = ?, published_at = ' . $pubSql . ',
                        updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?'
            );
            $st->execute([$title, $author, $level, $langue, $text, $words, $public ? 1 : 0, $token, $id, $u['id']]);
            jsonOut(['id' => $id, 'share_token' => $token, 'adaptee' => $adaptee]);
        }

        verifierQuota($u, 'dictations', 'borrowed = 0', 'dictées', 'à toi');
        $st = db()->prepare('SELECT COUNT(*) FROM dictations WHERE user_id = ?');
        $st->execute([$u['id']]);
        if ((int) $st->fetchColumn() >= 200) {
            fail('limite de 200 dictées atteinte, supprime les plus anciennes');
        }
        if ($public && publicCount((int) $u['id']) >= 50) {
            fail('limite de 50 dictées publiées atteinte');
        }

        $st = db()->prepare(
            'INSERT INTO dictations (user_id, title, author, level, lang, body, word_count, is_public, share_token, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ' . $pubSql . ')'
        );
        $st->execute([$u['id'], $title, $author, $level, $langue, $text, $words, $public ? 1 : 0, $token]);
        jsonOut(['id' => (int) db()->lastInsertId(), 'share_token' => $token]);
    }

    /* ---------- reprendre chez soi la dictée d'un autre ----------
       Le texte est copié depuis la source, jamais depuis ce que dit le
       navigateur : ni le titre ni l'auteur ne peuvent être maquillés. */
    case 'dictation_borrow': {
        requirePost();
        $u = requireUser();
        verifierQuota($u, 'dictations', 'borrowed = 1', 'dictées reprises', 'dans la bibliothèque');
        $token = str_field('token', 32);
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }

        $st = db()->prepare(
            'SELECT d.id, d.user_id, d.title, d.author, d.level, d.lang, d.body, d.word_count, d.reports,
                    u.name AS owner_name, u.email AS owner_email
             FROM dictations d JOIN users u ON u.id = d.user_id
             WHERE d.share_token = ?'
        );
        $st->execute([$token]);
        $src = $st->fetch();
        if (!$src || (int) $src['reports'] >= 3) {
            fail('cette dictée n\'est plus accessible', 404);
        }
        if ((int) $src['user_id'] === (int) $u['id']) {
            fail('cette dictée est déjà la tienne');
        }

        $st = db()->prepare('SELECT id FROM dictations WHERE user_id = ? AND origin_token = ?');
        $st->execute([$u['id'], $token]);
        $deja = $st->fetch();
        if ($deja) {
            jsonOut(['id' => (int) $deja['id'], 'already' => true]);
        }

        $st = db()->prepare('SELECT COUNT(*) FROM dictations WHERE user_id = ?');
        $st->execute([$u['id']]);
        if ((int) $st->fetchColumn() >= 200) {
            fail('limite de 200 dictées atteinte, supprime les plus anciennes');
        }

        // le nom du compte d'origine, à défaut le début de son adresse
        $proprietaire = trim((string) $src['owner_name']);
        if ($proprietaire === '') {
            $proprietaire = explode('@', (string) $src['owner_email'])[0];
        }

        $st = db()->prepare(
            'INSERT INTO dictations (user_id, title, author, level, lang, body, word_count, is_public, borrowed, origin_token, origin_owner)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)'
        );
        $st->execute([$u['id'], $src['title'], $src['author'], $src['level'], $src['lang'] ?? 'fr',
                      $src['body'], (int) $src['word_count'], $token, u_cut($proprietaire, 80)]);
        jsonOut(['id' => (int) db()->lastInsertId()]);
    }

    /* ---------- publier ou dépublier, sans renvoyer tout le texte ---------- */
    case 'dictation_publish': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $public = !empty(body()['public']);

        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM dictations WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('dictée introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette dictée vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette dictée est celle de son auteur : elle ne peut pas être republiée sous ton compte');
        }
        if ($public && publicCount((int) $u['id']) >= 50) {
            fail('limite de 50 dictées publiées atteinte');
        }

        // dépublier ne détruit pas le lien déjà distribué : il reste valable
        $token = $row['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null);
        $st = db()->prepare(
            'UPDATE dictations SET is_public = ?, share_token = ?,
                    published_at = ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . '
             WHERE id = ? AND user_id = ?'
        );
        $st->execute([$public ? 1 : 0, $token, $id, $u['id']]);
        jsonOut(['id' => $id, 'is_public' => $public, 'share_token' => $token]);
    }

    /* ---------- obtenir le lien de partage d'une dictée ---------- */
    case 'dictation_share': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM dictations WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('dictée introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette dictée vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette dictée est celle de son auteur : à lui de la partager');
        }
        $token = $row['share_token'];
        if (!$token) {
            $token = bin2hex(random_bytes(16));
            db()->prepare('UPDATE dictations SET share_token = ? WHERE id = ? AND user_id = ?')
                ->execute([$token, $id, $u['id']]);
        }
        jsonOut(['share_token' => $token, 'url' => siteUrl() . '/dictee.html?d=' . $token]);
    }

    /* ---------- ouvrir une dictée partagée, sans compte ---------- */
    case 'dictation_open': {
        $token = (string) ($_GET['t'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT id, title, author, level, body AS text, word_count, reports
             FROM dictations WHERE share_token = ?'
        );
        $st->execute([$token]);
        $d = $st->fetch();
        if (!$d || (int) $d['reports'] >= 3) {
            fail('cette dictée n\'est plus accessible', 404);
        }
        unset($d['reports']);
        jsonOut(['dictation' => shapeDictation($d)]);
    }

    /* ---------- bibliothèque publique, ouverte à tous ---------- */
    case 'library': {
        $q     = u_cut(trim((string) ($_GET['q'] ?? '')), 60);
        $level = levelCode((string) ($_GET['level'] ?? ''));

        $sql = 'SELECT id, title, author, level, lang, word_count, share_token
                FROM dictations WHERE is_public = 1 AND reports < 3';
        $args = [];
        if ($level !== '') {
            $sql .= ' AND level = ?';
            $args[] = $level;
        }
        $langue = langueValide((string) ($_GET['lang'] ?? ''));
        if ($langue !== '') {
            $sql .= ' AND lang = ?';
            $args[] = $langue;
        }
        if ($q !== '') {
            $sql .= ' AND (title LIKE ? OR author LIKE ?)';
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $args[] = $like;
            $args[] = $like;
        }
        $sql .= ' ORDER BY published_at DESC, id DESC LIMIT 40';

        $st = db()->prepare($sql);
        $st->execute($args);
        $rows = array_map('shapeDictation', $st->fetchAll());

        // Tout le monde voit le catalogue, mais seul un compte obtient le jeton
        // qui donne le texte. Sans cela la restriction serait décorative :
        // le jeton figurerait dans la réponse et suffirait à tout lire.
        // un compte, même gratuit, peut ouvrir ce que d'autres ont publié :
        // c'est la vitrine, et la fermer n'aurait servi personne
        $moi = currentUser();
        $abonne = $moi ? abonnementActif($moi) : false;
        foreach ($rows as &$r) {
            if (!$moi) {
                unset($r['share_token']);
            }
        }
        unset($r);

        jsonOut(['dictations' => $rows, 'signed_in' => $moi !== null, 'abonne' => $abonne]);
    }

    /* ---------- signaler une dictée publiée ---------- */
    case 'dictation_report': {
        requirePost();
        $id = (int) (body()['id'] ?? 0);
        if ($id <= 0) {
            fail('dictée introuvable', 404);
        }
        if (recentAttempts('report', 60) >= 10) {
            fail('trop de signalements. Réessaie plus tard.', 429);
        }
        noteAttempt('report', '');

        // seules les dictées publiées peuvent être signalées
        $st = db()->prepare('SELECT id, title, author, user_id, share_token FROM dictations WHERE id = ? AND is_public = 1');
        $st->execute([$id]);
        $d = $st->fetch();
        if (!$d) {
            jsonOut(['reported' => true]);   // on n'indique pas si le lien existe
        }

        // Un signalement par adresse : recliquer ne fait pas monter le compteur.
        $nouveau = true;
        try {
            db()->prepare('INSERT INTO reports (dictation_id, ip) VALUES (?, ?)')
                ->execute([$d['id'], clientIp()]);
        } catch (PDOException $e) {
            if ($e->getCode() !== '23000') {
                throw $e;
            }
            $nouveau = false;
        }

        $st = db()->prepare('SELECT COUNT(*) FROM reports WHERE dictation_id = ?');
        $st->execute([$d['id']]);
        $total = (int) $st->fetchColumn();
        db()->prepare('UPDATE dictations SET reports = ? WHERE id = ?')->execute([$total, $d['id']]);

        // Prévenir l'administrateur au premier signalement, puis au retrait :
        // assez pour réagir, pas assez pour noyer la boîte aux lettres.
        $admin = (string) (config()['admin_email'] ?? '');
        if ($nouveau && $admin !== '' && ($total === 1 || $total === 3)) {
            $st = db()->prepare('SELECT email FROM users WHERE id = ?');
            $st->execute([$d['user_id']]);
            $auteurCompte = (string) ($st->fetchColumn() ?: 'compte supprimé');

            $texte = "Une dictée de la bibliothèque a été signalée.\n\n"
                . 'Titre    : ' . $d['title'] . "\n"
                . 'Auteur   : ' . ($d['author'] !== '' ? $d['author'] : 'non précisé') . "\n"
                . 'Compte   : ' . $auteurCompte . "\n"
                . 'Numéro   : ' . $d['id'] . "\n"
                . 'Signalée : ' . $total . ' fois' . "\n\n"
                . 'À lire   : ' . siteUrl() . '/dictee.html?d=' . $d['share_token'] . "\n\n"
                . ($total >= 3
                    ? "Elle vient d'être retirée de la bibliothèque et son lien ne répond plus.\n"
                      . "Pour la rétablir : UPDATE dictations SET reports = 0 WHERE id = " . $d['id'] . ";\n"
                    : "Elle reste visible. Elle sera retirée automatiquement au troisième signalement.\n"
                      . "Pour la retirer tout de suite : UPDATE dictations SET is_public = 0 WHERE id = " . $d['id'] . ";\n");

            sendMail($admin, 'Dictée signalée : ' . $d['title'], $texte);
        }

        jsonOut(['reported' => true, 'count' => $total]);
    }

    /* ---------- supprimer une dictée ---------- */
    case 'dictation_delete': {
        requirePost();
        $u = requireUser();
        $id = (int) (body()['id'] ?? 0);
        if ($id <= 0) {
            fail('identifiant manquant');
        }
        db()->prepare('DELETE FROM dictations WHERE id = ? AND user_id = ?')->execute([$id, $u['id']]);
        jsonOut(['deleted' => true]);
    }

    /* ---------- résultats ---------- */
    case 'attempt_save': {
        requirePost();
        $u = requireAbonne();
        $label   = str_field('label', MAX_NAME, 'Dictée');
        $words   = max(0, min(100000, (int) (body()['words'] ?? 0)));
        $correct = max(0, min(100000, (int) (body()['correct'] ?? 0)));
        $errors  = max(0, min(100000, (int) (body()['errors'] ?? 0)));

        // rattachement à une dictée précise, quand elle est enregistrée
        $dictee = (int) (body()['dictation_id'] ?? 0);
        if ($dictee > 0) {
            $v = db()->prepare('SELECT id FROM dictations WHERE id = ? AND user_id = ?');
            $v->execute([$dictee, $u['id']]);
            if (!$v->fetch()) {
                $dictee = 0;
            }
        }

        $st = db()->prepare('INSERT INTO attempts (user_id, dictation_id, label, words, correct_words, errors) VALUES (?, ?, ?, ?, ?, ?)');
        $st->execute([$u['id'], $dictee > 0 ? $dictee : null, $label !== '' ? $label : 'Dictée', $words, $correct, $errors]);
        jsonOut(['saved' => true]);
    }

    case 'attempts': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT dictation_id, label, words, correct_words AS correct, errors, created_at
             FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 40'
        );
        $st->execute([$u['id']]);
        jsonOut(['attempts' => $st->fetchAll()]);
    }

    /* ---------- suivi par dictée : la progression d'un texte à l'autre ---------- */
    case 'attempts_par_dictee': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT dictation_id, label, words, correct_words AS correct, errors, created_at
             FROM attempts WHERE user_id = ? ORDER BY id ASC LIMIT 400'
        );
        $st->execute([$u['id']]);

        $groupes = [];
        foreach ($st->fetchAll() as $a) {
            // à défaut de dictée enregistrée, on regroupe sur l'étiquette
            $cle = $a['dictation_id'] ? ('d' . $a['dictation_id']) : ('t' . $a['label']);
            if (!isset($groupes[$cle])) {
                $groupes[$cle] = [
                    'dictation_id' => $a['dictation_id'] ? (int) $a['dictation_id'] : null,
                    'label'        => (string) $a['label'],
                    'essais'       => [],
                ];
            }
            $groupes[$cle]['essais'][] = [
                'words'      => (int) $a['words'],
                'correct'    => (int) $a['correct'],
                'errors'     => (int) $a['errors'],
                'created_at' => (string) $a['created_at'],
            ];
        }

        $sortie = [];
        foreach ($groupes as $g) {
            $n = count($g['essais']);
            $premier = $g['essais'][0];
            $dernier = $g['essais'][$n - 1];
            $g['nb'] = $n;
            $g['premier_erreurs'] = $premier['errors'];
            $g['dernier_erreurs'] = $dernier['errors'];
            $g['meilleur_erreurs'] = min(array_column($g['essais'], 'errors'));
            $g['derniere_date'] = $dernier['created_at'];
            $sortie[] = $g;
        }
        usort($sortie, static fn(array $a, array $b): int => strcmp($b['derniere_date'], $a['derniere_date']));
        jsonOut(['dictees' => $sortie]);
    }

    /* ---------- mot de passe oublié : demander un lien ---------- */
    case 'password_forgot': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            /* Le portail détient les jetons et les courriels de
               réinitialisation. En tenir un second ici ferait deux
               mécanismes à garder d'accord. */
            jsonOut(['error' => 'La réinitialisation se fait sur needhelpapp.com.',
                     'lien' => nhaUrlMotDePasse()], 409);
        }

        $email = u_lower(str_field('email', 190));

        // La réponse est toujours la même : sans cela, cette page dirait
        // à n'importe qui si une adresse possède un compte.
        $vague = ['sent' => true];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonOut($vague);
        }
        if (recentAttempts('reset', 60) >= 5) {
            fail('trop de demandes. Réessaie dans une heure.', 429);
        }
        noteAttempt('reset', $email);

        $st = db()->prepare('SELECT id, name FROM users WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u) {
            jsonOut($vague);
        }

        $token = bin2hex(random_bytes(32));
        $hash  = hash('sha256', $token);
        $expires = (config()['driver'] ?? 'mysql') === 'sqlite'
            ? "datetime('now','+1 hour')"
            : 'DATE_ADD(NOW(), INTERVAL 1 HOUR)';

        // une seule demande valable à la fois
        db()->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$u['id']]);
        db()->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ' . $expires . ')')
            ->execute([$u['id'], $hash]);

        $link = siteUrl() . '/dictee.html?reset=' . $token;
        $prenom = trim((string) $u['name']);
        $texte = ($prenom !== '' ? 'Bonjour ' . $prenom . ',' : 'Bonjour,') . "\n\n"
            . "Tu as demandé un nouveau mot de passe pour La dictée.\n"
            . "Ouvre ce lien pour en choisir un :\n\n"
            . $link . "\n\n"
            . "Le lien est valable une heure et ne fonctionne qu'une fois.\n"
            . "Si tu n'as rien demandé, ignore ce message : ton mot de passe actuel reste valable.\n";

        sendMail($email, 'Nouveau mot de passe pour La dictée', $texte);
        jsonOut($vague);
    }

    /* ---------- mot de passe oublié : choisir le nouveau ---------- */
    case 'password_reset': {
        requirePost();

        $token = str_field('token', 128);
        $password = (string) (body()['password'] ?? '');

        if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            fail('lien invalide ou déjà utilisé');
        }
        if (u_len($password) < 8) {
            fail('le mot de passe doit faire au moins 8 caractères');
        }
        if (recentAttempts('reset_use', 60) >= 20) {
            fail('trop de tentatives. Réessaie dans une heure.', 429);
        }
        noteAttempt('reset_use', '');

        $notExpired = (config()['driver'] ?? 'mysql') === 'sqlite'
            ? "expires_at > datetime('now')"
            : 'expires_at > NOW()';
        $st = db()->prepare(
            'SELECT r.id, r.user_id, u.email, u.name, u.pwd_version
             FROM password_resets r JOIN users u ON u.id = r.user_id
             WHERE r.token_hash = ? AND r.used_at IS NULL AND ' . $notExpired
        );
        $st->execute([hash('sha256', $token)]);
        $row = $st->fetch();
        if (!$row) {
            fail('ce lien a expiré ou a déjà servi. Redemande un nouveau lien.');
        }

        $version = ((int) $row['pwd_version']) + 1;
        db()->prepare('UPDATE users SET password_hash = ?, pwd_version = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $version, $row['user_id']]);
        db()->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$row['user_id']]);

        openSessionFor((int) $row['user_id'], $version);
        jsonOut([
            'user' => ['id' => (int) $row['user_id'], 'email' => $row['email'], 'name' => $row['name']],
            'csrf' => $_SESSION['csrf'],
        ]);
    }

    /* ---------- listes de verbes de la conjugaison ---------- */
    case 'lists': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT id, name, verbs, tenses, langue, is_public, borrowed, origin_owner, share_token
             FROM verb_lists WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 100'
        );
        $st->execute([$u['id']]);
        jsonOut(['lists' => array_map('shapeListe', $st->fetchAll())]);
    }

    case 'list_save': {
        requirePost();
        $u = requireUser();
        $name = str_field('name', MAX_NAME);
        $id   = (int) (body()['id'] ?? 0);
        $bruts = body()['verbs'] ?? [];
        if (!is_array($bruts)) {
            fail('liste de verbes illisible');
        }
        // on ne garde que des infinitifs plausibles, et pas plus de 200
        $verbes = [];
        foreach ($bruts as $v) {
            if (!is_string($v)) {
                continue;
            }
            $v = u_lower(trim($v));
            if ($v === '' || !preg_match('/^[a-zà-öø-ÿœ\'-]{2,30}$/u', $v)) {
                continue;
            }
            if (!in_array($v, $verbes, true)) {
                $verbes[] = $v;
            }
            if (count($verbes) >= 200) {
                break;
            }
        }
        if ($name === '') {
            fail('il faut un nom pour cette liste');
        }
        if (!count($verbes)) {
            fail('la liste ne contient aucun verbe');
        }
        $texte = implode(',', $verbes);

        // les temps choisis voyagent avec la liste : c'est la sélection entière
        // que l'on enregistre, pas seulement les verbes
        $temps = [];
        foreach ((array) (body()['tenses'] ?? []) as $t) {
            if (is_string($t) && preg_match('/^[A-Za-z]{3,24}$/', $t) && !in_array($t, $temps, true)) {
                $temps[] = $t;
            }
        }
        $tempsTexte = implode(',', array_slice($temps, 0, 30));
        $langueListe = in_array((string) (body()['langue'] ?? 'fr'), ['fr', 'en', 'it', 'de'], true)
            ? (string) body()['langue'] : 'fr';
        $public = !empty(body()['is_public']);

        if ($id > 0) {
            $v = db()->prepare('SELECT borrowed, share_token FROM verb_lists WHERE id = ? AND user_id = ?');
            $v->execute([$id, $u['id']]);
            $avant = $v->fetch();
            if (!$avant) {
                fail('liste introuvable', 404);
            }
            /* Modifier une sélection reprise en fait la sienne. */
            $adaptee = ((int) $avant['borrowed'] === 1);
            if ($adaptee) {
                $public = false;
                db()->prepare('UPDATE verb_lists SET borrowed = 0 WHERE id = ? AND user_id = ?')
                    ->execute([$id, $u['id']]);
            }
            $jeton = $adaptee ? null : $avant['share_token'];
            if (!$adaptee && $public && !$jeton) {
                $jeton = bin2hex(random_bytes(16));
            }
            $st = db()->prepare(
                'UPDATE verb_lists SET name = ?, verbs = ?, tenses = ?, langue = ?, is_public = ?, share_token = ?,
                        published_at = ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ',
                        updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?'
            );
            $st->execute([$name, $texte, $tempsTexte, $langueListe, $public ? 1 : 0, $jeton, $id, $u['id']]);
            jsonOut(['id' => $id, 'share_token' => $jeton]);
        }

        verifierQuota($u, 'verb_lists', 'borrowed = 0', 'listes de verbes', 'à toi');
        $st = db()->prepare('SELECT COUNT(*) FROM verb_lists WHERE user_id = ?');
        $st->execute([$u['id']]);
        if ((int) $st->fetchColumn() >= 100) {
            fail('limite de 100 listes atteinte');
        }
        $jeton = $public ? bin2hex(random_bytes(16)) : null;
        $st = db()->prepare(
            'INSERT INTO verb_lists (user_id, name, verbs, tenses, langue, is_public, share_token, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ')'
        );
        $st->execute([$u['id'], $name, $texte, $tempsTexte, $langueListe, $public ? 1 : 0, $jeton]);
        jsonOut(['id' => (int) db()->lastInsertId(), 'share_token' => $jeton]);
    }

    case 'list_delete': {
        requirePost();
        $u = requireUser();
        $id = (int) (body()['id'] ?? 0);
        db()->prepare('DELETE FROM verb_lists WHERE id = ? AND user_id = ?')->execute([$id, $u['id']]);
        jsonOut(['deleted' => true]);
    }

    case 'list_publish': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $public = !empty(body()['public']);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM verb_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('liste introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette liste vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette liste est celle de son auteur : à lui de la publier');
        }
        $jeton = $row['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null);
        db()->prepare('UPDATE verb_lists SET is_public = ?, share_token = ?, published_at = '
            . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ' WHERE id = ? AND user_id = ?')
            ->execute([$public ? 1 : 0, $jeton, $id, $u['id']]);
        jsonOut(['id' => $id, 'is_public' => $public, 'share_token' => $jeton]);
    }

    /* ---------- la bibliothèque des listes, ouverte à tous ---------- */
    case 'library_lists': {
        $q = u_cut(trim((string) ($_GET['q'] ?? '')), 60);
        $sql = 'SELECT l.id, l.name, l.verbs, l.tenses, l.langue, l.share_token, u.name AS proprietaire
                FROM verb_lists l JOIN users u ON u.id = l.user_id
                WHERE l.is_public = 1 AND l.reports < 3';
        $args = [];
        if ($q !== '') {
            $sql .= ' AND (l.name LIKE ? OR u.name LIKE ?)';
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $args[] = $like;
            $args[] = $like;
        }
        $sql .= ' ORDER BY l.published_at DESC, l.id DESC LIMIT 40';
        $st = db()->prepare($sql);
        $st->execute($args);

        $moi = currentUser();
        $abonne = $moi ? abonnementActif($moi) : false;
        $rows = [];
        foreach ($st->fetchAll() as $r) {
            $l = shapeListe($r);
            $l['proprietaire'] = (string) ($r['proprietaire'] ?? '');
            if (!$moi) {
                unset($l['share_token']);
            }
            $rows[] = $l;
        }
        jsonOut(['lists' => $rows, 'abonne' => $abonne, 'connecte' => $moi !== null]);
    }

    /* ---------- reprendre chez soi la liste d'un autre ---------- */
    case 'list_borrow': {
        requirePost();
        $u = requireUser();
        verifierQuota($u, 'verb_lists', 'borrowed = 1', 'listes reprises', 'dans la bibliothèque');
        $token = str_field('token', 32);
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT l.id, l.user_id, l.name, l.verbs, l.tenses, l.langue, l.reports, u.name AS proprietaire, u.email
             FROM verb_lists l JOIN users u ON u.id = l.user_id WHERE l.share_token = ?'
        );
        $st->execute([$token]);
        $src = $st->fetch();
        if (!$src || (int) $src['reports'] >= 3) {
            fail('cette liste n\'est plus accessible', 404);
        }
        if ((int) $src['user_id'] === (int) $u['id']) {
            fail('cette liste est déjà la tienne');
        }
        $st = db()->prepare('SELECT id FROM verb_lists WHERE user_id = ? AND origin_token = ?');
        $st->execute([$u['id'], $token]);
        if ($deja = $st->fetch()) {
            jsonOut(['id' => (int) $deja['id'], 'already' => true]);
        }
        $proprio = trim((string) $src['proprietaire']);
        if ($proprio === '') {
            $proprio = explode('@', (string) $src['email'])[0];
        }
        $st = db()->prepare(
            'INSERT INTO verb_lists (user_id, name, verbs, tenses, langue, borrowed, origin_token, origin_owner)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
        );
        $st->execute([$u['id'], $src['name'], $src['verbs'], $src['tenses'],
                      $src['langue'] ?? 'fr', $token, u_cut($proprio, 80)]);
        jsonOut(['id' => (int) db()->lastInsertId()]);
    }

    case 'list_report': {
        requirePost();
        $id = (int) (body()['id'] ?? 0);
        if ($id <= 0) {
            fail('liste introuvable', 404);
        }
        if (recentAttempts('report', 60) >= 10) {
            fail('trop de signalements. Réessaie plus tard.', 429);
        }
        noteAttempt('report', '');
        db()->prepare('UPDATE verb_lists SET reports = reports + 1 WHERE id = ? AND is_public = 1')->execute([$id]);
        $st = db()->prepare('SELECT reports FROM verb_lists WHERE id = ?');
        $st->execute([$id]);
        jsonOut(['reported' => true, 'count' => (int) $st->fetchColumn()]);
    }

    case 'list_share': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $st = db()->prepare('SELECT share_token FROM verb_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('liste introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette liste vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        $token = $row['share_token'];
        if (!$token) {
            $token = bin2hex(random_bytes(16));
            db()->prepare('UPDATE verb_lists SET share_token = ? WHERE id = ? AND user_id = ?')
                ->execute([$token, $id, $u['id']]);
        }
        jsonOut(['share_token' => $token, 'url' => siteUrl() . '/conjugaison.html?l=' . $token]);
    }

    // ouverte sans compte : c'est le principe d'un lien qu'on envoie à sa classe
    case 'list_open': {
        $token = (string) ($_GET['t'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare('SELECT id, name, verbs, tenses, langue, reports FROM verb_lists WHERE share_token = ?');
        $st->execute([$token]);
        $l = $st->fetch();
        if (!$l || (int) $l['reports'] >= 3) {
            fail('cette liste n\'est plus accessible', 404);
        }
        jsonOut(['list' => shapeListe($l)]);
    }

    /* =================================================================
       Vocabulaire
       Les exercices sont ouverts à tous : les listes toutes prêtes vivent
       dans le navigateur. Ce qui suit ne concerne que ce qu'on garde.
       ================================================================= */

    case 'vocab_lists': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT l.id, l.name, l.chapter, l.lang_source, l.lang_target, l.is_public,
                    l.borrowed, l.origin_owner, l.share_token,
                    (SELECT COUNT(*) FROM vocab_words w WHERE w.list_id = l.id) AS nb
             FROM vocab_lists l WHERE l.user_id = ? ORDER BY l.updated_at DESC, l.id DESC LIMIT 200'
        );
        $st->execute([$u['id']]);
        jsonOut(['lists' => array_map('shapeVocab', $st->fetchAll())]);
    }

    case 'vocab_list': {
        $u = requireUser();
        $id = (int) ($_GET['id'] ?? 0);
        $st = db()->prepare(
            'SELECT id, name, chapter, lang_source, lang_target, is_public, borrowed, origin_owner, share_token
             FROM vocab_lists WHERE id = ? AND user_id = ?'
        );
        $st->execute([$id, $u['id']]);
        $l = $st->fetch();
        if (!$l) {
            fail('liste introuvable', 404);
        }
        $out = shapeVocab($l);
        $out['words'] = motsDeLaListe($id);
        jsonOut(['list' => $out]);
    }

    case 'vocab_save': {
        requirePost();
        $u = requireUser();
        $id      = (int) (body()['id'] ?? 0);
        $name    = str_field('name', MAX_NAME);
        $chapter = u_cut(trim((string) (body()['chapter'] ?? '')), 80);
        $source  = langueValide((string) (body()['source'] ?? 'fr'));
        $target  = langueValide((string) (body()['target'] ?? ''));
        $public  = !empty(body()['is_public']);
        $mots    = body()['words'] ?? [];

        if ($name === '') {
            fail('il faut un nom pour cette liste');
        }
        if ($source === '' || $target === '') {
            fail('choisis une langue maternelle et une langue apprise');
        }
        if ($source === $target) {
            fail('les deux langues doivent être différentes');
        }
        if (!is_array($mots) || !count($mots)) {
            fail('la liste ne contient aucun mot');
        }

        if ($id > 0) {
            $v = db()->prepare('SELECT borrowed, share_token FROM vocab_lists WHERE id = ? AND user_id = ?');
            $v->execute([$id, $u['id']]);
            $avant = $v->fetch();
            if (!$avant) {
                fail('liste introuvable', 404);
            }
            /* Modifier un contenu repris en fait le sien : la copie personnelle
               cesse d'être une reprise. L'originale n'est pas touchée, et la
               version adaptée ne peut pas être republiée. */
            $adaptee = ((int) $avant['borrowed'] === 1);
            if ($adaptee) {
                $public = false;
                db()->prepare('UPDATE vocab_lists SET borrowed = 0 WHERE id = ? AND user_id = ?')
                    ->execute([$id, $u['id']]);
            }
            $jeton = $adaptee ? null : ($avant['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null));
            db()->prepare(
                'UPDATE vocab_lists SET name = ?, chapter = ?, lang_source = ?, lang_target = ?,
                        is_public = ?, share_token = ?, published_at = ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ',
                        updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?'
            )->execute([$name, $chapter, $source, $target, $public ? 1 : 0, $jeton, $id, $u['id']]);
            $n = enregistrerMots($id, $mots);
            jsonOut(['id' => $id, 'mots' => $n, 'share_token' => $jeton]);
        }

        verifierQuota($u, 'vocab_lists', 'borrowed = 0', 'listes de vocabulaire', 'à toi');
        $st = db()->prepare('SELECT COUNT(*) FROM vocab_lists WHERE user_id = ?');
        $st->execute([$u['id']]);
        if ((int) $st->fetchColumn() >= 200) {
            fail('limite de 200 listes atteinte');
        }
        $jeton = $public ? bin2hex(random_bytes(16)) : null;
        db()->prepare(
            'INSERT INTO vocab_lists (user_id, name, chapter, lang_source, lang_target, is_public, share_token, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ')'
        )->execute([$u['id'], $name, $chapter, $source, $target, $public ? 1 : 0, $jeton]);
        $id = (int) db()->lastInsertId();
        $n = enregistrerMots($id, $mots);
        jsonOut(['id' => $id, 'mots' => $n, 'share_token' => $jeton]);
    }

    case 'vocab_delete': {
        requirePost();
        $u = requireUser();
        db()->prepare('DELETE FROM vocab_lists WHERE id = ? AND user_id = ?')
            ->execute([(int) (body()['id'] ?? 0), $u['id']]);
        jsonOut(['deleted' => true]);
    }

    case 'vocab_publish': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $public = !empty(body()['public']);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM vocab_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('liste introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette liste vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette liste est celle de son auteur : à lui de la publier');
        }
        $jeton = $row['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null);
        db()->prepare('UPDATE vocab_lists SET is_public = ?, share_token = ?, published_at = '
            . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ' WHERE id = ? AND user_id = ?')
            ->execute([$public ? 1 : 0, $jeton, $id, $u['id']]);
        jsonOut(['id' => $id, 'is_public' => $public, 'share_token' => $jeton]);
    }

    case 'vocab_share': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM vocab_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('liste introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette liste vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette liste est celle de son auteur : à lui de la partager');
        }
        $jeton = $row['share_token'];
        if (!$jeton) {
            $jeton = bin2hex(random_bytes(16));
            db()->prepare('UPDATE vocab_lists SET share_token = ? WHERE id = ? AND user_id = ?')
                ->execute([$jeton, $id, $u['id']]);
        }
        jsonOut(['share_token' => $jeton]);
    }

    // ouverte sans compte : un enseignant envoie sa liste à sa classe
    case 'vocab_open': {
        $token = (string) ($_GET['t'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT id, name, chapter, lang_source, lang_target, reports FROM vocab_lists WHERE share_token = ?'
        );
        $st->execute([$token]);
        $l = $st->fetch();
        if (!$l || (int) $l['reports'] >= 3) {
            fail('cette liste n\'est plus accessible', 404);
        }
        $out = shapeVocab($l);
        $out['words'] = motsDeLaListe((int) $l['id']);
        jsonOut(['list' => $out]);
    }

    case 'vocab_library': {
        $q = u_cut(trim((string) ($_GET['q'] ?? '')), 60);
        $langue = langueValide((string) ($_GET['langue'] ?? ''));
        $sql = 'SELECT l.id, l.name, l.chapter, l.lang_source, l.lang_target, l.share_token,
                       u.name AS proprietaire,
                       (SELECT COUNT(*) FROM vocab_words w WHERE w.list_id = l.id) AS nb
                FROM vocab_lists l JOIN users u ON u.id = l.user_id
                WHERE l.is_public = 1 AND l.reports < 3';
        $args = [];
        if ($langue !== '') {
            $sql .= ' AND l.lang_target = ?';
            $args[] = $langue;
        }
        if ($q !== '') {
            $sql .= ' AND (l.name LIKE ? OR l.chapter LIKE ? OR u.name LIKE ?)';
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $args[] = $like; $args[] = $like; $args[] = $like;
        }
        $sql .= ' ORDER BY l.published_at DESC, l.id DESC LIMIT 40';
        $st = db()->prepare($sql);
        $st->execute($args);

        $moi = currentUser();
        $abonne = $moi ? abonnementActif($moi) : false;
        $rows = [];
        foreach ($st->fetchAll() as $r) {
            $l = shapeVocab($r);
            $l['proprietaire'] = (string) ($r['proprietaire'] ?? '');
            if (!$moi) {
                unset($l['share_token']);
            }
            $rows[] = $l;
        }
        jsonOut(['lists' => $rows, 'abonne' => $abonne, 'connecte' => $moi !== null]);
    }

    case 'vocab_borrow': {
        requirePost();
        $u = requireUser();
        verifierQuota($u, 'vocab_lists', 'borrowed = 1', 'listes reprises', 'dans la bibliothèque');
        $token = str_field('token', 32);
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT l.id, l.user_id, l.name, l.chapter, l.lang_source, l.lang_target, l.reports,
                    u.name AS proprietaire, u.email
             FROM vocab_lists l JOIN users u ON u.id = l.user_id WHERE l.share_token = ?'
        );
        $st->execute([$token]);
        $src = $st->fetch();
        if (!$src || (int) $src['reports'] >= 3) {
            fail('cette liste n\'est plus accessible', 404);
        }
        if ((int) $src['user_id'] === (int) $u['id']) {
            fail('cette liste est déjà la tienne');
        }
        $st = db()->prepare('SELECT id FROM vocab_lists WHERE user_id = ? AND origin_token = ?');
        $st->execute([$u['id'], $token]);
        if ($deja = $st->fetch()) {
            jsonOut(['id' => (int) $deja['id'], 'already' => true]);
        }
        $proprio = trim((string) $src['proprietaire']);
        if ($proprio === '') {
            $proprio = explode('@', (string) $src['email'])[0];
        }
        db()->prepare(
            'INSERT INTO vocab_lists (user_id, name, chapter, lang_source, lang_target, borrowed, origin_token, origin_owner)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([$u['id'], $src['name'], $src['chapter'], $src['lang_source'],
                    $src['lang_target'], $token, u_cut($proprio, 80)]);
        $neuf = (int) db()->lastInsertId();
        enregistrerMots($neuf, motsDeLaListe((int) $src['id']));
        jsonOut(['id' => $neuf]);
    }

    case 'vocab_report': {
        requirePost();
        $id = (int) (body()['id'] ?? 0);
        if (recentAttempts('report', 60) >= 10) {
            fail('trop de signalements. Réessaie plus tard.', 429);
        }
        noteAttempt('report', '');
        db()->prepare('UPDATE vocab_lists SET reports = reports + 1 WHERE id = ? AND is_public = 1')->execute([$id]);
        $st = db()->prepare('SELECT reports FROM vocab_lists WHERE id = ?');
        $st->execute([$id]);
        jsonOut(['reported' => true, 'count' => (int) $st->fetchColumn()]);
    }

    case 'vocab_attempt_save': {
        requirePost();
        $u = requireAbonne();
        $listId = (int) (body()['list_id'] ?? 0);
        if ($listId > 0) {
            $v = db()->prepare('SELECT id FROM vocab_lists WHERE id = ? AND user_id = ?');
            $v->execute([$listId, $u['id']]);
            if (!$v->fetch()) {
                $listId = 0;
            }
        }
        $direction = (string) (body()['direction'] ?? 'vers') === 'depuis' ? 'depuis' : 'vers';
        db()->prepare(
            'INSERT INTO vocab_attempts (user_id, list_id, label, direction, asked, correct, errors)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $u['id'], $listId > 0 ? $listId : null,
            u_cut(trim((string) (body()['label'] ?? '')), 120), $direction,
            max(0, (int) (body()['asked'] ?? 0)),
            max(0, (int) (body()['correct'] ?? 0)),
            max(0, (int) (body()['errors'] ?? 0)),
        ]);
        jsonOut(['saved' => true]);
    }

    case 'vocab_attempts': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT list_id, label, direction, asked, correct, errors, created_at
             FROM vocab_attempts WHERE user_id = ? ORDER BY id ASC LIMIT 400'
        );
        $st->execute([$u['id']]);

        $groupes = [];
        foreach ($st->fetchAll() as $a) {
            $cle = $a['list_id'] ? ('l' . $a['list_id']) : ('t' . $a['label']);
            if (!isset($groupes[$cle])) {
                $groupes[$cle] = ['list_id' => $a['list_id'] ? (int) $a['list_id'] : null,
                                  'label' => (string) $a['label'], 'essais' => []];
            }
            $groupes[$cle]['essais'][] = [
                'asked' => (int) $a['asked'], 'correct' => (int) $a['correct'],
                'errors' => (int) $a['errors'], 'direction' => (string) $a['direction'],
                'created_at' => (string) $a['created_at'],
            ];
        }
        $sortie = [];
        foreach ($groupes as $g) {
            $n = count($g['essais']);
            $g['nb'] = $n;
            $g['premier_erreurs'] = $g['essais'][0]['errors'];
            $g['dernier_erreurs'] = $g['essais'][$n - 1]['errors'];
            $g['meilleur_erreurs'] = min(array_column($g['essais'], 'errors'));
            $g['derniere_date'] = $g['essais'][$n - 1]['created_at'];
            $sortie[] = $g;
        }
        usort($sortie, static fn(array $a, array $b): int => strcmp($b['derniere_date'], $a['derniere_date']));
        jsonOut(['listes' => $sortie]);
    }

    /* =================================================================
       Mathématiques
       Une série est un réglage, pas une liste de questions : celles-ci
       sont engendrées à chaque séance. Rien à stocker, et jamais deux
       séances identiques.
       ================================================================= */

    case 'math_lists': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT id, name, chapter, famille, reglages, nb_questions, is_public,
                    borrowed, origin_owner, share_token
             FROM math_lists WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 200'
        );
        $st->execute([$u['id']]);
        jsonOut(['lists' => array_map('shapeMaths', $st->fetchAll())]);
    }

    case 'math_save': {
        requirePost();
        $u = requireUser();
        $id      = (int) (body()['id'] ?? 0);
        $name    = str_field('name', MAX_NAME);
        $chapter = u_cut(trim((string) (body()['chapter'] ?? '')), 80);
        $famille = (string) (body()['famille'] ?? '');
        $nb      = max(5, min(100, (int) (body()['nb'] ?? 20)));
        $public  = !empty(body()['is_public']);

        if ($name === '') {
            fail('il faut un nom pour cette série');
        }
        if (!in_array($famille, FAMILLES_MATHS, true)) {
            fail('famille d\'exercices inconnue');
        }
        $reglages = reglagesMaths(body()['reglages'] ?? []);

        if ($id > 0) {
            $v = db()->prepare('SELECT borrowed, share_token FROM math_lists WHERE id = ? AND user_id = ?');
            $v->execute([$id, $u['id']]);
            $avant = $v->fetch();
            if (!$avant) {
                fail('série introuvable', 404);
            }
            /* Modifier un contenu repris en fait le sien : la copie personnelle
               cesse d'être une reprise. L'originale n'est pas touchée, et la
               version adaptée ne peut pas être republiée. */
            $adaptee = ((int) $avant['borrowed'] === 1);
            if ($adaptee) {
                $public = false;
                db()->prepare('UPDATE math_lists SET borrowed = 0 WHERE id = ? AND user_id = ?')
                    ->execute([$id, $u['id']]);
            }
            $jeton = $adaptee ? null : ($avant['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null));
            db()->prepare(
                'UPDATE math_lists SET name = ?, chapter = ?, famille = ?, reglages = ?, nb_questions = ?,
                        is_public = ?, share_token = ?, published_at = ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ',
                        updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND user_id = ?'
            )->execute([$name, $chapter, $famille, $reglages, $nb, $public ? 1 : 0, $jeton, $id, $u['id']]);
            jsonOut(['id' => $id, 'share_token' => $jeton]);
        }

        verifierQuota($u, 'math_lists', 'borrowed = 0', 'séries', 'à toi');
        $st = db()->prepare('SELECT COUNT(*) FROM math_lists WHERE user_id = ?');
        $st->execute([$u['id']]);
        if ((int) $st->fetchColumn() >= 200) {
            fail('limite de 200 séries atteinte');
        }
        $jeton = $public ? bin2hex(random_bytes(16)) : null;
        db()->prepare(
            'INSERT INTO math_lists (user_id, name, chapter, famille, reglages, nb_questions, is_public, share_token, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ' . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ')'
        )->execute([$u['id'], $name, $chapter, $famille, $reglages, $nb, $public ? 1 : 0, $jeton]);
        jsonOut(['id' => (int) db()->lastInsertId(), 'share_token' => $jeton]);
    }

    case 'math_delete': {
        requirePost();
        $u = requireUser();
        db()->prepare('DELETE FROM math_lists WHERE id = ? AND user_id = ?')
            ->execute([(int) (body()['id'] ?? 0), $u['id']]);
        jsonOut(['deleted' => true]);
    }

    case 'math_publish': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $public = !empty(body()['public']);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM math_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('série introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette série vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette série est celle de son auteur : à lui de la publier');
        }
        $jeton = $row['share_token'] ?: ($public ? bin2hex(random_bytes(16)) : null);
        db()->prepare('UPDATE math_lists SET is_public = ?, share_token = ?, published_at = '
            . ($public ? 'CURRENT_TIMESTAMP' : 'NULL') . ' WHERE id = ? AND user_id = ?')
            ->execute([$public ? 1 : 0, $jeton, $id, $u['id']]);
        jsonOut(['id' => $id, 'is_public' => $public, 'share_token' => $jeton]);
    }

    case 'math_share': {
        requirePost();
        $u = requireAbonne();
        $id = (int) (body()['id'] ?? 0);
        $st = db()->prepare('SELECT share_token, borrowed, origin_owner FROM math_lists WHERE id = ? AND user_id = ?');
        $st->execute([$id, $u['id']]);
        $row = $st->fetch();
        if (!$row) {
            fail('série introuvable', 404);
        }
        // adapter le travail d'un autre pour soi est une chose ;
        // le rediffuser sous son nom en est une autre
        if (!empty($row['origin_owner'])) {
            fail('cette série vient de la bibliothèque : tu peux l\'adapter pour toi, mais pas la republier sous ton nom');
        }
        if ((int) $row['borrowed'] === 1) {
            fail('cette série est celle de son auteur : à lui de la partager');
        }
        $jeton = $row['share_token'];
        if (!$jeton) {
            $jeton = bin2hex(random_bytes(16));
            db()->prepare('UPDATE math_lists SET share_token = ? WHERE id = ? AND user_id = ?')
                ->execute([$jeton, $id, $u['id']]);
        }
        jsonOut(['share_token' => $jeton]);
    }

    case 'math_open': {
        $token = (string) ($_GET['t'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT id, name, chapter, famille, reglages, nb_questions, reports FROM math_lists WHERE share_token = ?'
        );
        $st->execute([$token]);
        $l = $st->fetch();
        if (!$l || (int) $l['reports'] >= 3) {
            fail('cette série n\'est plus accessible', 404);
        }
        jsonOut(['list' => shapeMaths($l)]);
    }

    case 'math_library': {
        $q = u_cut(trim((string) ($_GET['q'] ?? '')), 60);
        $famille = (string) ($_GET['famille'] ?? '');
        $sql = 'SELECT l.id, l.name, l.chapter, l.famille, l.reglages, l.nb_questions, l.share_token,
                       u.name AS proprietaire
                FROM math_lists l JOIN users u ON u.id = l.user_id
                WHERE l.is_public = 1 AND l.reports < 3';
        $args = [];
        if (in_array($famille, FAMILLES_MATHS, true)) {
            $sql .= ' AND l.famille = ?';
            $args[] = $famille;
        }
        if ($q !== '') {
            $sql .= ' AND (l.name LIKE ? OR l.chapter LIKE ? OR u.name LIKE ?)';
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $args[] = $like; $args[] = $like; $args[] = $like;
        }
        $sql .= ' ORDER BY l.published_at DESC, l.id DESC LIMIT 40';
        $st = db()->prepare($sql);
        $st->execute($args);

        $moi = currentUser();
        $abonne = $moi ? abonnementActif($moi) : false;
        $rows = [];
        foreach ($st->fetchAll() as $r) {
            $l = shapeMaths($r);
            $l['proprietaire'] = (string) ($r['proprietaire'] ?? '');
            if (!$moi) {
                unset($l['share_token']);
            }
            $rows[] = $l;
        }
        jsonOut(['lists' => $rows, 'abonne' => $abonne, 'connecte' => $moi !== null]);
    }

    case 'math_borrow': {
        requirePost();
        $u = requireUser();
        verifierQuota($u, 'math_lists', 'borrowed = 1', 'séries reprises', 'dans la bibliothèque');
        $token = str_field('token', 32);
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
            fail('lien invalide', 404);
        }
        $st = db()->prepare(
            'SELECT l.id, l.user_id, l.name, l.chapter, l.famille, l.reglages, l.nb_questions, l.reports,
                    u.name AS proprietaire, u.email
             FROM math_lists l JOIN users u ON u.id = l.user_id WHERE l.share_token = ?'
        );
        $st->execute([$token]);
        $src = $st->fetch();
        if (!$src || (int) $src['reports'] >= 3) {
            fail('cette série n\'est plus accessible', 404);
        }
        if ((int) $src['user_id'] === (int) $u['id']) {
            fail('cette série est déjà la tienne');
        }
        $st = db()->prepare('SELECT id FROM math_lists WHERE user_id = ? AND origin_token = ?');
        $st->execute([$u['id'], $token]);
        if ($deja = $st->fetch()) {
            jsonOut(['id' => (int) $deja['id'], 'already' => true]);
        }
        $proprio = trim((string) $src['proprietaire']);
        if ($proprio === '') {
            $proprio = explode('@', (string) $src['email'])[0];
        }
        db()->prepare(
            'INSERT INTO math_lists (user_id, name, chapter, famille, reglages, nb_questions, borrowed, origin_token, origin_owner)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([$u['id'], $src['name'], $src['chapter'], $src['famille'], $src['reglages'],
                    (int) $src['nb_questions'], $token, u_cut($proprio, 80)]);
        jsonOut(['id' => (int) db()->lastInsertId()]);
    }

    case 'math_report': {
        requirePost();
        $id = (int) (body()['id'] ?? 0);
        if (recentAttempts('report', 60) >= 10) {
            fail('trop de signalements. Réessaie plus tard.', 429);
        }
        noteAttempt('report', '');
        db()->prepare('UPDATE math_lists SET reports = reports + 1 WHERE id = ? AND is_public = 1')->execute([$id]);
        $st = db()->prepare('SELECT reports FROM math_lists WHERE id = ?');
        $st->execute([$id]);
        jsonOut(['reported' => true, 'count' => (int) $st->fetchColumn()]);
    }

    case 'math_attempt_save': {
        requirePost();
        $u = requireAbonne();
        $listId = (int) (body()['list_id'] ?? 0);
        if ($listId > 0) {
            $v = db()->prepare('SELECT id FROM math_lists WHERE id = ? AND user_id = ?');
            $v->execute([$listId, $u['id']]);
            if (!$v->fetch()) {
                $listId = 0;
            }
        }
        $famille = (string) (body()['famille'] ?? '');
        db()->prepare(
            'INSERT INTO math_attempts (user_id, list_id, label, famille, asked, correct, errors, secondes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $u['id'], $listId > 0 ? $listId : null,
            u_cut(trim((string) (body()['label'] ?? '')), 120),
            in_array($famille, FAMILLES_MATHS, true) ? $famille : '',
            max(0, (int) (body()['asked'] ?? 0)),
            max(0, (int) (body()['correct'] ?? 0)),
            max(0, (int) (body()['errors'] ?? 0)),
            max(0, min(36000, (int) (body()['secondes'] ?? 0))),
        ]);
        jsonOut(['saved' => true]);
    }

    case 'math_attempts': {
        $u = requireUser();
        $st = db()->prepare(
            'SELECT list_id, label, famille, asked, correct, errors, secondes, created_at
             FROM math_attempts WHERE user_id = ? ORDER BY id ASC LIMIT 400'
        );
        $st->execute([$u['id']]);

        $groupes = [];
        foreach ($st->fetchAll() as $a) {
            $cle = $a['list_id'] ? ('l' . $a['list_id']) : ('f' . $a['famille'] . $a['label']);
            if (!isset($groupes[$cle])) {
                $groupes[$cle] = ['list_id' => $a['list_id'] ? (int) $a['list_id'] : null,
                                  'label' => (string) $a['label'],
                                  'famille' => (string) $a['famille'], 'essais' => []];
            }
            $groupes[$cle]['essais'][] = [
                'asked' => (int) $a['asked'], 'correct' => (int) $a['correct'],
                'errors' => (int) $a['errors'], 'secondes' => (int) $a['secondes'],
                'created_at' => (string) $a['created_at'],
            ];
        }
        $sortie = [];
        foreach ($groupes as $g) {
            $n = count($g['essais']);
            $g['nb'] = $n;
            $g['premier_erreurs'] = $g['essais'][0]['errors'];
            $g['dernier_erreurs'] = $g['essais'][$n - 1]['errors'];
            $g['meilleur_erreurs'] = min(array_column($g['essais'], 'errors'));
            $g['derniere_date'] = $g['essais'][$n - 1]['created_at'];
            $sortie[] = $g;
        }
        usort($sortie, static fn(array $a, array $b): int => strcmp($b['derniere_date'], $a['derniere_date']));
        jsonOut(['listes' => $sortie]);
    }

    /* ---------- profil : ce que le compte contient ---------- */
    case 'profil': {
        $u = requireUser();
        $compte = static function (string $sql) use ($u): int {
            $st = db()->prepare($sql);
            $st->execute([$u['id']]);
            return (int) $st->fetchColumn();
        };
        $st = db()->prepare('SELECT created_at, last_login_at, google_sub, password_hash FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        $d = $st->fetch() ?: [];

        jsonOut([
            'profil' => [
                'nom'            => (string) $u['name'],
                'email'          => (string) $u['email'],
                'inscrit_le'     => $d['created_at'] ?? null,
                'derniere_visite'=> $d['last_login_at'] ?? null,
                'google'         => !empty($d['google_sub']),
                'mot_de_passe'   => !empty($d['password_hash']),
            ],
            'abonnement' => etatAbonnement($u),
            'donnees' => [
                'dictees'  => $compte('SELECT COUNT(*) FROM dictations WHERE user_id = ?'),
                'reprises' => $compte('SELECT COUNT(*) FROM dictations WHERE user_id = ? AND borrowed = 1'),
                'publiees' => $compte('SELECT COUNT(*) FROM dictations WHERE user_id = ? AND is_public = 1'),
                'listes'   => $compte('SELECT COUNT(*) FROM verb_lists WHERE user_id = ?'),
                'resultats'=> $compte('SELECT COUNT(*) FROM attempts WHERE user_id = ?'),
            ],
        ]);
    }

    case 'profil_nom': {
        requirePost();
        $u = requireUser();
        $nom = str_field('nom', 60);
        db()->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$nom, $u['id']]);
        jsonOut(['nom' => $nom]);
    }

    /* ---------- changer de mot de passe ----------
       Un compte ouvert avec Google n'en a pas : il peut s'en créer un, sans
       avoir à en fournir un ancien qui n'existe pas. */
    case 'mot_de_passe': {
        requirePost();
        $u = requireUser();
        $actuel  = (string) (body()['actuel'] ?? '');
        $nouveau = (string) (body()['nouveau'] ?? '');

        if (u_len($nouveau) < 8) {
            fail('le nouveau mot de passe doit faire au moins 8 caractères');
        }
        $st = db()->prepare('SELECT password_hash, pwd_version FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        $d = $st->fetch();
        $ancien = (string) ($d['password_hash'] ?? '');

        if ($ancien !== '') {
            if (recentAttempts('motdepasse', 15) >= 10) {
                fail('trop d\'essais, réessaie dans un quart d\'heure', 429);
            }
            noteAttempt('motdepasse', '');
            if (!password_verify($actuel, $ancien)) {
                fail('le mot de passe actuel est incorrect', 403);
            }
        }

        $version = ((int) ($d['pwd_version'] ?? 0)) + 1;
        db()->prepare('UPDATE users SET password_hash = ?, pwd_version = ? WHERE id = ?')
            ->execute([password_hash($nouveau, PASSWORD_DEFAULT), $version, $u['id']]);
        openSessionFor((int) $u['id'], $version);   // les autres appareils sont déconnectés
        jsonOut(['change' => true, 'csrf' => $_SESSION['csrf']]);
    }

    /* ---------- emporter toutes ses données ---------- */
    case 'export_tout': {
        $u = requireUser();
        $lire = static function (string $sql) use ($u): array {
            $st = db()->prepare($sql);
            $st->execute([$u['id']]);
            return $st->fetchAll();
        };
        jsonOut([
            'exporte_le' => date('c'),
            'compte' => ['nom' => $u['name'], 'email' => $u['email']],
            'dictees' => $lire('SELECT title, author, level, body AS text, is_public, borrowed, created_at FROM dictations WHERE user_id = ? ORDER BY id'),
            'listes'  => $lire('SELECT name, verbs, created_at FROM verb_lists WHERE user_id = ? ORDER BY id'),
            'resultats' => $lire('SELECT label, words, correct_words, errors, created_at FROM attempts WHERE user_id = ? ORDER BY id'),
        ]);
    }

    /* ---------- abonnement ---------- */
    case 'abonnement': {
        $u = requireUser();
        jsonOut(['abonnement' => etatAbonnement($u), 'offre' => offrePublique()]);
    }

    // ouvre une page de paiement chez le prestataire ; aucune donnée
    // bancaire ne transite par ce serveur
    case 'abonnement_paiement': {
        requirePost();
        $u = requireUser();
        if (!stripeConfigure()) {
            fail('le paiement n\'est pas encore configuré sur ce site', 503);
        }
        $plan = (string) (body()['plan'] ?? '');
        if ($plan !== 'mensuel' && $plan !== 'annuel') {
            fail('formule inconnue');
        }
        if (abonnementActif($u)) {
            fail('ton abonnement est déjà actif');
        }

        $c = config();
        $prix = (string) ($plan === 'mensuel' ? $c['stripe_prix_mensuel'] : $c['stripe_prix_annuel']);

        // Erreur la plus fréquente à la mise en place : on recopie le montant
        // au lieu de l'identifiant du tarif. Autant l'attraper ici, avec un
        // message clair, plutôt que de laisser Stripe répondre en anglais.
        if (strpos($prix, 'price_') !== 0) {
            $quoi = strpos($prix, 'prod_') === 0
                ? "l'identifiant d'un produit"
                : 'la valeur';
            fail('la configuration du paiement contient ' . $quoi . ' « ' . $prix . ' » '
               . "là où Stripe attend l'identifiant d'un TARIF, de la forme price_1Ab2Cd… "
               . 'Voyez api/paiement-test.php.', 500);
        }
        $params = [
            'mode' => 'subscription',
            'line_items[0][price]' => $prix,
            'line_items[0][quantity]' => 1,
            'success_url' => siteUrl() . '/abonnement.html?retour=merci&session={CHECKOUT_SESSION_ID}',
            'cancel_url'  => siteUrl() . '/abonnement.html?retour=annule',
            'client_reference_id' => (string) $u['id'],
            'locale' => 'fr',
            'allow_promotion_codes' => 'true',
            'subscription_data[metadata][user_id]' => (string) $u['id'],
            'metadata[user_id]' => (string) $u['id'],
        ];
        if (!empty($u['payeur_id'])) {
            $params['customer'] = $u['payeur_id'];
        } else {
            $params['customer_email'] = $u['email'];
        }

        $session = stripeAppel('checkout/sessions', $params);
        jsonOut(['url' => (string) ($session['url'] ?? '')]);
    }

    /* ---------- confirmer au retour du paiement ----------
       On ne croit pas le navigateur : on relit la session chez Stripe et
       l'on vérifie qu'elle est payée et qu'elle appartient bien à ce compte.
       Ce chemin rend l'activation indépendante de la notification, qui peut
       être mal configurée — un client qui a payé doit être servi. */
    case 'abonnement_confirmer': {
        requirePost();
        $u = requireUser();
        $sid = str_field('session', 100);
        if (!preg_match('/^cs_[A-Za-z0-9_]+$/', $sid)) {
            fail('identifiant de session invalide');
        }
        $s = stripeLire('checkout/sessions/' . rawurlencode($sid));
        if (!$s['ok']) {
            fail('impossible de vérifier le paiement : ' . $s['message'], 502);
        }
        $o = $s['objet'];

        $proprietaire = (string) ($o['client_reference_id'] ?? ($o['metadata']['user_id'] ?? ''));
        if ($proprietaire !== (string) $u['id']) {
            fail('ce paiement ne correspond pas à ce compte', 403);
        }
        $paye = (string) ($o['payment_status'] ?? '') === 'paid'
             || (string) ($o['status'] ?? '') === 'complete';
        if (!$paye) {
            fail('le paiement n\'est pas encore confirmé par la banque');
        }

        appliquerAbonnement((int) $u['id'], (string) ($o['customer'] ?? ''), (string) ($o['subscription'] ?? ''));
        jsonOut(['abonnement' => etatAbonnement(currentUser() ?: $u)]);
    }

    /* ---------- rattraper un abonnement resté invisible ----------
       Pour le client qui a payé sans que rien ne s'ouvre : on cherche chez
       Stripe un abonnement à son adresse et on le rattache. */
    case 'abonnement_resynchroniser': {
        requirePost();
        $u = requireUser();
        if (!stripeConfigure()) {
            fail('le paiement n\'est pas configuré sur ce site', 503);
        }
        if (recentAttempts('resync', 15) >= 10) {
            fail('trop de tentatives, réessaie dans un quart d\'heure', 429);
        }
        noteAttempt('resync', '');

        $trouve = !empty($u['abonnement_id'])
            ? appliquerAbonnement((int) $u['id'], (string) ($u['payeur_id'] ?? ''), (string) $u['abonnement_id'])
            : false;
        if (!$trouve) {
            $trouve = retrouverAbonnement((int) $u['id'], (string) $u['email']);
        }
        $apres = currentUser() ?: $u;
        jsonOut([
            'trouve'     => $trouve,
            'abonnement' => etatAbonnement($apres),
        ]);
    }

    // page du prestataire où l'on change de carte, télécharge ses factures
    // ou résilie : c'est lui qui garde tout cela, pas nous
    case 'abonnement_gerer': {
        requirePost();
        $u = requireUser();
        $c = config();

        // L'identifiant du payeur manque ? C'est le cas d'un abonnement
        // ouvert à la main, ou d'une notification jamais arrivée. On va le
        // chercher chez Stripe à partir de l'adresse du compte.
        if (empty($u['payeur_id']) && stripeConfigure()) {
            retrouverAbonnement((int) $u['id'], (string) $u['email']);
            $u = currentUser() ?: $u;
        }

        // Cas normal : on ouvre le portail directement sur le bon client,
        // sans qu'il ait à s'identifier une seconde fois.
        if (!empty($u['payeur_id']) && stripeConfigure()) {
            // en cas d'échec on ne s'arrête pas : le lien public prend le relais,
            // car pouvoir résilier ne doit jamais dépendre d'un service en panne
            $session = stripeAppel('billing_portal/sessions', [
                'customer'   => (string) $u['payeur_id'],
                'return_url' => siteUrl() . '/abonnement.html',
            ], false);
            $url = (string) ($session['url'] ?? '');
            if ($url !== '') {
                jsonOut(['url' => $url]);
            }
            error_log('[dictee] portail client indisponible : ' . (string) ($session['__echec'] ?? ''));
        }

        // Secours : le lien de portail public. Stripe demandera son adresse
        // e-mail au client et lui enverra un code. Utile si l'identifiant de
        // payeur n'a pas encore été rattaché au compte.
        $public = (string) ($c['stripe_portail_url'] ?? '');
        if ($public !== '') {
            jsonOut(['url' => $public, 'public' => true]);
        }

        fail('impossible d\'ouvrir la gestion : aucun client de paiement n\'est rattaché à ce '
           . 'compte, et aucun lien de portail n\'est configuré. Renseignez stripe_portail_url '
           . 'dans api/config.php, ou utilisez « Retrouver mon abonnement ».');
    }

    /* =================================================================
       Administration
       Chaque action revérifie le rôle en base : masquer un bouton ne
       protège rien, et le navigateur n'est jamais cru sur parole.
       ================================================================= */

    case 'admin_resume': {
        requireAdmin();
        $n = static function (string $sql): int {
            try { return (int) db()->query($sql)->fetchColumn(); } catch (Throwable $e) { return -1; }
        };
        jsonOut(['resume' => [
            'comptes'      => $n('SELECT COUNT(*) FROM users'),
            'abonnes'      => $n("SELECT COUNT(*) FROM users WHERE plan_statut IN ('actif','resilie')"),
            'impayes'      => $n("SELECT COUNT(*) FROM users WHERE plan_statut = 'impaye'"),
            'admins'       => $n("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
            'moderateurs'  => $n("SELECT COUNT(*) FROM users WHERE role = 'moderateur'"),
            'dictees'      => $n('SELECT COUNT(*) FROM dictations'),
            'dictees_pub'  => $n('SELECT COUNT(*) FROM dictations WHERE is_public = 1'),
            'listes_verbes'=> $n('SELECT COUNT(*) FROM verb_lists'),
            'listes_vocab' => $n('SELECT COUNT(*) FROM vocab_lists'),
            'signalements' => $n('SELECT COUNT(*) FROM dictations WHERE reports > 0')
                            + max(0, $n('SELECT COUNT(*) FROM verb_lists WHERE reports > 0'))
                            + max(0, $n('SELECT COUNT(*) FROM vocab_lists WHERE reports > 0')),
        ]]);
    }

    case 'admin_comptes': {
        requireAdmin();
        require_once __DIR__ . '/nha.php';
        $q = u_cut(trim((string) ($_GET['q'] ?? '')), 60);
        $filtre = (string) ($_GET['filtre'] ?? '');

        $sql = 'SELECT id, account_id, email, name, role, plan, plan_statut, plan_fin,
                       created_at, last_login_at, google_sub, payeur_id
                FROM users WHERE 1 = 1';
        $args = [];
        if ($q !== '') {
            $sql .= ' AND (email LIKE ? OR name LIKE ?)';
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $args[] = $like; $args[] = $like;
        }
        if ($filtre === 'abonnes')     { $sql .= " AND plan_statut IN ('actif','resilie')"; }
        elseif ($filtre === 'impayes') { $sql .= " AND plan_statut = 'impaye'"; }
        // le filtre par rôle s'applique après lecture : le rôle vit dans
        // le portail, pas dans cette base
        $sql .= ' ORDER BY id DESC LIMIT 100';

        $st = db()->prepare($sql);
        $st->execute($args);
        $lignes = $st->fetchAll();

        /* Le rôle et l'abonnement vivent dans le portail : on les lit là-bas
           en une seule requête, plutôt que d'afficher des valeurs locales
           qui seraient périmées. */
        $central = [];
        if (nhaDisponible()) {
            $ids = array_values(array_filter(array_map(
                static fn(array $r): int => (int) ($r['account_id'] ?? 0), $lignes)));
            if ($ids) {
                try {
                    $trous = implode(',', array_fill(0, count($ids), '?'));
                    $q = nha_db()->prepare(
                        'SELECT id, role, plan, plan_statut, plan_fin, email_verified_at
                         FROM accounts WHERE id IN (' . $trous . ')'
                    );
                    $q->execute($ids);
                    foreach ($q->fetchAll() as $c) {
                        $central[(int) $c['id']] = $c;
                    }
                } catch (Throwable $e) {
                    error_log('[teaching] comptes centraux illisibles : ' . $e->getMessage());
                }
            }
        }

        $rows = array_map(static function (array $r) use ($central): array {
            $c = $central[(int) ($r['account_id'] ?? 0)] ?? null;
            return [
                'id'      => (int) $r['id'],
                'email'   => (string) $r['email'],
                'nom'     => (string) $r['name'],
                'role'    => (string) ($c['role'] ?? $r['role']),
                'central' => $c !== null,
                'verifie' => $c !== null ? ($c['email_verified_at'] !== null) : null,
                'plan'    => (string) ($c['plan'] ?? $r['plan']),
                'statut'  => (string) ($c['plan_statut'] ?? $r['plan_statut']),
                'fin'     => $c['plan_fin'] ?? $r['plan_fin'],
                'inscrit' => $r['created_at'],
                'visite'  => $r['last_login_at'],
                'google'  => !empty($r['google_sub']),
                'payeur'  => !empty($r['payeur_id']),
            ];
        }, $lignes);

        if ($filtre === 'roles') {
            $rows = array_values(array_filter($rows, static fn(array $r): bool => $r['role'] !== 'membre'));
        }
        jsonOut(['comptes' => $rows]);
    }

    case 'admin_role': {
        requirePost();
        $moi = requireAdmin();
        require_once __DIR__ . '/nha.php';
        $id = (int) (body()['id'] ?? 0);
        $role = (string) (body()['role'] ?? '');
        if (!in_array($role, ROLES, true)) {
            fail('rôle inconnu');
        }

        /* Le rôle est global : on l'écrit dans le compte central, jamais
           dans la table locale. Sinon teaching et le portail se
           contrediraient au premier changement. */
        if (nhaDisponible()) {
            $st = db()->prepare('SELECT account_id, email FROM users WHERE id = ?');
            $st->execute([$id]);
            $cible = $st->fetch();
            if (!$cible || !$cible['account_id']) {
                fail('ce compte n\'est pas encore rattaché au portail', 404);
            }
            $accountId = (int) $cible['account_id'];

            if ($accountId === (int) ($moi['account_id'] ?? 0) && $role !== 'admin') {
                fail('tu ne peux pas retirer ton propre accès d\'administration');
            }
            try {
                $st = nha_db()->prepare('SELECT email, role FROM accounts WHERE id = ? AND deleted_at IS NULL');
                $st->execute([$accountId]);
                $compte = $st->fetch();
                if (!$compte) {
                    fail('compte introuvable dans le portail', 404);
                }
                if ($compte['role'] === 'admin' && $role !== 'admin') {
                    $n = (int) nha_db()->query(
                        "SELECT COUNT(*) FROM accounts WHERE role = 'admin' AND deleted_at IS NULL"
                    )->fetchColumn();
                    if ($n <= 1) {
                        fail('c\'est le dernier administrateur : nomme quelqu\'un d\'autre avant');
                    }
                }
                nha_db()->prepare('UPDATE accounts SET role = ? WHERE id = ?')
                        ->execute([$role, $accountId]);
                nha_log($accountId, 'role_change', $compte['role'] . ' → ' . $role
                      . ' (par ' . $moi['email'] . ')');
            } catch (Throwable $e) {
                error_log('[teaching] changement de rôle impossible : ' . $e->getMessage());
                fail('changement impossible : ' . nhaRaison('portail indisponible', $e), 500);
            }
            jsonOut(['id' => $id, 'role' => $role, 'global' => true]);
        }

        // sans portail : l'ancien mécanisme, purement local
        if ($id === (int) $moi['id'] && $role !== 'admin') {
            fail('tu ne peux pas retirer ton propre accès d\'administration');
        }
        $st = db()->prepare('SELECT email, role FROM users WHERE id = ?');
        $st->execute([$id]);
        $cible = $st->fetch();
        if (!$cible) {
            fail('compte introuvable', 404);
        }
        if ($cible['role'] === 'admin' && $role !== 'admin') {
            $n = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
            if ($n <= 1) {
                fail('c\'est le dernier administrateur : nomme quelqu\'un d\'autre avant');
            }
        }
        db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $id]);
        error_log('[dictee] rôle de ' . $cible['email'] . ' : ' . $cible['role'] . ' → ' . $role
                . ' (par ' . $moi['email'] . ')');
        jsonOut(['id' => $id, 'role' => $role]);
    }

    /* ---------- les contenus publiés, pour la modération ---------- */
    case 'admin_contenus': {
        requireAdmin();
        $type = (string) ($_GET['type'] ?? 'dictees');
        $signales = !empty($_GET['signales']);

        if ($type === 'listes') {
            $sql = 'SELECT l.id, l.name AS titre, l.reports, l.is_public, u.email, u.name AS proprietaire
                    FROM verb_lists l JOIN users u ON u.id = l.user_id WHERE l.is_public = 1';
        } elseif ($type === 'vocabulaire') {
            $sql = 'SELECT l.id, l.name AS titre, l.chapter, l.lang_target, l.reports, l.is_public,
                           u.email, u.name AS proprietaire
                    FROM vocab_lists l JOIN users u ON u.id = l.user_id WHERE l.is_public = 1';
        } else {
            $type = 'dictees';
            $sql = 'SELECT d.id, d.title AS titre, d.author, d.level, d.reports, d.is_public,
                           u.email, u.name AS proprietaire
                    FROM dictations d JOIN users u ON u.id = d.user_id WHERE d.is_public = 1';
        }
        // le préfixe est indispensable : `id` et `reports` existent des deux côtés
        $prefixe = ($type === 'dictees') ? 'd.' : 'l.';
        if ($signales) {
            $sql .= ' AND ' . $prefixe . 'reports > 0';
        }
        $sql .= ' ORDER BY ' . $prefixe . 'reports DESC, ' . $prefixe . 'id DESC LIMIT 100';

        $st = db()->query($sql);
        jsonOut(['type' => $type, 'contenus' => $st->fetchAll()]);
    }

    case 'admin_depublier': {
        requirePost();
        $moi = requireAdmin();
        $type = (string) (body()['type'] ?? '');
        $id = (int) (body()['id'] ?? 0);
        $tables = ['dictees' => 'dictations', 'listes' => 'verb_lists', 'vocabulaire' => 'vocab_lists'];
        if (!isset($tables[$type]) || $id <= 0) {
            fail('contenu inconnu');
        }
        // on dépublie sans effacer : le contenu appartient à son auteur
        db()->prepare('UPDATE ' . $tables[$type] . ' SET is_public = 0, published_at = NULL WHERE id = ?')
            ->execute([$id]);
        error_log('[dictee] dépublication ' . $type . ' #' . $id . ' par ' . $moi['email']);
        jsonOut(['depublie' => true]);
    }

    case 'admin_signalements_effacer': {
        requirePost();
        requireAdmin();
        $type = (string) (body()['type'] ?? '');
        $id = (int) (body()['id'] ?? 0);
        $tables = ['dictees' => 'dictations', 'listes' => 'verb_lists', 'vocabulaire' => 'vocab_lists'];
        if (!isset($tables[$type]) || $id <= 0) {
            fail('contenu inconnu');
        }
        db()->prepare('UPDATE ' . $tables[$type] . ' SET reports = 0 WHERE id = ?')->execute([$id]);
        jsonOut(['efface' => true]);
    }

    case 'admin_facturation': {
        requireAdmin();
        try {
            $st = db()->query(
                'SELECT b.event_id, b.type, b.resume, b.created_at, u.email
                 FROM billing_events b LEFT JOIN users u ON u.id = b.user_id
                 ORDER BY b.id DESC LIMIT 40'
            );
            jsonOut(['evenements' => $st->fetchAll()]);
        } catch (Throwable $e) {
            jsonOut(['evenements' => []]);
        }
    }

    /* ---------- supprimer son compte et tout ce qui va avec ---------- */
    case 'account_delete': {
        requirePost();
        $u = requireUser();
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
        $_SESSION = [];
        session_regenerate_id(true);
        jsonOut(['deleted' => true]);
    }

    default:
        fail('action inconnue', 404);
}
