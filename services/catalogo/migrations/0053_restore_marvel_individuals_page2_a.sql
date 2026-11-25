-- Individually reviewed records from the second Heróis Individuais API page.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_electro', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'electro', 'Electro', NULL, 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics'),
  ('char_marvel_elektra', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'elektra', 'Elektra', NULL, 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen'),
  ('char_marvel_escorpiao', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'escorpiao', 'Escorpião', NULL, 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan'),
  ('char_marvel_gata_negra', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'gata-negra', 'Gata Negra', NULL, 'https://share.marvel.com/comics/discover/1174/marvels-spider-man-the-heist');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_electro', 'attr_publisher_marvel', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Marvel identifies Max Dillon/Electro among Spider-Man foes.'),
  ('char_marvel_electro', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Official Spider-Man profile identifies Electro as an adversary; public collection is Homem-Aranha / Electro.'),
  ('char_marvel_elektra', 'attr_publisher_marvel', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Marvel identifies Elektra Natchios as a distinct character.'),
  ('char_marvel_escorpiao', 'attr_publisher_marvel', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Official Marvel profile identifies Mac Gargan as Scorpion.'),
  ('char_marvel_escorpiao', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Official profile identifies Spider-Man as Scorpion’s main adversary; public collection is Homem-Aranha / Escorpião.'),
  ('char_marvel_gata_negra', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/1174/marvels-spider-man-the-heist', 'Official Marvel material identifies Felicia Hardy as Black Cat.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_81d60f280bc8f5d793fb', 'char_marvel_electro', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Public API title and collection identify Electro in the Homem-Aranha folder.', 0),
  ('mdl_0ae76945217d245f7cc2', 'char_marvel_elektra', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Public API title and collection both identify Elektra.', 0),
  ('mdl_1ad6261f97145d6d2d34', 'char_marvel_escorpiao', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'First Escorpião model ID; title and Homem-Aranha collection confirmed.', 0),
  ('mdl_b5522d3311e777a86e01', 'char_marvel_escorpiao', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Second Escorpião model ID; title and collection reviewed independently.', 0),
  ('mdl_6b686ae19153de236599', 'char_marvel_gata_negra', 'https://share.marvel.com/comics/discover/1174/marvels-spider-man-the-heist', 'First Gata Negra model ID; public title identifies the individual character.', 0),
  ('mdl_a338e0b9376a98c4b406', 'char_marvel_gata_negra', 'https://share.marvel.com/comics/discover/1174/marvels-spider-man-the-heist', 'Second Gata Negra model ID; title and collection reviewed independently.', 0);
