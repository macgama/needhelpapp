-- =====================================================================
-- Le catalogue des applications.
--
-- Toute application doit y figurer : l'accueil du portail lit cette
-- table, et sessions.created_app_id comme audit_log.app_id s'y réfèrent.
-- Ces deux colonnes acceptent NULL, donc une application manquante
-- n'empêche pas de se connecter — mais elle brouille le journal, où
-- l'on ne sait plus d'où venait la connexion.
--
-- « portail » manquait : c'est pourquoi toutes les lignes d'audit_log
-- portent un app_id vide.
-- =====================================================================

-- Le client doit annoncer l'encodage AVANT la première valeur accentuée.
-- Sans cette ligne, un client dont le jeu par défaut n'est pas utf8mb4 —
-- la ligne de commande en donne souvent latin1 — enregistre « ménage »
-- sous la forme doublement encodée « mÃ©nage », et la page d'accueil
-- l'affiche telle quelle. schema.sql la porte depuis toujours ; ce
-- fichier-ci ne l'avait pas, et le défaut est resté dormant tant qu'il
-- ne contenait aucun accent.
SET NAMES utf8mb4;
INSERT INTO apps (code, name, tagline, url, color, keywords, status, position) VALUES
  ('portail', 'Le portail', 'Un compte pour toutes les applications',
   'https://needhelpapp.com/', '#3B2F7F', 'compte connexion abonnement profil', 'en_ligne', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name), url = VALUES(url), status = VALUES(status);

-- ---------------------------------------------------------------
-- budget.needhelpapp.com
--
-- La ligne existait déjà en base, mais avec le gabarit laissé tel
-- quel : « Une phrase. » en accroche et « mots clés pour la recherche »
-- en mots-clés, le tout en statut « en ligne ». L'accueil du portail lit
-- ce catalogue et affichait donc une carte de démonstration pointant
-- vers un sous-domaine qui n'existe pas encore.
--
-- Deux différences avec la ligne du portail ci-dessus, et elles
-- comptent :
--
--   ON DUPLICATE KEY UPDATE reprend ici tagline, keywords et color.
--   Celui du portail ne touche que name, url et status : appliqué à
--   budget, il aurait laissé le texte de gabarit en place et ce fichier
--   n'aurait servi à rien.
--
--   status vaut 'construction'. Une application annoncée « en ligne »
--   qui n'existe pas envoie les visiteurs sur une erreur, et elle est
--   comptée dans le nombre d'applications ouvertes affiché en bannière.
--   Repassez-la en 'en_ligne' le jour de la mise en ligne, comme le
--   rappelle budget/LISEZ-MOI.md.
--
-- Le nom compte deux mots au moins : l'accueil met le dernier en
-- italique (titre_accentue() dans index.php), et un nom d'un seul mot
-- s'afficherait entièrement penché.
-- ---------------------------------------------------------------

INSERT INTO apps (code, name, tagline, url, color, keywords, status, position) VALUES
  ('budget', 'Les comptes du ménage',
   'Ce qui entre, ce qui sort, et ce que coûte vraiment un emprunt.',
   'https://budget.needhelpapp.com/', '#2B3A55',
   'budget comptes dépenses revenus épargne hypothèque emprunt crédit leasing amortissement intérêts patrimoine dettes ménage finances virement facture',
   'construction', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline),
                        url = VALUES(url), color = VALUES(color),
                        keywords = VALUES(keywords), status = VALUES(status);

-- ---------------------------------------------------------------
-- machines.needhelpapp.com
--
-- Quinze petits jeux en HTML, CSS et JavaScript. Aucune base, aucun
-- compte, aucun réseau : les records vivent dans le navigateur de
-- chacun. C'est, avec roadsecurity, la seule application entièrement
-- statique du dépôt — elle ne charge même pas le socle PHP.
--
-- Le nom compte trois mots, et ce n'est pas un hasard : titre_accentue()
-- dans index.php met le DERNIER en italique. « Machines », seul, se
-- serait affiché entièrement penché.
--
-- status vaut 'construction' tant que machines.needhelpapp.com n'existe
-- pas, pour la raison écrite plus haut à propos de budget : une
-- application annoncée « en ligne » qui n'existe pas envoie les
-- visiteurs sur une erreur, et se compte dans la bannière des
-- applications ouvertes. Passez-la en 'en_ligne' le jour où le
-- sous-domaine répond, c'est-à-dire quand CHEMIN_MACHINES est renseigné
-- et qu'un premier déploiement a eu lieu.
-- ---------------------------------------------------------------

INSERT INTO apps (code, name, tagline, url, color, keywords, status, position) VALUES
  ('machines', 'Les petites machines',
   'Quinze jeux qui tiennent dans un navigateur, sans compte et sans réseau.',
   'https://machines.needhelpapp.com/', '#2B565E',
   'jeux jeu machine arcade mot du jour anagrammes puzzle réflexe casse-tête mémoire logique vocabulaire calcul détente pause navigateur hors ligne sans compte',
   'construction', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline),
                        url = VALUES(url), color = VALUES(color),
                        keywords = VALUES(keywords), status = VALUES(status);

-- ---------------------------------------------------------------
-- L'ORDRE D'AFFICHAGE, ENFIN APPLIQUÉ.
--
-- Le commentaire ci-dessous proposait ces mises à jour depuis
-- longtemps, sans que personne ne les passe. Deux lignes partageaient la
-- position 2, deux autres la position 4, et deux lignes de même position
-- sortent dans un ordre arbitraire — donc dans un ordre qui pouvait
-- changer d'une requête à l'autre.
--
-- Elles sont ici plutôt que dans un fichier à part parce que ce
-- fichier-ci est rejouable : le catalogue déclaré, c'est lui.
-- Les applications ouvertes viennent en tête, les chantiers ensuite,
-- les idées en dernier.
-- ---------------------------------------------------------------

UPDATE apps SET position = 0 WHERE code = 'portail';
UPDATE apps SET position = 1 WHERE code = 'teaching';
UPDATE apps SET position = 2 WHERE code = 'familyshop';
UPDATE apps SET position = 3 WHERE code = 'budget';
UPDATE apps SET position = 4 WHERE code = 'sport';
UPDATE apps SET position = 5 WHERE code = 'machines';
UPDATE apps SET position = 6 WHERE code = 'artisans';
UPDATE apps SET position = 7 WHERE code = 'asso';
UPDATE apps SET position = 8 WHERE code = 'admin';
UPDATE apps SET position = 9 WHERE code = 'quartier';

-- Les autres sont déjà en base :
--   teaching    L'apprentissage scolaire     en ligne
--   familyshop  Les courses en famille       en ligne
--   sport       Les associations sportives   en construction
--   artisans    Les artisans et leurs clients en construction
--   asso        La vie associative           à l'étude
--   admin       Les démarches administratives à l'étude
--   quartier    L'entraide de quartier       à l'étude
--
-- Les positions sont désormais fixées plus haut, une ligne par
-- application : c'est là qu'on change l'ordre du catalogue.
--
-- Pour en brancher une nouvelle, reprenez le bloc de machines ci-dessus :
-- il porte le ON DUPLICATE KEY UPDATE complet, celui qui rattrape une
-- ligne déjà posée à la main.
