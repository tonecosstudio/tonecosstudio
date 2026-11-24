-- Titans franchise page reviewed record by record through the public Worker.
-- Candidate only; do not apply before the authorized M5 gate.

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_3def0d3c7e3f818caf21', 'char_dc_estelar', 'https://www.dc.com/characters/starfire', 'Public API title explicitly names Estelar (Starfire); DC official profile confirms the character.', 0),
  ('mdl_721774c0f21326ebe495', 'char_dc_estelar', 'https://www.dc.com/characters/starfire', 'Second Estelar model; title explicitly names the character; armor and flames are model details.', 0),
  ('mdl_0033cf3a5cb64ab103fd', 'char_dc_ravena', 'https://www.dc.com/characters/raven', 'Public API title explicitly names Ravena (Raven); skulls and ravens are model details.', 0),
  ('mdl_bd818f3fb3fef507610e', 'char_dc_ravena', 'https://www.dc.com/characters/raven', 'Second Ravena model; title explicitly names the character; meditation/books are model details.', 0);
