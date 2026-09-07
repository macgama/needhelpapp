<?php
/**
 * Le calcul des échéanciers d'emprunt et d'hypothèque.
 *
 * Aucune base de données ici, aucune session, aucun état : des entrées,
 * des sorties, et rien d'autre. C'est délibéré — c'est le morceau où les
 * erreurs se cachent le mieux, parce qu'un échéancier faux reste
 * plausible pendant des années et ne se contredit qu'à la dernière
 * échéance. Une fonction pure s'éprouve ligne à ligne contre un calcul
 * fait à la main.
 *
 * TOUT EN CENTIMES, TOUT EN ENTIERS
 *
 * Les montants sont des entiers de centimes, le taux un entier de points
 * de base (1.50 % s'écrit 150). Un taux gardé en flottant vaut
 * 1.4899999999 au bout de trois multiplications, et l'écart se voit à la
 * fin de l'échéancier, quand il est trop tard.
 *
 * L'INVARIANT
 *
 * Pour tout emprunt qui s'amortit : la somme des parts de capital vaut
 * exactement le capital emprunté, et le solde après la dernière échéance
 * vaut zéro. Les arrondis se rattrapent sur la dernière ligne — c'est ce
 * que font les banques, qui parlent d'« échéance d'ajustement ».
 *
 * LES CINQ MODES
 *
 * Trois sont universels, deux sont là parce que nous sommes en Suisse.
 *
 *   annuites  Mensualité constante. La part d'intérêt décroît, celle de
 *             capital croît. Prêt personnel, leasing, crédit.
 *
 *   constant  Amortissement constant : la même part de capital à chaque
 *             fois, donc une mensualité qui BAISSE dans le temps.
 *
 *   direct    Hypothèque à amortissement direct. La dette diminue
 *             réellement ; les intérêts suivent le solde.
 *
 *   indirect  Hypothèque à amortissement indirect, propre à la Suisse.
 *             LE CAPITAL NE BAISSE PAS. On ne verse que les intérêts à
 *             la banque, et l'amortissement va sur un 3e pilier nanti
 *             qui remboursera le capital à l'échéance. L'intérêt reste
 *             donc constant, et la déduction fiscale est maintenue.
 *
 *             C'est le mode qu'un outil étranger modélise mal, et il
 *             n'est pas cosmétique : traiter l'indirect comme du direct
 *             ferait décroître une dette qui ne décroît pas, et ferait
 *             disparaître du patrimoine un 3e pilier qui est un ACTIF.
 *             Le ménage se croirait deux fois plus riche qu'il n'est.
 *             Le versement au 3a ne figure donc PAS dans l'échéancier :
 *             il est rendu à part, à créer comme un virement vers le
 *             compte de prévoyance.
 *
 *   infine    Intérêts seuls, capital remboursé en une fois à la fin.
 */

declare(strict_types=1);

const AMORT_MAX_ECHEANCES = 1200;   // cent ans de mensualités : au-delà, c'est une erreur de saisie

/** Nombre de mois que couvre une échéance. */
function amort_mois_par_periode(string $periodicite): int {
    return match ($periodicite) {
        'mensuel'     => 1,
        'trimestriel' => 3,
        'semestriel'  => 6,
        'annuel'      => 12,
        default => throw new InvalidArgumentException('Périodicité inconnue : ' . $periodicite),
    };
}

/**
 * Ajoute des mois à une date sans déborder sur le mois suivant.
 *
 * PHP répond au 3 mars quand on ajoute un mois au 31 janvier. Une
 * échéance au 31 se paie le 28 ou le 30, pas le 3 du mois d'après : on
 * rabat sur le dernier jour du mois visé.
 */
function amort_ajouter_mois(DateTimeImmutable $depart, int $mois): DateTimeImmutable {
    $jourVoulu = (int) $depart->format('j');
    $cible = $depart->modify('first day of this month')->modify(sprintf('%+d month', $mois));
    $dernier = (int) $cible->format('t');
    return $cible->setDate(
        (int) $cible->format('Y'),
        (int) $cible->format('n'),
        min($jourVoulu, $dernier)
    );
}

/** Nombre de mois entiers entre deux dates. */
function amort_mois_entre(DateTimeImmutable $a, DateTimeImmutable $b): int {
    $d = $a->diff($b);
    return $d->y * 12 + $d->m + ($d->d > 0 ? 1 : 0);
}

/**
 * Construit l'échéancier complet.
 *
 * @param array $pret  capital (centimes), taux (points de base), mode,
 *                     periodicite, debut (AAAA-MM-JJ), et l'un de
 *                     duree_mois ou echeance. amortissement_periodique
 *                     (centimes) sert aux modes 'direct' et 'indirect'.
 * @return array{mode:string,periodes:int,taux_periodique:float,
 *               total_interets:int,total_capital:int,total_verse:int,
 *               versement_amortissement:?int,lignes:list<array>}
 */
function echeancier(array $pret): array {
    $capital = (int) ($pret['capital'] ?? 0);
    if ($capital <= 0) {
        throw new InvalidArgumentException('Le capital emprunté doit être positif.');
    }
    $tauxBp = (int) ($pret['taux'] ?? 0);
    if ($tauxBp < 0 || $tauxBp > 100000) {
        throw new InvalidArgumentException('Taux hors de toute vraisemblance : ' . $tauxBp . ' points de base.');
    }

    $mode = (string) ($pret['mode'] ?? 'annuites');
    $moisParPeriode = amort_mois_par_periode((string) ($pret['periodicite'] ?? 'mensuel'));
    $debut = new DateTimeImmutable((string) ($pret['debut'] ?? 'today'));

    /* Combien d'échéances. La durée l'emporte sur la date d'échéance :
       elle est plus précise, et c'est elle que porte un contrat. */
    if (!empty($pret['duree_mois'])) {
        $totalMois = (int) $pret['duree_mois'];
    } elseif (!empty($pret['echeance'])) {
        $totalMois = amort_mois_entre($debut, new DateTimeImmutable((string) $pret['echeance']));
    } else {
        throw new InvalidArgumentException(
            'Il faut une durée ou une date d\'échéance : sans l\'une des deux, '
            . 'un échéancier n\'a pas de fin.'
        );
    }
    $n = (int) ceil($totalMois / $moisParPeriode);
    if ($n < 1) {
        throw new InvalidArgumentException('La durée est trop courte pour une seule échéance.');
    }
    if ($n > AMORT_MAX_ECHEANCES) {
        throw new InvalidArgumentException(
            "Cet emprunt produirait $n échéances. Vérifiez la durée : "
            . 'au-delà de ' . AMORT_MAX_ECHEANCES . ', c\'est une erreur de saisie.'
        );
    }

    // Taux de la période. 1.50 % l'an, payé trimestriellement, fait
    // 0.375 % par échéance.
    $periodesParAn = 12 / $moisParPeriode;
    $i = ($tauxBp / 10000) / $periodesParAn;

    $amortPeriodique = isset($pret['amortissement_periodique'])
        ? (int) $pret['amortissement_periodique'] : null;

    $lignes = [];
    $restant = $capital;
    $totalInterets = 0;
    $versementAmortissement = null;

    /* --- La mensualité constante, pour le mode 'annuites' ---
       A = C · i / (1 − (1+i)^−n). À taux nul la formule divise par
       zéro : le capital se partage alors simplement en n. */
    $annuite = 0;
    if ($mode === 'annuites') {
        $annuite = $i > 0
            ? (int) round($capital * $i / (1 - (1 + $i) ** (-$n)))
            : (int) round($capital / $n);
    }

    for ($k = 1; $k <= $n; $k++) {
        $derniere = ($k === $n);
        $interet = (int) round($restant * $i);

        switch ($mode) {
            case 'annuites':
                $partCapital = $derniere ? $restant : $annuite - $interet;
                break;

            case 'constant':
            case 'direct':
                if ($mode === 'direct' && $amortPeriodique !== null && $amortPeriodique > 0) {
                    // Amortissement contractuel fixe : on rembourse ce
                    // montant tant qu'il reste de la dette.
                    $partCapital = min($amortPeriodique, $restant);
                } else {
                    /* On répartit par différence de cumuls plutôt que
                       par division : les centimes perdus à l'arrondi se
                       redistribuent au fil des échéances au lieu de
                       s'entasser sur la dernière. */
                    $partCapital = (int) round($capital * $k / $n) - (int) round($capital * ($k - 1) / $n);
                }
                if ($derniere) { $partCapital = $restant; }
                break;

            case 'indirect':
                // Le capital ne bouge pas : c'est toute la différence.
                $partCapital = 0;
                $versementAmortissement = $amortPeriodique;
                break;

            case 'infine':
                $partCapital = $derniere ? $restant : 0;
                break;

            default:
                throw new InvalidArgumentException('Mode d\'amortissement inconnu : ' . $mode);
        }

        // Garde-fou : jamais plus que ce qui reste dû.
        if ($partCapital > $restant) { $partCapital = $restant; }
        if ($partCapital < 0)        { $partCapital = 0; }

        $restant -= $partCapital;
        $totalInterets += $interet;

        $lignes[] = [
            'numero'  => $k,
            'jour'    => amort_ajouter_mois($debut, $k * $moisParPeriode)->format('Y-m-d'),
            'montant' => $interet + $partCapital,
            'interet' => $interet,
            'capital' => $partCapital,
            'restant' => $restant,
        ];

        /* Un amortissement contractuel peut solder la dette avant le
           terme prévu. Continuer produirait des échéances à zéro. */
        if ($restant === 0 && $mode === 'direct' && $amortPeriodique !== null && !$derniere) {
            break;
        }
    }

    $totalCapital = array_sum(array_column($lignes, 'capital'));

    return [
        'mode'            => $mode,
        'periodes'        => count($lignes),
        'taux_periodique' => $i,
        'total_interets'  => $totalInterets,
        'total_capital'   => $totalCapital,
        'total_verse'     => $totalInterets + $totalCapital,
        // Hors échéancier, et c'est voulu : ce versement ne va pas à la
        // banque mais sur le 3e pilier nanti, qui est un actif.
        'versement_amortissement' => $versementAmortissement,
        'lignes'          => $lignes,
    ];
}
