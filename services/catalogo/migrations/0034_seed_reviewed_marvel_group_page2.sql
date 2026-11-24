-- Page-by-page, individually reviewed Marvel model associations.
-- Local candidate only; do not apply before the authorized M5 gate.
-- Evidence is the public catalog API by model ID plus the official Marvel references below.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_deadpool', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'deadpool', 'Deadpool', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_marvel_dentes_de_sabre', (SELECT id FROM franchises WHERE slug='viloes'), 'dentes-de-sabre', 'Dentes de Sabre', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_domino', (SELECT id FROM franchises WHERE slug='equipes-e-grupos'), 'domino', 'Dominó', NULL, 'https://share.marvel.com/comics/discover/934/domino'),
  ('char_marvel_doutor_estranho', (SELECT id FROM franchises WHERE slug='equipes-e-grupos'), 'doutor-estranho', 'Doutor Estranho', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_drax', (SELECT id FROM franchises WHERE slug='equipes-e-grupos'), 'drax', 'Drax', NULL, 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/'),
  ('char_marvel_emma_frost', (SELECT id FROM franchises WHERE slug='equipes-e-grupos'), 'emma-frost', 'Emma Frost', NULL, 'https://www.marvel.com/characters/emma-frost');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_guardioes-da-galaxia', 'universe', 'guardioes-da-galaxia', 'Guardiões da Galáxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/'),
  ('attr_universe_quarteto-fantastico', 'universe', 'quarteto-fantastico', 'Quarteto Fantástico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_39e7e37ae991965efc61', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_6e3b7887f73f98fa1717', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_76a7515255a3163b30c1', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_962fb16e3069caaeedb4', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_b4d1b184fef6d84fc1f9', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_b8c573b84931c7301197', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in the X-Men group catalog; model ID reviewed individually. No X-Men affiliation inferred from grouping alone.', 1),
  ('mdl_272f18274731e142ad75', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Dentes de Sabre; public folder is X-Men villains. Marvel lists Sabretooth among X-Men characters.', 1),
  ('mdl_2fb4731f218c63e0b2c7', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Second Dentes de Sabre model; title and ID reviewed separately.', 1),
  ('mdl_3758b64d6967aaa0ccf0', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Third Dentes de Sabre model; title and ID reviewed separately.', 1),
  ('mdl_658ed6136d83cd507d82', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Fourth Dentes de Sabre model; title and ID reviewed separately.', 1),
  ('mdl_69d20e94e29c85914553', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Fifth Dentes de Sabre model; title and ID reviewed separately.', 1),
  ('mdl_809e937a8bf00bcf074b', 'char_marvel_dentes_de_sabre', 'owner_reviewed_model:2026-11-24', 'Sixth Dentes de Sabre model; title and ID reviewed separately.', 1),
  ('mdl_87f700ca51fc10539882', 'char_marvel_domino', 'owner_reviewed_model:2026-11-24', 'Dominó in X-Men/Domino; Marvel identifies her as a mainstay X-Force member.', 0),
  ('mdl_9b103a8c42f301075b3d', 'char_marvel_doutor_destino', 'owner_reviewed_model:2026-11-24', 'Doutor Destino in the Quarteto Fantástico villains folder; reuses Doctor Doom, not DC Senhor Destino.', 1),
  ('mdl_aea6bef782ecdb0f46fa', 'char_marvel_doutor_destino', 'owner_reviewed_model:2026-11-24', 'Second Doctor Doom record in the Quarteto Fantástico villain folder; model ID reviewed separately.', 1),
  ('mdl_b6ab78f1028b97eaf479', 'char_marvel_doutor_destino', 'owner_reviewed_model:2026-11-24', 'Third Doctor Doom record in the Quarteto Fantástico villain folder; model ID reviewed separately.', 1),
  ('mdl_ea959f93829fbaf7ffbc', 'char_marvel_doutor_destino', 'owner_reviewed_model:2026-11-24', 'Fourth Doctor Doom record in the Quarteto Fantástico villain folder; model ID reviewed separately.', 1),
  ('mdl_05ea108fc0032f5f307c', 'char_marvel_doutor_estranho', 'owner_reviewed_model:2026-11-24', 'Doutor Estranho in Vingadores/Doutor Estranho; Marvel Avengers roster lists Stephen Strange.', 0),
  ('mdl_5bcb2035f108895d353c', 'char_marvel_doutor_estranho', 'owner_reviewed_model:2026-11-24', 'Second Doutor Estranho model in the Vingadores folder; ID reviewed separately.', 0),
  ('mdl_8a50a83d2ffc300f1230', 'char_marvel_doutor_estranho', 'owner_reviewed_model:2026-11-24', 'Third Doutor Estranho model in the Vingadores folder; ID reviewed separately.', 0),
  ('mdl_bf3c85b52154d79ba4a0', 'char_marvel_doutor_estranho', 'owner_reviewed_model:2026-11-24', 'Fourth Doutor Estranho model in the Vingadores folder; ID reviewed separately.', 0),
  ('mdl_2d7a265bebe9adb27024', 'char_marvel_drax', 'owner_reviewed_model:2026-11-24', 'Drax in Guardians of the Galaxy/Drax; official Marvel team page supports the named affiliation.', 0),
  ('mdl_5f5953cbdc3a39536df3', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Duckpool statue is a named Deadpool variant in the public catalog; canonical Deadpool identity retained.', 1),
  ('mdl_0bf08c10e35899205345', 'char_marvel_emma_frost', 'owner_reviewed_model:2026-11-24', 'Emma Frost in X-Men/Emma Frost; official Marvel profile confirms the character.', 0),
  ('mdl_0feb3edd3cade8ae8d6a', 'char_marvel_emma_frost', 'owner_reviewed_model:2026-11-24', 'Second Emma Frost model; title and ID reviewed separately.', 0),
  ('mdl_404edb22ca6967b73b57', 'char_marvel_emma_frost', 'owner_reviewed_model:2026-11-24', 'Third Emma Frost model; title and ID reviewed separately.', 0),
  ('mdl_9b848bf9a9a8c1da0bab', 'char_marvel_emma_frost', 'owner_reviewed_model:2026-11-24', 'Fourth Emma Frost model; title and ID reviewed separately.', 0),
  ('mdl_bbe0b39e832530f09731', 'char_marvel_emma_frost', 'owner_reviewed_model:2026-11-24', 'Fifth Emma Frost model; title and ID reviewed separately.', 0);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_deadpool', 'attr_publisher_marvel', 'https://www.marvel.com/characters/deadpool-wade-wilson', 'Marvel character identity.'),
  ('char_marvel_dentes_de_sabre', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel character identity.'),
  ('char_marvel_dentes_de_sabre', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel lists Sabretooth in X-Men-related characters; catalog folder is X-Men villains.'),
  ('char_marvel_domino', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/934/domino', 'Marvel character profile.'),
  ('char_marvel_domino', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-force', 'Marvel identifies Domino as an X-Force member; public catalog places the model under X-Men.'),
  ('char_marvel_doutor_destino', 'attr_publisher_marvel', 'owner_reviewed_public_catalog:2026-11-24', 'Canonical identity is Marvel Doctor Doom, distinct from DC Doctor Fate.'),
  ('char_marvel_doutor_destino', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Public catalog folder identifies these records as Fantastic Four villains.'),
  ('char_marvel_doutor_estranho', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Marvel Avengers roster lists Stephen Strange.'),
  ('char_marvel_doutor_estranho', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official roster and public catalog folder confirm Avengers association.'),
  ('char_marvel_drax', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Marvel Guardians of the Galaxy team page.'),
  ('char_marvel_drax', 'attr_universe_guardioes-da-galaxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Public catalog folder identifies Drax within the Guardians collection.'),
  ('char_marvel_emma_frost', 'attr_publisher_marvel', 'https://www.marvel.com/characters/emma-frost', 'Official Marvel character profile.'),
  ('char_marvel_emma_frost', 'attr_universe_x-men', 'https://www.marvel.com/characters/emma-frost', 'Official Marvel profile identifies Emma Frost in the X-Men context.');
-- The first twenty models of this same API page are repeated idempotently here
-- so this page remains complete even if an earlier candidate seed is absent.
INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_ciclope', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'ciclope', 'Ciclope', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_coisa', (SELECT id FROM franchises WHERE slug='equipes-e-grupos'), 'coisa', 'Coisa', NULL, 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('char_marvel_colossus', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'colossus', 'Colossus', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_wolverine', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'wolverine', 'Wolverine', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_3a664edc29c00a63d8eb', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Sixth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_627197107b6ef9ba9074', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Seventh Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_92f262c99aac7e67394b', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Eighth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_9f428d3888ee0874075a', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Ninth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_a57d288fb13e4f553df8', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Tenth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_a8a1fa881853f377c86c', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Eleventh Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_ac050a3dc99d183ccbfe', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Twelfth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_c876cee3b202585be13f', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Thirteenth Ciclope model; individual public ID and X-Men folder reviewed.', 1),
  ('mdl_00e2a361c019918aecb4', 'char_marvel_coisa', 'owner_reviewed_model:2026-11-24', 'Coisa in Quarteto Fantástico/Coisa; Marvel team roster confirms Ben Grimm/The Thing.', 0),
  ('mdl_231f0c08a73861d8f0bb', 'char_marvel_coisa', 'owner_reviewed_model:2026-11-24', 'Second Coisa model; title and folder reviewed by ID.', 0),
  ('mdl_e2d20938044ce2222a54', 'char_marvel_coisa', 'owner_reviewed_model:2026-11-24', 'Third Coisa model; title and folder reviewed by ID.', 0),
  ('mdl_fe505be5db159d9dbb68', 'char_marvel_coisa', 'owner_reviewed_model:2026-11-24', 'Fourth Coisa model; title and folder reviewed by ID.', 0),
  ('mdl_4b780eac35abc084f80d', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Colossus in X-Men/Colossus; public title and model ID checked.', 1),
  ('mdl_546b10121f0ec887862d', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Second Colossus model; public ID and folder checked.', 1),
  ('mdl_703492a64047b588b983', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Third Colossus model; public ID and folder checked.', 1),
  ('mdl_8eeff1f666133b75251c', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Fourth Colossus model; public ID and folder checked.', 1),
  ('mdl_9fa2f328b2ea33538d50', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Fifth Colossus model; public ID and folder checked.', 1),
  ('mdl_e531d7641184dc0eda3e', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Title explicitly names Colossus and Wolverine; separate Colossus relation.', 1),
  ('mdl_e531d7641184dc0eda3e', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Title explicitly names Colossus and Wolverine; separate Wolverine relation.', 1),
  ('mdl_21f9ab8a9b5318a4d3fb', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Deadpool record in group collection; reviewed by ID without inferring X-Men affiliation.', 1),
  ('mdl_2ddbfeda8e5ddf74f914', 'char_marvel_deadpool', 'owner_reviewed_model:2026-11-24', 'Second Deadpool record in group collection; reviewed by ID without inferring X-Men affiliation.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_ciclope', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel X-Men roster.'),
  ('char_marvel_ciclope', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public X-Men model folder and Marvel team roster.'),
  ('char_marvel_coisa', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Marvel Fantastic Four roster.'),
  ('char_marvel_coisa', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Public Quarteto Fantástico folder and Marvel roster.'),
  ('char_marvel_colossus', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel X-Men roster.'),
  ('char_marvel_colossus', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public X-Men model folder and Marvel team roster.'),
  ('char_marvel_wolverine', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel X-Men roster.'),
  ('char_marvel_wolverine', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public X-Men model folder and Marvel team roster.');