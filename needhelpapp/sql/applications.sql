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

-- Les autres sont déjà en base :
--   teaching    L'apprentissage scolaire     en ligne
--   familyshop  Les courses en famille       en ligne
--   sport       Les associations sportives   en construction
--   artisans    Les artisans et leurs clients en construction
--   asso        La vie associative           à l'étude
--   admin       Les démarches administratives à l'étude
--   quartier    L'entraide de quartier       à l'étude
--
-- ATTENTION aux positions, qui donnent l'ordre d'affichage : sport et
-- familyshop valent toutes deux 2, asso et budget toutes deux 4. Deux
-- lignes de même position sortent dans un ordre arbitraire. Rien ne
-- casse, mais si vous voulez que les applications ouvertes viennent en
-- tête, une renumérotation s'impose :
--
--   UPDATE apps SET position = 0 WHERE code = 'portail';
--   UPDATE apps SET position = 1 WHERE code = 'teaching';
--   UPDATE apps SET position = 2 WHERE code = 'familyshop';
--   UPDATE apps SET position = 3 WHERE code = 'budget';
--   UPDATE apps SET position = 4 WHERE code = 'sport';
--   UPDATE apps SET position = 5 WHERE code = 'artisans';
--   UPDATE apps SET position = 6 WHERE code = 'asso';
--   UPDATE apps SET position = 7 WHERE code = 'admin';
--   UPDATE apps SET position = 8 WHERE code = 'quartier';
--
-- Pour en brancher une nouvelle, reprenez le bloc de budget ci-dessus :
-- il porte le ON DUPLICATE KEY UPDATE complet, celui qui rattrape une
-- ligne déjà posée à la main.
