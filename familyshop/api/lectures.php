<?php
/**
 * FamilyShop — lectures, et régénération de la liste depuis le menu.
 *
 * Le fichier le plus délicat du projet. La liste a deux origines qui ne
 * doivent jamais se marcher dessus : ce qui vient du menu, recalculé à
 * chaque changement, et ce qu'on a ajouté à la main, qui doit survivre à
 * tous les recalculs. Effacer la seconde en refaisant la première est le
 * défaut classique de ce genre d'application.
 */

declare(strict_types=1);

function foyerPublic(array $f): array
{
    return [
        'id'       => (int) $f['id'],
        'nom'      => (string) $f['name'],
        'code'     => (string) $f['join_code'],
        'couverts' => (int) $f['couverts'],
        'mon_role' => (string) ($f['mon_role'] ?? 'membre'),
    ];
}

function membresDu(int $foyerId): array
{
    $st = db()->prepare(
        'SELECT u.id, u.name, u.email, m.role, m.joined_at
         FROM household_members m JOIN users u ON u.id = m.user_id
         WHERE m.household_id = ? ORDER BY m.joined_at'
    );
    $st->execute([$foyerId]);
    return array_map(static function (array $r): array {
        return [
            'id'    => (int) $r['id'],
            'nom'   => $r['name'] !== '' ? $r['name'] : explode('@', (string) $r['email'])[0],
            'role'  => (string) $r['role'],
            'depuis'=> (string) $r['joined_at'],
        ];
    }, $st->fetchAll());
}

function recettesDu(int $foyerId): array
{
    $st = db()->prepare(
        'SELECT id, name, couverts, minutes, categorie, notes, favori
         FROM recipes WHERE household_id = ? ORDER BY favori DESC, name'
    );
    $st->execute([$foyerId]);
    $recettes = $st->fetchAll();
    if (!$recettes) {
        return [];
    }

    // les ingrédients de toutes les recettes en une requête : une par
    // recette ferait vingt allers-retours pour un carnet ordinaire
    $ids = array_column($recettes, 'id');
    $trous = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare(
        'SELECT recipe_id, label, quantite, unite, rayon
         FROM recipe_items WHERE recipe_id IN (' . $trous . ') ORDER BY recipe_id, position'
    );
    $st->execute($ids);
    $parRecette = [];
    foreach ($st->fetchAll() as $i) {
        $parRecette[(int) $i['recipe_id']][] = [
            'label'    => (string) $i['label'],
            'quantite' => $i['quantite'] === null ? null : (float) $i['quantite'],
            'unite'    => (string) $i['unite'],
            'rayon'    => (string) $i['rayon'],
        ];
    }

    /* Les illustrations en une seule requête, comme les ingrédients.
       Elles sont rattachées au nom de plat normalisé, pas à la recette :
       une famille qui rebaptise ses lasagnes « lasagnes de mamie » perd
       l'image, mais deux familles qui écrivent « Lasagnes » et
       « les lasagne » partagent la même. Le compromis penche du bon
       côté — les noms courants sont la règle. */
    require_once __DIR__ . '/illustrations.php';
    $images = illustrationsPour(array_column($recettes, 'name'));

    return array_map(static function (array $r) use ($parRecette, $images): array {
        return [
            'id'          => (int) $r['id'],
            'nom'         => (string) $r['name'],
            'couverts'    => (int) $r['couverts'],
            'minutes'     => (int) $r['minutes'],
            'categorie'   => (string) $r['categorie'],
            'notes'       => (string) ($r['notes'] ?? ''),
            'favori'      => (bool) $r['favori'],
            'image'       => $images[cleIngredient((string) $r['name'])] ?? null,
            'ingredients' => $parRecette[(int) $r['id']] ?? [],
        ];
    }, $recettes);
}

function menuDu(int $foyerId): array
{
    /* Les dates se calculent en PHP et voyagent en paramètre : les
       fonctions de date de MySQL et de SQLite ne s'écrivent pas pareil,
       et une requête portable vaut mieux que deux dialectes à tenir. */
    $st = db()->prepare(
        'SELECT p.id, p.jour, p.repas, p.recipe_id, p.libelle, p.couverts, r.name AS recette
         FROM plan_entries p LEFT JOIN recipes r ON r.id = p.recipe_id
         WHERE p.household_id = ? AND p.jour >= ?
         ORDER BY p.jour, p.repas'
    );
    $st->execute([$foyerId, date('Y-m-d', strtotime('-7 days'))]);
    return array_map(static function (array $r): array {
        return [
            'id'        => (int) $r['id'],
            'jour'      => (string) $r['jour'],
            'repas'     => (string) $r['repas'],
            'recipe_id' => $r['recipe_id'] === null ? null : (int) $r['recipe_id'],
            'nom'       => (string) ($r['recette'] ?? $r['libelle']),
            'couverts'  => (int) $r['couverts'],
        ];
    }, $st->fetchAll());
}

function listeDu(int $foyerId): array
{
    $st = db()->prepare(
        'SELECT l.id, l.label, l.cle, l.quantite, l.unite, l.rayon, l.origine, l.detail,
                l.coche_le, u.name AS par
         FROM list_items l LEFT JOIN users u ON u.id = l.coche_par
         WHERE l.household_id = ? ORDER BY l.label'
    );
    $st->execute([$foyerId]);
    $lignes = $st->fetchAll();

    /* L'ordre des rayons est celui du magasin, pas l'alphabet : on entre
       par les fruits et légumes et l'on finit par l'entretien. Trier
       autrement ferait refaire trois fois le tour du magasin — c'est
       précisément ce que cette application doit éviter.

       Le tri se fait ici et non en SQL : la fonction FIELD() de MySQL
       n'existe pas ailleurs, et la liste tient dans quelques dizaines
       de lignes. */
    $ordre = array_flip(RAYONS);
    usort($lignes, static function (array $a, array $b) use ($ordre): int {
        $ra = $ordre[$a['rayon']] ?? 99;
        $rb = $ordre[$b['rayon']] ?? 99;
        if ($ra !== $rb) { return $ra <=> $rb; }
        // au sein d'un rayon, ce qui reste à prendre d'abord
        $ca = $a['coche_le'] !== null ? 1 : 0;
        $cb = $b['coche_le'] !== null ? 1 : 0;
        if ($ca !== $cb) { return $ca <=> $cb; }
        return strcasecmp((string) $a['label'], (string) $b['label']);
    });

    return array_map(static function (array $r): array {
        return [
            'id'       => (int) $r['id'],
            'label'    => (string) $r['label'],
            'quantite' => $r['quantite'] === null ? null : (float) $r['quantite'],
            'unite'    => (string) $r['unite'],
            'rayon'    => (string) $r['rayon'],
            'origine'  => (string) $r['origine'],
            'detail'   => (string) $r['detail'],
            'coche'    => $r['coche_le'] !== null,
            'coche_par'=> (string) ($r['par'] ?? ''),
        ];
    }, $lignes);
}

/* ===================================================================
   La régénération
   =================================================================== */

/** Les familles d'unités convertibles, comme côté navigateur. */
function familleUnite(string $unite): array
{
    $u = mb_strtolower(trim($unite), 'UTF-8');
    $masses  = ['g' => 1.0, 'gr' => 1.0, 'kg' => 1000.0];
    $volumes = ['ml' => 1.0, 'cl' => 10.0, 'dl' => 100.0, 'l' => 1000.0];
    if (isset($masses[$u]))  return ['masse', $masses[$u]];
    if (isset($volumes[$u])) return ['volume', $volumes[$u]];
    return [$u === '' ? 'sans' : $u, 1.0];
}

/* Ce qui s'achète à l'unité : on ne met pas trois quarts de citron dans
   un panier. La mise à l'échelle produit pourtant des 1,75 dès qu'un repas
   change de nombre de couverts. */
const COMPTABLES = ['pièce', 'gousse', 'tranche', 'botte', 'boîte', 'paquet',
                    'sachet', 'pot', 'bouteille', 'cube'];

/** Remet une quantité dans l'unité la plus lisible de sa famille. */
function presenterQuantite(float $valeur, string $famille): array
{
    if ($famille === 'masse') {
        return $valeur >= 1000 ? [round($valeur / 1000, 2), 'kg'] : [round($valeur, 2), 'g'];
    }
    if ($famille === 'volume') {
        if ($valeur >= 1000) return [round($valeur / 1000, 2), 'l'];
        if ($valeur >= 100)  return [round($valeur / 100, 2), 'dl'];
        return [round($valeur, 2), 'ml'];
    }
    if (in_array($famille, COMPTABLES, true)) {
        // vers le haut : mieux vaut un citron de trop que la recette ratée
        return [(float) ceil($valeur - 0.001), $famille];
    }
    return [round($valeur, 2), $famille === 'sans' ? '' : $famille];
}

/**
 * Recompose la partie « menu » de la liste.
 *
 * Trois précautions, et chacune répond à un agacement réel :
 *
 * 1. Les articles ajoutés à la main ne sont jamais touchés.
 * 2. Ce qui était coché le reste, s'il revient : on ne recoche pas
 *    vingt articles parce que quelqu'un a changé le repas de jeudi.
 * 3. Seuls les repas d'aujourd'hui et des jours suivants comptent :
 *    la liste sert aux courses à venir, pas aux repas déjà mangés.
 */
function regenererListe(int $foyerId): void
{
    // ce qui était coché, pour le rétablir
    $st = db()->prepare(
        'SELECT cle, coche_le, coche_par FROM list_items
         WHERE household_id = ? AND origine = \'menu\' AND coche_le IS NOT NULL'
    );
    $st->execute([$foyerId]);
    $cochesAvant = [];
    foreach ($st->fetchAll() as $r) {
        $cochesAvant[(string) $r['cle']] = [$r['coche_le'], $r['coche_par']];
    }

    db()->prepare('DELETE FROM list_items WHERE household_id = ? AND origine = \'menu\'')
        ->execute([$foyerId]);

    // les ingrédients de tous les repas à venir
    $st = db()->prepare(
        'SELECT r.name AS recette, r.couverts AS couverts_recette, p.couverts AS couverts_repas,
                i.label, i.quantite, i.unite, i.rayon
         FROM plan_entries p
         JOIN recipes r      ON r.id = p.recipe_id
         JOIN recipe_items i ON i.recipe_id = r.id
         WHERE p.household_id = ? AND p.jour >= ?'
    );
    $st->execute([$foyerId, date('Y-m-d')]);
    $lignes = $st->fetchAll();
    if (!$lignes) {
        return;
    }

    $paquets = [];
    foreach ($lignes as $l) {
        $label = trim((string) $l['label']);
        if ($label === '') { continue; }
        $cle = cleIngredient($label);

        if (!isset($paquets[$cle])) {
            $paquets[$cle] = ['label' => $label, 'rayon' => (string) $l['rayon'],
                              'familles' => [], 'sources' => []];
        }
        $p = &$paquets[$cle];
        if (mb_strlen($label) < mb_strlen($p['label'])) { $p['label'] = $label; }
        if ($l['rayon'] !== 'divers') { $p['rayon'] = (string) $l['rayon']; }

        $recette = (string) $l['recette'];
        if (!in_array($recette, $p['sources'], true)) { $p['sources'][] = $recette; }

        if ($l['quantite'] !== null) {
            // la mise à l'échelle : ce repas nourrit peut-être plus de monde
            $base = max(1, (int) $l['couverts_recette']);
            $voulu = max(1, (int) $l['couverts_repas']);
            $q = ((float) $l['quantite']) * $voulu / $base;

            [$famille, $facteur] = familleUnite((string) $l['unite']);
            if (!isset($p['familles'][$famille])) { $p['familles'][$famille] = 0.0; }
            $p['familles'][$famille] += $q * $facteur;
        }
        unset($p);
    }

    $ins = db()->prepare(
        'INSERT INTO list_items
           (household_id, label, cle, quantite, unite, rayon, origine, detail, coche_le, coche_par)
         VALUES (?, ?, ?, ?, ?, ?, \'menu\', ?, ?, ?)'
    );
    foreach ($paquets as $cle => $p) {
        $detail = mb_substr(implode(', ', $p['sources']), 0, 190);
        [$cocheLe, $cochePar] = $cochesAvant[$cle] ?? [null, null];

        if (!$p['familles']) {
            // « du sel » : on sait qu'il en faut, sans savoir combien
            $ins->execute([$foyerId, $p['label'], $cle, null, '', $p['rayon'],
                           $detail, $cocheLe, $cochePar]);
            continue;
        }
        /* Une ligne par famille d'unités. « 3 pièces » et « 200 g » du même
           produit ne s'additionnent pas : les mêler donnerait un nombre
           faux, et faire acheter n'importe quoi est pire que faire lire
           deux lignes. */
        foreach ($p['familles'] as $famille => $total) {
            [$q, $u] = presenterQuantite($total, $famille);
            $ins->execute([$foyerId, $p['label'], $cle, $q, $u, $p['rayon'],
                           $detail, $cocheLe, $cochePar]);
        }
    }
}

/**
 * Retient qu'on achète souvent ce produit.
 *
 * Écrit en deux temps plutôt qu'avec ON DUPLICATE KEY : cette syntaxe
 * n'existe qu'en MySQL, et il n'y a aucune raison d'enfermer l'application
 * dans un dialecte pour une écriture aussi simple.
 */
function noterHabitude(int $foyerId, string $cle, string $label, string $rayon, string $unite): void
{
    $st = db()->prepare('UPDATE habitudes SET fois = fois + 1, dernier = ?, label = ?
                         WHERE household_id = ? AND cle = ?');
    $st->execute([date('Y-m-d H:i:s'), $label, $foyerId, $cle]);
    if ($st->rowCount() > 0) {
        return;
    }
    try {
        db()->prepare('INSERT INTO habitudes (household_id, cle, label, rayon, unite, fois, dernier)
                       VALUES (?, ?, ?, ?, ?, 1, ?)')
            ->execute([$foyerId, $cle, $label, $rayon, $unite, date('Y-m-d H:i:s')]);
    } catch (PDOException $e) {
        // deux ajouts simultanés du même produit : l'un des deux a gagné
        if ($e->getCode() !== '23000') { throw $e; }
    }
}

/** Les produits que ce foyer achète le plus souvent. */
function habitudesDu(int $foyerId, int $combien = 12): array
{
    $st = db()->prepare(
        'SELECT label, rayon, unite, fois FROM habitudes
         WHERE household_id = ? ORDER BY fois DESC, dernier DESC LIMIT ' . max(1, min(50, $combien))
    );
    $st->execute([$foyerId]);
    return $st->fetchAll();
}
