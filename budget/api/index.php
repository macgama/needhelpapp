<?php
/**
 * budget — l'API.
 *
 *   api/index.php?a=<action>, corps JSON, réponse JSON.
 *
 * DEUX RÈGLES QUI NE SOUFFRENT AUCUNE EXCEPTION
 *
 * 1. Toute action qui touche des données appelle exigerMembre() avant
 *    d'écrire ou de lire. Un identifiant deviné ne doit jamais suffire.
 *
 * 2. Aucun montant, aucun libellé ne va vers la base sans passer par
 *    chiffrerPour(), ni n'en revient sans dechiffrerDe().
 *
 * LES TOTAUX SE CALCULENT EN PHP
 *
 * SUM() ne fonctionne pas sur une colonne chiffrée. On filtre en SQL sur
 * le livre et les dates, on déchiffre, on additionne ici. Ce n'est pas
 * une faiblesse : c'est la contrepartie assumée du chiffrement, et elle
 * coûte une cinquantaine de millisecondes pour dix ans de budget.
 */

declare(strict_types=1);

require __DIR__ . '/db.php';
require_once __DIR__ . '/amortissement.php';

session_start();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

$action = (string) ($_GET['a'] ?? '');

/* =================================================================
   Fonctions de lecture, partagées par plusieurs actions
   ================================================================= */

/** Les comptes du livre, déchiffrés, avec leur solde. */
function lireComptes(int $livreId): array
{
    $st = db()->prepare(
        'SELECT id, nom, type, devise, solde_initial, valeur, valeur_le,
                iban_4, couleur, ordre, archive
         FROM comptes WHERE livre_id = ? ORDER BY archive, ordre, id'
    );
    $st->execute([$livreId]);
    $comptes = [];
    foreach ($st as $c) {
        $id = (int) $c['id'];
        $comptes[$id] = [
            'id'      => $id,
            'nom'     => dechiffrerDe($livreId, 'comptes.nom', $c['nom']),
            'type'    => $c['type'],
            'devise'  => $c['devise'],
            'initial' => dechiffrerMontantDe($livreId, 'comptes.solde_initial', $c['solde_initial']) ?? 0,
            'valeur'  => dechiffrerMontantDe($livreId, 'comptes.valeur', $c['valeur']),
            'valeur_le' => $c['valeur_le'],
            'iban_4'  => $c['iban_4'],
            'couleur' => $c['couleur'],
            'ordre'   => (int) $c['ordre'],
            'archive' => (int) $c['archive'] === 1,
            'solde'   => 0,
        ];
    }
    return $comptes;
}

/**
 * Applique toutes les opérations aux soldes.
 *
 * Il faut bien lire l'historique entier : un solde est la somme de tout
 * ce qui l'a précédé, et il n'existe pas de raccourci quand les montants
 * sont chiffrés. C'est le seul endroit de l'application qui parcourt
 * toute la table, et c'est assumé.
 */
function appliquerOperations(int $livreId, array &$comptes): void
{
    $st = db()->prepare(
        'SELECT compte_id, vers_compte_id, montant, sens FROM operations WHERE livre_id = ?'
    );
    $st->execute([$livreId]);
    foreach ($st as $o) {
        $m = dechiffrerMontantDe($livreId, 'operations.montant', $o['montant']) ?? 0;
        $src = (int) $o['compte_id'];
        $dst = $o['vers_compte_id'] !== null ? (int) $o['vers_compte_id'] : null;

        if ($o['sens'] === 'entree') {
            if (isset($comptes[$src])) { $comptes[$src]['solde'] += $m; }
        } elseif ($o['sens'] === 'sortie') {
            if (isset($comptes[$src])) { $comptes[$src]['solde'] -= $m; }
        } else {   // virement : une seule ligne, deux effets
            if (isset($comptes[$src])) { $comptes[$src]['solde'] -= $m; }
            if ($dst !== null && isset($comptes[$dst])) { $comptes[$dst]['solde'] += $m; }
        }
    }
    foreach ($comptes as &$c) { $c['solde'] += $c['initial']; }
    unset($c);
}

function lireCategories(int $livreId): array
{
    $st = db()->prepare(
        'SELECT id, parent_id, nom, sens, couleur, emoji, ordre, archive
         FROM categories WHERE livre_id = ? ORDER BY sens DESC, ordre, id'
    );
    $st->execute([$livreId]);
    $out = [];
    foreach ($st as $c) {
        $out[] = [
            'id'      => (int) $c['id'],
            'parent'  => $c['parent_id'] !== null ? (int) $c['parent_id'] : null,
            'nom'     => dechiffrerDe($livreId, 'categories.nom', $c['nom']),
            'sens'    => $c['sens'],
            'couleur' => $c['couleur'],
            'emoji'   => $c['emoji'],
            'ordre'   => (int) $c['ordre'],
            'archive' => (int) $c['archive'] === 1,
        ];
    }
    return $out;
}

function lireOperations(int $livreId, string $du, string $au): array
{
    $st = db()->prepare(
        'SELECT id, compte_id, vers_compte_id, categorie_id, emprunt_id, jour,
                libelle, montant, sens, note, pointe, user_id
         FROM operations WHERE livre_id = ? AND jour BETWEEN ? AND ?
         ORDER BY jour DESC, id DESC'
    );
    $st->execute([$livreId, $du, $au]);
    $out = [];
    foreach ($st as $o) {
        $out[] = [
            'id'        => (int) $o['id'],
            'compte'    => (int) $o['compte_id'],
            'vers'      => $o['vers_compte_id'] !== null ? (int) $o['vers_compte_id'] : null,
            'categorie' => $o['categorie_id'] !== null ? (int) $o['categorie_id'] : null,
            'emprunt'   => $o['emprunt_id'] !== null ? (int) $o['emprunt_id'] : null,
            'jour'      => $o['jour'],
            'libelle'   => dechiffrerDe($livreId, 'operations.libelle', $o['libelle']),
            'montant'   => dechiffrerMontantDe($livreId, 'operations.montant', $o['montant']),
            'sens'      => $o['sens'],
            'note'      => dechiffrerDe($livreId, 'operations.note', $o['note']),
            'pointe'    => (int) $o['pointe'] === 1,
        ];
    }
    return $out;
}

function lireEmprunts(int $livreId): array
{
    $st = db()->prepare(
        'SELECT id, compte_id, compte_amortissement_id, bien_compte_id, nom, preteur,
                genre, mode, capital_initial, taux_annuel, amortissement_periodique,
                periodicite, debut, echeance, duree_mois, note, archive
         FROM emprunts WHERE livre_id = ? ORDER BY archive, id'
    );
    $st->execute([$livreId]);
    $out = [];
    foreach ($st as $e) {
        $id = (int) $e['id'];
        $out[] = [
            'id'        => $id,
            'compte'    => (int) $e['compte_id'],
            'compte_3a' => $e['compte_amortissement_id'] !== null ? (int) $e['compte_amortissement_id'] : null,
            'bien'      => $e['bien_compte_id'] !== null ? (int) $e['bien_compte_id'] : null,
            'nom'       => dechiffrerDe($livreId, 'emprunts.nom', $e['nom']),
            'preteur'   => dechiffrerDe($livreId, 'emprunts.preteur', $e['preteur']),
            'genre'     => $e['genre'],
            'mode'      => $e['mode'],
            'capital'   => dechiffrerMontantDe($livreId, 'emprunts.capital_initial', $e['capital_initial']),
            'taux'      => dechiffrerMontantDe($livreId, 'emprunts.taux_annuel', $e['taux_annuel']),
            'amortissement' => dechiffrerMontantDe($livreId, 'emprunts.amortissement_periodique', $e['amortissement_periodique']),
            'periodicite' => $e['periodicite'],
            'debut'     => $e['debut'],
            'echeance'  => $e['echeance'],
            'duree_mois' => $e['duree_mois'] !== null ? (int) $e['duree_mois'] : null,
            'note'      => dechiffrerDe($livreId, 'emprunts.note', $e['note']),
            'archive'   => (int) $e['archive'] === 1,
        ];
    }
    return $out;
}

function lireEcheances(int $livreId, int $empruntId): array
{
    $st = db()->prepare(
        'SELECT numero, jour, montant, part_interet, part_capital, capital_restant, paye_le
         FROM echeances WHERE emprunt_id = ? ORDER BY numero'
    );
    $st->execute([$empruntId]);
    $out = [];
    foreach ($st as $e) {
        $out[] = [
            'numero'  => (int) $e['numero'],
            'jour'    => $e['jour'],
            'montant' => dechiffrerMontantDe($livreId, 'echeances.montant', $e['montant']),
            'interet' => dechiffrerMontantDe($livreId, 'echeances.part_interet', $e['part_interet']),
            'capital' => dechiffrerMontantDe($livreId, 'echeances.part_capital', $e['part_capital']),
            'restant' => dechiffrerMontantDe($livreId, 'echeances.capital_restant', $e['capital_restant']),
            'paye_le' => $e['paye_le'],
        ];
    }
    return $out;
}

/**
 * Regénère l'échéancier d'un emprunt.
 *
 * On efface et l'on recalcule : un échéancier partiellement à jour est
 * pire que pas d'échéancier du tout, parce qu'il paraît juste.
 */
function regenererEcheancier(int $livreId, int $empruntId): int
{
    $st = db()->prepare('SELECT * FROM emprunts WHERE id = ? AND livre_id = ?');
    $st->execute([$empruntId, $livreId]);
    $e = $st->fetch();
    if (!$e) { fail('emprunt introuvable', 404); }

    try {
        $plan = echeancier([
            'capital'     => dechiffrerMontantDe($livreId, 'emprunts.capital_initial', $e['capital_initial']),
            'taux'        => dechiffrerMontantDe($livreId, 'emprunts.taux_annuel', $e['taux_annuel']),
            'mode'        => $e['mode'],
            'periodicite' => $e['periodicite'],
            'debut'       => $e['debut'],
            'echeance'    => $e['echeance'],
            'duree_mois'  => $e['duree_mois'],
            'amortissement_periodique' =>
                dechiffrerMontantDe($livreId, 'emprunts.amortissement_periodique', $e['amortissement_periodique']),
        ]);
    } catch (InvalidArgumentException $ex) {
        fail($ex->getMessage());
    }

    db()->prepare('DELETE FROM echeances WHERE emprunt_id = ?')->execute([$empruntId]);
    $ins = db()->prepare(
        'INSERT INTO echeances (emprunt_id, numero, jour, montant, part_interet,
                                part_capital, capital_restant)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($plan['lignes'] as $l) {
        $ins->execute([
            $empruntId, $l['numero'], $l['jour'],
            chiffrerMontantPour($livreId, 'echeances.montant', $l['montant']),
            chiffrerMontantPour($livreId, 'echeances.part_interet', $l['interet']),
            chiffrerMontantPour($livreId, 'echeances.part_capital', $l['capital']),
            chiffrerMontantPour($livreId, 'echeances.capital_restant', $l['restant']),
        ]);
    }
    return count($plan['lignes']);
}

/**
 * Exécute une suppression et refuse de mentir sur son résultat.
 *
 * Toutes les suppressions portent « AND livre_id = ? », ce qui suffit à
 * protéger les données : un membre d'un autre ménage n'efface rien.
 * Mais la requête réussit en ne touchant aucune ligne, et l'API
 * répondait alors « ok » — elle annonçait un travail qu'elle n'avait pas
 * fait. Pour un intrus c'est sans conséquence ; pour un utilisateur
 * légitime, cela masque une vraie anomalie derrière un succès.
 */
function supprimerOuEchouer(string $sql, array $params, string $quoi): void
{
    $st = db()->prepare($sql);
    $st->execute($params);
    if ($st->rowCount() === 0) {
        fail($quoi . ' introuvable', 404);
    }
}

/* =================================================================
   Le routage
   ================================================================= */
try {
    switch ($action) {

    /* ---------------- L'identité, déléguée au portail ---------------- */
    case 'session': {
        require_once __DIR__ . '/nha.php';
        $u = currentUser();
        /* Aucun formulaire de connexion ici, et c'est délibéré : budget
           renvoie au portail. Une application qui tient des revenus et
           des dettes n'a pas besoin d'un second chemin d'authentification
           à surveiller — teaching et familyshop en ont un pour des
           raisons d'histoire, pas de sécurité. */
        $sortie = ['user' => null, 'csrf' => $_SESSION['csrf']];
        if ($u) {
            $sortie['user'] = ['id' => $u['id'], 'email' => $u['email'],
                               'name' => $u['name'], 'role' => $u['role']];
        }
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
                'confidentialite' => nhaUrl('/confidentialite.php'),
            ];
        }
        jsonOut($sortie);
    }

    case 'version': {
        $u = currentUser();
        if (!$u) { jsonOut(['version' => 0]); }
        $l = livreCourant($u);
        jsonOut(['version' => (int) $l['version']]);
    }

    /* ---------------- Tout le livre ---------------- */
    case 'tout': {
        $u = requireUser();
        $l = livreCourant($u);
        $id = (int) $l['id'];

        $mois = moisValide((string) ($_GET['mois'] ?? date('Y-m')));
        $du = $mois . '-01';
        $au = (new DateTimeImmutable($du))->modify('last day of this month')->format('Y-m-d');

        $comptes = lireComptes($id);
        appliquerOperations($id, $comptes);

        $membres = db()->prepare(
            'SELECT u.id, u.name, u.email, m.role FROM livre_membres m
             JOIN users u ON u.id = m.user_id WHERE m.livre_id = ? ORDER BY m.joined_at'
        );
        $membres->execute([$id]);

        $env = db()->prepare('SELECT categorie_id, montant FROM enveloppes WHERE livre_id = ? AND mois = ?');
        $env->execute([$id, $mois]);
        $enveloppes = [];
        foreach ($env as $e) {
            $enveloppes[(int) $e['categorie_id']] =
                dechiffrerMontantDe($id, 'enveloppes.montant', $e['montant']);
        }

        jsonOut([
            'livre' => ['id' => $id, 'nom' => $l['nom_clair'], 'code' => $l['join_code'],
                        'devise' => $l['devise'], 'version' => (int) $l['version'],
                        'mon_role' => $l['mon_role']],
            'moi'        => ['id' => $u['id'], 'name' => $u['name']],
            'membres'    => $membres->fetchAll(),
            'mois'       => $mois,
            'comptes'    => array_values($comptes),
            'categories' => lireCategories($id),
            'operations' => lireOperations($id, $du, $au),
            'emprunts'   => lireEmprunts($id),
            'enveloppes' => $enveloppes,
        ]);
    }

    /* ---------------- Le livre ---------------- */
    case 'livre_renommer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $nom = champ('nom', 80);
        if ($nom === '') { fail('donnez un nom à ce livre'); }
        db()->prepare('UPDATE livres SET nom = ? WHERE id = ?')
            ->execute([chiffrerPour($id, 'livres.nom', $nom), $id]);
        journaliser($id, $u['id'], 'livre_renomme', 'livre', $id);
        jsonOut(['ok' => true, 'nom' => $nom, 'version' => toucher($id)]);
    }

    case 'livre_rejoindre': {
        requirePost();
        $u = requireUser();
        $code = strtoupper(preg_replace('/[^A-Z0-9]/i', '', champ('code', 8)));
        if (strlen($code) !== 8) { fail('ce code ne ressemble pas à un code de livre'); }
        $st = db()->prepare('SELECT id FROM livres WHERE join_code = ?');
        $st->execute([$code]);
        $cible = $st->fetchColumn();
        if ($cible === false) { fail('aucun livre ne porte ce code', 404); }
        $cible = (int) $cible;
        db()->prepare(
            'INSERT INTO livre_membres (livre_id, user_id, role) VALUES (?, ?, "membre")
             ON DUPLICATE KEY UPDATE role = role'
        )->execute([$cible, $u['id']]);
        journaliser($cible, $u['id'], 'membre_rejoint', 'membre', $u['id']);
        jsonOut(['ok' => true, 'version' => toucher($cible)]);
    }

    case 'livre_nouveau_code': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        if ($l['mon_role'] !== 'proprietaire') {
            fail('seul celui qui a ouvert le livre peut en changer le code', 403);
        }
        for ($i = 0; $i < 5; $i++) {
            try {
                $code = codeLivre();
                db()->prepare('UPDATE livres SET join_code = ? WHERE id = ?')->execute([$code, $id]);
                journaliser($id, $u['id'], 'code_change', 'livre', $id);
                jsonOut(['ok' => true, 'code' => $code, 'version' => toucher($id)]);
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') { throw $e; }
            }
        }
        fail('impossible de tirer un nouveau code', 500);
    }

    case 'journal': {
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $st = db()->prepare(
            'SELECT j.action, j.objet, j.objet_id, j.created_at, u.name
             FROM journal j LEFT JOIN users u ON u.id = j.user_id
             WHERE j.livre_id = ? ORDER BY j.id DESC LIMIT 100'
        );
        $st->execute([$id]);
        jsonOut(['journal' => $st->fetchAll()]);
    }

    /* ---------------- Les comptes ---------------- */
    case 'compte_enregistrer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $nom = champ('nom', 80);
        if ($nom === '') { fail('donnez un nom à ce compte'); }
        $type = dansListe(champ('type', 16),
            ['courant','epargne','especes','carte','placement','bien','dette','prevoyance'], 'courant');
        $compteId = entier('id');

        if ($compteId) {
            $st = db()->prepare('SELECT 1 FROM comptes WHERE id = ? AND livre_id = ?');
            $st->execute([$compteId, $id]);
            if (!$st->fetch()) { fail('compte introuvable', 404); }
            db()->prepare(
                'UPDATE comptes SET nom = ?, type = ?, solde_initial = ?, valeur = ?,
                        valeur_le = ?, iban_4 = ?, couleur = ?, archive = ? WHERE id = ?'
            )->execute([
                chiffrerPour($id, 'comptes.nom', $nom), $type,
                chiffrerMontantPour($id, 'comptes.solde_initial', montant('initial') ?? 0),
                chiffrerMontantPour($id, 'comptes.valeur', montant('valeur')),
                champ('valeur_le', 10) !== '' ? jourValide(champ('valeur_le', 10)) : null,
                champ('iban_4', 4) !== '' ? champ('iban_4', 4) : null,
                champ('couleur', 7) !== '' ? champ('couleur', 7) : '#2B3A55',
                entier('archive', 0), $compteId,
            ]);
            journaliser($id, $u['id'], 'compte_modifie', 'compte', $compteId);
        } else {
            db()->prepare(
                'INSERT INTO comptes (livre_id, nom, type, solde_initial, valeur, valeur_le,
                                      iban_4, couleur, ordre)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $id, chiffrerPour($id, 'comptes.nom', $nom), $type,
                chiffrerMontantPour($id, 'comptes.solde_initial', montant('initial') ?? 0),
                chiffrerMontantPour($id, 'comptes.valeur', montant('valeur')),
                champ('valeur_le', 10) !== '' ? jourValide(champ('valeur_le', 10)) : null,
                champ('iban_4', 4) !== '' ? champ('iban_4', 4) : null,
                champ('couleur', 7) !== '' ? champ('couleur', 7) : '#2B3A55',
                entier('ordre', 0),
            ]);
            $compteId = (int) db()->lastInsertId();
            journaliser($id, $u['id'], 'compte_cree', 'compte', $compteId);
        }
        jsonOut(['ok' => true, 'id' => $compteId, 'version' => toucher($id)]);
    }

    case 'compte_supprimer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $compteId = entier('id');
        if (!$compteId) { fail('quel compte ?'); }
        /* Les opérations tombent avec le compte (ON DELETE CASCADE) :
           on le dit plutôt que de laisser la surprise à l'utilisateur. */
        $st = db()->prepare('SELECT COUNT(*) FROM operations WHERE compte_id = ? AND livre_id = ?');
        $st->execute([$compteId, $id]);
        $n = (int) $st->fetchColumn();
        if ($n > 0 && !entier('confirme', 0)) {
            fail("ce compte porte $n opération(s), qui seront supprimées avec lui", 409);
        }
        supprimerOuEchouer('DELETE FROM comptes WHERE id = ? AND livre_id = ?',
                           [$compteId, $id], 'compte');
        journaliser($id, $u['id'], 'compte_supprime', 'compte', $compteId);
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    /* ---------------- Les catégories ---------------- */
    case 'categorie_enregistrer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $nom = champ('nom', 60);
        if ($nom === '') { fail('donnez un nom à cette catégorie'); }
        $sens = sensValide(champ('sens', 8));
        $catId = entier('id');

        if ($catId) {
            $st = db()->prepare('SELECT 1 FROM categories WHERE id = ? AND livre_id = ?');
            $st->execute([$catId, $id]);
            if (!$st->fetch()) { fail('catégorie introuvable', 404); }
            db()->prepare(
                'UPDATE categories SET nom = ?, sens = ?, couleur = ?, emoji = ?, archive = ?
                 WHERE id = ?'
            )->execute([chiffrerPour($id, 'categories.nom', $nom), $sens,
                        champ('couleur', 7) !== '' ? champ('couleur', 7) : '#7A7466',
                        champ('emoji', 8), entier('archive', 0), $catId]);
        } else {
            db()->prepare(
                'INSERT INTO categories (livre_id, nom, sens, couleur, emoji, ordre)
                 VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([$id, chiffrerPour($id, 'categories.nom', $nom), $sens,
                        champ('couleur', 7) !== '' ? champ('couleur', 7) : '#7A7466',
                        champ('emoji', 8), entier('ordre', 99)]);
            $catId = (int) db()->lastInsertId();
        }
        journaliser($id, $u['id'], 'categorie_enregistree', 'categorie', $catId);
        jsonOut(['ok' => true, 'id' => $catId, 'version' => toucher($id)]);
    }

    case 'categorie_supprimer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $catId = entier('id');
        if (!$catId) { fail('quelle catégorie ?'); }
        /* Les opérations survivent : leur categorie_id passe à NULL
           (ON DELETE SET NULL). On ne perd pas une dépense parce qu'on a
           rangé ses catégories. */
        supprimerOuEchouer('DELETE FROM categories WHERE id = ? AND livre_id = ?',
                           [$catId, $id], 'catégorie');
        journaliser($id, $u['id'], 'categorie_supprimee', 'categorie', $catId);
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    /* ---------------- Les opérations ---------------- */
    case 'operation_enregistrer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];

        $m = montant('montant');
        if ($m === null || $m === 0) { fail('indiquez un montant'); }
        $m = abs($m);   // le sens porte le signe, pas le montant
        $sens = sensValide(champ('sens', 8), ['entree', 'sortie', 'virement']);
        $compte = entier('compte');
        if (!$compte) { fail('sur quel compte ?'); }

        $comptes = lireComptes($id);
        if (!isset($comptes[$compte])) { fail('compte introuvable', 404); }
        $vers = entier('vers');
        if ($sens === 'virement') {
            if (!$vers || !isset($comptes[$vers])) { fail('vers quel compte ?'); }
            if ($vers === $compte) { fail('un virement va d\'un compte à un autre'); }
        } else {
            $vers = null;
        }

        $cat = entier('categorie');
        if ($cat) {
            $st = db()->prepare('SELECT 1 FROM categories WHERE id = ? AND livre_id = ?');
            $st->execute([$cat, $id]);
            if (!$st->fetch()) { $cat = null; }
        }

        $opId = entier('id');
        $donnees = [
            $compte, $vers, $cat, jourValide(champ('jour', 10)),
            chiffrerPour($id, 'operations.libelle', champ('libelle', 120)),
            chiffrerMontantPour($id, 'operations.montant', $m),
            $sens,
            chiffrerPour($id, 'operations.note', champ('note', 255) !== '' ? champ('note', 255) : null),
            entier('pointe', 0),
        ];

        if ($opId) {
            $st = db()->prepare('SELECT 1 FROM operations WHERE id = ? AND livre_id = ?');
            $st->execute([$opId, $id]);
            if (!$st->fetch()) { fail('opération introuvable', 404); }
            db()->prepare(
                'UPDATE operations SET compte_id = ?, vers_compte_id = ?, categorie_id = ?,
                        jour = ?, libelle = ?, montant = ?, sens = ?, note = ?, pointe = ?
                 WHERE id = ?'
            )->execute([...$donnees, $opId]);
            journaliser($id, $u['id'], 'operation_modifiee', 'operation', $opId);
        } else {
            db()->prepare(
                'INSERT INTO operations (compte_id, vers_compte_id, categorie_id, jour,
                        libelle, montant, sens, note, pointe, livre_id, user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([...$donnees, $id, $u['id']]);
            $opId = (int) db()->lastInsertId();
            journaliser($id, $u['id'], 'operation_creee', 'operation', $opId);
        }
        jsonOut(['ok' => true, 'id' => $opId, 'version' => toucher($id)]);
    }

    case 'operation_supprimer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $opId = entier('id');
        if (!$opId) { fail('quelle opération ?'); }
        supprimerOuEchouer('DELETE FROM operations WHERE id = ? AND livre_id = ?',
                           [$opId, $id], 'opération');
        journaliser($id, $u['id'], 'operation_supprimee', 'operation', $opId);
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    case 'operation_pointer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $opId = entier('id');
        if (!$opId) { fail('quelle opération ?'); }
        /* On vérifie l'appartenance par un SELECT plutôt que par le
           nombre de lignes touchées : rowCount() compte, après un UPDATE
           MySQL, les lignes CHANGÉES et non les lignes trouvées.
           Repointer une opération déjà pointée n'en change aucune, et
           un contrôle par ce nombre répondrait « introuvable » à une
           demande parfaitement légitime. */
        $st = db()->prepare('SELECT 1 FROM operations WHERE id = ? AND livre_id = ?');
        $st->execute([$opId, $id]);
        if (!$st->fetch()) { fail('opération introuvable', 404); }
        db()->prepare('UPDATE operations SET pointe = ? WHERE id = ?')
            ->execute([entier('pointe', 1), $opId]);
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    /* ---------------- Le budget par enveloppe ---------------- */
    case 'enveloppe_definir': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $cat = entier('categorie');
        if (!$cat) { fail('quelle catégorie ?'); }
        $st = db()->prepare('SELECT 1 FROM categories WHERE id = ? AND livre_id = ?');
        $st->execute([$cat, $id]);
        if (!$st->fetch()) { fail('catégorie introuvable', 404); }
        $mois = moisValide(champ('mois', 7));
        $m = montant('montant');

        if ($m === null || $m <= 0) {
            db()->prepare('DELETE FROM enveloppes WHERE livre_id = ? AND categorie_id = ? AND mois = ?')
                ->execute([$id, $cat, $mois]);
        } else {
            db()->prepare(
                'INSERT INTO enveloppes (livre_id, categorie_id, mois, montant) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE montant = VALUES(montant)'
            )->execute([$id, $cat, $mois, chiffrerMontantPour($id, 'enveloppes.montant', $m)]);
        }
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    /* ---------------- Les emprunts ---------------- */
    case 'emprunt_enregistrer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];

        $nom = champ('nom', 80);
        if ($nom === '') { fail('donnez un nom à cet emprunt'); }
        $capital = montant('capital');
        if ($capital === null || $capital <= 0) { fail('indiquez le capital emprunté'); }

        /* Le taux arrive en pourcent et se garde en points de base :
           1.50 % devient 150. Un taux en flottant dérive au fil des
           multiplications, et l'écart ne se voit qu'à la fin. */
        $tauxPourcent = body()['taux'] ?? null;
        if ($tauxPourcent === null || $tauxPourcent === '') { fail('indiquez le taux'); }
        $taux = (int) round(((float) str_replace(',', '.', (string) $tauxPourcent)) * 100);
        if ($taux < 0 || $taux > 100000) { fail('ce taux n\'est pas vraisemblable'); }

        $compte = entier('compte');
        $comptes = lireComptes($id);
        if (!$compte || !isset($comptes[$compte])) { fail('à quel compte de dette le rattacher ?'); }
        $c3a = entier('compte_3a');
        if ($c3a && !isset($comptes[$c3a])) { $c3a = null; }
        $bien = entier('bien');
        if ($bien && !isset($comptes[$bien])) { $bien = null; }

        $mode = dansListe(champ('mode', 12), ['annuites','constant','direct','indirect','infine'], 'annuites');
        $per  = dansListe(champ('periodicite', 12), ['mensuel','trimestriel','semestriel','annuel'], 'mensuel');

        $donnees = [
            $compte, $c3a, $bien,
            chiffrerPour($id, 'emprunts.nom', $nom),
            chiffrerPour($id, 'emprunts.preteur', champ('preteur', 80) !== '' ? champ('preteur', 80) : null),
            dansListe(champ('genre', 12), ['hypotheque','pret','leasing','credit','prive'], 'pret'),
            $mode,
            chiffrerMontantPour($id, 'emprunts.capital_initial', $capital),
            chiffrerMontantPour($id, 'emprunts.taux_annuel', $taux),
            chiffrerMontantPour($id, 'emprunts.amortissement_periodique', montant('amortissement')),
            $per,
            jourValide(champ('debut', 10)),
            champ('echeance', 10) !== '' ? jourValide(champ('echeance', 10)) : null,
            entier('duree_mois'),
            chiffrerPour($id, 'emprunts.note', champ('note', 255) !== '' ? champ('note', 255) : null),
            entier('archive', 0),
        ];

        $empId = entier('id');
        if ($empId) {
            $st = db()->prepare('SELECT 1 FROM emprunts WHERE id = ? AND livre_id = ?');
            $st->execute([$empId, $id]);
            if (!$st->fetch()) { fail('emprunt introuvable', 404); }
            db()->prepare(
                'UPDATE emprunts SET compte_id = ?, compte_amortissement_id = ?, bien_compte_id = ?,
                        nom = ?, preteur = ?, genre = ?, mode = ?, capital_initial = ?,
                        taux_annuel = ?, amortissement_periodique = ?, periodicite = ?,
                        debut = ?, echeance = ?, duree_mois = ?, note = ?, archive = ?
                 WHERE id = ?'
            )->execute([...$donnees, $empId]);
        } else {
            db()->prepare(
                'INSERT INTO emprunts (compte_id, compte_amortissement_id, bien_compte_id,
                        nom, preteur, genre, mode, capital_initial, taux_annuel,
                        amortissement_periodique, periodicite, debut, echeance, duree_mois,
                        note, archive, livre_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([...$donnees, $id]);
            $empId = (int) db()->lastInsertId();
        }

        $n = regenererEcheancier($id, $empId);
        journaliser($id, $u['id'], 'emprunt_enregistre', 'emprunt', $empId);
        jsonOut(['ok' => true, 'id' => $empId, 'echeances' => $n, 'version' => toucher($id)]);
    }

    case 'emprunt_supprimer': {
        requirePost();
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $empId = entier('id');
        if (!$empId) { fail('quel emprunt ?'); }
        supprimerOuEchouer('DELETE FROM emprunts WHERE id = ? AND livre_id = ?',
                           [$empId, $id], 'emprunt');
        journaliser($id, $u['id'], 'emprunt_supprime', 'emprunt', $empId);
        jsonOut(['ok' => true, 'version' => toucher($id)]);
    }

    case 'echeancier': {
        $u = requireUser(); $l = livreCourant($u); $id = (int) $l['id'];
        $empId = (int) ($_GET['id'] ?? 0);
        if (!$empId) { fail('quel emprunt ?'); }
        $st = db()->prepare('SELECT 1 FROM emprunts WHERE id = ? AND livre_id = ?');
        $st->execute([$empId, $id]);
        if (!$st->fetch()) { fail('emprunt introuvable', 404); }

        $lignes = lireEcheances($id, $empId);
        if (!$lignes) { regenererEcheancier($id, $empId); $lignes = lireEcheances($id, $empId); }

        $interets = array_sum(array_column($lignes, 'interet'));
        $capital  = array_sum(array_column($lignes, 'capital'));
        jsonOut([
            'echeances'      => $lignes,
            'total_interets' => $interets,
            'total_capital'  => $capital,
            'total_verse'    => $interets + $capital,
        ]);
    }

    default:
        fail('action inconnue : ' . mb_substr($action, 0, 40), 404);
    }
} catch (PDOException $e) {
    error_log('[budget] base : ' . $e->getMessage());
    fail('la base de données a refusé cette opération', 500);
} catch (RuntimeException $e) {
    /* Le coffre lève une RuntimeException quand la clé manque ou qu'une
       donnée a été modifiée. Le message est technique mais précis, et
       c'est exactement ce qu'on veut voir dans ce cas-là. */
    error_log('[budget] coffre : ' . $e->getMessage());
    fail($e->getMessage(), 500);
}
