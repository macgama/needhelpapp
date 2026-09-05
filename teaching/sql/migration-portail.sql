-- =====================================================================
-- Rattachement au portail NeedHelpApp.
--
-- La table `users` de teaching n'est pas supprimée : toutes les données
-- de l'application y sont rattachées par une clé étrangère. Elle devient
-- un point d'ancrage local, relié au compte central par `account_id`.
--
-- Les comptes existants sont retrouvés par leur adresse au premier
-- passage : rien à faire à la main, rien n'est perdu.
-- =====================================================================

ALTER TABLE users ADD COLUMN account_id INT UNSIGNED NULL AFTER id;
ALTER TABLE users ADD UNIQUE KEY uk_users_account (account_id);

-- Le mot de passe local n'est plus utilisé pour se connecter : le portail
-- s'en charge. On ne l'efface pas tout de suite, le temps de vérifier que
-- la bascule fonctionne. À faire ensuite, quand tout sera confirmé :
--   UPDATE users SET password = '';
