<?php
/**
 * budget — la couche de données.
 *
 * Deux idées gouvernent ce fichier.
 *
 * LA PREMIÈRE : rien n'appartient à une personne, tout appartient au
 * livre. Chaque lecture et chaque écriture passe par livreCourant() ou
 * exigerMembre(). Sans cela, connaître un identifiant suffirait à lire
 * les comptes d'un autre ménage — et ici ce ne sont pas des courses,
 * ce sont des revenus et des dettes.
 *
 * LA SECONDE : rien de sensible ne touche la base en clair. Les
 * fonctions chiffrerPour() et dechiffrerDe() sont le seul chemin, et
 * elles fabriquent elles-mêmes les données associées. Un appelant qui
 * devrait composer « operations.montant|livre=12 » à la main finirait
 * par se tromper de colonne, et le déchiffrement échouerait au pire
 * moment — six mois plus tard, sur les données de quelqu'un.
 */

declare(strict_types=1);

require_once __DIR__ . '/coffre.php';

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            fail('configuration absente : copiez config.example.php en config.php', 500);
        }
        $cfg = require $file;
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $c['host'] ?? 'localhost', (int) ($c['port'] ?? 3306), $c['database'] ?? '');
    $pdo = new PDO($dsn, $c['user'] ?? '', $c['password'] ?? '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/* ---------------------------------------------------------------
   Réponses
   --------------------------------------------------------------- */
function jsonOut(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    // Un budget n'a rien à faire dans le cache d'un navigateur partagé.
    header('Cache-Control: no-store, private');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): never
{
    jsonOut(['error' => $message], $code);
}

function body(): array
{
    static $corps = null;
    if ($corps === null) {
        $brut = file_get_contents('php://input') ?: '';
        $d = json_decode($brut, true);
        $corps = is_array($d) ? $d : [];
    }
    return $corps;
}

function champ(string $cle, int $max = 190): string
{
    return mb_substr(trim((string) (body()[$cle] ?? '')), 0, $max);
}

function entier(string $cle, ?int $defaut = null): ?int
{
    $v = body()[$cle] ?? null;
    if ($v === null || $v === '') { return $defaut; }
    return is_numeric($v) ? (int) $v : $defaut;
}

/**
 * Un montant saisi par un humain, rendu en centimes.
 *
 * Rend null si le champ est absent, et échoue proprement s'il est
 * présent mais illisible : « environ 500 » doit produire un message,
 * pas un zéro qui fausserait un solde sans rien dire.
 */
function montant(string $cle): ?int
{
    $v = body()[$cle] ?? null;
    if ($v === null || $v === '') { return null; }
    try {
        return centimes(is_string($v) ? $v : (float) $v);
    } catch (InvalidArgumentException $e) {
        fail('montant illisible : ' . mb_substr((string) $v, 0, 40));
    }
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        fail('méthode non autorisée', 405);
    }
    $envoye = (string) ($_SERVER['HTTP_X_CSRF'] ?? '');
    if ($envoye === '' || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $envoye)) {
        fail('session expirée, rechargez la page', 419);
    }
}

/* ---------------------------------------------------------------
   Qui parle
   --------------------------------------------------------------- */
function currentUser(): ?array
{
    require_once __DIR__ . '/nha.php';
    $compte = nhaCompte();
    if (!$compte) { return null; }
    $u = nhaUtilisateurLocal($compte);
    if (!$u) { return null; }
    $u['id'] = (int) $u['id'];
    $u['account_id'] = (int) $compte['id'];
    $u['role'] = (string) ($compte['role'] ?? 'membre');
    return $u;
}

function requireUser(): array
{
    $u = currentUser();
    if (!$u) { fail('il faut être connecté', 401); }
    return $u;
}

/* ---------------------------------------------------------------
   Le coffre, vu des appelants

   Le nom de colonne passé ici doit être exactement celui qui a servi à
   écrire. C'est voulu : la donnée associée lie le paquet à sa colonne
   ET à son livre, de sorte qu'un montant chiffré ne peut pas être
   recopié d'un ménage à un autre, ni d'un solde vers un capital.
   --------------------------------------------------------------- */
function chiffrerPour(int $livreId, string $colonne, ?string $clair): ?string
{
    return chiffrer($clair, coffre_aad($colonne, $livreId));
}

function dechiffrerDe(int $livreId, string $colonne, ?string $paquet): ?string
{
    return dechiffrer($paquet, coffre_aad($colonne, $livreId));
}

function chiffrerMontantPour(int $livreId, string $colonne, ?int $centimes): ?string
{
    return $centimes === null ? null
        : chiffrer((string) $centimes, coffre_aad($colonne, $livreId));
}

function dechiffrerMontantDe(int $livreId, string $colonne, ?string $paquet): ?int
{
    $clair = dechiffrer($paquet, coffre_aad($colonne, $livreId));
    return $clair === null ? null : (int) $clair;
}

/* ---------------------------------------------------------------
   Le livre
   --------------------------------------------------------------- */

/** Un code court, lisible à voix haute. Ni O ni 0, ni I ni 1. */
function codeLivre(): string
{
    $lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $lettres[random_int(0, strlen($lettres) - 1)];
    }
    return $code;
}

/**
 * Les catégories d'un ménage qui commence.
 *
 * Un budget sans catégories ne sert à rien, et demander à quelqu'un d'en
 * inventer douze avant sa première dépense est le meilleur moyen qu'il
 * referme la page. Elles se renomment et s'archivent toutes.
 */
function categoriesDepart(): array
{
    return [
        ['Salaire',        'entree', '#1B6547', '💼'],
        ['Allocations',    'entree', '#2E7D52', '👪'],
        ['Autres revenus', 'entree', '#4A8C6B', '➕'],
        ['Logement',       'sortie', '#2B3A55', '🏠'],
        ['Alimentation',   'sortie', '#A0521A', '🛒'],
        ['Assurances',     'sortie', '#5B5470', '📄'],
        ['Santé',          'sortie', '#8E2A2A', '⚕️'],
        ['Transports',     'sortie', '#1F5570', '🚊'],
        ['Impôts',         'sortie', '#6B5310', '🏛️'],
        ['Loisirs',        'sortie', '#7A2E4E', '🎬'],
        ['Enfants',        'sortie', '#A0721A', '🧸'],
        ['Divers',         'sortie', '#7A7466', '•'],
    ];
}

/**
 * Le livre de la personne, créé au besoin.
 *
 * Personne ne doit avoir à « créer un livre » avant de pouvoir noter sa
 * première dépense : on lui en donne un, avec ses catégories, qu'il
 * pourra renommer et partager.
 */
function livreCourant(array $u): array
{
    $st = db()->prepare(
        'SELECT l.*, m.role AS mon_role
         FROM livres l JOIN livre_membres m ON m.livre_id = l.id
         WHERE m.user_id = ? ORDER BY m.joined_at LIMIT 1'
    );
    $st->execute([$u['id']]);
    $l = $st->fetch();
    if ($l) {
        $l['id'] = (int) $l['id'];
        $l['nom_clair'] = dechiffrerDe($l['id'], 'livres.nom', $l['nom']) ?? 'Mon budget';
        return $l;
    }

    $nom = ($u['name'] ?? '') !== '' ? ('Budget de ' . $u['name']) : 'Mon budget';
    for ($essai = 0; $essai < 5; $essai++) {
        try {
            db()->beginTransaction();
            db()->prepare(
                'INSERT INTO livres (nom, join_code, created_by) VALUES (NULL, ?, ?)'
            )->execute([codeLivre(), $u['id']]);
            $id = (int) db()->lastInsertId();

            /* Le nom est chiffré, et sa donnée associée contient
               l'identifiant du livre : impossible de le chiffrer avant
               de connaître cet identifiant. D'où l'insertion en deux
               temps, dans une transaction pour qu'un livre sans nom ne
               puisse jamais subsister. */
            db()->prepare('UPDATE livres SET nom = ? WHERE id = ?')
                ->execute([chiffrerPour($id, 'livres.nom', $nom), $id]);
            db()->prepare(
                'INSERT INTO livre_membres (livre_id, user_id, role) VALUES (?, ?, ?)'
            )->execute([$id, $u['id'], 'proprietaire']);

            $ordre = 0;
            $ins = db()->prepare(
                'INSERT INTO categories (livre_id, nom, sens, couleur, emoji, ordre)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach (categoriesDepart() as [$nomCat, $sens, $couleur, $emoji]) {
                $ins->execute([$id, chiffrerPour($id, 'categories.nom', $nomCat),
                               $sens, $couleur, $emoji, $ordre++]);
            }
            db()->commit();
            journaliser($id, $u['id'], 'livre_cree', 'livre', $id);
            return livreCourant($u);
        } catch (PDOException $e) {
            if (db()->inTransaction()) { db()->rollBack(); }
            if ($e->getCode() !== '23000') { throw $e; }   // collision de code : on retire au sort
        }
    }
    fail('impossible de créer le livre', 500);
}

/** Vérifie que cette personne appartient bien à ce livre. */
function exigerMembre(array $u, int $livreId): void
{
    $st = db()->prepare('SELECT 1 FROM livre_membres WHERE livre_id = ? AND user_id = ?');
    $st->execute([$livreId, $u['id']]);
    if (!$st->fetch()) {
        fail('ce livre n\'est pas le vôtre', 403);
    }
}

/**
 * Marque le livre comme modifié.
 *
 * Les navigateurs ouverts comparent ce nombre au leur toutes les
 * quelques secondes. Oublier de l'appeler après une écriture, c'est
 * laisser l'autre membre du ménage devant des chiffres périmés sans
 * qu'il le sache.
 */
function toucher(int $livreId): int
{
    db()->prepare('UPDATE livres SET version = version + 1 WHERE id = ?')->execute([$livreId]);
    $st = db()->prepare('SELECT version FROM livres WHERE id = ?');
    $st->execute([$livreId]);
    return (int) $st->fetchColumn();
}

/**
 * Le journal du livre.
 *
 * Un livre partagé sans journal est une pièce où l'on entend marcher
 * sans savoir qui. Il ne consigne ni montants ni libellés — seulement
 * qui a touché à quoi, et quand. C'est ce qui permet de répondre à
 * « je n'ai pas modifié ça », question qui se pose dans tous les budgets
 * de couple.
 *
 * Un journal qui échoue ne doit jamais empêcher l'action elle-même.
 */
function journaliser(int $livreId, ?int $userId, string $action,
                     string $objet = '', ?int $objetId = null): void
{
    try {
        db()->prepare(
            'INSERT INTO journal (livre_id, user_id, action, objet, objet_id, ip)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$livreId, $userId, $action, $objet, $objetId,
                    @inet_pton($_SERVER['REMOTE_ADDR'] ?? '') ?: null]);
    } catch (Throwable $e) {
        error_log('[budget] journal indisponible (' . $action . ') : ' . $e->getMessage());
    }
}

/* ---------------------------------------------------------------
   Petites validations partagées
   --------------------------------------------------------------- */
function sensValide(string $s, array $permis = ['entree', 'sortie']): string
{
    return in_array($s, $permis, true) ? $s : $permis[count($permis) - 1];
}

function dansListe(string $v, array $permis, string $defaut): string
{
    return in_array($v, $permis, true) ? $v : $defaut;
}

/** Une date AAAA-MM-JJ, ou aujourd'hui si elle est absurde. */
function jourValide(string $j): string
{
    $d = DateTimeImmutable::createFromFormat('Y-m-d', $j);
    return ($d && $d->format('Y-m-d') === $j) ? $j : date('Y-m-d');
}

/** Un mois AAAA-MM. */
function moisValide(string $m): string
{
    return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $m) ? $m : date('Y-m');
}
