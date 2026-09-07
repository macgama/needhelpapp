<?php
/**
 * FamilyShop — le point d'entrée unique de l'API.
 *
 *   GET  ?a=session      qui je suis, mon foyer
 *   GET  ?a=version      le compteur, pour la synchronisation
 *   GET  ?a=tout         foyer + recettes + menu + liste, en un appel
 *   POST ?a=…            les écritures
 */

declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lectures.php';

ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => (bool) (config()['cookie_secure'] ?? true),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_name('familyshop_sess');
session_start();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

$action = (string) ($_GET['a'] ?? '');

try {
    switch ($action) {

    /* ---------- qui je suis ---------- */
    case 'session': {
        require_once __DIR__ . '/nha.php';
        $u = currentUser();
        $sortie = ['user' => null, 'csrf' => $_SESSION['csrf'],
                   'google' => googleClientId()];
        if ($u) {
            $sortie['user'] = ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name'],
                               'role' => $u['role']];
        }
        /* Une application fermée pour mise à jour le dit au navigateur,
           qui affiche une page d'attente plutôt qu'une erreur. */
        $sortie['ouverte'] = nhaOuverte();
        if (nhaDisponible()) {
            $sortie['portail'] = [
                'actif'       => true,
                'connexion'   => nhaUrlConnexion(),
                'inscription' => nhaUrlInscription(),
                'profil'      => nhaUrl('/profil.php'),
                'abonnement'  => nhaUrl('/abonnement.php'),
                'deconnexion' => nhaUrl('/deconnexion.php'),
                'motdepasse'  => nhaUrlMotDePasse(),
                'accueil'     => nhaUrl('/'),
            ];
        }
        jsonOut($sortie);
    }

    /* ================= L'IDENTITÉ =================
       Le compte est celui du portail, mais le formulaire reste ici :
       personne n'a à quitter l'application qu'il utilise pour se
       connecter. Ces cinq actions manquaient, et leur absence était
       invisible — le navigateur les appelait, le serveur répondait
       « action inconnue », et l'erreur était avalée. */

    case 'register': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        $email = mb_strtolower(champ('email', 190), 'UTF-8');
        $motDePasse = (string) (body()['password'] ?? '');
        $nom = champ('name', 60);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('cette adresse e-mail n\'est pas valide');
        }
        if (mb_strlen($motDePasse) < 8) {
            fail('le mot de passe doit faire au moins 8 caractères');
        }
        if (!nhaDisponible()) {
            fail('la création de compte n\'est pas disponible : le portail est injoignable', 503);
        }
        $r = nhaInscription($email, $motDePasse, $nom);
        if (!$r['ok']) {
            jsonOut(['error' => $r['erreur'], 'existe' => !empty($r['existe'])], 400);
        }
        $u = currentUser();
        jsonOut([
            'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
            'csrf' => $_SESSION['csrf'],
            'nouveau' => true,
        ]);
    }

    case 'login': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        $email = mb_strtolower(champ('email', 190), 'UTF-8');
        $motDePasse = (string) (body()['password'] ?? '');
        if (!nhaDisponible()) {
            fail('la connexion n\'est pas disponible : le portail est injoignable', 503);
        }
        $r = nhaConnexion($email, $motDePasse);
        if (!$r['ok']) {
            fail($r['erreur'], 401);
        }
        $u = currentUser();
        jsonOut([
            'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
            'csrf' => $_SESSION['csrf'],
        ]);
    }

    case 'google': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        if (!nhaDisponible()) {
            fail('la connexion Google n\'est pas disponible', 503);
        }
        $jeton = (string) (body()['credential'] ?? '');
        $g = verifierJetonGoogle($jeton);
        if (!$g) {
            fail('la connexion Google n\'a pas pu être vérifiée', 401);
        }
        /* verifierJetonGoogle() a déjà refusé le jeton si l'adresse n'était
           pas vérifiée : d'où le « true ». Et elle renvoie « nom », pas
           « name » — se tromper de clé passait des valeurs vides au portail,
           qui refusait sans qu'on comprenne pourquoi. */
        $r = nhaGoogle((string) $g['sub'], (string) $g['email'], true, (string) ($g['nom'] ?? ''));
        if (!$r['ok']) {
            fail($r['erreur'], 401);
        }
        $u = currentUser();
        jsonOut([
            'user' => $u ? ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']] : null,
            'csrf' => $_SESSION['csrf'],
        ]);
    }

    /* Se déconnecter ferme la session PARTOUT : elle est commune à tout le
       domaine. Ne vider que la session locale laissait l'utilisateur
       connecté sur needhelpapp.com — et donc reconnecté ici au premier
       rechargement, ce qui donne l'impression que rien ne marche. */
    case 'logout': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        if (nhaDisponible()) {
            try {
                nha_logout();
            } catch (Throwable $e) {
                error_log('[familyshop] déconnexion du portail impossible : ' . $e->getMessage());
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

    /* Le portail détient les jetons et les courriels de réinitialisation.
       En tenir un second ici ferait deux mécanismes à garder d'accord. */
    case 'password_forgot': {
        requirePost();
        require_once __DIR__ . '/nha.php';
        jsonOut([
            'error' => 'La réinitialisation se fait sur needhelpapp.com.',
            'lien'  => nhaDisponible() ? nhaUrlMotDePasse() : 'https://needhelpapp.com/mot-de-passe-oublie.php',
        ], 409);
    }

    /* ---------- le compteur de synchronisation ----------
       Appelé souvent : il doit rester minuscule, une seule ligne lue. */
    case 'version': {
        $u = currentUser();
        if (!$u) {
            jsonOut(['version' => 0, 'connecte' => false]);
        }
        $f = foyerCourant($u);
        jsonOut(['version' => (int) $f['version'], 'connecte' => true]);
    }

    /* ---------- tout, en un seul appel ----------
       Un aller-retour plutôt que quatre : sur un téléphone en 3G au
       magasin, la différence se voit. */
    case 'tout': {
        $u = requireUser();
        $f = foyerCourant($u);
        jsonOut([
            'foyer'    => foyerPublic($f),
            'membres'  => membresDu((int) $f['id']),
            'recettes' => recettesDu((int) $f['id']),
            'menu'     => menuDu((int) $f['id']),
            'liste'     => listeDu((int) $f['id']),
            'habitudes' => habitudesDu((int) $f['id']),
            'version'   => (int) $f['version'],
        ]);
    }

    /* ================= LE FOYER ================= */

    case 'foyer_renommer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $nom = champ('nom', 80);
        if ($nom === '') {
            fail('donne un nom à ton foyer');
        }
        $couverts = (int) (body()['couverts'] ?? $f['couverts']);
        $couverts = max(1, min(20, $couverts));
        db()->prepare('UPDATE households SET name = ?, couverts = ? WHERE id = ?')
            ->execute([$nom, $couverts, $f['id']]);
        jsonOut(['ok' => true, 'version' => toucher((int) $f['id'])]);
    }

    /* Rejoindre un foyer avec son code.
       On quitte le sien au passage : appartenir à deux foyers doublerait
       les listes sans que personne comprenne pourquoi. */
    case 'foyer_rejoindre': {
        requirePost();
        $u = requireUser();
        $code = strtoupper(preg_replace('/[^A-Z0-9]/i', '', champ('code', 12)));
        if (strlen($code) !== 8) {
            fail('ce code ne ressemble pas à un code de foyer');
        }
        $st = db()->prepare('SELECT * FROM households WHERE join_code = ?');
        $st->execute([$code]);
        $cible = $st->fetch();
        if (!$cible) {
            fail('aucun foyer ne porte ce code', 404);
        }
        $ancien = foyerCourant($u);
        if ((int) $cible['id'] === (int) $ancien['id']) {
            jsonOut(['ok' => true, 'deja' => true, 'foyer' => foyerPublic($cible)]);
        }

        db()->prepare('DELETE FROM household_members WHERE user_id = ?')->execute([$u['id']]);
        db()->prepare('INSERT INTO household_members (household_id, user_id, role) VALUES (?, ?, ?)')
            ->execute([(int) $cible['id'], $u['id'], 'membre']);

        // un foyer que plus personne n'habite n'a plus de raison d'être
        $reste = db()->prepare('SELECT COUNT(*) FROM household_members WHERE household_id = ?');
        $reste->execute([(int) $ancien['id']]);
        if ((int) $reste->fetchColumn() === 0) {
            db()->prepare('DELETE FROM households WHERE id = ?')->execute([(int) $ancien['id']]);
        }
        jsonOut(['ok' => true, 'foyer' => foyerPublic($cible), 'version' => toucher((int) $cible['id'])]);
    }

    /* Un nouveau code invalide l'ancien : c'est ainsi qu'on retire
       l'accès à quelqu'un à qui on l'avait donné. */
    case 'foyer_nouveau_code': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        for ($essai = 0; $essai < 5; $essai++) {
            try {
                $code = codeFoyer();
                db()->prepare('UPDATE households SET join_code = ? WHERE id = ?')
                    ->execute([$code, $f['id']]);
                jsonOut(['ok' => true, 'code' => $code]);
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') { throw $e; }
            }
        }
        fail('impossible de tirer un nouveau code', 500);
    }

    case 'foyer_retirer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        if (($f['mon_role'] ?? '') !== 'proprietaire') {
            fail('seul celui qui a ouvert le foyer peut en retirer quelqu\'un', 403);
        }
        $qui = (int) (body()['user_id'] ?? 0);
        if ($qui === $u['id']) {
            fail('pour partir toi-même, rejoins un autre foyer');
        }
        db()->prepare('DELETE FROM household_members WHERE household_id = ? AND user_id = ?')
            ->execute([$f['id'], $qui]);
        jsonOut(['ok' => true, 'membres' => membresDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* ================= LES RECETTES ================= */

    case 'recette_enregistrer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);

        $id = (int) (body()['id'] ?? 0);
        $nom = champ('nom', 120);
        if ($nom === '') {
            fail('donne un nom à cette recette');
        }
        $couverts = max(1, min(20, (int) (body()['couverts'] ?? 4)));
        $minutes  = max(0, min(600, (int) (body()['minutes'] ?? 0)));
        $categorie = champ('categorie', 24) ?: 'plat';
        $notes = mb_substr((string) (body()['notes'] ?? ''), 0, 4000);

        if ($id > 0) {
            $st = db()->prepare('SELECT id FROM recipes WHERE id = ? AND household_id = ?');
            $st->execute([$id, $f['id']]);
            if (!$st->fetch()) {
                fail('recette introuvable', 404);
            }
            db()->prepare(
                'UPDATE recipes SET name = ?, couverts = ?, minutes = ?, categorie = ?, notes = ?
                 WHERE id = ? AND household_id = ?'
            )->execute([$nom, $couverts, $minutes, $categorie, $notes, $id, $f['id']]);
            db()->prepare('DELETE FROM recipe_items WHERE recipe_id = ?')->execute([$id]);
        } else {
            db()->prepare(
                'INSERT INTO recipes (household_id, user_id, name, couverts, minutes, categorie, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$f['id'], $u['id'], $nom, $couverts, $minutes, $categorie, $notes]);
            $id = (int) db()->lastInsertId();
        }

        $ing = body()['ingredients'] ?? [];
        if (!is_array($ing)) { $ing = []; }
        $st = db()->prepare(
            'INSERT INTO recipe_items (recipe_id, position, label, quantite, unite, rayon)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $n = 0;
        foreach (array_slice($ing, 0, 60) as $i => $ligne) {
            $label = trim(mb_substr((string) ($ligne['label'] ?? ''), 0, 80));
            if ($label === '') { continue; }
            $q = $ligne['quantite'] ?? null;
            $q = ($q === null || $q === '') ? null : (float) str_replace(',', '.', (string) $q);
            $st->execute([$id, $i, $label, $q,
                          uniteValide((string) ($ligne['unite'] ?? '')),
                          rayonValide((string) ($ligne['rayon'] ?? 'divers'))]);
            $n++;
        }
        jsonOut(['ok' => true, 'id' => $id, 'ingredients' => $n,
                 'recettes' => recettesDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* Importer les recettes de départ.
       Le foyer les reçoit chez lui : ce sont ses recettes, modifiables et
       supprimables. Un catalogue en lecture seule aurait obligé à
       distinguer deux sortes de recettes partout dans le code. */
    case 'recettes_importer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);

        $lot = body()['recettes'] ?? [];
        if (!is_array($lot) || !$lot) {
            fail('aucune recette à importer');
        }

        // celles qu'on a déjà, pour ne pas les doubler
        $st = db()->prepare('SELECT name FROM recipes WHERE household_id = ?');
        $st->execute([$f['id']]);
        $deja = [];
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $nom) {
            $deja[mb_strtolower(trim((string) $nom), 'UTF-8')] = true;
        }

        $ajoutees = 0;
        $sautees = 0;
        foreach (array_slice($lot, 0, 60) as $r) {
            $nom = trim(mb_substr((string) ($r['nom'] ?? ''), 0, 120));
            if ($nom === '') { continue; }
            if (isset($deja[mb_strtolower($nom, 'UTF-8')])) { $sautees++; continue; }

            db()->prepare(
                'INSERT INTO recipes (household_id, user_id, name, couverts, minutes, categorie, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$f['id'], $u['id'], $nom,
                        max(1, min(20, (int) ($r['couverts'] ?? 4))),
                        max(0, min(600, (int) ($r['minutes'] ?? 0))),
                        mb_substr((string) ($r['categorie'] ?? 'plat'), 0, 24),
                        mb_substr((string) ($r['notes'] ?? ''), 0, 4000)]);
            $rid = (int) db()->lastInsertId();

            $ins = db()->prepare(
                'INSERT INTO recipe_items (recipe_id, position, label, quantite, unite, rayon)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach (array_slice((array) ($r['ingredients'] ?? []), 0, 60) as $p => $ligne) {
                $label = trim(mb_substr((string) ($ligne['label'] ?? ''), 0, 80));
                if ($label === '') { continue; }
                $q = $ligne['quantite'] ?? null;
                $q = ($q === null || $q === '') ? null : (float) str_replace(',', '.', (string) $q);
                $ins->execute([$rid, $p, $label, $q,
                               uniteValide((string) ($ligne['unite'] ?? '')),
                               rayonValide((string) ($ligne['rayon'] ?? 'divers'))]);
            }
            $ajoutees++;
        }

        jsonOut(['ok' => true, 'ajoutees' => $ajoutees, 'sautees' => $sautees,
                 'recettes' => recettesDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* Lire une recette depuis une adresse web.
       On ne l'enregistre pas : on la propose. L'utilisateur voit ce qui a
       été compris, corrige, et décide. Enregistrer d'office ferait entrer
       des lignes bancales dans son carnet sans qu'il les ait vues. */
    case 'recette_lire_web': {
        requirePost();
        requireUser();
        require_once __DIR__ . '/importer.php';

        $url = champ('url', 500);
        if ($url === '') {
            fail('donne l\'adresse de la recette');
        }
        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }

        [$html, $pourquoi] = telecharger($url);
        if ($html === null) {
            fail($pourquoi);
        }

        $trouvee = extraireRecette($html);
        if (!$trouvee) {
            fail('cette page ne publie pas sa recette dans un format lisible. '
               . 'Beaucoup de sites le font ; celui-ci non. Il reste la saisie à la main.');
        }

        $recette = mettreEnForme($trouvee, $url);
        if (!$recette['ingredients']) {
            fail('la recette a été trouvée, mais sans liste d\'ingrédients exploitable');
        }
        jsonOut(['ok' => true, 'recette' => $recette]);
    }

    case 'recette_supprimer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $id = (int) (body()['id'] ?? 0);
        db()->prepare('DELETE FROM recipes WHERE id = ? AND household_id = ?')->execute([$id, $f['id']]);
        jsonOut(['ok' => true, 'recettes' => recettesDu((int) $f['id']),
                 'menu' => menuDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    case 'recette_favori': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $id = (int) (body()['id'] ?? 0);
        db()->prepare(
            'UPDATE recipes SET favori = 1 - favori WHERE id = ? AND household_id = ?'
        )->execute([$id, $f['id']]);
        jsonOut(['ok' => true, 'recettes' => recettesDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* ================= LE MENU ================= */

    case 'menu_poser': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);

        $jour = champ('jour', 10);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $jour)) {
            fail('date invalide');
        }
        $repas = champ('repas', 8) === 'midi' ? 'midi' : 'soir';
        $recette = (int) (body()['recipe_id'] ?? 0);
        $libelle = champ('libelle', 120);
        $couverts = max(1, min(20, (int) (body()['couverts'] ?? $f['couverts'])));

        if ($recette > 0) {
            $st = db()->prepare('SELECT couverts FROM recipes WHERE id = ? AND household_id = ?');
            $st->execute([$recette, $f['id']]);
            if (!$st->fetch()) {
                fail('recette introuvable', 404);
            }
        } elseif ($libelle === '') {
            fail('choisis une recette ou écris ce que vous mangez');
        }

        db()->prepare('DELETE FROM plan_entries WHERE household_id = ? AND jour = ? AND repas = ?')
            ->execute([$f['id'], $jour, $repas]);
        db()->prepare(
            'INSERT INTO plan_entries (household_id, jour, repas, recipe_id, libelle, couverts)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$f['id'], $jour, $repas, $recette > 0 ? $recette : null, $libelle, $couverts]);

        regenererListe((int) $f['id']);
        jsonOut(['ok' => true, 'menu' => menuDu((int) $f['id']),
                 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    case 'menu_retirer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $jour = champ('jour', 10);
        $repas = champ('repas', 8) === 'midi' ? 'midi' : 'soir';
        db()->prepare('DELETE FROM plan_entries WHERE household_id = ? AND jour = ? AND repas = ?')
            ->execute([$f['id'], $jour, $repas]);
        regenererListe((int) $f['id']);
        jsonOut(['ok' => true, 'menu' => menuDu((int) $f['id']),
                 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    case 'menu_vider': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $depuis = champ('depuis', 10);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $depuis)) {
            db()->prepare('DELETE FROM plan_entries WHERE household_id = ? AND jour >= ? AND jour < ?')
                ->execute([$f['id'], $depuis, date('Y-m-d', strtotime($depuis . ' +7 days'))]);
        } else {
            db()->prepare('DELETE FROM plan_entries WHERE household_id = ?')->execute([$f['id']]);
        }
        regenererListe((int) $f['id']);
        jsonOut(['ok' => true, 'menu' => menuDu((int) $f['id']),
                 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* ================= LA LISTE ================= */

    case 'liste_ajouter': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $label = champ('label', 80);
        if ($label === '') {
            fail('écris ce qu\'il faut acheter');
        }
        $cle = cleIngredient($label);
        $q = nombre('quantite');
        $unite = uniteValide((string) (body()['unite'] ?? ''));
        $rayon = rayonValide((string) (body()['rayon'] ?? 'divers'));

        /* Ajouter deux fois la même chose ne doit pas faire deux lignes :
           on ajoute la quantité à celle qui est déjà là, si l'unité s'y
           prête. C'est le geste le plus fréquent au magasin. */
        $st = db()->prepare(
            'SELECT id, quantite, unite FROM list_items
             WHERE household_id = ? AND cle = ? AND origine = \'libre\' AND coche_le IS NULL LIMIT 1'
        );
        $st->execute([$f['id'], $cle]);
        $existe = $st->fetch();

        if ($existe && $q !== null && (string) $existe['unite'] === $unite) {
            db()->prepare('UPDATE list_items SET quantite = COALESCE(quantite, 0) + ? WHERE id = ?')
                ->execute([$q, (int) $existe['id']]);
        } elseif (!$existe) {
            db()->prepare(
                'INSERT INTO list_items (household_id, label, cle, quantite, unite, rayon, origine)
                 VALUES (?, ?, ?, ?, ?, ?, \'libre\')'
            )->execute([$f['id'], $label, $cle, $q, $unite, $rayon]);
        }

        // ce que le foyer achète souvent revient en suggestion
        noterHabitude((int) $f['id'], $cle, $label, $rayon, $unite);

        jsonOut(['ok' => true, 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* Cocher, c'est le geste du magasin : il doit être instantané et
       visible aussitôt par l'autre. On garde qui a coché et quand, pour
       pouvoir revenir en arrière. */
    case 'liste_cocher': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $id = (int) (body()['id'] ?? 0);
        $coche = !empty(body()['coche']);
        db()->prepare(
            'UPDATE list_items SET coche_le = ?, coche_par = ? WHERE id = ? AND household_id = ?'
        )->execute([$coche ? date('Y-m-d H:i:s') : null, $coche ? $u['id'] : null, $id, $f['id']]);
        jsonOut(['ok' => true, 'version' => toucher((int) $f['id'])]);
    }

    case 'liste_supprimer': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        $id = (int) (body()['id'] ?? 0);
        db()->prepare('DELETE FROM list_items WHERE id = ? AND household_id = ?')->execute([$id, $f['id']]);
        jsonOut(['ok' => true, 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* Ranger les courses : on retire ce qui est coché, on garde le reste.
       Vider toute la liste effacerait ce qu'on n'a pas trouvé au magasin. */
    case 'liste_ranger': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        db()->prepare('DELETE FROM list_items WHERE household_id = ? AND coche_le IS NOT NULL')
            ->execute([$f['id']]);
        jsonOut(['ok' => true, 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    case 'liste_vider': {
        requirePost();
        $u = requireUser();
        $f = foyerCourant($u);
        db()->prepare('DELETE FROM list_items WHERE household_id = ?')->execute([$f['id']]);
        jsonOut(['ok' => true, 'liste' => listeDu((int) $f['id']), 'version' => toucher((int) $f['id'])]);
    }

    /* ================= LES ILLUSTRATIONS =================
       Réservées aux administrateurs de NeedHelpApp. Le rôle vient du
       portail : nul ne se déclare administrateur ici.

       Le téléversement arrive en multipart, pas en JSON : body() lit
       php://input, qui est vide dans ce cas. On lit donc $_POST et
       $_FILES directement. Le jeton CSRF voyage en en-tête, ce qui
       fonctionne aussi bien avec un FormData. */
    case 'illustration_poser': {
        requirePost();
        $u = requireUser();
        require_once __DIR__ . '/illustrations.php';
        $r = poserIllustration(
            $u,
            mb_substr(trim((string) ($_POST['libelle'] ?? '')), 0, 120),
            $_FILES['image'] ?? [],
            mb_substr(trim((string) ($_POST['prompt'] ?? '')), 0, 500)
        );
        jsonOut(['ok' => true] + $r + ['version' => toucher(foyerCourant($u)['id'])]);
    }

    case 'illustration_retirer': {
        requirePost();
        $u = requireUser();
        require_once __DIR__ . '/illustrations.php';
        retirerIllustration($u, champ('libelle', 120));
        jsonOut(['ok' => true, 'version' => toucher(foyerCourant($u)['id'])]);
    }

    case 'illustrations': {
        $u = requireUser();
        require_once __DIR__ . '/illustrations.php';
        exigerAdmin($u);
        jsonOut(['illustrations' => toutesLesIllustrations()]);
    }

    default:
        fail('action inconnue', 404);
    }
} catch (PDOException $e) {
    error_log('[familyshop] base : ' . $e->getMessage());
    fail('la base de données n\'a pas répondu', 500);
} catch (Throwable $e) {
    error_log('[familyshop] ' . $e->getMessage());
    fail('erreur interne du serveur', 500);
}
