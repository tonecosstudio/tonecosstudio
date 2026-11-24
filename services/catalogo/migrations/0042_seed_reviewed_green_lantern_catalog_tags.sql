-- Explicit Green Lantern character identities reviewed against each public
-- model title. Candidate only; do not apply before the authorized M5 gate.

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_5cb1a7c25d077cd52209', 'char_dc_jessica_cruz', 'https://www.dc.com/characters/jessica-cruz', 'Public API title explicitly names Jessica Cruz; DC confirms her identity as a Green Lantern.', 0),
  ('mdl_b3d0a7390ef896e06a73', 'char_dc_jessica_cruz', 'https://www.dc.com/characters/jessica-cruz', 'Public API title explicitly names Jessica Cruz; classic lantern and energy are model details.', 0),
  ('mdl_492778f14427f5b13e48', 'char_dc_hal_jordan', 'https://www.dc.com/characters/green-lantern', 'Public API title explicitly names Hal Jordan; DC identifies Hal Jordan as Green Lantern.', 0);
