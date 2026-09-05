-- =====================================================================
-- Les rôles.
--   'membre'      : le cas ordinaire. L'accès complet dépend de l'abonnement.
--   'moderateur'  : accès complet à l'application, sans payer.
--   'admin'       : idem, plus la zone d'administration.
--
-- Il n'existe volontairement AUCUN moyen de se promouvoir depuis
-- l'application : le premier administrateur se désigne ici, à la main.
-- =====================================================================

ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'membre';
ALTER TABLE users ADD KEY idx_users_role (role);

-- Remplacez l'adresse par la vôtre, puis exécutez :
-- UPDATE users SET role = 'admin' WHERE email = 'vous@exemple.ch';
