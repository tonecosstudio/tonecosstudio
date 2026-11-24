-- Canonical character attributes for public tags already projected in D1.
-- Staged only. Apply through the authorized D1 migration owner after the
-- existing M5/publication gate; this migration intentionally inserts no tags.
CREATE TABLE IF NOT EXISTS catalog_attributes (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 3 AND 100),
  kind TEXT NOT NULL CHECK (kind IN ('publisher', 'universe', 'sign', 'constellation')),
  canonical_slug TEXT NOT NULL CHECK (
    length(canonical_slug) BETWEEN 1 AND 100
    AND canonical_slug NOT GLOB '*[^a-z0-9-]*'
    AND substr(canonical_slug, 1, 1) GLOB '[a-z0-9]'
    AND substr(canonical_slug, -1, 1) GLOB '[a-z0-9]'
  ),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'withdrawn')),
  evidence_origin TEXT NOT NULL CHECK (length(trim(evidence_origin)) BETWEEN 3 AND 240),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, canonical_slug)
);

CREATE TABLE IF NOT EXISTS catalog_character_attributes (
  character_id TEXT NOT NULL REFERENCES catalog_characters(id) ON DELETE RESTRICT,
  attribute_id TEXT NOT NULL REFERENCES catalog_attributes(id) ON DELETE RESTRICT,
  evidence_origin TEXT NOT NULL CHECK (length(trim(evidence_origin)) BETWEEN 3 AND 240),
  evidence_note TEXT,
  review_state TEXT NOT NULL DEFAULT 'confirmed' CHECK (review_state IN ('confirmed', 'withdrawn')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_character_attributes_attribute
  ON catalog_character_attributes(attribute_id, review_state, character_id);
