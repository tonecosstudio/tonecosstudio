-- Loki e Sylvie public models reviewed individually by canonical model ID.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_loki', (SELECT id FROM franchises WHERE slug='loki-e-sylvie'), 'loki', 'Loki', NULL, 'https://www.marvel.com/characters/loki/'),
  ('char_marvel_sylvie', (SELECT id FROM franchises WHERE slug='loki-e-sylvie'), 'sylvie', 'Sylvie', NULL, 'https://www.marvel.com/articles/tv-shows/loki-sylvie-in-love');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_loki', 'attr_publisher_marvel', 'https://www.marvel.com/characters/loki/', 'Marvel identifies Loki as its character and distinguishes on-screen and comics profiles.'),
  ('char_marvel_sylvie', 'attr_publisher_marvel', 'https://www.marvel.com/articles/tv-shows/loki-sylvie-in-love', 'Marvel identifies Sylvie as an individual Loki variant and names Sophia Di Martino as the performer.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_77d457b17eb24a690e1d', 'char_marvel_loki', 'https://www.marvel.com/characters/loki/', 'Public API title and collection both identify Loki; first of three distinct Loki model IDs.', 0),
  ('mdl_c65c1e0abec4f37f1f31', 'char_marvel_loki', 'https://www.marvel.com/characters/loki/', 'Public API title and collection both identify Loki; second of three distinct Loki model IDs.', 0),
  ('mdl_fe78a0784dd5090ea683', 'char_marvel_loki', 'https://www.marvel.com/characters/loki/', 'Public API title and collection both identify Loki; third of three distinct Loki model IDs.', 0),
  ('mdl_cfe37def386b9d7c7e92', 'char_marvel_sylvie', 'https://www.marvel.com/articles/tv-shows/loki-sylvie-in-love', 'Public API title and collection both identify Sylvie; kept as a separate character identity.', 0);
