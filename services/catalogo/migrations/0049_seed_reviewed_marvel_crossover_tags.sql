-- Public Marvel crossover records and Red Sonja checked individually by model ID.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_attributes
  (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_dynamite', 'publisher', 'dynamite', 'Dynamite', 'https://dynamite.com/titles/red-sonja/');

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_rei_do_crime', (SELECT id FROM franchises WHERE slug='viloes'), 'rei-do-crime', 'Rei do Crime', NULL, 'https://www.marvel.com/characters/kingpin/'),
  ('char_marvel_justiceiro', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'justiceiro', 'Justiceiro', NULL, 'https://www.marvel.com/characters/punisher-frank-castle'),
  ('char_marvel_killmonger', (SELECT id FROM franchises WHERE slug='viloes'), 'killmonger', 'Killmonger', NULL, 'https://share.marvel.com/comics/discover/904/killmonger'),
  ('char_marvel_thanos', (SELECT id FROM franchises WHERE slug='viloes'), 'thanos', 'Thanos', NULL, 'https://www.marvel.com/characters/Thanos'),
  ('char_marvel_sentry', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'sentry', 'Sentry', NULL, 'https://share.marvel.com/comics/discover/2463/sentry'),
  ('char_other_red_sonja', (SELECT id FROM franchises WHERE slug='personagens-extras-e-outros'), 'red-sonja', 'Red Sonja', NULL, 'https://dynamite.com/titles/red-sonja/');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_demolidor', 'attr_publisher_marvel', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Marvel identifies Matt Murdock as Daredevil.'),
  ('char_marvel_rei_do_crime', 'attr_publisher_marvel', 'https://www.marvel.com/characters/kingpin/', 'Marvel identifies Wilson Fisk as Kingpin.'),
  ('char_marvel_justiceiro', 'attr_publisher_marvel', 'https://www.marvel.com/characters/punisher-frank-castle', 'Marvel identifies Frank Castle as the Punisher.'),
  ('char_marvel_wolverine', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel X-Men roster includes Wolverine.'),
  ('char_marvel_pantera_negra', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Marvel identifies Black Panther as an Avenger.'),
  ('char_marvel_namor', 'attr_publisher_marvel', 'https://www.marvel.com/characters/sub-mariner', 'Marvel identifies Namor the Sub-Mariner.'),
  ('char_marvel_killmonger', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/904/killmonger', 'Marvel identifies Erik Killmonger as Black Panther’s adversary.'),
  ('char_marvel_thanos', 'attr_publisher_marvel', 'https://www.marvel.com/characters/Thanos', 'Official Marvel character profile.'),
  ('char_marvel_sentry', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/2463/sentry', 'Official Marvel character listing identifies Sentry and Robert Reynolds.'),
  ('char_other_red_sonja', 'attr_publisher_dynamite', 'https://dynamite.com/titles/red-sonja/', 'Dynamite publishes Red Sonja; this is the publisher associated with this public model identity.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_539110cb1c68f21db454', 'char_other_red_sonja', 'https://dynamite.com/titles/red-sonja/', 'Public API title and folder both identify Red Sonja.', 0),
  ('mdl_830e54c0bb81b3fca4e0', 'char_other_red_sonja', 'https://dynamite.com/titles/red-sonja/', 'Second Red Sonja record; public API title and folder confirm the same character, reviewed by ID.', 0),
  ('mdl_a8bc7dfc982503c46967', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Public API title separately names Demolidor and Rei do Crime; first individual relation.', 1),
  ('mdl_a8bc7dfc982503c46967', 'char_marvel_rei_do_crime', 'https://www.marvel.com/characters/kingpin/', 'Public API title separately names Demolidor and Rei do Crime; Wilson Fisk is the individual Kingpin identity.', 1),
  ('mdl_4a30f60ad77e6641899a', 'char_marvel_justiceiro', 'https://www.marvel.com/characters/punisher-frank-castle', 'Public API title names Justiceiro and Wolverine; first individual relation.', 1),
  ('mdl_4a30f60ad77e6641899a', 'char_marvel_wolverine', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public API title names Justiceiro and Wolverine; second individual relation.', 1),
  ('mdl_794b70f6834ae9155462', 'char_marvel_pantera_negra', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Public API title names Pantera Negra and Namor; first individual relation.', 1),
  ('mdl_794b70f6834ae9155462', 'char_marvel_namor', 'https://www.marvel.com/characters/sub-mariner', 'Public API title names Pantera Negra and Namor; second individual relation.', 1),
  ('mdl_60d6adc77461a015ebef', 'char_marvel_pantera_negra', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Public API title names Pantera Negra and Killmonger; first individual relation.', 1),
  ('mdl_60d6adc77461a015ebef', 'char_marvel_killmonger', 'https://share.marvel.com/comics/discover/904/killmonger', 'Public API title names Pantera Negra and Killmonger; separate antagonist identity.', 1),
  ('mdl_bcf35d4718ee9bb71db7', 'char_marvel_thanos', 'https://www.marvel.com/characters/Thanos', 'Public API title names Thanos and Sentry; first individual relation.', 1),
  ('mdl_bcf35d4718ee9bb71db7', 'char_marvel_sentry', 'https://share.marvel.com/comics/discover/2463/sentry', 'Public API title names Thanos and Sentry; separate individual relation.', 1);
