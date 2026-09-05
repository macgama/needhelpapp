-- =====================================================================
-- NeedHelpApp — la base centrale 6l3nq9_core
--
-- Ce fichier décrit la base telle qu'elle est réellement sur le serveur.
-- Il a d'abord été reconstitué depuis le code, ce qui laissait passer des
-- écarts ; il est désormais aligné sur l'export de production.
--
-- MariaDB 10.11, utf8mb4.
-- =====================================================================

SET NAMES utf8mb4;


-- ---------------------------------------------------------------
-- Le compte central. plan, plan_statut et plan_fin ne sont qu'un cache
-- recalculé par nha_refresh_cache() : la vérité est dans subscriptions.
-- password_hash vaut NULL — ou une chaîne vide — pour un compte ouvert
-- avec Google seulement.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `email` varchar(190) NOT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `name` varchar(60) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `pwd_version` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `lang` char(2) NOT NULL DEFAULT 'fr',
  `role` varchar(16) NOT NULL DEFAULT 'membre',
  `plan` varchar(16) NOT NULL DEFAULT 'gratuit',
  `plan_statut` varchar(16) NOT NULL DEFAULT 'aucun',
  `plan_fin` datetime DEFAULT NULL,
  `plan_app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_login_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_email` (`email`),
  UNIQUE KEY `uq_accounts_uuid` (`uuid`),
  KEY `ix_accounts_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Vérification d'adresse et mot de passe oublié.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `action_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` int(10) UNSIGNED NOT NULL,
  `purpose` enum('verify_email','reset_password','invite','claim_seat') NOT NULL,
  `token_hash` char(64) NOT NULL,
  `payload` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_action_tokens` (`token_hash`),
  KEY `ix_action_tokens_account` (`account_id`,`purpose`),
  CONSTRAINT `fk_action_tokens_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Toute application doit y figurer : les autres tables s'y réfèrent,
-- et l'accueil du portail lit ce catalogue.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `apps` (
  `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(120) NOT NULL,
  `tagline` varchar(255) NOT NULL DEFAULT '',
  `url` varchar(255) DEFAULT NULL,
  `color` char(7) NOT NULL DEFAULT '#3B2F7F',
  `keywords` varchar(500) NOT NULL DEFAULT '',
  `status` enum('en_ligne','construction','etude','archive') NOT NULL DEFAULT 'etude',
  `position` smallint(6) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_apps_code` (`code`),
  KEY `ix_apps_status` (`status`,`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- La clé primaire composite est indispensable : nha_attach_app()
-- s'appuie sur ON DUPLICATE KEY UPDATE, qui sans elle insérerait un
-- doublon à chaque page consultée.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_users` (
  `account_id` int(10) UNSIGNED NOT NULL,
  `app_id` smallint(5) UNSIGNED NOT NULL,
  `role` varchar(40) NOT NULL DEFAULT 'membre',
  `first_seen_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` datetime DEFAULT NULL,
  PRIMARY KEY (`account_id`,`app_id`),
  KEY `ix_app_users_app` (`app_id`),
  CONSTRAINT `fk_app_users_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_users_app` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` int(10) UNSIGNED DEFAULT NULL,
  `app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `event` varchar(60) NOT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `ip` varbinary(16) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_audit_account` (`account_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- La clé unique sur l'évènement rend le webhook rejouable sans dégât.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `billing_events` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` varchar(20) NOT NULL,
  `provider_event_id` varchar(80) NOT NULL,
  `type` varchar(60) NOT NULL,
  `subscription_id` bigint(20) UNSIGNED DEFAULT NULL,
  `account_id` int(10) UNSIGNED DEFAULT NULL,
  `payload` mediumtext DEFAULT NULL,
  `received_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL,
  `error` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_billing_event` (`provider`,`provider_event_id`),
  KEY `ix_billing_processed` (`processed_at`,`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ideas` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `prenom` varchar(80) DEFAULT NULL,
  `email` varchar(190) NOT NULL,
  `besoin` text NOT NULL,
  `source` varchar(60) NOT NULL DEFAULT 'accueil',
  `ip` varbinary(16) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `handled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_ideas_handled` (`handled_at`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les identités externes. La clé unique (provider, subject) empêche
-- qu'un même compte Google ouvre deux comptes NeedHelpApp.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `identities` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` int(10) UNSIGNED NOT NULL,
  `provider` varchar(20) NOT NULL,
  `subject` varchar(64) NOT NULL,
  `email_at_provider` varchar(190) DEFAULT NULL,
  `linked_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_identities` (`provider`,`subject`),
  KEY `ix_identities_account` (`account_id`),
  CONSTRAINT `fk_identities_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(190) DEFAULT NULL,
  `ip` varbinary(16) DEFAULT NULL,
  `app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `attempted_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_login_attempts_email` (`email`,`attempted_at`),
  KEY `ix_login_attempts_ip` (`ip`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- Les sessions, partagées par tout *.needhelpapp.com.
-- created_app_id est NULLABLE : une application pas encore déclarée
-- ne doit pas empêcher de se connecter.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `token_hash` char(64) NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `created_app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `ip` varbinary(16) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `ix_sessions_account` (`account_id`),
  KEY `ix_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- scope = 'all' vaut pour toutes les applications, y compris celles
-- qui n'existent pas encore.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `payer_account_id` int(10) UNSIGNED NOT NULL,
  `scope` enum('all','app') NOT NULL DEFAULT 'all',
  `app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `sold_by_app_id` smallint(5) UNSIGNED DEFAULT NULL,
  `plan` varchar(16) NOT NULL,
  `period` enum('mensuel','annuel','a_vie') NOT NULL DEFAULT 'mensuel',
  `status` enum('essai','actif','impaye','resilie','expire') NOT NULL DEFAULT 'essai',
  `seats` smallint(5) UNSIGNED NOT NULL DEFAULT 1,
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `current_period_end` datetime DEFAULT NULL,
  `cancel_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `provider` varchar(20) DEFAULT NULL,
  `provider_customer_id` varchar(64) DEFAULT NULL,
  `provider_subscription_id` varchar(64) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subscriptions_provider` (`provider`,`provider_subscription_id`),
  KEY `ix_subscriptions_payer` (`payer_account_id`,`status`),
  KEY `fk_subscriptions_app` (`app_id`),
  CONSTRAINT `fk_subscriptions_app` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_subscriptions_payer` FOREIGN KEY (`payer_account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_seats` (
  `subscription_id` bigint(20) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `added_at` datetime NOT NULL DEFAULT current_timestamp(),
  `removed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`subscription_id`,`account_id`),
  KEY `ix_seats_account` (`account_id`,`removed_at`),
  CONSTRAINT `fk_seats_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_seats_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
