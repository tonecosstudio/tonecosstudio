-- Final API page of the public Equipes e Grupos collection: reviewed by model ID.
-- The complete public collection contains 354 records across 8 pages.
-- Candidate only; do not apply or publish before authorized M5 approval.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_omega_red', (SELECT id FROM franchises WHERE slug='viloes'), 'omega-red', 'Ômega Red', NULL, 'https://www.marvel.com/characters/omega-red'),
  ('char_marvel_x23', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'x-23', 'X-23', NULL, 'https://www.marvel.com/characters/x-23'),
  ('char_marvel_yondu', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'yondu', 'Yondu', NULL, 'https://www.marvel.com/characters/yondu'),
  ('char_marvel_wolverine', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'wolverine', 'Wolverine', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_deadpool', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'deadpool', 'Deadpool', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_marvel_dentes_de_sabre', (SELECT id FROM franchises WHERE slug='viloes'), 'dentes-de-sabre', 'Dentes de Sabre', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_capitao_america', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'capitao-america', 'Capitão América', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'hulk', 'Hulk', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('attr_universe_guardioes-da-galaxia', 'universe', 'guardioes-da-galaxia', 'Guardiões da Galáxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_e9a0606f0efbc4023786', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine in X-Men/Wolverine; first of the final page records, checked by ID.', 1),
  ('mdl_ec953a96095732c4a0b1', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Second Wolverine model on final page; title and folder checked individually.', 1),
  ('mdl_e4d356f2c4ee0a92e6a9', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine e Deadpool: title names Wolverine; separate first relation.', 1),
  ('mdl_e4d356f2c4ee0a92e6a9', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Wolverine e Deadpool: title names Deadpool; separate second relation.', 1),
  ('mdl_b52267d66b29b887ce6b', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine sobre Dentes de Sabre: title names Wolverine; separate first relation.', 1),
  ('mdl_b52267d66b29b887ce6b', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Wolverine sobre Dentes de Sabre: title names Dentes de Sabre; separate second relation.', 1),
  ('mdl_755b6b252b7f1173ecdd', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Capitão América: title names Wolverine; separate first relation.', 1),
  ('mdl_755b6b252b7f1173ecdd', 'char_marvel_capitao_america', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Capitão América: title names Capitão América; separate second relation.', 1),
  ('mdl_d076960a81de17fdfcd3', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Dentes de Sabre 01: title explicitly names Wolverine.', 1),
  ('mdl_d076960a81de17fdfcd3', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Dentes de Sabre 01: title explicitly names Dentes de Sabre.', 1),
  ('mdl_d52f8a6a9bc02f1f2323', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Dentes de Sabre 02: title explicitly names Wolverine.', 1),
  ('mdl_d52f8a6a9bc02f1f2323', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Dentes de Sabre 02: title explicitly names Dentes de Sabre.', 1),
  ('mdl_b634f75d8f134d824290', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Hulk: title explicitly names Wolverine; separate relation.', 1),
  ('mdl_b634f75d8f134d824290', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Hulk: title explicitly names Hulk; separate relation.', 1),
  ('mdl_6cdf79e1a0c624e29091', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Hulk colorido: title explicitly names Wolverine; separate relation.', 1),
  ('mdl_6cdf79e1a0c624e29091', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Hulk colorido: title explicitly names Hulk; separate relation.', 1),
  ('mdl_699128768fe432f39c35', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Omega Red: title explicitly names Wolverine; separate first relation.', 1),
  ('mdl_699128768fe432f39c35', 'char_marvel_omega_red', 'owner_reviewed_model:2026-11-24', 'Wolverine vs Omega Red: title explicitly names Omega Red; separate second relation.', 1),
  ('mdl_eb8b36c11b31b9fb8e03', 'char_marvel_x23', 'owner_reviewed_model:2026-11-24', 'X23 statue in X-Men/X-23; character is separately identified as X-23.', 1),
  ('mdl_b460ad7dd3d9da6c6130', 'char_marvel_x23', 'owner_reviewed_model:2026-11-24', 'Second X-23 model; title and folder reviewed individually.', 1),
  ('mdl_9ab2ad4f3188edddc838', 'char_marvel_x23', 'owner_reviewed_model:2026-11-24', 'Third X-23 model; costume/view details stay out of the character tag.', 1),
  ('mdl_11f9d8a6696c13c1f996', 'char_marvel_x23', 'owner_reviewed_model:2026-11-24', 'Fourth X-23 model; title and folder reviewed individually.', 1),
  ('mdl_04de07e0be5f3d02d980', 'char_marvel_yondu', 'owner_reviewed_model:2026-11-24', 'Yondu in Guardians of the Galaxy/Yondu; title and collection reviewed.', 1),
  ('mdl_d6514ebd4c39880a8771', 'char_marvel_yondu', 'owner_reviewed_model:2026-11-24', 'Second Yondu model; public title and ID reviewed separately.', 1),
  ('mdl_2244c0b3c8f8ff1fb2fa', 'char_marvel_omega_red', 'owner_reviewed_model:2026-11-24', 'Omega Red in X-Men villains; title, folder, and official Marvel character profile confirm.', 1),
  ('mdl_44ee1465446e0754159c', 'char_marvel_omega_red', 'owner_reviewed_model:2026-11-24', 'Second Omega Red model; ID and X-Men villain folder reviewed.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_omega_red', 'attr_publisher_marvel', 'https://www.marvel.com/characters/omega-red', 'Official Marvel character profile.'),
  ('char_marvel_omega_red', 'attr_universe_x-men', 'https://www.marvel.com/characters/omega-red', 'Official profile and public X-Men villains folder.'),
  ('char_marvel_x23', 'attr_publisher_marvel', 'https://www.marvel.com/characters/x-23', 'Official Marvel character profile.'),
  ('char_marvel_x23', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public X-Men/X-23 folder and official team context.'),
  ('char_marvel_yondu', 'attr_publisher_marvel', 'https://www.marvel.com/characters/yondu', 'Official Marvel Yondu profile.'),
  ('char_marvel_yondu', 'attr_universe_guardioes-da-galaxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Public Guardians collection and official team context.'),
  ('char_marvel_wolverine', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster.'),
  ('char_marvel_wolverine', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster and public collection.'),
  ('char_marvel_deadpool', 'attr_publisher_marvel', 'https://www.marvel.com/characters/deadpool-wade-wilson', 'Official Marvel character profile.'),
  ('char_marvel_dentes_de_sabre', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men material.'),
  ('char_marvel_dentes_de_sabre', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men history and public villain collection.'),
  ('char_marvel_capitao_america', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster.'),
  ('char_marvel_capitao_america', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official roster and crossover collection.'),
  ('char_marvel_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history.'),
  ('char_marvel_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history and public confrontation folder.');