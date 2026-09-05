-- =====================================================================
-- Les listes de verbes gagnent les temps choisis, la publication et la
-- reprise, comme les dictées. À exécuter ligne par ligne : une erreur
-- « #1060 déjà utilisé » signifie simplement que c'était déjà fait.
-- =====================================================================

ALTER TABLE verb_lists ADD COLUMN tenses       TEXT NOT NULL DEFAULT '';
ALTER TABLE verb_lists ADD COLUMN is_public    TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE verb_lists ADD COLUMN published_at DATETIME NULL;
ALTER TABLE verb_lists ADD COLUMN reports      SMALLINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE verb_lists ADD COLUMN borrowed     TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE verb_lists ADD COLUMN origin_token CHAR(32) NULL;
ALTER TABLE verb_lists ADD COLUMN origin_owner VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE verb_lists ADD KEY idx_lists_public (is_public, published_at);
