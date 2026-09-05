-- =====================================================================
-- À exécuter sur une base déjà installée, pour l'abonnement et le suivi
-- des résultats par dictée.
-- Sur une base neuve, schema.sql contient déjà tout ceci.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN plan          VARCHAR(16) NOT NULL DEFAULT 'gratuit' AFTER pwd_version,
    ADD COLUMN plan_statut   VARCHAR(16) NOT NULL DEFAULT 'aucun'   AFTER plan,
    ADD COLUMN plan_fin      DATETIME    NULL                       AFTER plan_statut,
    ADD COLUMN payeur_id     VARCHAR(64) NULL                       AFTER plan_fin,
    ADD COLUMN abonnement_id VARCHAR(64) NULL                       AFTER payeur_id;

ALTER TABLE attempts
    ADD COLUMN dictation_id INT UNSIGNED NULL AFTER user_id,
    ADD KEY idx_attempts_dictation (user_id, dictation_id),
    ADD CONSTRAINT fk_attempts_dictation FOREIGN KEY (dictation_id) REFERENCES dictations (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS billing_events (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id    VARCHAR(80)  NOT NULL,
    type        VARCHAR(60)  NOT NULL,
    user_id     INT UNSIGNED NULL,
    resume      VARCHAR(255) NOT NULL DEFAULT '',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_billing_event (event_id),
    KEY idx_billing_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
