-- Explicit visibility for Telegram studios on the public read-only showcase.
-- The existing 1,228 public-visible Telegram rows remain visible unchanged.
-- All subsequent private imports begin invisible until editorial and rights approval.
ALTER TABLE models ADD COLUMN telegram_showcase_visible INTEGER NOT NULL DEFAULT 0
  CHECK (telegram_showcase_visible IN (0,1));

-- One-time snapshot of the pre-migration public predicate; no automatic approvals.
UPDATE models SET telegram_showcase_visible=1
  WHERE telegram_group_key IS NOT NULL
    AND telegram_review_status<>'rejected'
    AND telegram_rights_status<>'rejected';

CREATE INDEX IF NOT EXISTS idx_models_telegram_showcase_visible
  ON models(telegram_studio,name)
  WHERE telegram_group_key IS NOT NULL AND telegram_showcase_visible=1;

-- No new import or manual update may expose a draft without both approvals.
CREATE TRIGGER IF NOT EXISTS trg_telegram_showcase_public_insert_requires_review
BEFORE INSERT ON models
WHEN NEW.telegram_group_key IS NOT NULL AND NEW.telegram_showcase_visible=1
  AND (NEW.telegram_review_status<>'confirmed' OR NEW.telegram_rights_status<>'approved')
BEGIN
  SELECT RAISE(ABORT,'telegram showcase requires editorial review and rights');
END;

CREATE TRIGGER IF NOT EXISTS trg_telegram_showcase_public_update_requires_review
BEFORE UPDATE OF telegram_showcase_visible ON models
WHEN NEW.telegram_group_key IS NOT NULL AND OLD.telegram_showcase_visible<>1
  AND NEW.telegram_showcase_visible=1
  AND (NEW.telegram_review_status<>'confirmed' OR NEW.telegram_rights_status<>'approved')
BEGIN
  SELECT RAISE(ABORT,'telegram showcase requires editorial review and rights');
END;

-- Withdraw visibility if a fully approved record later loses either approval.
-- The pre-existing preview catalogue is retained until each row is reviewed.
CREATE TRIGGER IF NOT EXISTS trg_telegram_showcase_revoke_visibility
AFTER UPDATE OF telegram_review_status,telegram_rights_status ON models
WHEN NEW.telegram_group_key IS NOT NULL
  AND OLD.telegram_showcase_visible=1
  AND OLD.telegram_review_status='confirmed'
  AND OLD.telegram_rights_status='approved'
  AND (NEW.telegram_review_status<>'confirmed' OR NEW.telegram_rights_status<>'approved')
BEGIN
  UPDATE models SET telegram_showcase_visible=0 WHERE id=NEW.id;
END;
