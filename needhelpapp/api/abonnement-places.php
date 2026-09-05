<?php
/**
 * Partager son abonnement.
 *
 * Un abonnement paie un service, pas une personne. Une famille de cinq
 * n'a aucune raison de payer cinq fois pour que les enfants fassent
 * leurs dictées et que tout le monde tienne la même liste de courses.
 *
 * Le schéma le prévoyait depuis le début — `subscriptions.seats` et
 * `subscription_seats` — sans que rien ne s'en serve. C'est fait ici.
 *
 * Le mécanisme est déjà branché partout : `nha_entitlement()` lit les
 * places, donc ajouter quelqu'un lui ouvre aussitôt teaching, familyshop
 * et les applications à venir, sans une ligne de plus.
 */

declare(strict_types=1);
require __DIR__ . '/../includes/http.php';

exiger_post();
csrf_verifier();

$compte = nha_current_account();
if (!$compte) {
    json_erreur('Non connecté.', 401);
}

$d = json_corps();
$quoi = champ($d, 'action', 16);

/** L'abonnement dont ce compte est le payeur, ou null. */
function abonnementPaye(int $payeur): ?array {
    $st = nha_db()->prepare(
        'SELECT * FROM subscriptions
         WHERE payer_account_id = ? AND status IN (\'actif\', \'essai\')
         ORDER BY current_period_end DESC LIMIT 1'
    );
    $st->execute([$payeur]);
    $s = $st->fetch();
    return $s ?: null;
}

/** Les places occupées, payeur compris. */
function placesDe(int $abonnement): array {
    $st = nha_db()->prepare(
        'SELECT a.id, a.email, a.name, seat.added_at
         FROM subscription_seats seat JOIN accounts a ON a.id = seat.account_id
         WHERE seat.subscription_id = ? AND seat.removed_at IS NULL
         ORDER BY seat.added_at'
    );
    $st->execute([$abonnement]);
    return array_map(static function (array $r): array {
        return ['id' => (int) $r['id'], 'email' => $r['email'],
                'nom' => $r['name'] ?: explode('@', (string) $r['email'])[0],
                'depuis' => $r['added_at']];
    }, $st->fetchAll());
}

$abo = abonnementPaye((int) $compte['id']);
if (!$abo) {
    json_erreur('Vous n\'avez pas d\'abonnement à partager. '
              . 'Seul celui qui paie peut ajouter des proches.', 403);
}
$places = (int) ($abo['seats'] ?? 1);
$occupees = placesDe((int) $abo['id']);

/* ---------------------------------------------------------------
   Lire
   --------------------------------------------------------------- */
if ($quoi === 'lire' || $quoi === '') {
    json_ok(['places' => $places, 'occupees' => count($occupees), 'membres' => $occupees]);
}

/* ---------------------------------------------------------------
   Ajouter quelqu'un
   --------------------------------------------------------------- */
if ($quoi === 'ajouter') {
    $email = nha_normalise_email(champ($d, 'email', 190));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_erreur('Cette adresse e-mail n\'est pas valide.', 400);
    }
    if (count($occupees) >= $places) {
        json_erreur('Toutes les places sont prises (' . $places . '). '
                  . 'Retirez quelqu\'un, ou passez à une formule plus large.', 409);
    }

    /* Le compte doit exister. On ne crée pas un compte au nom de
       quelqu'un d'autre : il choisira lui-même son mot de passe, et
       saura qu'il a un compte. */
    $st = nha_db()->prepare('SELECT id, name FROM accounts WHERE email = ? AND deleted_at IS NULL');
    $st->execute([$email]);
    $cible = $st->fetch();
    if (!$cible) {
        json_erreur('Personne n\'a de compte avec cette adresse. '
                  . 'Demandez-lui d\'en créer un sur needhelpapp.com, '
                  . 'puis revenez l\'ajouter.', 404);
    }
    $cibleId = (int) $cible['id'];

    foreach ($occupees as $m) {
        if ($m['id'] === $cibleId) {
            json_erreur('Cette personne a déjà une place.', 409);
        }
    }

    /* Quelqu'un qui paie déjà son propre abonnement ne doit pas se voir
       ajouter en silence : il continuerait de payer pour rien. */
    if (abonnementPaye($cibleId) !== null) {
        json_erreur('Cette personne paie déjà son propre abonnement. '
                  . 'Elle doit le résilier avant de rejoindre le vôtre, '
                  . 'sans quoi elle paierait deux fois.', 409);
    }

    // une place rendue puis reprise : on la réveille plutôt que d'en créer une
    $st = nha_db()->prepare(
        'SELECT 1 FROM subscription_seats WHERE subscription_id = ? AND account_id = ?'
    );
    $st->execute([(int) $abo['id'], $cibleId]);
    if ($st->fetch()) {
        nha_db()->prepare(
            'UPDATE subscription_seats SET removed_at = NULL, added_at = NOW()
             WHERE subscription_id = ? AND account_id = ?'
        )->execute([(int) $abo['id'], $cibleId]);
    } else {
        nha_db()->prepare(
            'INSERT INTO subscription_seats (subscription_id, account_id, added_at)
             VALUES (?, ?, NOW())'
        )->execute([(int) $abo['id'], $cibleId]);
    }

    /* Le cache des droits doit suivre tout de suite : sans cela, la
       personne resterait « non abonnée » aux yeux des applications
       jusqu'au prochain paiement. */
    nha_refresh_cache($cibleId);
    nha_log((int) $compte['id'], 'seat_added', $email);

    $nom = $cible['name'] ?: explode('@', $email)[0];
    nha_mail($email,
        'Vous avez accès à NeedHelpApp',
        ($compte['name'] ?: 'Quelqu\'un') . " vous a ajouté à son abonnement NeedHelpApp.\n\n"
      . "Toutes les applications vous sont ouvertes avec votre compte habituel :\n"
      . "l'apprentissage scolaire, les courses en famille, et celles à venir.\n\n"
      . "Rien à faire de votre côté : connectez-vous comme d'habitude sur\n"
      . "https://needhelpapp.com\n\n"
      . "Si vous ne connaissez pas la personne qui vous a ajouté, écrivez-nous.\n");

    json_ok(['message' => $nom . ' a désormais accès à toutes les applications.',
             'membres' => placesDe((int) $abo['id']),
             'places' => $places]);
}

/* ---------------------------------------------------------------
   Retirer quelqu'un
   --------------------------------------------------------------- */
if ($quoi === 'retirer') {
    $cibleId = (int) ($d['compte'] ?? 0);
    if ($cibleId === (int) $compte['id']) {
        json_erreur('Vous ne pouvez pas retirer votre propre place : '
                  . 'c\'est vous qui payez. Résiliez l\'abonnement si vous '
                  . 'voulez y mettre fin.', 409);
    }

    /* On ne supprime pas la ligne, on la date : savoir qui a eu accès et
       quand est utile en cas de litige, et cela permet de rendre la place
       à quelqu'un sans repartir de zéro. */
    nha_db()->prepare(
        'UPDATE subscription_seats SET removed_at = NOW()
         WHERE subscription_id = ? AND account_id = ? AND removed_at IS NULL'
    )->execute([(int) $abo['id'], $cibleId]);

    nha_refresh_cache($cibleId);
    nha_log((int) $compte['id'], 'seat_removed', (string) $cibleId);

    json_ok(['message' => 'La place a été rendue.',
             'membres' => placesDe((int) $abo['id']),
             'places' => $places]);
}

json_erreur('Action inconnue.', 400);
