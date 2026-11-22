-- TONART: canonical character identity projection for every catalog model origin.
-- Staged only. Apply through the single authorized D1 migration owner after M5 approval.
-- No backfill, release, rights change, search rewrite, or import is performed here.
-- Supabase/SQLite curation proposals are not second publication authorities.
-- Publisher must reconcile approved editorial_identity_id to the same stable character ID.
CREATE TABLE IF NOT EXISTS catalog_characters (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 3 AND 100),
  franchise_id INTEGER NOT NULL REFERENCES franchises(id) ON DELETE RESTRICT,
  canonical_slug TEXT NOT NULL CHECK (
    length(canonical_slug) BETWEEN 1 AND 100
    AND canonical_slug NOT GLOB '*[^a-z0-9-]*'
    AND substr(canonical_slug, 1, 1) GLOB '[a-z0-9]'
    AND substr(canonical_slug, -1, 1) GLOB '[a-z0-9]'
  ),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  editorial_identity_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','withdrawn')),
  evidence_origin TEXT NOT NULL CHECK (length(trim(evidence_origin)) BETWEEN 3 AND 240),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (franchise_id, canonical_slug)
);

CREATE INDEX IF NOT EXISTS idx_catalog_characters_franchise
  ON catalog_characters(franchise_id, status, canonical_slug);

-- Aliases are search labels only. They do not create second characters.
CREATE TABLE IF NOT EXISTS catalog_character_aliases (
  franchise_id INTEGER NOT NULL REFERENCES franchises(id) ON DELETE RESTRICT,
  alias_slug TEXT NOT NULL CHECK (
    length(alias_slug) BETWEEN 1 AND 100
    AND alias_slug NOT GLOB '*[^a-z0-9-]*'
    AND substr(alias_slug, 1, 1) GLOB '[a-z0-9]'
    AND substr(alias_slug, -1, 1) GLOB '[a-z0-9]'
  ),
  character_id TEXT NOT NULL REFERENCES catalog_characters(id) ON DELETE RESTRICT,
  evidence_origin TEXT NOT NULL CHECK (length(trim(evidence_origin)) BETWEEN 3 AND 240),
  PRIMARY KEY (franchise_id, alias_slug)
);

CREATE TRIGGER IF NOT EXISTS guard_catalog_character_alias_insert
BEFORE INSERT ON catalog_character_aliases
BEGIN
  SELECT CASE WHEN
    (SELECT franchise_id FROM catalog_characters WHERE id=NEW.character_id) IS NOT NEW.franchise_id
    OR EXISTS (
      SELECT 1 FROM catalog_characters c
      WHERE c.franchise_id=NEW.franchise_id AND c.canonical_slug=NEW.alias_slug
    )
  THEN RAISE(ABORT, 'character alias must match its franchise and not collide with canonical slugs') END;
END;

CREATE TRIGGER IF NOT EXISTS guard_catalog_character_alias_update
BEFORE UPDATE ON catalog_character_aliases
BEGIN
  SELECT CASE WHEN
    (SELECT franchise_id FROM catalog_characters WHERE id=NEW.character_id) IS NOT NEW.franchise_id
    OR EXISTS (
      SELECT 1 FROM catalog_characters c
      WHERE c.franchise_id=NEW.franchise_id AND c.canonical_slug=NEW.alias_slug
    )
  THEN RAISE(ABORT, 'character alias must match its franchise and not collide with canonical slugs') END;
END;

CREATE TRIGGER IF NOT EXISTS guard_catalog_character_slug_insert
BEFORE INSERT ON catalog_characters
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM catalog_character_aliases a
    WHERE a.franchise_id=NEW.franchise_id AND a.alias_slug=NEW.canonical_slug
  ) THEN RAISE(ABORT, 'canonical character collides with existing alias') END;
END;

CREATE TRIGGER IF NOT EXISTS guard_catalog_character_slug_update
BEFORE UPDATE OF canonical_slug, franchise_id ON catalog_characters
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM catalog_character_aliases a
    WHERE a.franchise_id=NEW.franchise_id AND a.alias_slug=NEW.canonical_slug
  ) THEN RAISE(ABORT, 'canonical character collides with existing alias') END;
  SELECT CASE WHEN NEW.franchise_id <> OLD.franchise_id
    AND EXISTS (SELECT 1 FROM catalog_model_characters mc WHERE mc.character_id=OLD.id)
  THEN RAISE(ABORT, 'unlink model characters before changing franchise') END;
END;

-- Confirmed associations, from either tg_* or mdl_* models; never duplicate model/gallery.
-- Cross-franchise associations require explicit confirmation for documented crossovers.
CREATE TABLE IF NOT EXISTS catalog_model_characters (
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  character_id TEXT NOT NULL REFERENCES catalog_characters(id) ON DELETE RESTRICT,
  evidence_origin TEXT NOT NULL CHECK (length(trim(evidence_origin)) BETWEEN 3 AND 240),
  evidence_note TEXT,
  cross_franchise_approved INTEGER NOT NULL DEFAULT 0 CHECK (cross_franchise_approved IN (0,1)),
  review_state TEXT NOT NULL DEFAULT 'confirmed' CHECK (review_state IN ('confirmed','withdrawn')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (model_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_model_characters_character
  ON catalog_model_characters(character_id, review_state, model_id);

CREATE TRIGGER IF NOT EXISTS guard_catalog_model_character_insert
BEFORE INSERT ON catalog_model_characters
BEGIN
  SELECT CASE WHEN
    NEW.review_state='confirmed'
    AND (SELECT franchise_id FROM models WHERE id=NEW.model_id) <>
    (SELECT franchise_id FROM catalog_characters WHERE id=NEW.character_id)
    AND NOT (
      NEW.cross_franchise_approved=1 AND NEW.review_state='confirmed'
      AND length(trim(COALESCE(NEW.evidence_note,''))) >= 10
    )
  THEN RAISE(ABORT, 'cross-franchise link requires confirmed evidence') END;
END;

CREATE TRIGGER IF NOT EXISTS guard_catalog_model_character_update
BEFORE UPDATE OF model_id, character_id, cross_franchise_approved, review_state, evidence_note
ON catalog_model_characters
BEGIN
  SELECT CASE WHEN
    NEW.review_state='confirmed'
    AND (SELECT franchise_id FROM models WHERE id=NEW.model_id) <>
    (SELECT franchise_id FROM catalog_characters WHERE id=NEW.character_id)
    AND NOT (
      NEW.cross_franchise_approved=1 AND NEW.review_state='confirmed'
      AND length(trim(COALESCE(NEW.evidence_note,''))) >= 10
    )
  THEN RAISE(ABORT, 'cross-franchise link requires confirmed evidence') END;
END;

CREATE TRIGGER IF NOT EXISTS guard_catalog_model_franchise_update
BEFORE UPDATE OF franchise_id ON models
WHEN EXISTS (
  SELECT 1 FROM catalog_model_characters mc
  JOIN catalog_characters c ON c.id=mc.character_id
  WHERE mc.model_id=OLD.id AND mc.review_state='confirmed'
    AND c.franchise_id<>NEW.franchise_id
    AND NOT (mc.cross_franchise_approved=1 AND mc.review_state='confirmed'
             AND length(trim(COALESCE(mc.evidence_note,''))) >= 10)
)
BEGIN
  SELECT RAISE(ABORT, 'review character links before changing model franchise');
END;
