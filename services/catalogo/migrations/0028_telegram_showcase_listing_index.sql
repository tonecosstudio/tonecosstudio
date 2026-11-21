-- Additive index for the anonymous Telegram preview sorted by model name.
-- Intentionally no schema or data change; keep the index restricted to
-- visible, non-rejected Telegram entries to avoid indexing unrelated models.
-- Applies only via the canonical migration owner after release approval.
CREATE INDEX IF NOT EXISTS idx_models_telegram_showcase_name
ON models (
  telegram_showcase_visible,
  name COLLATE NOCASE,
  telegram_studio COLLATE NOCASE,
  id
)
WHERE telegram_group_key IS NOT NULL
  AND telegram_review_status <> 'rejected'
  AND telegram_rights_status <> 'rejected';
