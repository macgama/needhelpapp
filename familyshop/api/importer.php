<?php
/**
 * FamilyShop — importer une recette depuis une adresse web.
 *
 * Deux précautions gouvernent ce fichier, et aucune n'est technique.
 *
 * LE DROIT. Une recette, comme méthode et liste d'ingrédients, n'est pas
 * une œuvre de l'esprit : la jurisprudence est constante là-dessus. Mais
 * sa RÉDACTION l'est — le texte des instructions, les notes d'entête. On
 * importe donc le nom, les quantités et les ingrédients, qui sont des
 * faits, et l'on renvoie vers la source pour la façon de faire. Recopier
 * les instructions dans notre base serait une reproduction.
 *
 * LA SÉCURITÉ. Un serveur qui va chercher l'adresse qu'on lui donne peut
 * être retourné contre le réseau interne de l'hébergeur : c'est ce qu'on
 * appelle une requête falsifiée côté serveur. On n'accepte donc que http
 * et https, on refuse les adresses privées, et l'on borne la taille et
 * la durée.
 */

declare(strict_types=1);

/** Les unités qu'on sait reconnaître dans un texte français. */
const UNITES_TEXTE = [
    'kg' => 'kg', 'kilo' => 'kg', 'kilos' => 'kg', 'kilogramme' => 'kg', 'kilogrammes' => 'kg',
    'g' => 'g', 'gr' => 'g', 'gramme' => 'g', 'grammes' => 'g',
    'mg' => 'g',
    'l' => 'l', 'litre' => 'l', 'litres' => 'l',
    'dl' => 'dl', 'décilitre' => 'dl', 'decilitre' => 'dl',
    'cl' => 'cl', 'centilitre' => 'cl',
    'ml' => 'ml', 'millilitre' => 'ml',
    'cs' => 'cs', 'càs' => 'cs', 'cas' => 'cs',
    'cuillère à soupe' => 'cs', 'cuillères à soupe' => 'cs',
    'cuillere a soupe' => 'cs', 'cuilleres a soupe' => 'cs',
    'cc' => 'cc', 'càc' => 'cc', 'cac' => 'cc',
    'cuillère à café' => 'cc', 'cuillères à café' => 'cc',
    'cuillere a cafe' => 'cc', 'cuilleres a cafe' => 'cc',
    'pincée' => 'pincée', 'pincées' => 'pincée', 'pincee' => 'pincée',
    'gousse' => 'gousse', 'gousses' => 'gousse',
    'tranche' => 'tranche', 'tranches' => 'tranche',
    'botte' => 'botte', 'bottes' => 'botte', 'bouquet' => 'botte',
    'boîte' => 'boîte', 'boîtes' => 'boîte', 'boite' => 'boîte', 'boites' => 'boîte',
    'paquet' => 'paquet', 'paquets' => 'paquet',
    'sachet' => 'sachet', 'sachets' => 'sachet',
    'pot' => 'pot', 'pots' => 'pot',
    'bouteille' => 'bouteille', 'bouteilles' => 'bouteille',
    'cube' => 'cube', 'cubes' => 'cube',
    'pièce' => 'pièce', 'pièces' => 'pièce', 'piece' => 'pièce',
];

/** Les fractions qu'on rencontre dans les recettes. */
const FRACTIONS = ['½' => 0.5, '¼' => 0.25, '¾' => 0.75, '⅓' => 0.3333, '⅔' => 0.6667,
                   '⅛' => 0.125, '1/2' => 0.5, '1/4' => 0.25, '3/4' => 0.75,
                   '1/3' => 0.3333, '2/3' => 0.6667];

/**
 * Découpe « 500 g de viande hachée » en ses trois parties.
 *
 * On rend toujours quelque chose : un ingrédient qu'on n'a pas su
 * analyser vaut mieux qu'un ingrédient perdu. L'utilisateur corrigera.
 */
function analyserIngredient(string $texte): array
{
    $t = trim(preg_replace('/\s+/u', ' ', $texte));
    $t = str_replace(["\u{00A0}", '–', '—'], [' ', '-', '-'], $t);
    if ($t === '') {
        return ['label' => '', 'quantite' => null, 'unite' => ''];
    }

    $quantite = null;

    // « 1 ½ » ou « ½ » en tête
    foreach (FRACTIONS as $signe => $valeur) {
        if (str_starts_with($t, $signe . ' ')) {
            $quantite = $valeur;
            $t = trim(substr($t, strlen($signe)));
            break;
        }
        if (preg_match('/^(\d+)\s*' . preg_quote($signe, '/') . '\s/u', $t, $m)) {
            $quantite = (float) $m[1] + $valeur;
            $t = trim(substr($t, strlen($m[0])));
            break;
        }
    }

    // un nombre en tête : « 500 », « 1,5 », « 2.5 », et « 4 à 6 » → 6
    if ($quantite === null && preg_match('/^(\d+(?:[.,]\d+)?)(?:\s*(?:à|-|\/)\s*(\d+(?:[.,]\d+)?))?\s*/u', $t, $m)) {
        $quantite = (float) str_replace(',', '.', $m[2] ?? $m[1]);
        $t = trim(substr($t, strlen($m[0])));
    }

    // l'unité, en essayant les plus longues d'abord : « cuillère à soupe »
    // avant « cuillère », sans quoi le « à soupe » resterait dans le nom
    $unite = '';
    $cles = array_keys(UNITES_TEXTE);
    usort($cles, static fn($a, $b) => mb_strlen($b) <=> mb_strlen($a));
    $bas = mb_strtolower($t, 'UTF-8');
    foreach ($cles as $mot) {
        if ($bas === $mot || str_starts_with($bas, $mot . ' ') || str_starts_with($bas, $mot . '.')) {
            $unite = UNITES_TEXTE[$mot];
            $t = trim(mb_substr($t, mb_strlen($mot)));
            $t = ltrim($t, '. ');
            break;
        }
    }

    // « de », « d' », « du », « des » entre l'unité et le produit
    $t = preg_replace('/^(de |d\'|du |des |le |la |les )/iu', '', $t);

    // ce qui suit une virgule est une précision de préparation, pas le
    // produit : « oignon, émincé » s'achète comme un oignon
    $t = preg_split('/,/u', $t)[0];
    $t = trim($t, " \t\n.:;-");

    return [
        'label'    => mb_substr($t, 0, 80),
        'quantite' => $quantite,
        'unite'    => $unite,
    ];
}

/**
 * Les adresses IP d'un hôte, IPv4 ET IPv6.
 *
 * gethostbynamel() ne lit que les enregistrements A. Un domaine pointant
 * en A vers une adresse publique et en AAAA vers ::1 franchissait donc
 * le contrôle, après quoi cURL — qui préfère l'IPv6 quand il est
 * disponible — se connectait à la boucle locale. On lit les deux.
 *
 * Un littéral, « 93.184.216.34 » ou « [2606:2800::1] », se rend
 * lui-même : il n'y a pas de nom à résoudre.
 */
function adressesDe(string $hote): array
{
    $nu = trim($hote, '[]');
    if (filter_var($nu, FILTER_VALIDATE_IP)) {
        return [$nu];
    }

    $ips = @gethostbynamel($hote) ?: [];
    foreach (@dns_get_record($hote, DNS_AAAA) ?: [] as $e) {
        if (!empty($e['ipv6'])) {
            $ips[] = $e['ipv6'];
        }
    }
    return array_values(array_unique($ips));
}

/**
 * Cette adresse est-elle sûre à aller chercher ?
 * Sans ce contrôle, on offrirait au premier venu un moyen d'interroger
 * le réseau interne de l'hébergeur depuis notre serveur.
 *
 * Rend [sûre, pourquoi pas, épinglage] — l'épinglage étant ce qu'il faut
 * passer à CURLOPT_RESOLVE pour que cURL se connecte AUX ADRESSES QUE
 * L'ON VIENT DE CONTRÔLER, et non à ce qu'un second appel au DNS lui
 * répondrait. Voir telecharger().
 */
function adresseSure(string $url): array
{
    $p = parse_url($url);
    if (!$p || empty($p['scheme']) || empty($p['host'])) {
        return [false, 'cette adresse n\'est pas valide', []];
    }
    $schema = strtolower($p['scheme']);
    if (!in_array($schema, ['http', 'https'], true)) {
        return [false, 'seules les adresses http et https sont acceptées', []];
    }
    $hote = $p['host'];
    $port = (int) ($p['port'] ?? ($schema === 'https' ? 443 : 80));

    $ips = adressesDe($hote);
    if (!$ips) {
        return [false, 'ce site est introuvable', []];
    }
    foreach ($ips as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP,
                        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return [false, 'cette adresse mène au réseau interne', []];
        }
    }

    /* Toutes les adresses ont été contrôlées, donc toutes peuvent être
       épinglées : si la première ne répond pas, cURL peut basculer sur
       une autre sans sortir de ce qu'on a autorisé.

       Un littéral n'est pas épinglé — il n'y a rien à résoudre, cURL s'y
       connecte directement — et une adresse IPv6 entre crochets rendrait
       de toute façon la syntaxe hôte:port:ip indéchiffrable. */
    $epingle = filter_var(trim($hote, '[]'), FILTER_VALIDATE_IP)
        ? []
        : [$hote . ':' . $port . ':' . implode(',', $ips)];

    return [true, '', $epingle];
}

/** Au-delà, on considère que le site tourne en rond. */
const IMPORT_SAUTS_MAX = 3;

/**
 * Va chercher la page, en bornant tout ce qui peut l'être.
 *
 * TROIS TROUS ONT ÉTÉ BOUCHÉS ICI, ET ILS SE RESSEMBLENT : entre le
 * moment où l'on VÉRIFIE une adresse et le moment où l'on s'y CONNECTE,
 * quelque chose pouvait changer.
 *
 *   1. LE DNS. adresseSure() résolvait le nom, puis cURL le résolvait à
 *      son tour, pour son propre compte. Un serveur de noms complice,
 *      avec une durée de vie d'une seconde, répondait « adresse
 *      publique » au contrôle et « 127.0.0.1 » à la connexion. On
 *      épingle désormais les adresses contrôlées : cURL ne redemande
 *      rien à personne.
 *
 *   2. LES REDIRECTIONS. CURLOPT_FOLLOWLOCATION les suivait seul, sans
 *      qu'aucun saut intermédiaire ne soit examiné. Seule l'adresse
 *      FINALE était revérifiée — donc APRÈS que la requête vers le
 *      réseau interne avait déjà eu lieu. Cela ne rendait pas la
 *      réponse, mais cela suffisait à atteindre un service interne qui
 *      agit sur ce qu'on lui demande. On suit maintenant les
 *      redirections à la main, en contrôlant chaque saut AVANT de le
 *      faire.
 *
 *   3. L'IPV6. Voir adressesDe().
 *
 * Le reste des bornes n'a pas changé : douze secondes, trois sauts,
 * deux mégaoctets, et le certificat vérifié.
 */
function telecharger(string $url): array
{
    if (!function_exists('curl_init')) {
        return [null, 'le serveur ne sait pas aller chercher de page'];
    }

    $vues = [];

    for ($saut = 0; $saut <= IMPORT_SAUTS_MAX; $saut++) {
        [$sure, $pourquoi, $epingle] = adresseSure($url);
        if (!$sure) {
            return [null, $pourquoi];
        }
        if (isset($vues[$url])) {
            return [null, 'ce site renvoie en boucle sur lui-même'];
        }
        $vues[$url] = true;

        $ch = curl_init($url);
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            // Surtout pas : elles sont suivies à la main, ci-dessous.
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT        => 12,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_USERAGENT      => 'FamilyShop/1.0 (+https://familyshop.needhelpapp.com)',
            CURLOPT_ACCEPT_ENCODING => '',
            // une page de recette pèse rarement plus de 2 Mo ; au-delà, on coupe
            CURLOPT_BUFFERSIZE     => 65536,
            CURLOPT_NOPROGRESS     => false,
            CURLOPT_PROGRESSFUNCTION => static function ($r, $recu) {
                return $recu > 2097152 ? 1 : 0;
            },
        ];
        if ($epingle) {
            $options[CURLOPT_RESOLVE] = $epingle;
        }
        curl_setopt_array($ch, $options);

        $corps  = curl_exec($ch);
        $code   = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        /* Renseigné même sans FOLLOWLOCATION, et déjà rendu absolu : c'est
           précisément à cela que sert cette information. */
        $suivant = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        $erreur = curl_error($ch);
        curl_close($ch);

        if ($corps === false) {
            return [null, $erreur !== '' ? 'la page n\'a pas pu être lue' : 'la page est vide'];
        }
        if ($code >= 300 && $code < 400) {
            if ($suivant === '') {
                return [null, 'ce site redirige vers une adresse illisible'];
            }
            // Le tour suivant le contrôlera AVANT de s'y rendre.
            $url = $suivant;
            continue;
        }
        if ($code >= 400) {
            return [null, 'le site a répondu ' . $code];
        }
        if ($corps === '') {
            return [null, 'la page est vide'];
        }
        return [$corps, ''];
    }

    return [null, 'ce site enchaîne trop de redirections'];
}

/**
 * Cherche la recette dans les données structurées de la page.
 *
 * La quasi-totalité des sites de cuisine publient un bloc JSON-LD au
 * format schema.org/Recipe, parce que les moteurs de recherche le
 * demandent. C'est autrement plus fiable que de lire le HTML : la mise
 * en page change tous les six mois, ces données non.
 */
function extraireRecette(string $html): ?array
{
    if (!preg_match_all(
        '#<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>#is',
        $html, $blocs)) {
        return null;
    }

    foreach ($blocs[1] as $brut) {
        $donnees = json_decode(trim($brut), true);
        if (!is_array($donnees)) {
            continue;
        }
        $trouvee = chercherRecipe($donnees);
        if ($trouvee) {
            return $trouvee;
        }
    }
    return null;
}

/** Le bloc peut être un objet, un tableau, ou un @graph : on descend. */
function chercherRecipe(array $noeud): ?array
{
    $type = $noeud['@type'] ?? null;
    $types = is_array($type) ? $type : [$type];
    foreach ($types as $t) {
        if (is_string($t) && strcasecmp($t, 'Recipe') === 0) {
            return $noeud;
        }
    }
    foreach (['@graph', 'mainEntity', 'itemListElement'] as $cle) {
        if (isset($noeud[$cle]) && is_array($noeud[$cle])) {
            $r = chercherRecipe($noeud[$cle]);
            if ($r) { return $r; }
        }
    }
    foreach ($noeud as $valeur) {
        if (is_array($valeur)) {
            $r = chercherRecipe($valeur);
            if ($r) { return $r; }
        }
    }
    return null;
}

/** « PT1H30M » devient 90. */
function minutesDe($duree): int
{
    if (!is_string($duree)) { return 0; }
    if (!preg_match('/PT(?:(\d+)H)?(?:(\d+)M)?/i', $duree, $m)) { return 0; }
    return (int) ($m[1] ?? 0) * 60 + (int) ($m[2] ?? 0);
}

/** Le nombre de couverts, souvent écrit « 4 personnes ». */
function couvertsDe($rendement): int
{
    if (is_array($rendement)) { $rendement = $rendement[0] ?? ''; }
    if (preg_match('/(\d+)/', (string) $rendement, $m)) {
        return max(1, min(20, (int) $m[1]));
    }
    return 4;
}

/**
 * Met la recette trouvée dans notre forme.
 *
 * On ne rapporte PAS les instructions : leur rédaction appartient à son
 * auteur. On garde l'adresse, pour que l'utilisateur y retourne — ce qui
 * est d'ailleurs plus honnête envers le site que de le recopier.
 */
function mettreEnForme(array $r, string $url): array
{
    $nom = $r['name'] ?? '';
    if (is_array($nom)) { $nom = $nom[0] ?? ''; }
    $nom = trim(html_entity_decode(strip_tags((string) $nom), ENT_QUOTES, 'UTF-8'));

    $brutIngredients = $r['recipeIngredient'] ?? $r['ingredients'] ?? [];
    if (is_string($brutIngredients)) { $brutIngredients = [$brutIngredients]; }
    if (!is_array($brutIngredients)) { $brutIngredients = []; }

    $ingredients = [];
    foreach (array_slice($brutIngredients, 0, 60) as $ligne) {
        if (!is_string($ligne)) { continue; }
        $ligne = html_entity_decode(strip_tags($ligne), ENT_QUOTES, 'UTF-8');
        $a = analyserIngredient($ligne);
        if ($a['label'] === '') { continue; }
        $a['rayon'] = 'divers';    // le navigateur devinera avec son catalogue
        $a['brut'] = mb_substr(trim($ligne), 0, 120);
        $ingredients[] = $a;
    }

    return [
        'nom'      => mb_substr($nom, 0, 120),
        'couverts' => couvertsDe($r['recipeYield'] ?? null),
        'minutes'  => minutesDe($r['totalTime'] ?? $r['cookTime'] ?? null),
        'ingredients' => $ingredients,
        'source'   => $url,
    ];
}
