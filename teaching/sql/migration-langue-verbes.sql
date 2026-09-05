-- =====================================================================
-- Les sélections de verbes portent leur langue : une liste anglaise
-- ne se travaille pas avec les temps français.
-- =====================================================================

ALTER TABLE verb_lists ADD COLUMN langue CHAR(2) NOT NULL DEFAULT 'fr';
