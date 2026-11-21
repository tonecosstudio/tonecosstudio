-- Operator-authorized NONCOMMERCIAL catalogue preview, independent of licensing.
-- Never marks editorial review or image rights as approved. The owner explicitly
-- requested that named Telegram studio models be listed immediately.
-- Models import privately first. Only individually granted model IDs may
-- enter the public read-only showcase before editorial/rights review.
CREATE TABLE IF NOT EXISTS telegram_showcase_owner_preview_grants (
  model_id TEXT PRIMARY KEY REFERENCES models(id) ON DELETE CASCADE,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  authority TEXT NOT NULL CHECK (authority = 'owner_explicit_request'),
  scope TEXT NOT NULL CHECK (scope = 'noncommercial_readonly_preview'),
  reason TEXT NOT NULL CHECK (length(reason) >= 10)
);

-- Keep the restrictive INSERT gate from 0025 intact. Only an existing private
-- draft with explicit audited owner grant can be made publicly previewable.
DROP TRIGGER IF EXISTS trg_telegram_showcase_public_update_requires_review;
CREATE TRIGGER trg_telegram_showcase_public_update_requires_review
BEFORE UPDATE OF telegram_showcase_visible ON models
WHEN NEW.telegram_group_key IS NOT NULL
  AND OLD.telegram_showcase_visible<>1
  AND NEW.telegram_showcase_visible=1
  AND NOT (
    (NEW.telegram_review_status='confirmed' AND NEW.telegram_rights_status='approved')
    OR (
      NEW.published=0
      AND NEW.telegram_review_status='pending'
      AND NEW.telegram_rights_status='not_reviewed'
      AND NEW.telegram_name_provisional=1
      AND length(trim(NEW.name))>0
      AND NEW.image_count>0
      AND EXISTS (
        SELECT 1 FROM telegram_showcase_owner_preview_grants grant_record
        WHERE grant_record.model_id=NEW.id
          AND grant_record.authority='owner_explicit_request'
          AND grant_record.scope='noncommercial_readonly_preview'
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT,'telegram showcase requires reviewed rights or explicit owner preview grant');
END;

-- A rejected review/rights decision takes precedence over any earlier grant.
CREATE TRIGGER IF NOT EXISTS trg_telegram_showcase_owner_preview_revoke_rejected
AFTER UPDATE OF telegram_review_status,telegram_rights_status ON models
WHEN NEW.telegram_group_key IS NOT NULL AND NEW.telegram_showcase_visible=1
  AND (NEW.telegram_review_status='rejected' OR NEW.telegram_rights_status='rejected')
BEGIN
  UPDATE models SET telegram_showcase_visible=0 WHERE id=NEW.id;
END;

-- Removing the owner's exception removes provisional visibility.
CREATE TRIGGER IF NOT EXISTS trg_telegram_showcase_owner_preview_grant_deleted
AFTER DELETE ON telegram_showcase_owner_preview_grants
WHEN EXISTS (
  SELECT 1 FROM models m WHERE m.id=OLD.model_id
  AND m.telegram_showcase_visible=1
  AND (m.telegram_review_status<>'confirmed' OR m.telegram_rights_status<>'approved')
)
BEGIN
  UPDATE models SET telegram_showcase_visible=0 WHERE id=OLD.model_id;
END;
