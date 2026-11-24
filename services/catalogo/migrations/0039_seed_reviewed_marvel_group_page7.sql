-- Page 7 of Equipes e Grupos, reviewed ID by ID from the public catalog API.
-- The Venom Hulk title receives two separate canonical relations; display variants stay out of tags.
-- Local proposal only; no D1 write or Worker publication is authorized.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_tocha_humana', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'tocha-humana', 'Tocha Humana', NULL, 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics'),
  ('char_marvel_visao', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'visao', 'Visão', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_viuva_negra', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'viuva-negra', 'Viúva Negra', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_feiticeira_escarlate', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'feiticeira-escarlate', 'Feiticeira Escarlate', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_warpath', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'warpath', 'Warpath', NULL, 'https://www.marvel.com/teams-and-groups/x-force'),
  ('char_marvel_vampira', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'vampira', 'Vampira', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_venom', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'venom', 'Venom', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_marvel_thor', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'thor', 'Thor', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_wolverine', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'wolverine', 'Wolverine', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('attr_universe_quarteto-fantastico', 'universe', 'quarteto-fantastico', 'Quarteto Fantástico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_ebf4a8425c77b98203cc', 'char_marvel_thor', 'owner_reviewed_model:2026-11-24', 'Seventeenth Thor record in the Vingadores/Thor folder; reviewed individually by ID.', 1),
  ('mdl_2a7c327c1ec173b4ada7', 'char_marvel_tocha_humana', 'owner_reviewed_model:2026-11-24', 'Tocha Humana in Quarteto Fantástico/Tocha Humana; official roster identifies Johnny Storm.', 1),
  ('mdl_192f5a49152b7c2e8c07', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Vampira in X-Men/Vampira; official X-Men roster lists Rogue, the same canonical character.', 1),
  ('mdl_5ea2fc775ba4ca8097ff', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Second Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_697585bf0bb93634a702', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Third Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_9541e0e9c6a51f8cf778', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Fourth Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_a35dc03796e409f3d2e0', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Fifth Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_a5d75a7087fda69fd3ac', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Sixth Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_e3d39c635f7c167a926b', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Seventh Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_f331c2c64b5ff322429b', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Eighth Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_fea4e94b387f05e45fd5', 'char_marvel_vampira', 'owner_reviewed_model:2026-11-24', 'Ninth Vampira model; title and X-Men folder reviewed separately.', 1),
  ('mdl_da9c02d86cbbf8432e1b', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Venom Hulk model title names the Hulk identity; separate Hulk relation.', 1),
  ('mdl_da9c02d86cbbf8432e1b', 'char_marvel_venom', 'owner_reviewed_model:2026-11-24', 'Venom Hulk model title names the Venom identity; separate symbiote-character relation.', 1),
  ('mdl_0d6360ea803486785538', 'char_marvel_visao', 'owner_reviewed_model:2026-11-24', 'Visão in Vingadores/Visão; official Avengers history identifies the android Avenger.', 1),
  ('mdl_4710e2f2a97d7b949f53', 'char_marvel_visao', 'owner_reviewed_model:2026-11-24', 'Second Visão model; public title and collection reviewed by ID.', 1),
  ('mdl_5eab095f7549e8054ca1', 'char_marvel_viuva_negra', 'owner_reviewed_model:2026-11-24', 'Viúva Negra in Vingadores/Viúva Negra; official Avengers roster confirms.', 1),
  ('mdl_74c1319ab8c8ff08db4f', 'char_marvel_viuva_negra', 'owner_reviewed_model:2026-11-24', 'Second Viúva Negra model; ID and folder reviewed separately.', 1),
  ('mdl_835588bf5e98e77b6f03', 'char_marvel_viuva_negra', 'owner_reviewed_model:2026-11-24', 'Third Viúva Negra model; ID and folder reviewed separately.', 1),
  ('mdl_a27143b91a477674454d', 'char_marvel_viuva_negra', 'owner_reviewed_model:2026-11-24', 'Fourth Viúva Negra model; ID and folder reviewed separately.', 1),
  ('mdl_e43e63e3190f10bf3214', 'char_marvel_viuva_negra', 'owner_reviewed_model:2026-11-24', 'Fifth Viúva Negra model; ID and folder reviewed separately.', 1),
  ('mdl_42e8a9b2a0389f999b94', 'char_marvel_feiticeira_escarlate', 'owner_reviewed_model:2026-11-24', 'Wanda in the Feiticeira Escarlate (Wanda) collection; canonical character name is Feiticeira Escarlate.', 1),
  ('mdl_bb7a2c09fc1169b1e78e', 'char_marvel_feiticeira_escarlate', 'owner_reviewed_model:2026-11-24', 'Second Wanda model; costume and magic effects are visual details, not tags.', 1),
  ('mdl_d043b5a510b35d439ba7', 'char_marvel_warpath', 'owner_reviewed_model:2026-11-24', 'Warpath in X-Men/Warpath; official Marvel identifies James Proudstar among X-Force and X-Men-related teams.', 1),
  ('mdl_01097769095f4d73cb18', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Wolverine in X-Men/Wolverine; first of 26 records individually reviewed on this page.', 1),
  ('mdl_08d88c9d9cd39758b575', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Second Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_23869ae3149d43b42a7a', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Third Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_2f5e3899b7c8c974a06f', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Fourth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_2fe8192a21df84564743', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Fifth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_43069b20371abe5fc072', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Sixth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_46f8c2e0c830ae929094', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Seventh Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_5afe38d6422e71732859', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Eighth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_5b0a0555993ae6275c91', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Ninth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_66197d7f900d022a4ace', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Tenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_80720ca0806800aaada3', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Eleventh Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_90f401c38862bc331dc2', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twelfth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_996ac70a1cbbc7535f8e', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Thirteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_9f1f717547bb28b0d81f', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Fourteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_a7fdc591346ace0f879d', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Fifteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_adb15d71b78a1492e028', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Sixteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_b3f43678ccb99b15d614', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Seventeenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_b594ad3721879ff4c1f5', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Eighteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_b78b3528dcc526dda5aa', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Nineteenth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_b9a1919c7a52253de81a', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twentieth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_c06aff20c39ab2a390a6', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-first Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_c49b530059713875a3aa', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-second Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_ccd630b33f6c409032e7', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-third Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_db7d00f32692b0858f85', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-fourth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_e0551fe4bde6190d9d8f', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-fifth Wolverine model on this page; title and folder checked by ID.', 1),
  ('mdl_e75d913a593c54c7d51a', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Twenty-sixth Wolverine model on this page; title and folder checked by ID.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_tocha_humana', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official Fantastic Four roster.'),
  ('char_marvel_tocha_humana', 'attr_universe_quarteto-fantastico', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Official roster and public collection identify Johnny Storm as a Fantastic Four member.'),
  ('char_marvel_vampira', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster.'),
  ('char_marvel_vampira', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official roster lists Rogue; public collection uses localized name Vampira.'),
  ('char_marvel_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history.'),
  ('char_marvel_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official source and public Vingadores/Hulk folder.'),
  ('char_marvel_venom', 'attr_publisher_marvel', 'https://www.marvel.com/characters/venom-eddie-brock', 'Official Marvel Venom material.'),
  ('char_marvel_visao', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history identifies Vision.'),
  ('char_marvel_visao', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history and public collection confirm Vision.'),
  ('char_marvel_viuva_negra', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster lists Black Widow.'),
  ('char_marvel_viuva_negra', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official roster and public Vingadores collection.'),
  ('char_marvel_feiticeira_escarlate', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history identifies Scarlet Witch/Wanda.'),
  ('char_marvel_feiticeira_escarlate', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official history confirms Wanda within Avengers; public collection names her.'),
  ('char_marvel_warpath', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-force', 'Official Marvel X-Force roster identifies James Proudstar/Warpath.'),
  ('char_marvel_warpath', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel team histories include Warpath among X-Men-related members; public folder is X-Men.'),
  ('char_marvel_wolverine', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster.'),
  ('char_marvel_wolverine', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official roster and public folder confirm Wolverine X-Men context.'),
  ('char_marvel_thor', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster.'),
  ('char_marvel_thor', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official roster and public Vingadores/Thor collection.');