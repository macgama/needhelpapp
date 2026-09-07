<?php
/**
 * Contrôle du coffre et du calcul d'échéancier.
 *
 *   php api/calcul-test.php          en ligne de commande, sans clé
 *   api/calcul-test.php?cle=…        par HTTP, avec 'maintenance_token'
 *
 * Ni base de données, ni session : ces deux morceaux sont des fonctions
 * pures, et c'est précisément ce qui permet de les éprouver contre des
 * valeurs calculées à la main. Un échéancier faux reste vraisemblable
 * pendant des années et ne se contredit qu'à la dernière échéance.
 *
 * Le coffre est essayé avec une clé jetable, tirée à chaque exécution :
 * on vérifie l'algorithme, pas le déploiement. La clé réellement posée
 * dans api/config.php est contrôlée séparément, à la fin.
 */

declare(strict_types=1);

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    $reel = is_file(__DIR__ . '/config.php') ? (array) require __DIR__ . '/config.php' : [];
    $cle = (string) ($reel['maintenance_token'] ?? '');
    if ($cle === '' || !hash_equals($cle, (string) ($_GET['cle'] ?? ''))) {
        http_response_code(403);
        exit("Contrôle réservé à la maintenance.\n");
    }
}

/* Une configuration d'essai : deux clés, pour pouvoir éprouver aussi la
   rotation. Elle remplace config() avant que le coffre ne la demande. */
$CFG = [
    'coffre_cles' => [
        1 => base64_encode(random_bytes(32)),
        2 => base64_encode(random_bytes(32)),
    ],
    'coffre_cle_active' => 1,
];
function config(): array { global $CFG; return $CFG; }

require __DIR__ . '/coffre.php';
require __DIR__ . '/amortissement.php';

$ok = 0; $ko = 0;
function verifie(string $quoi, bool $vrai, string $detail = ''): void {
    global $ok, $ko;
    if ($vrai) { $ok++; echo "  ok    $quoi\n"; }
    else { $ko++; echo "  ÉCHEC $quoi" . ($detail !== '' ? "\n          $detail" : '') . "\n"; }
}
function egal(string $quoi, $attendu, $obtenu): void {
    verifie($quoi, $attendu === $obtenu, 'attendu ' . var_export($attendu, true) . ', obtenu ' . var_export($obtenu, true));
}
function leve(string $quoi, callable $f): void {
    try { $f(); verifie($quoi, false, 'aucune exception levée'); }
    catch (Throwable $e) { verifie($quoi, true); }
}
function titre(string $t): void { echo "\n$t\n" . str_repeat('-', 68) . "\n"; }

echo "Contrôle de budget — coffre et échéanciers\n" . str_repeat('=', 68) . "\n";

/* =============================================================
   LE COFFRE
   ============================================================= */
titre('Le coffre');

$aad = coffre_aad('operations.montant', 12);
$p = chiffrer('salaire de septembre', $aad);
egal('un aller-retour rend le texte d\'origine', 'salaire de septembre', dechiffrer($p, $aad));
verifie('le chiffré ne contient pas le clair', !str_contains($p, 'salaire'));
egal('l\'octet de version est celui de la clé active', 1, ord($p[0]));

$a = chiffrer('même texte', $aad);
$b = chiffrer('même texte', $aad);
verifie('deux chiffrements du même texte diffèrent', $a !== $b, 'vecteur d\'initialisation figé');

egal('NULL reste NULL', null, chiffrer(null, $aad));
egal('déchiffrer NULL rend NULL', null, dechiffrer(null, $aad));
egal('la chaîne vide se chiffre et revient', '', dechiffrer(chiffrer('', $aad), $aad));

leve('un autre livre ne peut pas lire le paquet',
     fn() => dechiffrer($p, coffre_aad('operations.montant', 13)));
leve('une autre colonne ne peut pas lire le paquet',
     fn() => dechiffrer($p, coffre_aad('comptes.solde_initial', 12)));

$abime = $p; $abime[strlen($abime) - 1] = chr(ord($abime[strlen($abime) - 1]) ^ 0x01);
leve('un octet modifié est refusé', fn() => dechiffrer($abime, $aad));
$tagAbime = $p; $tagAbime[14] = chr(ord($tagAbime[14]) ^ 0x01);
leve('un tag d\'authentification modifié est refusé', fn() => dechiffrer($tagAbime, $aad));
leve('un paquet tronqué est refusé', fn() => dechiffrer(substr($p, 0, 10), $aad));

$inconnue = chr(9) . substr($p, 1);
leve('une clé non déclarée est refusée', fn() => dechiffrer($inconnue, $aad));

// Rotation : ce qui a été écrit avec la clé 1 se relit après passage à la 2.
$CFG['coffre_cle_active'] = 2;
$p2 = chiffrer('après rotation', $aad);
egal('la nouvelle clé est bien la 2', 2, ord($p2[0]));
egal('l\'ancien paquet reste lisible après rotation', 'salaire de septembre', dechiffrer($p, $aad));
egal('le nouveau paquet est lisible', 'après rotation', dechiffrer($p2, $aad));
$CFG['coffre_cle_active'] = 1;

titre('L\'argent');
egal('19.99 fait 1999 centimes',        1999, centimes('19.99'));
egal('une apostrophe suisse est admise', 123450, centimes("1'234.50"));
egal('la virgule est admise',            123450, centimes('1234,50'));
egal('un espace insécable est admis',    123450, centimes("1 234.50"));
egal('un entier vaut des francs entiers', 4500, centimes(45));
egal('0.1 + 0.2 ne dérive pas',            30, centimes('0.10') + centimes('0.20'));
egal('un montant négatif passe',        -50000, centimes('-500'));
leve('un montant illisible est refusé', fn() => centimes('beaucoup'));
egal('l\'affichage remet les centimes', '1234.56', francs(123456));
egal('l\'affichage garde le zéro final',   '10.50', francs(1050));
egal('l\'affichage du négatif',           '-3.07', francs(-307));
egal('un montant chiffré revient entier', 123456, dechiffrer_montant(chiffrer_montant(123456, $aad), $aad));

/* =============================================================
   LES ÉCHÉANCIERS
   ============================================================= */
titre('Mensualité constante — 10 000 CHF à 5 %, 12 mensualités');
$e = echeancier(['capital' => 1000000, 'taux' => 500, 'mode' => 'annuites',
                 'periodicite' => 'mensuel', 'debut' => '2026-01-15', 'duree_mois' => 12]);
egal('douze échéances', 12, $e['periodes']);
// Valeur de référence : 856.07 CHF par mois, calculée hors de ce code.
egal('la mensualité vaut 856.07', '856.07', francs($e['lignes'][0]['montant']));
egal('le capital est intégralement remboursé', 1000000, $e['total_capital']);
egal('le solde final est nul', 0, $e['lignes'][11]['restant']);
verifie('les intérêts totaux avoisinent 273 CHF',
        abs($e['total_interets'] - 27290) < 200, 'obtenu ' . francs($e['total_interets']));
verifie('la part d\'intérêt décroît',
        $e['lignes'][0]['interet'] > $e['lignes'][11]['interet']);
verifie('la part de capital croît',
        $e['lignes'][0]['capital'] < $e['lignes'][11]['capital']);
egal('première échéance un mois après le début', '2026-02-15', $e['lignes'][0]['jour']);

titre('Taux nul');
$e = echeancier(['capital' => 120000, 'taux' => 0, 'mode' => 'annuites',
                 'periodicite' => 'mensuel', 'debut' => '2026-01-01', 'duree_mois' => 12]);
egal('aucun intérêt', 0, $e['total_interets']);
egal('capital partagé en douze', 10000, $e['lignes'][0]['capital']);
egal('le capital est soldé', 120000, $e['total_capital']);

titre('Amortissement constant — 12 000 CHF à 5 %, 12 mensualités');
$e = echeancier(['capital' => 1200000, 'taux' => 500, 'mode' => 'constant',
                 'periodicite' => 'mensuel', 'debut' => '2026-01-01', 'duree_mois' => 12]);
egal('même part de capital chaque mois', 100000, $e['lignes'][0]['capital']);
egal('idem à la dernière', 100000, $e['lignes'][11]['capital']);
verifie('la mensualité baisse', $e['lignes'][0]['montant'] > $e['lignes'][11]['montant']);
egal('le capital est soldé', 1200000, $e['total_capital']);
egal('solde final nul', 0, $e['lignes'][11]['restant']);

titre('Hypothèque à amortissement INDIRECT — 400 000 CHF à 1.5 %, trimestriel, 10 ans');
$e = echeancier(['capital' => 40000000, 'taux' => 150, 'mode' => 'indirect',
                 'periodicite' => 'trimestriel', 'debut' => '2026-01-01',
                 'duree_mois' => 120, 'amortissement_periodique' => 175000]);
egal('quarante trimestres', 40, $e['periodes']);
egal('intérêt trimestriel de 1500 CHF', 150000, $e['lignes'][0]['interet']);
egal('le même au dernier trimestre', 150000, $e['lignes'][39]['interet']);
egal('AUCUN capital remboursé à la banque', 0, $e['total_capital']);
egal('la dette reste entière', 40000000, $e['lignes'][39]['restant']);
egal('le versement au 3a est rendu à part', 175000, $e['versement_amortissement']);
verifie('il ne figure pas dans l\'échéancier',
        $e['lignes'][0]['montant'] === 150000,
        'le 3a serait compté comme un remboursement de dette');

titre('Hypothèque à amortissement DIRECT — même prêt, amortissement contractuel');
$e = echeancier(['capital' => 40000000, 'taux' => 150, 'mode' => 'direct',
                 'periodicite' => 'trimestriel', 'debut' => '2026-01-01',
                 'duree_mois' => 120, 'amortissement_periodique' => 175000]);
egal('capital remboursé chaque trimestre', 175000, $e['lignes'][0]['capital']);
verifie('la dette diminue vraiment', $e['lignes'][39]['restant'] < 40000000);
verifie('l\'intérêt baisse avec la dette',
        $e['lignes'][39]['interet'] < $e['lignes'][0]['interet']);
verifie('la comparaison avec l\'indirect a du sens',
        $e['total_interets'] < 40 * 150000, 'l\'indirect coûte plus d\'intérêts, et c\'est le fait marquant');

titre('Remboursement in fine — 50 000 CHF à 3 %, 5 ans');
$e = echeancier(['capital' => 5000000, 'taux' => 300, 'mode' => 'infine',
                 'periodicite' => 'annuel', 'debut' => '2026-01-01', 'duree_mois' => 60]);
egal('cinq échéances', 5, $e['periodes']);
egal('rien remboursé la première année', 0, $e['lignes'][0]['capital']);
egal('tout à la dernière', 5000000, $e['lignes'][4]['capital']);
egal('solde final nul', 0, $e['lignes'][4]['restant']);
egal('intérêt annuel de 1500 CHF', 150000, $e['lignes'][0]['interet']);

titre('Les dates de fin de mois');
$e = echeancier(['capital' => 100000, 'taux' => 0, 'mode' => 'constant',
                 'periodicite' => 'mensuel', 'debut' => '2026-01-31', 'duree_mois' => 4]);
egal('le 31 janvier donne le 28 février', '2026-02-28', $e['lignes'][0]['jour']);
egal('puis le 31 mars',                   '2026-03-31', $e['lignes'][1]['jour']);
egal('puis le 30 avril',                  '2026-04-30', $e['lignes'][2]['jour']);
egal('puis le 31 mai',                    '2026-05-31', $e['lignes'][3]['jour']);

titre('Les refus');
leve('capital nul',        fn() => echeancier(['capital' => 0, 'taux' => 100, 'duree_mois' => 12, 'debut' => '2026-01-01']));
leve('taux aberrant',      fn() => echeancier(['capital' => 100000, 'taux' => 999999, 'duree_mois' => 12, 'debut' => '2026-01-01']));
leve('ni durée ni échéance', fn() => echeancier(['capital' => 100000, 'taux' => 100, 'debut' => '2026-01-01']));
leve('durée démesurée',    fn() => echeancier(['capital' => 100000, 'taux' => 100, 'duree_mois' => 20000, 'debut' => '2026-01-01']));
leve('mode inconnu',       fn() => echeancier(['capital' => 100000, 'taux' => 100, 'mode' => 'magique', 'duree_mois' => 12, 'debut' => '2026-01-01']));
leve('périodicité inconnue', fn() => echeancier(['capital' => 100000, 'taux' => 100, 'periodicite' => 'hebdomadaire', 'duree_mois' => 12, 'debut' => '2026-01-01']));

titre('L\'invariant, sur 400 combinaisons');
$soldes = 0; $sommes = 0; $additions = 0; $decroissance = 0; $cas = 0;
foreach (['annuites', 'constant', 'direct', 'infine'] as $mode) {
    foreach (['mensuel', 'trimestriel', 'semestriel', 'annuel'] as $per) {
        foreach ([0, 25, 150, 499, 1290] as $taux) {
            foreach ([100, 999999, 40000000, 123457] as $cap) {
                foreach ([12, 60, 121] as $duree) {
                    $cas++;
                    $r = echeancier(['capital' => $cap, 'taux' => $taux, 'mode' => $mode,
                                     'periodicite' => $per, 'debut' => '2026-03-31',
                                     'duree_mois' => $duree]);
                    $l = $r['lignes'];
                    if (end($l)['restant'] === 0) { $soldes++; }
                    if ($r['total_capital'] === $cap) { $sommes++; }
                    $bon = true; $prec = PHP_INT_MAX;
                    foreach ($l as $x) {
                        if ($x['montant'] !== $x['interet'] + $x['capital']) { $bon = false; }
                        if ($x['restant'] > $prec) { $bon = false; }
                        $prec = $x['restant'];
                    }
                    if ($bon) { $additions++; $decroissance++; }
                }
            }
        }
    }
}
egal("le solde final est nul dans les $cas cas",            $cas, $soldes);
egal("la somme des capitaux vaut l'emprunt dans les $cas",  $cas, $sommes);
egal("montant = intérêt + capital, et la dette ne remonte jamais", $cas, $additions);

titre('La clé réellement posée dans api/config.php');
$reel = is_file(__DIR__ . '/config.php') ? (array) require __DIR__ . '/config.php' : null;
if ($reel === null) {
    echo "  info  api/config.php n'existe pas encore : rien à contrôler ici.\n";
} else {
    $cles = $reel['coffre_cles'] ?? [];
    if (!is_array($cles) || $cles === []) {
        verifie('une clé de chiffrement est déclarée', false,
                "sans elle, budget refuse de démarrer — c'est voulu");
    } else {
        foreach ($cles as $v => $b64) {
            $brute = base64_decode((string) $b64, true);
            verifie("la clé n° $v fait 32 octets", $brute !== false && strlen($brute) === 32);
            verifie("la clé n° $v n'est pas un exemple laissé tel quel",
                    !in_array((string) $b64, ['', 'a-remplacer', str_repeat('A', 44)], true));
        }
        $active = $reel['coffre_cle_active'] ?? null;
        verifie('la clé active est déclarée',
                $active === null ? count($cles) === 1 : isset($cles[(int) $active]));
    }
}

echo "\n" . str_repeat('=', 68) . "\n";
echo $ko === 0
    ? "$ok contrôles passés, aucun échec.\n"
    : "$ok passés, $ko ÉCHEC(S). Ne mettez rien en ligne avant de les avoir compris.\n";
exit($ko === 0 ? 0 : 1);
