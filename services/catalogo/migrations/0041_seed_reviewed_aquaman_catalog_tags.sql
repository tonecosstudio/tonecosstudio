-- Public Aquaman franchise page reviewed record by record through the local
-- Worker API. Candidate only; do not apply before the authorized M5 gate.
-- Aquaman and Black Manta identities/publisher tags are declared by migration 0033.

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_cea55f7f13dcaa99ebb3', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; trident and classic styling are model details.', 0),
  ('mdl_27c9132c0b1fbf8766e8', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; sea-dragon diorama is a prop/context.', 0),
  ('mdl_ede7d556559b2d436f30', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; sea-monster diorama is a prop/context.', 0),
  ('mdl_35d9b756ce015ab48995', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; gray finish and trident do not alter identity.', 0),
  ('mdl_2de3cc68b34dfe13af99', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; three views represent one model.', 0),
  ('mdl_df7b9a1a71cb2ccd957d', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; seahorse mount is model context.', 0),
  ('mdl_0c9cd42d049a330f24d0', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; shark mount is model context.', 0),
  ('mdl_ac83ea86bb27b04ef3fe', 'char_dc_aquaman', 'https://www.dc.com/characters/aquaman', 'Public API title explicitly names Aquaman; throne and trident are model details.', 0),
  ('mdl_a6535ea2b5095114abce', 'char_dc_arraia_negra', 'https://www.dc.com/characters/black-manta', 'Public API title explicitly names Arraia Negra; DC identifies Black Manta as Aquaman’s enemy.', 0);
