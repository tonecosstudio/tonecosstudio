-- Page 6 of Equipes e Grupos, audited by public API ID.
-- The generic Sentinela model is a robot class, not one named individual, so it remains held.
-- Candidate migration only. Never apply before the authorized M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_senhor_sinistro', (SELECT id FROM franchises WHERE slug='viloes'), 'senhor-sinistro', 'Senhor Sinistro', NULL, 'https://www.marvel.com/characters/mister-sinister'),
  ('char_marvel_skaar', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'skaar', 'Skaar', NULL, 'https://www.marvel.com/characters/skaar'),
  ('char_marvel_senhor_das_estrelas', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'senhor-das-estrelas', 'Star-Lord', NULL, 'https://www.marvel.com/characters/star-lord-peter-quill'),
  ('char_marvel_super_skrull', (SELECT id FROM franchises WHERE slug='viloes'), 'super-skrull', 'Super-Skrull', NULL, 'https://www.marvel.com/characters/super-skrull-klrt'),
  ('char_marvel_surfista_prateado', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'surfista-prateado', 'Surfista Prateado', NULL, 'https://www.marvel.com/characters/silver-surfer-norrin-radd'),
  ('char_marvel_tempestade', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'tempestade', 'Tempestade', NULL, 'https://www.marvel.com/characters/storm'),
  ('char_marvel_thor', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'thor', 'Thor', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_mulher_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'mulher-hulk', 'Mulher-Hulk', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('attr_universe_guardioes-da-galaxia', 'universe', 'guardioes-da-galaxia', 'Guardiões da Galáxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/'),
  ('attr_universe_quarteto-fantastico', 'universe', 'quarteto-fantastico', 'Quarteto Fantástico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_328834e473fbe320183f', 'char_marvel_senhor_sinistro', 'owner_reviewed_model:2026-11-24', 'Senhor Sinistro in X-Men villains; official Marvel profile identifies Nathaniel Essex/Mister Sinister.', 1),
  ('mdl_5233362029e6a03e398c', 'char_marvel_senhor_sinistro', 'owner_reviewed_model:2026-11-24', 'Second Senhor Sinistro model; public title and folder reviewed separately.', 1),
  ('mdl_5da358e13b93bab1a5d3', 'char_marvel_senhor_sinistro', 'owner_reviewed_model:2026-11-24', 'Third Senhor Sinistro model; public title and folder reviewed separately.', 1),
  ('mdl_98258a877c2fa162f738', 'char_marvel_senhor_sinistro', 'owner_reviewed_model:2026-11-24', 'Fourth Senhor Sinistro model; public title and folder reviewed separately.', 1),
  ('mdl_7750a95a403d293cba4e', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'She-Hulk with hammer and weights: appearance is variant metadata; canonical person is Jennifer Walters.', 1),
  ('mdl_e3e5091ade2d538ced4f', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Second She-Hulk model; gym weights are visual details, not tags.', 1),
  ('mdl_78b7d799c772852461d2', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Third She-Hulk model; hammer/statue details do not change identity.', 1),
  ('mdl_5144cd47ca1f542e59c3', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'She-Hulk Jennifer Walters double version; single canonical character identity.', 1),
  ('mdl_0e2b3a642644b70d1e97', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Fifth She-Hulk model; title and folder reviewed by ID.', 1),
  ('mdl_597b695ca1a08e686930', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Sixth She-Hulk model; title and folder reviewed by ID.', 1),
  ('mdl_0ce952bd49444be23cf6', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Seventh She-Hulk model; three views are model presentation only.', 1),
  ('mdl_ee1c274b7117ec337175', 'char_marvel_skaar', 'owner_reviewed_model:2026-11-24', 'Skaar in Vingadores/Hulk/Skaar; public title and ID identify the individual character.', 1),
  ('mdl_052cc60f912f9850657c', 'char_marvel_senhor_das_estrelas', 'owner_reviewed_model:2026-11-24', 'Star-Lord in Guardians of the Galaxy/Star-Lord; official Marvel character profile confirms identity.', 1),
  ('mdl_435c48d6ccf537e20299', 'char_marvel_senhor_das_estrelas', 'owner_reviewed_model:2026-11-24', 'Second Star-Lord model; title and Guardians folder reviewed by ID.', 1),
  ('mdl_b5c9468b5f521229da7b', 'char_marvel_senhor_das_estrelas', 'owner_reviewed_model:2026-11-24', 'Third Star-Lord model; title and Guardians folder reviewed by ID.', 1),
  ('mdl_ca56ba567faf213b881f', 'char_marvel_senhor_das_estrelas', 'owner_reviewed_model:2026-11-24', 'Fourth Star-Lord model; title and Guardians folder reviewed by ID.', 1),
  ('mdl_449593a4092e1ddf177b', 'char_marvel_super_skrull', 'owner_reviewed_model:2026-11-24', 'Super-Skrull in Fantastic Four villains; official Marvel profile identifies Kl’rt.', 1),
  ('mdl_324784c48fe5baf8fdfd', 'char_marvel_surfista_prateado', 'owner_reviewed_model:2026-11-24', 'Surfista Prateado in Quarteto Fantástico collection; official Marvel profile identifies Norrin Radd.', 1),
  ('mdl_33fa44c9d44a147a73dd', 'char_marvel_surfista_prateado', 'owner_reviewed_model:2026-11-24', 'Second Surfista Prateado model; title and collection reviewed individually.', 1),
  ('mdl_4ea60b1daf3f1cc2ed1b', 'char_marvel_surfista_prateado', 'owner_reviewed_model:2026-11-24', 'Third Surfista Prateado model; title and collection reviewed individually.', 1),
  ('mdl_a4e161c3c538328fa39c', 'char_marvel_surfista_prateado', 'owner_reviewed_model:2026-11-24', 'Fourth Surfista Prateado model; title and collection reviewed individually.', 1),
  ('mdl_af0d8d4e151aab32a8ac', 'char_marvel_surfista_prateado', 'owner_reviewed_model:2026-11-24', 'Fifth Surfista Prateado model; title and collection reviewed individually.', 1),
  ('mdl_113605b916d1a2bf12a8', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Tempestade in X-Men/Tempestade; official Marvel profile and public folder confirm identity.', 1),
  ('mdl_374442131921dd983741', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Second Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_6021eb20ddff05f8232f', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Third Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_8e1922092d90882cfdb0', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Fourth Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_96a207c1f9ecb88d59f8', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Fifth Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_a27d68e07e0ad146b481', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Sixth Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_a8a64ab3a228a6141761', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Seventh Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_d2d8a6142d5637c4e459', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Eighth Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_dcaa58e55c4cf1c511d4', 'char_marvel_tempestade', 'owner_reviewed_model:2026-11-24', 'Ninth Tempestade model; title and folder reviewed by ID.', 1),
  ('mdl_01afcbc3930b77262b5a', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Thor in Vingadores/Thor; title and official Avengers roster confirm.', 1),
  ('mdl_336deef62c9b3c842cf3', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Second Thor model; public ID and collection reviewed.', 1),
  ('mdl_4192f8e7cf69d8a57b4f', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Third Thor model; public ID and collection reviewed.', 1),
  ('mdl_4cd23369fd7eeb43a014', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Fourth Thor model; public ID and collection reviewed.', 1),
  ('mdl_50772c32facae6b73c2c', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Fifth Thor model; public ID and collection reviewed.', 1),
  ('mdl_79770ecd35b052603117', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Sixth Thor model; public ID and collection reviewed.', 1),
  ('mdl_8df0009720051d6ed490', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Seventh Thor model; public ID and collection reviewed.', 1),
  ('mdl_957e7cda48da02d28c6f', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Eighth Thor model; public ID and collection reviewed.', 1),
  ('mdl_a63899a9010b5c839f72', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Ninth Thor model; public ID and collection reviewed.', 1),
  ('mdl_a74b2cff2fd4c56e305b', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Tenth Thor model; public ID and collection reviewed.', 1),
  ('mdl_a9afa21a18f131d45a36', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Eleventh Thor model; public ID and collection reviewed.', 1),
  ('mdl_aa941eed3ba1a8196c6e', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Twelfth Thor model; public ID and collection reviewed.', 1),
  ('mdl_b6e0680da954bb5ef07f', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Thirteenth Thor model; public ID and collection reviewed.', 1),
  ('mdl_baa5a95a50ac45dea8f8', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Fourteenth Thor model; public ID and collection reviewed.', 1),
  ('mdl_c7332b16b09f481e7481', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Fifteenth Thor model; public ID and collection reviewed.', 1),
  ('mdl_ddb55c4397ac05307d06', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Sixteenth Thor model; public ID and collection reviewed.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_senhor_sinistro', 'attr_publisher_marvel', 'https://www.marvel.com/characters/mister-sinister', 'Official Marvel profile.'),
  ('char_marvel_senhor_sinistro', 'attr_universe_x-men', 'https://www.marvel.com/characters/mister-sinister', 'Official profile places Sinister in repeated X-Men conflicts; public collection is the X-Men villain tree.'),
  ('char_marvel_mulher_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster.'),
  ('char_marvel_mulher_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'She-Hulk appears on the official Avengers roster; public collection agrees.'),
  ('char_marvel_skaar', 'attr_publisher_marvel', 'https://www.marvel.com/characters/skaar', 'Official Marvel Skaar character profile.'),
  ('char_marvel_senhor_das_estrelas', 'attr_publisher_marvel', 'https://www.marvel.com/characters/star-lord-peter-quill', 'Official Marvel Star-Lord profile.'),
  ('char_marvel_senhor_das_estrelas', 'attr_universe_guardioes-da-galaxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Official Guardians roster/team page and public collection.'),
  ('char_marvel_super_skrull', 'attr_publisher_marvel', 'https://www.marvel.com/characters/super-skrull-klrt', 'Official Marvel Super-Skrull profile.'),
  ('char_marvel_super_skrull', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'The public catalog places Super-Skrull under Fantastic Four villains.'),
  ('char_marvel_surfista_prateado', 'attr_publisher_marvel', 'https://www.marvel.com/characters/silver-surfer-norrin-radd', 'Official Marvel Silver Surfer profile.'),
  ('char_marvel_surfista_prateado', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Public collection associates these records with Fantastic Four; Marvel describes Silver Surfer as an ally.'),
  ('char_marvel_tempestade', 'attr_publisher_marvel', 'https://www.marvel.com/characters/storm', 'Official Marvel Storm profile.'),
  ('char_marvel_tempestade', 'attr_universe_x-men', 'https://www.marvel.com/characters/storm/in-comics', 'Official Marvel story and public folder confirm X-Men context.'),
  ('char_marvel_thor', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster.'),
  ('char_marvel_thor', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster and public Vingadores/Thor collection.');