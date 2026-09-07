<?php
declare(strict_types=1);

/**
 * Vérification de la configuration de paiement.
 *
 * Stripe refuse une demande pour une dizaine de raisons possibles, et son
 * message est précis. Cette page le lit à votre place et le traduit.
 *
 * Ouvrez : api/paiement-test.php?cle=…
 * La clé est celle de 'maintenance_token' dans api/config.php.
 * Rien n'est modifié, rien n'est facturé : on ne fait que lire.
 */

require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

/* ---------------------------------------------------------------
   Qui a le droit d'ouvrir cette page

   Elle ne montre aucune clé, mais elle dit lesquelles sont posées,
   si le compte Stripe tourne en test ou en production, et quels
   tarifs existent. C'est un état des lieux du paiement : il se
   réserve.

   Même clé que api/migrer.php et api/portail-test.php. Pas de clé
   configurée = page fermée.
   --------------------------------------------------------------- */
$cle = (string) (config()['maintenance_token'] ?? '');
if ($cle === '' || !hash_equals($cle, (string) ($_GET['cle'] ?? ''))) {
    http_response_code(403);
    echo "Diagnostic réservé à la maintenance.\n\n";
    echo "Ajoutez dans api/config.php :\n";
    echo "   'maintenance_token' => 'un-mot-de-passe-que-vous-choisissez',\n";
    echo "puis ouvrez cette page avec ?cle=ce-mot-de-passe\n";
    exit;
}

$c = config();
$ligne = static function (string $etat, string $texte): void {
    echo str_pad($etat, 10) . $texte . "\n";
};

echo "Vérification du paiement\n" . str_repeat('=', 68) . "\n\n";

/* ---------- 1. La configuration est-elle remplie ? ---------- */
$secret  = (string) ($c['stripe_secret'] ?? '');
$mensuel = (string) ($c['stripe_prix_mensuel'] ?? '');
$annuel  = (string) ($c['stripe_prix_annuel'] ?? '');
$whsec   = (string) ($c['stripe_webhook_secret'] ?? '');

if ($secret === '' || $mensuel === '' || $annuel === '') {
    $ligne('MANQUE', 'la configuration est incomplète dans api/config.php :');
    if ($secret === '')  { echo "           - stripe_secret est vide\n"; }
    if ($mensuel === '') { echo "           - stripe_prix_mensuel est vide\n"; }
    if ($annuel === '')  { echo "           - stripe_prix_annuel est vide\n"; }
    echo "\nTant que ces champs sont vides, le site ne propose aucun abonnement.\n";
    exit;
}

/* ---------- 2. Cohérence entre le mode de la clé et celui des tarifs ---------- */
$modeCle = str_starts_with($secret, 'sk_live_') ? 'production'
         : (str_starts_with($secret, 'sk_test_') ? 'test' : 'inconnu');
$ligne('CLÉ', 'mode ' . $modeCle . ' (' . substr($secret, 0, 8) . '…)');

if ($modeCle === 'inconnu') {
    $ligne('ATTENTION', 'la clé ne commence ni par sk_test_ ni par sk_live_ :');
    echo "           avez-vous copié la clé publiable (pk_…) au lieu de la clé secrète ?\n";
}

/* ---------- 3. Les tarifs existent-ils, et sont-ils récurrents ? ---------- */
$verifierPrix = static function (string $nom, string $id) use ($ligne, $modeCle): bool {
    // Un identifiant de tarif commence toujours par price_ . Si l'on trouve
    // autre chose, inutile d'interroger Stripe : la cause est ici.
    if (strpos($id, 'price_') !== 0) {
        $ligne('ÉCHEC', $nom . ' : « ' . $id .' » n\'est pas un identifiant de tarif.');
        if (strpos($id, 'prod_') === 0) {
            echo "           Vous avez saisi l'identifiant du PRODUIT. Un produit peut porter\n";
            echo "           plusieurs tarifs — mensuel, annuel — et Stripe a besoin de savoir\n";
            echo "           lequel débiter. Il faut donc le price_… , pas le prod_… .\n";
        } elseif (is_numeric(str_replace([',', ' '], ['.', ''], $id))) {
            echo "           Vous avez saisi un MONTANT. Stripe attend l'identifiant du\n";
            echo "           tarif, qui ressemble à price_1Ab2CdEfGhIjKlMn.\n";
        }
        echo "           Où le trouver : Stripe → Catalogue de produits → ouvrez votre produit.\n";
        echo "           En haut s'affiche l'identifiant du produit (prod_…) : ce n'est pas lui.\n";
        echo "           Plus bas, la section Tarifs liste vos abonnements ; cliquez sur celui\n";
        echo "           qui convient, son identifiant price_… apparaît avec un bouton copier.\n";
        echo "           Ne confondez pas :\n";
        echo "             stripe_prix_mensuel = price_1Ab2Cd…   (ce que Stripe débite)\n";
        echo "             prix_mensuel        = '4.90 CHF par mois'  (ce qui s'affiche)\n";
        return false;
    }
    $r = stripeLire('prices/' . rawurlencode($id));
    if (!$r['ok']) {
        $ligne('ÉCHEC', $nom . ' : ' . $r['message']);
        if (stripos($r['message'], 'No such price') !== false) {
            echo "           Ce tarif n'existe pas pour cette clé. Deux causes possibles :\n";
            echo "           - l'identifiant est mal recopié ;\n";
            echo "           - le tarif a été créé en mode " . ($modeCle === 'production' ? 'test' : 'production')
               . ", alors que la clé est en mode " . $modeCle . ".\n";
            echo "           Dans Stripe, l'interrupteur « Mode test » commande les deux.\n";
        }
        if (stripos($r['message'], 'Invalid API Key') !== false) {
            echo "           La clé secrète est refusée : recopiez-la depuis Stripe,\n";
            echo "           Développeurs → Clés d'API → clé secrète.\n";
        }
        return false;
    }

    $p = $r['objet'];
    $recurrent = isset($p['recurring']) && is_array($p['recurring']);
    $montant = isset($p['unit_amount']) ? number_format(((int) $p['unit_amount']) / 100, 2) : '?';
    $devise  = strtoupper((string) ($p['currency'] ?? ''));
    $periode = $recurrent ? (string) ($p['recurring']['interval'] ?? '?') : 'aucune';

    $ligne('OK', $nom . ' : ' . $montant . ' ' . $devise . ', récurrence ' . $periode
        . (empty($p['active']) ? ' — TARIF DÉSACTIVÉ' : ''));

    if (!$recurrent) {
        $ligne('ÉCHEC', $nom . ' n\'est pas un tarif récurrent.');
        echo "           Un abonnement exige un tarif « récurrent », pas « unique ».\n";
        echo "           Recréez-le dans Stripe en choisissant Périodique.\n";
        return false;
    }
    if (empty($p['active'])) {
        $ligne('ÉCHEC', $nom . ' est archivé dans Stripe : réactivez-le ou créez-en un autre.');
        return false;
    }
    return true;
};

echo "\n";
$okM = $verifierPrix('tarif mensuel', $mensuel);
$okA = $verifierPrix('tarif annuel',  $annuel);

/* ---------- 4. Périodicité attendue ---------- */
if ($okM) {
    $p = stripeLire('prices/' . rawurlencode($mensuel))['objet'] ?? [];
    if (($p['recurring']['interval'] ?? '') !== 'month') {
        $ligne('ATTENTION', 'le tarif mensuel n\'est pas facturé au mois.');
    }
}
if ($okA) {
    $p = stripeLire('prices/' . rawurlencode($annuel))['objet'] ?? [];
    if (($p['recurring']['interval'] ?? '') !== 'year') {
        $ligne('ATTENTION', 'le tarif annuel n\'est pas facturé à l\'année.');
    }
}

/* ---------- 5. Le reste ---------- */
echo "\n";
$ligne($whsec === '' ? 'MANQUE' : 'OK',
    $whsec === ''
        ? 'stripe_webhook_secret est vide : les abonnements payés ne s\'activeront pas.'
        : 'secret de notification renseigné (' . substr($whsec, 0, 6) . '…)');

$url = siteUrl();
$ligne(str_starts_with($url, 'https://') ? 'OK' : 'ATTENTION', 'site_url = ' . $url);
if (!str_starts_with($url, 'https://')) {
    echo "           Stripe exige des adresses de retour en https.\n";
}
echo "           Adresse à déclarer dans Stripe → Webhooks :\n";
echo "           " . $url . "/api/stripe.php\n";

/* ---------- 5 bis. Les exigences de TWINT ---------- */
echo "\n";
$ligne('TWINT', 'exigences de Stripe pour les marchands suisses');

$version = versionStripe();
$assezRecent = (strcmp(substr($version, 0, 10), '2026-05-27') >= 0);
$ligne($assezRecent ? 'OK' : 'ÉCHEC', 'version d\'API : ' . $version);
if (!$assezRecent) {
    echo "           TWINT n'accepte les abonnements qu'à partir de 2026-05-27.\n";
    echo "           Avec une version antérieure, il n'apparaîtra pas du tout sur la\n";
    echo "           page de paiement, et sans message d'erreur. Corrigez\n";
    echo "           'stripe_version' dans api/config.php.\n";
}

$mentions = __DIR__ . '/../mentions-legales.html';
if (!is_file($mentions)) {
    $ligne('ÉCHEC', 'la page mentions-legales.html est absente.');
} else {
    $texte = (string) file_get_contents($mentions);
    if (preg_match('/\[[^\]]{3,60}\]/', $texte, $m)) {
        $ligne('ÉCHEC', 'les mentions légales ne sont pas remplies : ' . $m[0] . ' subsiste.');
        echo "           Stripe vérifie que la dénomination, la forme juridique,\n";
        echo "           l'adresse complète et un moyen de contact figurent en clair.\n";
        echo "           Tant qu'il reste des crochets, la demande TWINT sera refusée.\n";
    } else {
        $ligne('OK', 'mentions légales remplies et accessibles.');
    }
}

$devises = [];
foreach ([$mensuel, $annuel] as $id) {
    if (strpos($id, 'price_') !== 0) {
        continue;
    }
    $r = stripeLire('prices/' . rawurlencode($id));
    if ($r['ok']) {
        $devises[] = strtolower((string) ($r['objet']['currency'] ?? ''));
    }
}
if ($devises && array_diff($devises, ['chf'])) {
    $ligne('ÉCHEC', 'les tarifs ne sont pas tous en CHF : TWINT exige des francs suisses.');
} elseif ($devises) {
    $ligne('OK', 'tarifs libellés en CHF.');
}

echo "           Reste à activer TWINT dans Stripe :\n";
echo "           Paramètres → Moyens de paiement → TWINT → Activer.\n";

/* ---------- 6. Des notifications sont-elles déjà arrivées ? ---------- */
try {
    $n = (int) db()->query('SELECT COUNT(*) FROM billing_events')->fetchColumn();
    if ($n === 0) {
        $ligne('ATTENTION', 'aucune notification reçue de Stripe à ce jour.');
        echo "           Si un paiement a déjà eu lieu, c'est que le webhook n'est pas\n";
        echo "           déclaré, ou qu'il pointe ailleurs. Vérifiez dans Stripe :\n";
        echo "           Développeurs → Webhooks → l'adresse ci-dessus, et la liste des\n";
        echo "           tentatives, qui indique le code de réponse obtenu.\n";
        echo "           Les abonnements s'ouvrent tout de même grâce à la vérification\n";
        echo "           au retour du paiement, mais les renouvellements et les\n";
        echo "           résiliations, eux, ont besoin du webhook.\n";
    } else {
        $d = db()->query('SELECT type, resume, created_at FROM billing_events ORDER BY id DESC LIMIT 1')->fetch();
        $ligne('OK', $n . ' notification(s) reçue(s), la dernière : '
            . (string) ($d['type'] ?? '') . ' → ' . (string) ($d['resume'] ?? ''));
    }
} catch (Throwable $e) {
    $ligne('ATTENTION', 'table billing_events absente : passez la mise à jour de la base.');
}

$ligne('INFO', 'prix affichés : ' . ($c['prix_mensuel'] ?? '—') . ' / ' . ($c['prix_annuel'] ?? '—'));
echo "           Vérifiez qu'ils correspondent aux montants ci-dessus :\n";
echo "           ces textes ne sont qu'un affichage, ils ne débitent rien.\n";

echo "\n" . str_repeat('=', 68) . "\n";
echo ($okM && $okA && $whsec !== '')
    ? "Configuration cohérente. Essayez une souscription en mode test.\n"
    : "Corrigez les points ci-dessus, puis rechargez cette page.\n";
