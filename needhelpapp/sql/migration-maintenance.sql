-- =====================================================================
-- Rendre possible « fermée pour mise à jour ».
--
-- LE BOUTON EXISTAIT, LA VALEUR NON.
--
-- /admin/applications.php propose quatre états, dont « fermée pour mise
-- à jour ». api/admin-application.php l'accepte — il figure dans sa
-- constante ETATS — et l'écrit tel quel dans apps.status. Mais la
-- colonne était déclarée :
--
--     enum('en_ligne','construction','etude','archive')
--
-- sans « maintenance ». En mode strict, que MariaDB applique par défaut
-- depuis la 10.2.4, l'UPDATE lève une erreur : le point d'entrée répond
-- 500 avec une référence, et l'application VISÉE RESTE OUVERTE. Hors
-- mode strict, c'est pire — la valeur devient la chaîne vide, et
-- nha_app_ouverte() ferme l'application sans que personne ne sache
-- pourquoi.
--
-- C'est le levier d'urgence du portail : celui qu'on actionne justement
-- quand quelque chose ne va pas. Il ne s'est jamais rien passé quand on
-- appuyait dessus.
--
-- Rien d'autre à changer : nha_app_ouverte() n'ouvre que sur
-- « en_ligne » et ferme sur tout le reste, index.php sait déjà afficher
-- « Fermée un moment » (sa branche $ferme n'avait simplement jamais pu
-- s'exécuter), et les sous-domaines ont déjà leur écran « Une mise à
-- jour est en cours ».
--
-- À passer dans phpMyAdmin, sur la base 6l3nq9_core.
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE `apps`
  MODIFY `status` enum('en_ligne','maintenance','construction','etude','archive')
  NOT NULL DEFAULT 'etude';

-- Vérification : la colonne doit maintenant annoncer les cinq valeurs.
-- SHOW COLUMNS FROM `apps` LIKE 'status';
