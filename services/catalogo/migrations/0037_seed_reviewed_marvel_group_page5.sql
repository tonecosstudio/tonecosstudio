-- Page 5 of Equipes e Grupos, audited model-by-model from the public API.
-- Two equipment records and one unnamed team diorama remain without character links.
-- Candidate only; do not apply or publish without the authorized M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_mistica', (SELECT id FROM franchises WHERE slug='viloes'), 'mistica', 'Mística', NULL, 'https://www.marvel.com/characters/mystique'),
  ('char_marvel_mulher_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'mulher-hulk', 'Mulher-Hulk', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_mulher_invisivel', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'mulher-invisivel', 'Mulher Invisível', NULL, 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('char_marvel_maquina_de_combate', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'maquina-de-combate', 'Máquina de Combate', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_namor', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'namor', 'Namor', NULL, 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('char_marvel_noturno', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'noturno', 'Noturno', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_pantera_negra', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'pantera-negra', 'Pantera Negra', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_polaris', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'polaris', 'Polaris', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_psylocke', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'psylocke', 'Psylocke', NULL, 'https://www.marvel.com/characters/psylocke'),
  ('char_marvel_red_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'red-hulk', 'Red Hulk', NULL, 'https://www.marvel.com/characters/red-hulk'),
  ('char_marvel_senhor_fantastico', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'senhor-fantastico', 'Senhor Fantástico', NULL, 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('char_marvel_demolidor', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'demolidor', 'Demolidor', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_marvel_capita_marvel', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'capita-marvel', 'Capitã Marvel', NULL, 'https://share.marvel.com/comics/discover/277/carol-danvers-captain-marvel'),
  ('char_marvel_magneto', (SELECT id FROM franchises WHERE slug='viloes'), 'magneto', 'Magneto', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_wolverine', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'wolverine', 'Wolverine', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_charles_xavier', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'charles-xavier', 'Charles Xavier', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'hulk', 'Hulk', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_rocket', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'rocket', 'Rocket', NULL, 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('attr_universe_quarteto-fantastico', 'universe', 'quarteto-fantastico', 'Quarteto Fantástico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('attr_universe_guardioes-da-galaxia', 'universe', 'guardioes-da-galaxia', 'Guardiões da Galáxia', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_b21a6c0c744c9ec2c9b1', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Magneto title and X-Men villain folder checked by ID.', 1),
  ('mdl_cda071fc75a89fc0fbe3', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Second Magneto model on this page; ID and folder reviewed separately.', 1),
  ('mdl_e607e6f0044f09ef0aba', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Third Magneto model on this page; ID and folder reviewed separately.', 1),
  ('mdl_e6e4c42ab642764db034', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Fourth Magneto model on this page; ID and folder reviewed separately.', 1),
  ('mdl_f98c50cf1be6d288d7ed', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Fifth Magneto model on this page; ID and folder reviewed separately.', 1),
  ('mdl_fa6969bedf16355d91de', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Sixth Magneto model on this page; ID and folder reviewed separately.', 1),
  ('mdl_040dfb883db79238b4bc', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Magneto e Charles Xavier: the title names Magneto; separate relation.', 1),
  ('mdl_040dfb883db79238b4bc', 'char_marvel_charles_xavier', 'owner_reviewed_model:2026-11-24', 'Magneto e Charles Xavier: the title names Charles Xavier; separate relation.', 1),
  ('mdl_dd16a0ce57421ec5e6bc', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Magneto e Wolverine: the title names Magneto; separate relation.', 1),
  ('mdl_dd16a0ce57421ec5e6bc', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Magneto e Wolverine: the title names Wolverine; separate relation.', 1),
  ('mdl_0e0c19c8641cbe692be4', 'char_marvel_mistica', 'owner_reviewed_model:2026-11-24', 'Mística in X-Men villains; official Marvel profile identifies Mystique/Raven Darkhölme.', 1),
  ('mdl_95859c2dafdb5da8f184', 'char_marvel_mistica', 'owner_reviewed_model:2026-11-24', 'Second Mística model; title and public folder checked separately.', 1),
  ('mdl_f4c013223c03a66220f7', 'char_marvel_mistica', 'owner_reviewed_model:2026-11-24', 'Third Mística model; title and public folder checked separately.', 1),
  ('mdl_501237d0dcec93d1de23', 'char_marvel_capita_marvel', 'owner_reviewed_model:2026-11-24', 'Ms. Marvel Carol Danvers resolves to canonical Carol Danvers/Captain Marvel; title and Vingadores folder checked.', 1),
  ('mdl_5143bfda26aebc7a964', 'char_marvel_mulher_hulk', 'owner_reviewed_model:2026-11-24', 'Mulher-Hulk e Demolidor: title names Jennifer Walters; separate character relation.', 1),
  ('mdl_5143bfda26aebc7a964', 'char_marvel_demolidor', 'owner_reviewed_model:2026-11-24', 'Mulher-Hulk e Demolidor: title names Demolidor; separate character relation.', 1),
  ('mdl_475691c2c8c8f644ca34', 'char_marvel_mulher_invisivel', 'owner_reviewed_model:2026-11-24', 'Mulher Invisível in the Fantastic Four collection; official roster confirms Susan Storm Richards.', 1),
  ('mdl_1a8c568259818b34a759', 'char_marvel_maquina_de_combate', 'owner_reviewed_model:2026-11-24', 'Máquina de Combate in Vingadores/Máquina de Combate; public ID and official team context reviewed.', 1),
  ('mdl_165389f6fc7cf32598ca', 'char_marvel_namor', 'owner_reviewed_model:2026-11-24', 'Namor in Quarteto Fantástico/Namor; public title and collection identify the character.', 1),
  ('mdl_401f49d0c38a85df4985', 'char_marvel_namor', 'owner_reviewed_model:2026-11-24', 'Second Namor model; title and collection reviewed individually.', 1),
  ('mdl_a47a88a289b424281d8b', 'char_marvel_namor', 'owner_reviewed_model:2026-11-24', 'Third Namor model; title and collection reviewed individually.', 1),
  ('mdl_afbddbdddb9c760c8b8f', 'char_marvel_namor', 'owner_reviewed_model:2026-11-24', 'Fourth Namor model; title and collection reviewed individually.', 1),
  ('mdl_0e2dfbd4ab0f1b730f2e', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Noturno in X-Men/Noturno; official X-Men roster context and public title reviewed.', 1),
  ('mdl_2f48c0a41da012d40c99', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Second Noturno model; public ID and folder checked separately.', 1),
  ('mdl_ad99dc68407a1dcff666', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Third Noturno model; public ID and folder checked separately.', 1),
  ('mdl_cd914e0eeb182e88344d', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Fourth Noturno model; public ID and folder checked separately.', 1),
  ('mdl_f37c242bd307490f67d7', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Fifth Noturno model; public ID and folder checked separately.', 1),
  ('mdl_fa4c25c473d212fa5450', 'char_marvel_noturno', 'owner_reviewed_model:2026-11-24', 'Sixth Noturno model; public ID and folder checked separately.', 1),
  ('mdl_058e35a1d2c210a32651', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Old Man Logan is a Wolverine variant/identity; preserve canonical Wolverine relation.', 1),
  ('mdl_0774df37842eed9b3b49', 'char_marvel_pantera_negra', 'owner_reviewed_model:2026-11-24', 'Pantera Negra in Vingadores/Pantera Negra; public title and official team context confirm.', 1),
  ('mdl_463f9ed1a8f7d5d785a6', 'char_marvel_pantera_negra', 'owner_reviewed_model:2026-11-24', 'Second Pantera Negra model; ID and folder reviewed separately.', 1),
  ('mdl_518002adefd8eca31cb6', 'char_marvel_pantera_negra', 'owner_reviewed_model:2026-11-24', 'Third Pantera Negra model; ID and folder reviewed separately.', 1),
  ('mdl_73899810823611f6a404', 'char_marvel_pantera_negra', 'owner_reviewed_model:2026-11-24', 'Fourth Pantera Negra model; ID and folder reviewed separately.', 1),
  ('mdl_acda6280da4a2a18aebd', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Planeta Hulk contra criaturas: title explicitly names Hulk; creatures are unnamed and remain untagged.', 1),
  ('mdl_815f83c72a409a8a90ee', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Planeta Hulk contra criaturas: title explicitly names Hulk; generic creatures are not individual characters.', 1),
  ('mdl_7cbe10bd46207d837db0', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Planeta Hulk diorama in the Vingadores/Hulk public collection; named Hulk identity retained.', 1),
  ('mdl_60e115626579b002700e', 'char_marvel_polaris', 'owner_reviewed_model:2026-11-24', 'Polaris in X-Men villains; public title and folder identify the character.', 1),
  ('mdl_90d55976e3a9b686cab5', 'char_marvel_polaris', 'owner_reviewed_model:2026-11-24', 'Second Polaris model; public ID and folder checked separately.', 1),
  ('mdl_5bbefe3688d3803110dc', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Psylocke in X-Men/Psylocke; official Marvel profile identifies the character.', 1),
  ('mdl_6a2c612e8754ed467c1f', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Second Psylocke model; title and folder checked individually.', 1),
  ('mdl_70c137b069f30070d769', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Third Psylocke model; title and folder checked individually.', 1),
  ('mdl_a7d5a286de5cdaa8ce8c', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Fourth Psylocke model; title and folder checked individually.', 1),
  ('mdl_f3bb20ee8cf44703a804', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Fifth Psylocke model; title and folder checked individually.', 1),
  ('mdl_f514513600ca81a5b473', 'char_marvel_psylocke', 'owner_reviewed_model:2026-11-24', 'Sixth Psylocke model; title and folder checked individually.', 1),
  ('mdl_4599a7e74b0a024dafd4', 'char_marvel_red_hulk', 'owner_reviewed_model:2026-11-24', 'Red Hulk is General Thaddeus Ross, a distinct individual identity; Marvel official profile confirms.', 1),
  ('mdl_4cd6508e75edbda26f62', 'char_marvel_red_hulk', 'owner_reviewed_model:2026-11-24', 'Second Red Hulk model; preserve Red Hulk as a distinct character from Bruce Banner/Hulk.', 1),
  ('mdl_db2a80ba704cbf52682f', 'char_marvel_red_hulk', 'owner_reviewed_model:2026-11-24', 'Third Red Hulk model; public title and Vingadores/Hulk folder checked.', 1),
  ('mdl_52dbed8cc17ad01bf41d', 'char_marvel_rocket', 'owner_reviewed_model:2026-11-24', 'Rocket in Guardians of the Galaxy/Rocket; title and official team context reviewed.', 1),
  ('mdl_4958207a1574d925fc3e', 'char_marvel_senhor_fantastico', 'owner_reviewed_model:2026-11-24', 'Senhor Fantástico in Quarteto Fantástico/Senhor Fantástico; official roster confirms Reed Richards.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_mistica', 'attr_publisher_marvel', 'https://www.marvel.com/characters/mystique', 'Official Marvel Mystique profile.'),
  ('char_marvel_mistica', 'attr_universe_x-men', 'https://www.marvel.com/characters/mystique', 'Official profile documents Mystique against and alongside X-Men; public catalog files X-Men villains.'),
  ('char_marvel_mulher_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Marvel character/team material.'),
  ('char_marvel_mulher_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Vingadores collection and official character/team history.'),
  ('char_marvel_mulher_invisivel', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official Fantastic Four roster.'),
  ('char_marvel_mulher_invisivel', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official roster and public collection confirm the affiliation.'),
  ('char_marvel_maquina_de_combate', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history.'),
  ('char_marvel_maquina_de_combate', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Public collection and official team context.'),
  ('char_marvel_namor', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official Marvel Fantastic Four material.'),
  ('char_marvel_namor', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Public collection files the reviewed Namor models under Fantastic Four.'),
  ('char_marvel_noturno', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster context.'),
  ('char_marvel_noturno', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official roster and public X-Men collection.'),
  ('char_marvel_pantera_negra', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster/history.'),
  ('char_marvel_pantera_negra', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official team context and public Vingadores collection.'),
  ('char_marvel_polaris', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men material.'),
  ('char_marvel_polaris', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public X-Men villain folder; official X-Men team references.'),
  ('char_marvel_psylocke', 'attr_publisher_marvel', 'https://www.marvel.com/characters/psylocke', 'Official Marvel Psylocke profile.'),
  ('char_marvel_psylocke', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men context and public X-Men collection.'),
  ('char_marvel_red_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/characters/red-hulk', 'Official Red Hulk profile identifies Thaddeus Ross as the character.'),
  ('char_marvel_red_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/characters/red-hulk', 'Official profile notes Red Hulk/Ross working alongside the Avengers; public folder also uses Vingadores.'),
  ('char_marvel_senhor_fantastico', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official Fantastic Four roster identifies Mister Fantastic/Reed Richards.'),
  ('char_marvel_senhor_fantastico', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official roster and public collection confirm the affiliation.'),
  ('char_marvel_capita_marvel', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/277/carol-danvers-captain-marvel', 'Marvel identifies Carol Danvers as Captain Marvel and notes her Ms. Marvel history.'),
  ('char_marvel_capita_marvel', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Carol Danvers appears on the official Avengers roster; public collection confirms.');