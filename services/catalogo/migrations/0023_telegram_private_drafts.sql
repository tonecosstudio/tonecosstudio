-- Private Telegram studio drafts extend the existing commercial catalog models.
-- No new catalog/database; all legacy rows retain their values.
ALTER TABLE models ADD COLUMN telegram_group_key TEXT;
ALTER TABLE models ADD COLUMN telegram_origin_id TEXT;
ALTER TABLE models ADD COLUMN telegram_studio TEXT NOT NULL DEFAULT '';
ALTER TABLE models ADD COLUMN telegram_character TEXT NOT NULL DEFAULT '';
ALTER TABLE models ADD COLUMN telegram_review_status TEXT NOT NULL DEFAULT 'legacy'
  CHECK (telegram_review_status IN ('legacy','pending','reviewing','confirmed','rejected'));
ALTER TABLE models ADD COLUMN telegram_name_provisional INTEGER NOT NULL DEFAULT 0
  CHECK (telegram_name_provisional IN (0,1));
ALTER TABLE models ADD COLUMN telegram_rights_status TEXT NOT NULL DEFAULT 'not_reviewed'
  CHECK (telegram_rights_status IN ('not_reviewed','rejected','approved'));
ALTER TABLE models ADD COLUMN telegram_revision INTEGER NOT NULL DEFAULT 0
  CHECK (telegram_revision >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_models_telegram_group_key
  ON models(telegram_origin_id,telegram_group_key)
  WHERE telegram_group_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_models_telegram_private_drafts
  ON models(telegram_studio,telegram_review_status,created_at)
  WHERE telegram_group_key IS NOT NULL AND published=0;

CREATE TRIGGER IF NOT EXISTS trg_telegram_draft_no_public_insert
BEFORE INSERT ON models
WHEN NEW.telegram_group_key IS NOT NULL AND NEW.published<>0
BEGIN
  SELECT RAISE(ABORT,'telegram import must start private');
END;

CREATE TRIGGER IF NOT EXISTS trg_telegram_draft_publication_requires_review
BEFORE UPDATE OF published ON models
WHEN NEW.telegram_group_key IS NOT NULL AND NEW.published<>0
  AND (NEW.telegram_review_status<>'confirmed' OR NEW.telegram_rights_status<>'approved')
BEGIN
  SELECT RAISE(ABORT,'telegram publication requires identity and commercial rights');
END;
