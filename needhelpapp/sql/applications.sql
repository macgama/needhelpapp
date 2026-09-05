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

INSERT INTO apps (code, name, tagline, url, color, keywords, status, position) VALUES
  ('portail', 'Le portail', 'Un compte pour toutes les applications',
   'https://needhelpapp.com/', '#3B2F7F', 'compte connexion abonnement profil', 'en_ligne', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name), url = VALUES(url), status = VALUES(status);

-- Les autres sont déjà en base :
--   teaching  L'apprentissage scolaire   en ligne
--   sport     Les associations sportives en construction
--   artisans  Les artisans et leurs clients
--
-- Pour en brancher une nouvelle :
-- INSERT INTO apps (code, name, tagline, url, color, keywords, status, position)
-- VALUES ('budget', 'Le budget', 'Tenir ses comptes',
--         'https://budget.needhelpapp.com/', '#1B6547', 'budget dépenses', 'construction', 4);
