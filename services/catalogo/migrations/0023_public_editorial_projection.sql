PRAGMA foreign_keys = ON;

-- Public editorial rows are an explicit, approved projection. Private drafts
-- and merely reviewed Supabase profiles are never copied into these tables.
-- The canonical category, franchise and model identities remain the existing
-- catalog rows; this migration adds only public facts and verified relations.
CREATE TABLE IF NOT EXISTS editorial_public_universes (
  franchise_id INTEGER PRIMARY KEY REFERENCES franchises(id) ON DELETE CASCADE,
  revision TEXT NOT NULL CHECK (length(trim(revision)) BETWEEN 1 AND 120),
  reviewed_at TEXT NOT NULL CHECK (length(trim(reviewed_at)) BETWEEN 1 AND 40),
  approval_ref TEXT NOT NULL CHECK (length(trim(approval_ref)) BETWEEN 1 AND 240),
  media_types_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(media_types_json) AND json_type(media_types_json) = 'array'),
  summary TEXT,
  summary_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(summary_evidence_ids_json) AND json_type(summary_evidence_ids_json) = 'array'),
  overview TEXT,
  overview_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(overview_evidence_ids_json) AND json_type(overview_evidence_ids_json) = 'array'),
  identity_evidence_ids_json TEXT NOT NULL
    CHECK (json_valid(identity_evidence_ids_json) AND json_type(identity_evidence_ids_json) = 'array'
      AND json_array_length(identity_evidence_ids_json) BETWEEN 1 AND 40),
  evidence_json TEXT NOT NULL
    CHECK (json_valid(evidence_json) AND json_type(evidence_json) = 'array'
      AND json_array_length(evidence_json) BETWEEN 1 AND 80),
  CHECK ((summary IS NULL AND json_array_length(summary_evidence_ids_json) = 0)
      OR (summary IS NOT NULL AND json_array_length(summary_evidence_ids_json) BETWEEN 1 AND 40)),
  CHECK ((overview IS NULL AND json_array_length(overview_evidence_ids_json) = 0)
      OR (overview IS NOT NULL AND json_array_length(overview_evidence_ids_json) BETWEEN 1 AND 40))
);

CREATE TABLE IF NOT EXISTS editorial_public_characters (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 1 AND 120),
  slug TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z0-9]*' AND length(slug) BETWEEN 1 AND 240
    AND slug NOT GLOB '*[^a-z0-9-]*' AND substr(slug, -1, 1) <> '-'),
  franchise_id INTEGER NOT NULL REFERENCES editorial_public_universes(franchise_id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 240),
  aliases_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(aliases_json) AND json_type(aliases_json) = 'array'
      AND json_array_length(aliases_json) <= 40),
  summary TEXT,
  summary_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(summary_evidence_ids_json) AND json_type(summary_evidence_ids_json) = 'array'),
  biography TEXT,
  biography_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(biography_evidence_ids_json) AND json_type(biography_evidence_ids_json) = 'array'),
  age_value TEXT,
  age_context TEXT,
  age_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(age_evidence_ids_json) AND json_type(age_evidence_ids_json) = 'array'),
  origin_work TEXT,
  origin_work_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(origin_work_evidence_ids_json) AND json_type(origin_work_evidence_ids_json) = 'array'),
  media_types_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(media_types_json) AND json_type(media_types_json) = 'array'
      AND json_array_length(media_types_json) <= 40),
  characteristics_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(characteristics_json) AND json_type(characteristics_json) = 'array'
      AND json_array_length(characteristics_json) <= 30),
  media_type_evidence_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(media_type_evidence_ids_json) AND json_type(media_type_evidence_ids_json) = 'array'),
  identity_evidence_ids_json TEXT NOT NULL
    CHECK (json_valid(identity_evidence_ids_json) AND json_type(identity_evidence_ids_json) = 'array'
      AND json_array_length(identity_evidence_ids_json) BETWEEN 1 AND 40),
  evidence_json TEXT NOT NULL
    CHECK (json_valid(evidence_json) AND json_type(evidence_json) = 'array'
      AND json_array_length(evidence_json) BETWEEN 1 AND 80),
  revision TEXT NOT NULL CHECK (length(trim(revision)) BETWEEN 1 AND 120),
  reviewed_at TEXT NOT NULL CHECK (length(trim(reviewed_at)) BETWEEN 1 AND 40),
  approval_ref TEXT NOT NULL CHECK (length(trim(approval_ref)) BETWEEN 1 AND 240),
  CHECK ((summary IS NULL AND json_array_length(summary_evidence_ids_json) = 0)
      OR (summary IS NOT NULL AND json_array_length(summary_evidence_ids_json) BETWEEN 1 AND 40)),
  CHECK ((biography IS NULL AND json_array_length(biography_evidence_ids_json) = 0)
      OR (biography IS NOT NULL AND json_array_length(biography_evidence_ids_json) BETWEEN 1 AND 40)),
  CHECK ((age_value IS NULL AND age_context IS NULL AND json_array_length(age_evidence_ids_json) = 0)
      OR (age_value IS NOT NULL AND age_context IS NOT NULL
        AND json_array_length(age_evidence_ids_json) BETWEEN 1 AND 40)),
  CHECK ((origin_work IS NULL AND json_array_length(origin_work_evidence_ids_json) = 0)
      OR (origin_work IS NOT NULL AND json_array_length(origin_work_evidence_ids_json) BETWEEN 1 AND 40)),
  CHECK ((json_array_length(media_types_json) = 0 AND json_array_length(media_type_evidence_ids_json) = 0)
      OR (json_array_length(media_types_json) > 0
        AND json_array_length(media_type_evidence_ids_json) BETWEEN 1 AND 40))
);

CREATE TABLE IF NOT EXISTS editorial_public_character_models (
  character_id TEXT NOT NULL REFERENCES editorial_public_characters(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  evidence_ids_json TEXT NOT NULL
    CHECK (json_valid(evidence_ids_json) AND json_type(evidence_ids_json) = 'array'
      AND json_array_length(evidence_ids_json) BETWEEN 1 AND 40),
  approval_ref TEXT NOT NULL CHECK (length(trim(approval_ref)) BETWEEN 1 AND 240),
  PRIMARY KEY (character_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_editorial_public_characters_franchise
  ON editorial_public_characters(franchise_id, name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_editorial_public_character_models_model
  ON editorial_public_character_models(model_id, character_id);

-- The FTS index is strictly a projection of the approved/public character
-- table. Name and alias columns preserve the match type without scanning D1.
CREATE VIRTUAL TABLE IF NOT EXISTS editorial_public_characters_fts USING fts5(
  character_id UNINDEXED,
  name,
  aliases,
  tokenize='trigram remove_diacritics 1'
);

INSERT INTO editorial_public_characters_fts(character_id, name, aliases)
SELECT c.id, c.name,
  COALESCE((SELECT group_concat(json_extract(alias.value, '$.value'), ' ')
    FROM json_each(c.aliases_json) AS alias), '')
FROM editorial_public_characters AS c;

CREATE TRIGGER IF NOT EXISTS trg_editorial_public_characters_fts_after_insert
AFTER INSERT ON editorial_public_characters
BEGIN
  INSERT INTO editorial_public_characters_fts(character_id, name, aliases)
  VALUES (
    NEW.id,
    NEW.name,
    COALESCE((SELECT group_concat(json_extract(alias.value, '$.value'), ' ')
      FROM json_each(NEW.aliases_json) AS alias), '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_editorial_public_characters_fts_after_delete
AFTER DELETE ON editorial_public_characters
BEGIN
  DELETE FROM editorial_public_characters_fts WHERE character_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_editorial_public_characters_fts_after_update
AFTER UPDATE OF id, name, aliases_json ON editorial_public_characters
BEGIN
  DELETE FROM editorial_public_characters_fts WHERE character_id = OLD.id;
  INSERT INTO editorial_public_characters_fts(character_id, name, aliases)
  VALUES (
    NEW.id,
    NEW.name,
    COALESCE((SELECT group_concat(json_extract(alias.value, '$.value'), ' ')
      FROM json_each(NEW.aliases_json) AS alias), '')
  );
END;
