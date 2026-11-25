-- Page 3 of Equipes e Grupos, reviewed by canonical model ID against the local public API.
-- Official Marvel team/character profiles support affiliations. Staged only; M5 gate is not authorized.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_fera', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'fera', 'Fera', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_galactus', (SELECT id FROM franchises WHERE slug='viloes'), 'galactus', 'Galactus', NULL, 'https://www.marvel.com/characters/galactus/'),
  ('char_marvel_gambit', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'gambit', 'Gambit', NULL, 'https://www.marvel.com/characters/gambit'),
  ('char_marvel_gaviao_arqueiro', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'gaviao-arqueiro', 'Gavião Arqueiro', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_groot', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'groot', 'Groot', NULL, 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/'),
  ('char_marvel_rocket', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'rocket', 'Rocket', NULL, 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/'),
  ('char_marvel_homem_aranha', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'homem-aranha', 'Homem-Aranha', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_marvel_homem_de_ferro', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'homem-de-ferro', 'Homem de Ferro', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_homem_de_gelo', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'homem-de-gelo', 'Homem de Gelo', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_hulk', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'hulk', 'Hulk', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_vampira', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'vampira', 'Vampira', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics');

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
  ('mdl_0086bb85f15d3adc1055', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Fera in X-Men/Fera; public API title, collection and model ID checked.', 1),
  ('mdl_12b80caefdffa0765cb8', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Second Fera model in X-Men/Fera; ID checked separately.', 1),
  ('mdl_251679b5c2028b1433c0', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Third Fera model in X-Men/Fera; ID checked separately.', 1),
  ('mdl_345515a5239f0eab2448', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Fourth Fera model in X-Men/Fera; ID checked separately.', 1),
  ('mdl_d700c44eed94ecb54e18', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Fifth Fera model in X-Men/Fera; ID checked separately.', 1),
  ('mdl_e221b01e90e467add646', 'char_marvel_fera', 'owner_reviewed_model:2026-11-24', 'Sixth Fera model in X-Men/Fera; ID checked separately.', 1),
  ('mdl_1c65869409888fc3d4dd', 'char_marvel_galactus', 'owner_reviewed_model:2026-11-24', 'Galactus in Quarteto Fantástico/Vilões/Galactus; title and folder support the distinct individual.', 1),
  ('mdl_5ef2af72465df3869b35', 'char_marvel_galactus', 'owner_reviewed_model:2026-11-24', 'Second Galactus model; public title and folder checked separately.', 1),
  ('mdl_209e99cf0f6d2edfc188', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Gambit in X-Men/Gambit; official Marvel character profile supports the identity and X-Men context.', 1),
  ('mdl_671406d754e5e2483430', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Second Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_6db837300a44422962a3', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Third Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_79fcc826f423486f599d', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Fourth Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_a080ec5d85ffdfc35944', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Fifth Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_bfc3295a0b7670d2b2ab', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Sixth Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_c7ecf45ad8689d738f49', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'Seventh Gambit model in the X-Men collection; ID checked individually.', 1),
  ('mdl_632946b761e0f649b9d0', 'char_marvel_gambit', 'owner_reviewed_model:2026-11-24', 'The public model title explicitly names Gambit and Vampira; this is the separate Gambit relation.', 1),
  ('mdl_632946b761e0f649b9d0', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'The public model title explicitly names Gambit and Vampira; this is the separate Vampira relation.', 1),
  ('mdl_4518528e64419fed305b', 'char_marvel_gaviao_arqueiro', 'owner_reviewed_model:2026-11-24', 'Gavião Arqueiro in Vingadores/Gavião Arqueiro; official Avengers history identifies Hawkeye among its members.', 1),
  ('mdl_507f0096b63255c8fd40', 'char_marvel_groot', 'owner_reviewed_model:2026-11-24', 'Groot in Guardians of the Galaxy/Groot; official Marvel Guardians sources confirm the character.', 1),
  ('mdl_52720fcfa55520bbcf6f', 'char_marvel_groot', 'owner_reviewed_model:2026-11-24', 'Second Groot model; public title and Guardians folder reviewed separately.', 1),
  ('mdl_79bce9ea706b8c85026f', 'char_marvel_groot', 'owner_reviewed_model:2026-11-24', 'Third Groot model; public title and Guardians folder reviewed separately.', 1),
  ('mdl_b651d4139c1eb9715949', 'char_marvel_groot', 'owner_reviewed_model:2026-11-24', 'Fourth Groot model; public title and Guardians folder reviewed separately.', 1),
  ('mdl_78fc13707479aa1eb4ff', 'char_marvel_groot', 'owner_reviewed_model:2026-11-24', 'Groot e Rocket busto dupla; first named character relation.', 1),
  ('mdl_78fc13707479aa1eb4ff', 'char_marvel_rocket', 'owner_reviewed_model:2026-11-24', 'Groot e Rocket busto dupla; second named character relation.', 1),
  ('mdl_af340da9545767612eb1', 'char_marvel_homem_aranha', 'owner_reviewed_model:2026-11-24', 'Public title explicitly names Homem-Aranha e Hulk; separate Homem-Aranha relation.', 1),
  ('mdl_af340da9545767612eb1', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Public title explicitly names Homem-Aranha e Hulk; separate Hulk relation.', 1),
  ('mdl_46c56e734de37f452c3c', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Model title: Batman vs homem de ferro em diorama. Confirmed as one separate Homem de Ferro tag across franchises.', 1),
  ('mdl_2572f45c00e15015fd8b', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Homem de Ferro in Vingadores/Homem de Ferro; public title and folder reviewed.', 1),
  ('mdl_3a6961558bf191438f27', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Second Homem de Ferro model; ID and collection checked individually.', 1),
  ('mdl_75a4725370116cb11c97', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Third Homem de Ferro model; ID and collection checked individually.', 1),
  ('mdl_83f992e12f00b93ed3e6', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Fourth Homem de Ferro model; ID and collection checked individually.', 1),
  ('mdl_aef713d89e1ecfa0ec23', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Fifth Homem de Ferro model; ID and collection checked individually.', 1),
  ('mdl_db2f8218c49183ef1bfd', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Sixth Homem de Ferro model; ID and collection checked individually.', 1),
  ('mdl_146eda203412dff19df8', 'char_marvel_homem_de_gelo', 'owner_reviewed_model:2026-11-24', 'Homem de Gelo in X-Men/Homem de Gelo; official Marvel X-Men roster confirms Iceman.', 1),
  ('mdl_2f9e5d043da9ba07c1f0', 'char_marvel_homem_de_gelo', 'owner_reviewed_model:2026-11-24', 'Second Homem de Gelo model; title and folder checked individually.', 1),
  ('mdl_e7027963506c5d087d06', 'char_marvel_homem_de_gelo', 'owner_reviewed_model:2026-11-24', 'Third Homem de Gelo model; title and folder checked individually.', 1),
  ('mdl_ead94f48e0c9deacbefc', 'char_marvel_homem_de_gelo', 'owner_reviewed_model:2026-11-24', 'Fourth Homem de Gelo model; title and folder checked individually.', 1),
  ('mdl_01cfb12901831676273a', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Hulk in Vingadores/Hulk; title and folder confirm the individual.', 1),
  ('mdl_1fd4cf6561272941736c', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Second Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_2bd224f4bc0e8b0bd07a', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Third Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_351d1179a7db92d10aab', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Fourth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_3cfa1aed2ff24afd49c2', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Fifth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_53e8fec574d571e9cf58', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Sixth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_61d176552e4a1af737be', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Seventh Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_6d52049db3f1613b426d', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Eighth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_8bb97e03a03f44323a2c', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Ninth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_a448b637d2c93ef16743', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Tenth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_ad8436952fa9b3864539', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Eleventh Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_b2477c3b5d104cb71d5b', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Twelfth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_e29381420ca2bddc639d', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Thirteenth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_ebb6940898f265dd4710', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Fourteenth Hulk model; title and Vingadores folder checked individually.', 1),
  ('mdl_ed035f48e874a15a91e1', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Fifteenth Hulk model; title and Vingadores folder checked individually.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_fera', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Marvel X-Men roster.'),
  ('char_marvel_fera', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel roster and public X-Men folders.'),
  ('char_marvel_galactus', 'attr_publisher_marvel', 'https://www.marvel.com/characters/galactus/', 'Official Marvel Galactus profile.'),
  ('char_marvel_galactus', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/comics/collection/67133/fantastic_four_behold.galactus_trade_paperback', 'Official Marvel Fantastic Four collection describes its conflict with Galactus; public catalog folder confirms this context.'),
  ('char_marvel_gambit', 'attr_publisher_marvel', 'https://www.marvel.com/characters/gambit', 'Official Marvel Gambit profile.'),
  ('char_marvel_gambit', 'attr_universe_x-men', 'https://www.marvel.com/characters/gambit', 'Official Marvel profile describes Gambit alongside the X-Men; public folder agrees.'),
  ('char_marvel_vampira', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster lists Rogue, the canonical counterpart of localized Vampira.'),
  ('char_marvel_vampira', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster lists Rogue; public model is filed under the X-Men confrontation folder.'),
  ('char_marvel_gaviao_arqueiro', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster/history.'),
  ('char_marvel_gaviao_arqueiro', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history identifies Hawkeye on the team; public folder agrees.'),
  ('char_marvel_groot', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Official Marvel Guardians sources.'),
  ('char_marvel_groot', 'attr_universe_guardioes-da-galaxia', 'https://www.marvel.com/articles/comics/guarding-the-galaxy-a-team-divided', 'Official Marvel source identifies Groot in the Guardians team.'),
  ('char_marvel_rocket', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/guardians-of-the-galaxy/', 'Official Marvel Guardians sources.'),
  ('char_marvel_rocket', 'attr_universe_guardioes-da-galaxia', 'https://www.marvel.com/articles/comics/guarding-the-galaxy-a-team-divided', 'Official Marvel source identifies Rocket in the Guardians team.'),
  ('char_marvel_homem_aranha', 'attr_publisher_marvel', 'owner_reviewed_public_catalog:2026-11-24', 'Public model is categorized under Marvel & DC and title names Homem-Aranha.'),
  ('char_marvel_homem_de_ferro', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster names Iron Man.'),
  ('char_marvel_homem_de_ferro', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official roster and public Vingadores folder confirm the association.'),
  ('char_marvel_homem_de_gelo', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster identifies Iceman.'),
  ('char_marvel_homem_de_gelo', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster and public folder confirm the association.'),
  ('char_marvel_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history includes Hulk.'),
  ('char_marvel_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history and public Vingadores folder confirm the association.');