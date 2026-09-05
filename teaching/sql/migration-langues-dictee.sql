-- =====================================================================
-- La dictée s'ouvre à l'allemand, l'anglais et l'italien.
-- Les dictées existantes restent en français, ce qui est exact.
-- =====================================================================

ALTER TABLE dictations ADD COLUMN lang CHAR(2) NOT NULL DEFAULT 'fr' AFTER level;
ALTER TABLE dictations ADD KEY idx_dictations_langue (is_public, lang, published_at);
