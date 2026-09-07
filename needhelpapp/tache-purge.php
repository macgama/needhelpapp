<?php
/**
 * Purge périodique de la base centrale.
 *
 * api/supprimer.php neutralise un compte immédiatement — adresse
 * remplacée, prénom et mot de passe effacés, sessions fermées, identités
 * Google rompues — puis renvoie ici pour l'effacement définitif. Sans ce
 * script, la politique de confidentialité promettait une purge que rien
 * n'exécutait.
 *
 * Deux façons de le lancer, selon ce que permet votre hébergement :
 *
 *   En ligne de commande, une fois par nuit (recommandé) :
 *       php /chemin/vers/le/site/tache-purge.php
 *
 *   Par appel HTTP, si le planificateur ne sait qu'ouvrir une adresse :
 *       https://needhelpapp.com/tache-purge.php?jeton=…
 *   avec le 'purge_jeton' de config/nha.php. Vide, l'accès HTTP est
 *   refusé ; la ligne de commande, elle, continue de fonctionner.
 *
 * Ajoutez --simulation (ou &simulation=1) pour voir ce qui serait
 * supprimé sans rien supprimer. À faire au premier lancement : les
 * premiers chiffres d'une purge sont toujours les plus gros, et il vaut
 * mieux les regarder avant qu'après.
 *
 * Chez Infomaniak : Manager → votre site → Tâches planifiées.
 */

declare(strict_types=1);
require_once __DIR__ . '/includes/nha-core.php';

/* ---------------------------------------------------------------
   Les durées de conservation

   Elles sont écrites ici, en un seul endroit, et reprises telles
   quelles dans le tableau de confidentialite.php. Si vous en changez
   une, changez aussi la page : une durée annoncée que le code ne tient
   pas est pire que pas de durée du tout.
   --------------------------------------------------------------- */
const PURGE_COMPTES_JOURS      = 30;   // après la suppression demandée
const PURGE_JETONS_JOURS       = 7;    // après expiration du lien
const PURGE_TENTATIVES_MOIS    = 12;
const PURGE_JOURNAL_MOIS       = 12;
const PURGE_MESSAGES_MOIS      = 24;   // contact et idées
const PURGE_PAYLOAD_JOURS      = 90;   // le corps brut des notifications Stripe
const PURGE_FACTURATION_ANNEES = 10;   // durée légale de conservation

$cli = PHP_SAPI === 'cli';

/* ---------------------------------------------------------------
   Qui a le droit de lancer la purge

   En ligne de commande, personne d'autre que vous n'y accède : le
   planificateur suffit. Par HTTP, il faut un jeton — ce script écrit
   dans la base, et un inconnu qui l'appellerait en boucle ferait
   travailler le serveur pour rien.

   'purge_jeton' est volontairement distinct de 'diagnostic_jeton' :
   celui-ci doit être vidé une fois la mise en ligne stabilisée, alors
   que la purge, elle, tourne pour toujours.
   --------------------------------------------------------------- */
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    $attendu = (string) nha_config('purge_jeton', '');
    if ($attendu === '' || !hash_equals($attendu, (string) ($_GET['jeton'] ?? ''))) {
        http_response_code(404);
        exit("Introuvable.\n");
    }
}

$simulation = $cli
    ? in_array('--simulation', $argv ?? [], true)
    : !empty($_GET['simulation']);

$db = nha_db();

function dire(string $texte = ''): void { echo $texte . "\n"; }

/* str_pad() compte des octets, pas des caractères : « évènements »
   en pèse trois de plus qu'il n'en affiche, et la colonne de droite
   partait en escalier. On aligne sur la longueur réelle. */
function caler(string $texte, int $largeur): string {
    $manque = $largeur - mb_strlen($texte, 'UTF-8');
    return $manque > 0 ? $texte . str_repeat(' ', $manque) : $texte;
}

function compte_ligne(string $libelle, int $n, string $precision = ''): void {
    dire(caler('', 8 - mb_strlen($t = ($n === 0 ? '—' : (string) $n), 'UTF-8')) . $t
       . '  ' . caler($libelle, 42) . $precision);
}

/**
 * Efface — ou compte, en simulation — les lignes visées par une clause.
 *
 * Le SELECT et le DELETE partagent exactement la même clause : une
 * simulation qui interrogerait autre chose que ce que la purge efface ne
 * servirait à rien.
 */
function purger(string $table, string $clause, array $params = []): int {
    global $db, $simulation;
    if ($simulation) {
        $st = $db->prepare("SELECT COUNT(*) FROM `$table` WHERE $clause");
        $st->execute($params);
        return (int) $st->fetchColumn();
    }
    $st = $db->prepare("DELETE FROM `$table` WHERE $clause");
    $st->execute($params);
    return $st->rowCount();
}

dire('Purge de la base centrale NeedHelpApp');
dire(str_repeat('=', 68));
dire('Moment : ' . date('d.m.Y H:i:s'));
dire('Mode   : ' . ($simulation ? 'SIMULATION — rien ne sera supprimé' : 'réel'));
dire();

$total = 0;

/* ===============================================================
   1. Les comptes supprimés

   Le délai de trente jours n'est pas une précaution administrative :
   il laisse le temps de traiter un litige de facturation ou de
   rattraper une suppression demandée par erreur.

   Un compte qui a payé ne peut pas disparaître entièrement — la
   contrainte de clé étrangère emporterait ses abonnements avec lui,
   et le droit suisse exige de conserver les pièces comptables dix
   ans. Sa ligne reste donc, mais vidée de tout ce qui désigne une
   personne : c'est une écriture comptable anonyme, plus un compte.
   =============================================================== */
dire('1. Les comptes supprimés depuis plus de ' . PURGE_COMPTES_JOURS . ' jours');
dire(str_repeat('-', 68));

/* « deja_anonyme » évite que la coquille comptable soit reprise chaque
   nuit : sans lui, le compte d'un ancien payeur restait candidat pour
   toujours, la purge le réécrivait à l'identique, et le rapport affichait
   une ligne traitée tous les jours — de quoi ne plus jamais remarquer un
   vrai évènement. api/supprimer.php ne vide pas last_login_at ni
   email_verified_at : un compte supprimé par ses soins passe donc bien
   une fois ici, puis plus jamais. */
$st = $db->prepare(
    'SELECT a.id,
            (SELECT COUNT(*) FROM subscriptions s WHERE s.payer_account_id = a.id) AS paye,
            (a.name IS NULL AND a.password_hash IS NULL
             AND a.last_login_at IS NULL AND a.email_verified_at IS NULL
             AND a.email = CONCAT("supprime+", a.id, "@needhelpapp.invalid")) AS deja_anonyme
     FROM accounts a
     WHERE a.deleted_at IS NOT NULL
       AND a.deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)'
);
$st->execute([PURGE_COMPTES_JOURS]);
$candidats = $st->fetchAll();

$effaces = 0;
$conserves = 0;

foreach ($candidats as $c) {
    $id = (int) $c['id'];

    // Déjà réduite à une écriture anonyme lors d'un passage précédent :
    // il n'y a plus rien à lui faire.
    if ((int) $c['paye'] > 0 && (int) $c['deja_anonyme'] === 1) { continue; }

    if ($simulation) {
        if ((int) $c['paye'] > 0) { $conserves++; } else { $effaces++; }
        continue;
    }
    try {
        $db->beginTransaction();

        /* Le journal ne porte pas de contrainte vers accounts : sans
           cette ligne, ses évènements garderaient un identifiant qui ne
           désigne plus rien, et la suppression serait incomplète. On
           garde l'évènement — il dit que le service a fonctionné — mais
           plus à qui il se rapportait. */
        $db->prepare('UPDATE audit_log SET account_id = NULL WHERE account_id = ?')->execute([$id]);

        if ((int) $c['paye'] > 0) {
            /* La coquille comptable. Ces champs ont normalement déjà été
               vidés par api/supprimer.php ; on repasse dessus au cas où
               la suppression daterait d'une version antérieure. */
            $db->prepare(
                'UPDATE accounts
                    SET email = CONCAT("supprime+", id, "@needhelpapp.invalid"),
                        name = NULL, password_hash = NULL, last_login_at = NULL,
                        email_verified_at = NULL
                  WHERE id = ?'
            )->execute([$id]);
            $conserves++;
        } else {
            // Les contraintes ON DELETE CASCADE emportent identités,
            // sessions, jetons, rattachements et places.
            $db->prepare('DELETE FROM accounts WHERE id = ?')->execute([$id]);
            $effaces++;
        }

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) { $db->rollBack(); }
        dire('  ÉCHEC sur le compte ' . $id . ' : ' . $e->getMessage());
    }
}

compte_ligne('comptes effacés définitivement', $effaces);
compte_ligne('comptes réduits à une écriture anonyme', $conserves,
             $conserves > 0 ? 'ont payé : pièces comptables à conserver' : '');
$total += $effaces + $conserves;
dire();

/* ===============================================================
   2. Ce qui a simplement expiré
   =============================================================== */
dire('2. Ce qui a expiré');
dire(str_repeat('-', 68));

$n = purger('sessions', 'expires_at < NOW()');
compte_ligne('sessions expirées', $n);
$total += $n;

/* Une semaine de battement après l'expiration : c'est le délai pendant
   lequel quelqu'un écrit « mon lien de réinitialisation ne marche pas »,
   et pendant lequel on veut encore pouvoir lui répondre pourquoi. */
$n = purger('action_tokens', 'expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [PURGE_JETONS_JOURS]);
compte_ligne('jetons de vérification et de mot de passe', $n);
$total += $n;
dire();

/* ===============================================================
   3. Les traces datées

   Toutes portent une adresse IP. C'est ce qui rend leur péremption
   nécessaire : passé le délai où elles servent à protéger les comptes,
   elles ne sont plus qu'une collection d'adresses.
   =============================================================== */
dire('3. Les traces');
dire(str_repeat('-', 68));

$n = purger('login_attempts', 'attempted_at < DATE_SUB(NOW(), INTERVAL ? MONTH)', [PURGE_TENTATIVES_MOIS]);
compte_ligne('tentatives de connexion', $n, '> ' . PURGE_TENTATIVES_MOIS . ' mois');
$total += $n;

$n = purger('audit_log', 'created_at < DATE_SUB(NOW(), INTERVAL ? MONTH)', [PURGE_JOURNAL_MOIS]);
compte_ligne('évènements du journal', $n, '> ' . PURGE_JOURNAL_MOIS . ' mois');
$total += $n;

$n = purger('ideas', 'created_at < DATE_SUB(NOW(), INTERVAL ? MONTH)', [PURGE_MESSAGES_MOIS]);
compte_ligne('messages de contact et idées', $n, '> ' . PURGE_MESSAGES_MOIS . ' mois');
$total += $n;
dire();

/* ===============================================================
   4. La facturation

   Le corps brut d'une notification Stripe contient le nom, l'adresse
   et parfois le pays du payeur. Rien ne le relit — l'administration
   n'affiche que le type de l'évènement, ses dates et son erreur
   éventuelle : il n'est gardé que pour comprendre un webhook qui a
   mal tourné. Passé trois mois, il n'explique plus rien et ne fait
   que conserver des données personnelles.

   Les colonnes qui restent — type, dates, erreur — sont la trace
   comptable proprement dite. Elles vivent dix ans.
   =============================================================== */
dire('4. La facturation');
dire(str_repeat('-', 68));

if ($simulation) {
    $st = $db->prepare(
        'SELECT COUNT(*) FROM billing_events
         WHERE payload IS NOT NULL AND received_at < DATE_SUB(NOW(), INTERVAL ? DAY)'
    );
    $st->execute([PURGE_PAYLOAD_JOURS]);
    $n = (int) $st->fetchColumn();
} else {
    $st = $db->prepare(
        'UPDATE billing_events SET payload = NULL
         WHERE payload IS NOT NULL AND received_at < DATE_SUB(NOW(), INTERVAL ? DAY)'
    );
    $st->execute([PURGE_PAYLOAD_JOURS]);
    $n = $st->rowCount();
}
compte_ligne('notifications vidées de leur corps', $n, '> ' . PURGE_PAYLOAD_JOURS . ' jours');
$total += $n;

$n = purger('billing_events', 'received_at < DATE_SUB(NOW(), INTERVAL ? YEAR)', [PURGE_FACTURATION_ANNEES]);
compte_ligne('évènements de facturation effacés', $n, '> ' . PURGE_FACTURATION_ANNEES . ' ans');
$total += $n;
dire();

/* ===============================================================
   Le mot de la fin
   =============================================================== */
dire(str_repeat('=', 68));
if ($simulation) {
    dire($total . ' ligne(s) seraient touchées. Relancez sans --simulation pour agir.');
} else {
    dire($total . ' ligne(s) traitées.');
    // Une purge qui ne laisse aucune trace ne se vérifie pas : le
    // journal de l'administration doit pouvoir dire quand elle a tourné.
    nha_log(null, 'purge', $total . ' ligne(s), dont ' . $effaces . ' compte(s) effacé(s)');
}
dire();
