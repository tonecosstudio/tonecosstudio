
-- Independent promotional selection; no changes to model, publication, pricing or media data.
CREATE TABLE IF NOT EXISTS promotion_image_selections (
  campaign TEXT NOT NULL CHECK(length(campaign) BETWEEN 1 AND 80),
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  model_id TEXT NOT NULL,
  media_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  selected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(campaign,sha256)
);
