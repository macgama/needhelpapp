<?php
/**
 * Le coffre : chiffrement des colonnes sensibles de 6l3nq9_budget.
 *
 * CE QUE CELA PROTÈGE, ET CE QUE CELA NE PROTÈGE PAS
 *
 * La clé ne vit pas dans la base. Elle est dans api/config.php, que le
 * serveur ne sert jamais, et de préférence au-dessus de la racine web.
 * Un dump SQL qui fuit — sauvegarde égarée, phpMyAdmin laissé ouvert,
 * injection qui lit une table — ne rend donc ni les montants, ni les
 * libellés, ni les conditions d'un emprunt.
 *
 * En revanche, quelqu'un qui obtient un accès complet au serveur obtient
 * aussi la clé. Nous l'écrivons noir sur blanc aux utilisateurs plutôt
 * que de laisser croire à une inviolabilité que ce chiffrement ne donne
 * pas. Le seul modèle qui résisterait à cela — la clé dérivée d'une
 * phrase de passe qui ne quitte jamais le navigateur — a été écarté en
 * connaissance de cause : une phrase oubliée y signifie la perte
 * définitive de tout l'historique, sans recours possible.
 *
 * AES-256-GCM. GCM et non CBC parce qu'il authentifie : une valeur
 * modifiée dans la base ne se déchiffre pas silencieusement en autre
 * chose, elle lève une exception.
 *
 * FORMAT D'UN PAQUET
 *
 *     [version 1 octet][iv 12 octets][tag 16 octets][chiffré]
 *
 * L'octet de version dit avec quelle clé le paquet a été fabriqué. Sans
 * lui, changer de clé obligerait à tout redéchiffrer d'un seul coup,
 * donc en pratique à ne jamais en changer.
 *
 * LES DONNÉES ASSOCIÉES
 *
 * Chaque paquet est lié à sa colonne et à son livre. Sans cela,
 * quelqu'un qui écrit dans la base pourrait recopier le montant chiffré
 * d'un livre dans un autre, ou le capital d'un emprunt dans le solde
 * d'un compte : il ne saurait toujours pas ce que vaut la valeur, mais
 * il fausserait les comptes de quelqu'un. Le déchiffrement échoue si le
 * paquet n'est pas lu là où il a été écrit.
 */

declare(strict_types=1);

const COFFRE_IV      = 12;   // taille recommandée pour GCM
const COFFRE_TAG     = 16;
const COFFRE_ALGO    = 'aes-256-gcm';
const COFFRE_ENTETE  = 1 + COFFRE_IV + COFFRE_TAG;

/**
 * Les clés déclarées, par numéro de version.
 *
 * config.php porte 'coffre_cles' => [1 => 'base64…', 2 => 'base64…'] et
 * 'coffre_cle_active' => 2. On chiffre toujours avec l'active, on
 * déchiffre avec celle que le paquet réclame.
 */
function coffre_cles(): array {
    static $cles = null;
    if ($cles !== null) { return $cles; }

    $brutes = config()['coffre_cles'] ?? [];
    if (!is_array($brutes) || $brutes === []) {
        throw new RuntimeException(
            "Aucune clé de chiffrement dans api/config.php. Sans elle, budget "
            . "refuse de démarrer : écrire des montants en clair dans une base "
            . "prévue pour les recevoir chiffrés serait pire que de s'arrêter."
        );
    }

    $cles = [];
    foreach ($brutes as $version => $b64) {
        $brute = base64_decode((string) $b64, true);
        if ($brute === false || strlen($brute) !== 32) {
            throw new RuntimeException(
                "La clé de chiffrement n° $version ne fait pas 32 octets une fois "
                . "décodée. Produisez-en une correcte : "
                . "php -r \"echo base64_encode(random_bytes(32));\""
            );
        }
        $cles[(int) $version] = $brute;
    }
    return $cles;
}

function coffre_version_active(): int {
    $v = (int) (config()['coffre_cle_active'] ?? 0);
    if ($v <= 0 || $v > 255) {
        // Une seule clé déclarée et pas de version active : on prend la
        // seule qui existe plutôt que d'exiger un réglage de plus.
        $cles = coffre_cles();
        if (count($cles) === 1) { return (int) array_key_first($cles); }
        throw new RuntimeException(
            "'coffre_cle_active' doit désigner la clé avec laquelle chiffrer "
            . "les nouvelles valeurs (1 à 255)."
        );
    }
    return $v;
}

/**
 * Les données associées d'une colonne.
 *
 * Le livre en fait partie : c'est ce qui empêche de déplacer une valeur
 * chiffrée d'un ménage à un autre.
 */
function coffre_aad(string $colonne, int $livreId): string {
    return $colonne . '|livre=' . $livreId;
}

/**
 * Chiffre une valeur. NULL reste NULL : une note absente n'a pas à
 * ressembler à une note vide chiffrée, et l'inverse non plus.
 */
function chiffrer(?string $clair, string $aad): ?string {
    if ($clair === null) { return null; }

    $version = coffre_version_active();
    $cles = coffre_cles();
    if (!isset($cles[$version])) {
        throw new RuntimeException("La clé active n° $version n'est pas déclarée.");
    }

    $iv  = random_bytes(COFFRE_IV);
    $tag = '';
    $chiffre = openssl_encrypt($clair, COFFRE_ALGO, $cles[$version],
                               OPENSSL_RAW_DATA, $iv, $tag, $aad, COFFRE_TAG);
    if ($chiffre === false) {
        throw new RuntimeException('Le chiffrement a échoué : ' . openssl_error_string());
    }
    return chr($version) . $iv . $tag . $chiffre;
}

/**
 * Déchiffre un paquet.
 *
 * Un échec lève une exception au lieu de rendre NULL. C'est délibéré :
 * une valeur illisible est soit une clé perdue, soit une base modifiée,
 * et les deux méritent qu'on s'arrête plutôt que d'afficher un budget
 * silencieusement amputé de ses lignes abîmées.
 */
function dechiffrer(?string $paquet, string $aad): ?string {
    if ($paquet === null || $paquet === '') { return null; }
    if (strlen($paquet) < COFFRE_ENTETE) {
        throw new RuntimeException('Paquet chiffré tronqué (' . strlen($paquet) . ' octets).');
    }

    $version = ord($paquet[0]);
    $cles = coffre_cles();
    if (!isset($cles[$version])) {
        throw new RuntimeException(
            "Cette donnée a été chiffrée avec la clé n° $version, qui n'est plus "
            . "déclarée dans api/config.php. Ne retirez jamais une clé tant qu'une "
            . "seule ligne s'y réfère encore."
        );
    }

    $iv      = substr($paquet, 1, COFFRE_IV);
    $tag     = substr($paquet, 1 + COFFRE_IV, COFFRE_TAG);
    $chiffre = substr($paquet, COFFRE_ENTETE);

    $clair = openssl_decrypt($chiffre, COFFRE_ALGO, $cles[$version],
                             OPENSSL_RAW_DATA, $iv, $tag, $aad);
    if ($clair === false) {
        throw new RuntimeException(
            'Déchiffrement refusé : mauvaise clé, ou donnée modifiée depuis son '
            . 'écriture. Le contenu n\'est pas restitué.'
        );
    }
    return $clair;
}

/* =================================================================
   L'argent

   Toujours des centimes, toujours des entiers. Un budget tenu en
   flottants finit par afficher 0.30000000000000004, et un total qui
   ne tombe pas juste ruine la confiance dans tout le reste.
   ================================================================= */

/** Rend des centimes à partir de ce que saisit un humain : "1'234.50", "1234,5". */
function centimes(string|int|float $saisie): int {
    if (is_int($saisie)) { return $saisie * 100; }
    $t = str_replace([' ', "'", ' ', ','], ['', '', '', '.'], (string) $saisie);
    if ($t === '' || !is_numeric($t)) {
        throw new InvalidArgumentException('Montant illisible : ' . $saisie);
    }
    // Le passage par une chaîne évite l'erreur de représentation :
    // (int) round(19.99 * 100) vaut 1998 sur certaines plateformes.
    return (int) round((float) $t * 100);
}

/** Affiche des centimes : 123456 devient "1234.56". */
function francs(int $centimes): string {
    $signe = $centimes < 0 ? '-' : '';
    $abs = abs($centimes);
    return $signe . intdiv($abs, 100) . '.' . str_pad((string) ($abs % 100), 2, '0', STR_PAD_LEFT);
}

function chiffrer_montant(?int $centimes, string $aad): ?string {
    return $centimes === null ? null : chiffrer((string) $centimes, $aad);
}

function dechiffrer_montant(?string $paquet, string $aad): ?int {
    $clair = dechiffrer($paquet, $aad);
    return $clair === null ? null : (int) $clair;
}
