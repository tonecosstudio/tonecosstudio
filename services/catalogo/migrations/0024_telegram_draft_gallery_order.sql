-- Gallery order is editable metadata on the existing commercial draft model.
-- Original Telegram SHA-256 and individual source associations stay immutable.
ALTER TABLE models ADD COLUMN telegram_gallery_order TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(telegram_gallery_order) AND json_type(telegram_gallery_order)='array');
