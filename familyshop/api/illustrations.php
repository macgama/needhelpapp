<?php
/**
 * Les illustrations de recettes.
 *
 * QUI PEUT EN POSER : les administrateurs de NeedHelpApp, et eux seuls.
 * Le rôle vient du portail, pas d'ici — nul ne se déclare administrateur
 * dans familyshop.
 *
 * POURQUOI PAR NOM DE PLAT ET NON PAR RECETTE
 *
 * Une recette appartient à un foyer, et les mêmes plats reviennent d'un
 * foyer à l'autre. Attacher l'image à la recette ferait payer la même
 * photographie de lasagnes autant de fois qu'il y a de familles qui en
 * font. Attachée au nom normalisé — la clé qui reconnaît « Les Boulettes
 * de viande » et « boulette de viande » comme une seule chose — une
 * génération les sert toutes.
 *
 * CE QUI EST FAIT DE CHAQUE FICHIER REÇU
 *
 * Il est décodé par GD puis RÉENCODÉ en WebP. C'est la vraie garantie
 * qu'il s'agit d'une image : un fichier déguisé — une archive, un script
 * portant une en-tête d'image — ne survit pas à l'aller-retour. Les
 * contrôles de type et d'extension se contournent ; un réencodage, non.
 *
 * L'opération retire au passage les données EXIF, dont la position GPS :
 * une photo prise à la maison ne doit pas publier l'adresse du foyer.
 */

declare(strict_types=1);

const ILLU_DOSSIER   = __DIR__ . '/../assets/recettes';
const ILLU_URL       = '/assets/recettes/';
const ILLU_MAX_RECU  = 8 * 1024 * 1024;   // ce qu'on accepte de recevoir
const ILLU_LARGEUR   = 1200;              // au-delà, on réduit
const ILLU_QUALITE   = 82;

/** Seuls les administrateurs du portail posent des illustrations. */
function exigerAdmin(array $u): void
{
    if (($u['role'] ?? 'membre') !== 'admin') {
        fail('réservé aux administrateurs de NeedHelpApp', 403);
    }
}

/**
 * Les illustrations correspondant à une liste de noms de plats.
 * @return array<string,string> clé du plat => adresse de l'image
 */
function illustrationsPour(array $noms): array
{
    $cles = [];
    foreach ($noms as $n) {
        $c = cleIngredient((string) $n);
        if ($c !== '') { $cles[$c] = true; }
    }
    if (!$cles) { return []; }

    $cles = array_keys($cles);
    $trous = implode(',', array_fill(0, count($cles), '?'));
    $st = db()->prepare("SELECT cle, fichier FROM illustrations WHERE cle IN ($trous)");
    $st->execute($cles);

    $out = [];
    foreach ($st as $r) { $out[$r['cle']] = ILLU_URL . $r['fichier']; }
    return $out;
}

/** L'illustration d'un plat, ou null. */
function illustrationDe(string $nom): ?string
{
    $t = illustrationsPour([$nom]);
    return $t[cleIngredient($nom)] ?? null;
}

/**
 * Reçoit un fichier, le réencode, l'enregistre.
 * @return array{cle:string,url:string,largeur:int,hauteur:int,octets:int}
 */
function poserIllustration(array $u, string $libelle, array $fichier, string $prompt = ''): array
{
    exigerAdmin($u);

    $cle = cleIngredient($libelle);
    if ($cle === '') { fail('indiquez le nom du plat à illustrer'); }

    if (($fichier['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        fail(match ((int) ($fichier['error'] ?? -1)) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE =>
                'image trop lourde pour le serveur — réduisez-la avant de la déposer',
            UPLOAD_ERR_NO_FILE => 'aucune image reçue',
            UPLOAD_ERR_PARTIAL => 'le transfert s\'est interrompu, réessayez',
            default => 'le transfert a échoué',
        });
    }
    if (($fichier['size'] ?? 0) > ILLU_MAX_RECU) {
        fail('image trop lourde : ' . round($fichier['size'] / 1048576, 1) . ' Mo pour 8 Mo au maximum');
    }
    /* is_uploaded_file() empêche qu'un chemin arbitraire du serveur soit
       présenté comme un téléversement. */
    if (!is_uploaded_file($fichier['tmp_name'] ?? '')) {
        fail('fichier inattendu', 400);
    }

    $brut = (string) file_get_contents($fichier['tmp_name']);
    $mesure = @getimagesizefromstring($brut);
    if ($mesure === false || !in_array($mesure[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        fail('ce fichier n\'est pas une image JPEG, PNG ou WebP');
    }

    $img = @imagecreatefromstring($brut);
    if ($img === false) { fail('image illisible'); }

    // Réduction à la largeur utile : une carte de recette n'affiche pas 4000 px.
    $l = imagesx($img); $h = imagesy($img);
    if ($l > ILLU_LARGEUR) {
        $nh = (int) round($h * ILLU_LARGEUR / $l);
        $petite = imagescale($img, ILLU_LARGEUR, $nh);
        if ($petite !== false) { imagedestroy($img); $img = $petite; $l = ILLU_LARGEUR; $h = $nh; }
    }

    if (!is_dir(ILLU_DOSSIER) && !@mkdir(ILLU_DOSSIER, 0755, true)) {
        fail('le dossier des illustrations est introuvable et n\'a pas pu être créé', 500);
    }

    /* Le nom est fabriqué ici, jamais repris du téléversement. Le suffixe
       aléatoire évite qu'un remplacement soit servi depuis le cache du
       navigateur — les images sont déclarées immuables. */
    $nom = preg_replace('/[^a-z0-9]+/', '-', $cle);
    $nom = trim((string) $nom, '-') . '-' . bin2hex(random_bytes(4)) . '.webp';
    $chemin = ILLU_DOSSIER . '/' . $nom;

    $ok = imagewebp($img, $chemin, ILLU_QUALITE);
    imagedestroy($img);
    if (!$ok) { fail('l\'image n\'a pas pu être enregistrée', 500); }
    @chmod($chemin, 0644);

    $ancien = illustrationFichier($cle);
    db()->prepare(
        'INSERT INTO illustrations (cle, fichier, libelle, prompt, source, largeur, hauteur, octets, cree_par)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE fichier = VALUES(fichier), libelle = VALUES(libelle),
             prompt = VALUES(prompt), source = VALUES(source), largeur = VALUES(largeur),
             hauteur = VALUES(hauteur), octets = VALUES(octets), cree_par = VALUES(cree_par),
             cree_le = CURRENT_TIMESTAMP'
    )->execute([$cle, $nom, mb_substr(trim($libelle), 0, 120), mb_substr($prompt, 0, 500),
                'televerse', $l, $h, (int) filesize($chemin), $u['id']]);

    // L'ancienne n'est effacée qu'une fois la nouvelle en place.
    if ($ancien !== null && $ancien !== $nom) { @unlink(ILLU_DOSSIER . '/' . $ancien); }

    return ['cle' => $cle, 'url' => ILLU_URL . $nom,
            'largeur' => $l, 'hauteur' => $h, 'octets' => (int) filesize($chemin)];
}

function illustrationFichier(string $cle): ?string
{
    $st = db()->prepare('SELECT fichier FROM illustrations WHERE cle = ?');
    $st->execute([$cle]);
    $f = $st->fetchColumn();
    return $f === false ? null : (string) $f;
}

function retirerIllustration(array $u, string $libelle): void
{
    exigerAdmin($u);
    $cle = cleIngredient($libelle);
    $fichier = illustrationFichier($cle);
    if ($fichier === null) { fail('aucune illustration pour ce plat', 404); }
    db()->prepare('DELETE FROM illustrations WHERE cle = ?')->execute([$cle]);
    @unlink(ILLU_DOSSIER . '/' . $fichier);
}

/** Le catalogue, pour la page d'administration. */
function toutesLesIllustrations(): array
{
    $st = db()->query(
        'SELECT cle, fichier, libelle, largeur, hauteur, octets, cree_le
         FROM illustrations ORDER BY cree_le DESC LIMIT 300'
    );
    $out = [];
    foreach ($st as $r) {
        $out[] = ['cle' => $r['cle'], 'libelle' => $r['libelle'],
                  'url' => ILLU_URL . $r['fichier'],
                  'largeur' => (int) $r['largeur'], 'hauteur' => (int) $r['hauteur'],
                  'octets' => (int) $r['octets'], 'cree_le' => $r['cree_le']];
    }
    return $out;
}
