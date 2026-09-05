-- =====================================================================
-- À exécuter sur une base déjà installée, pour permettre d'enregistrer
-- chez soi une dictée écrite par quelqu'un d'autre, sans pouvoir la
-- modifier ni la republier : elle reste celle de son auteur.
-- =====================================================================

ALTER TABLE dictations
    ADD COLUMN borrowed     TINYINT(1) NOT NULL DEFAULT 0 AFTER reports,
    ADD COLUMN origin_token CHAR(32)   NULL               AFTER borrowed,
    ADD COLUMN origin_owner VARCHAR(80) NOT NULL DEFAULT '' AFTER origin_token,
    ADD KEY idx_dictations_origin (user_id, origin_token);
