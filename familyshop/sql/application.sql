-- =====================================================================
-- Déclarer FamilyShop dans le catalogue du portail.
-- À exécuter sur 6l3nq9_core, AVANT la première connexion.
-- =====================================================================

INSERT INTO apps (code, name, tagline, url, color, keywords, status, position) VALUES
  ('familyshop', 'Les courses en famille',
   'Les menus de la semaine, et la liste qui va avec.',
   'https://familyshop.needhelpapp.com/', '#1B6547',
   'courses liste menu semaine recettes ingrédients repas famille cuisine supermarché rayon',
   'en_ligne', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline),
                        url = VALUES(url), status = VALUES(status);
