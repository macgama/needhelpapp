-- =====================================================================
-- Déclarer FamilyShop dans le catalogue du portail.
-- À exécuter sur 6l3nq9_core, AVANT la première connexion.
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
  ('familyshop', 'Les courses en famille',
   'Les menus de la semaine, et la liste qui va avec.',
   'https://familyshop.needhelpapp.com/', '#1B6547',
   'courses liste menu semaine recettes ingrédients repas famille cuisine supermarché rayon',
   'en_ligne', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline),
                        url = VALUES(url), status = VALUES(status);
