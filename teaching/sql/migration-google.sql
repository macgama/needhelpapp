-- =====================================================================
-- À exécuter sur une base déjà installée, pour la connexion avec Google.
-- Sur une base neuve, schema.sql contient déjà ceci.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN google_sub VARCHAR(64) NULL AFTER password_hash,
    ADD UNIQUE KEY uk_users_google (google_sub),
    MODIFY COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- Un compte ouvert avec Google n'a pas de mot de passe : la colonne reste
-- vide, et aucune vérification de mot de passe ne peut aboutir dessus.
-- Son titulaire peut s'en créer un à tout moment par « mot de passe oublié ».
