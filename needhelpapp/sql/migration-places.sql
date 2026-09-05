-- =====================================================================
-- Ouvrir les abonnements existants au partage.
--
-- Le webhook fixait le nombre de places à la quantité facturée, soit 1 :
-- personne ne pouvait donc partager. Les abonnements déjà en cours
-- gardent cette valeur jusqu'à leur prochain renouvellement — cette
-- migration la relève tout de suite.
--
-- Ajustez le 5 à ce que vous avez mis dans places_incluses.
-- =====================================================================

UPDATE subscriptions
   SET seats = GREATEST(seats, 5)
 WHERE status IN ('actif', 'essai');
