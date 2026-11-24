-- Canonical public tags reviewed against owner instructions and current model IDs.
-- Staged only: apply after M5 approval and migrations 0028-0030 through the
-- single authorized D1 writer. Both catalog UIs read this same D1 projection.

INSERT INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_cdz_aiolia', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'aiolia', 'Aiolia', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_aiolos', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'aiolos', 'Aiolos', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_ikki', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'ikki', 'Ikki', '31bfd5a3-87d9-4348-b6e3-d75a854934ae', 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_seiya', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'seiya', 'Seiya', 'e60c4674-be00-438b-bd43-8549ac87d521', 'owner_tag_instruction:2026-11-24'),
  ('char_avatar_aang', (SELECT id FROM franchises WHERE slug='avatar-last-airbender'), 'aang', 'Aang', 'ca8a6fe2-89f3-4061-af62-25a5836fb74d', 'owner_tag_instruction:2026-11-24'),
  ('char_avatar_appa', (SELECT id FROM franchises WHERE slug='avatar-last-airbender'), 'appa', 'Appa', '7a90e8ad-9f97-4207-bc7b-99e0ae2bd4db', 'owner_tag_instruction:2026-11-24'),
  ('char_avatar_momo', (SELECT id FROM franchises WHERE slug='avatar-last-airbender'), 'momo', 'Momo', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_dc_adao_negro', (SELECT id FROM franchises WHERE slug='adao-negro'), 'adao-negro', 'Adão Negro', '50f8421a-5cda-4bae-a493-a126eec190d4', 'owner_tag_instruction:2026-11-24'),
  ('char_marvel_doutor_destino', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'doutor-destino', 'Doutor Destino', 'cba1082d-fab5-4ddb-8c52-7d60338f35c5', 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_afrodite', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'afrodite', 'Afrodite', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_aldebaran', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'aldebaran', 'Aldebaran', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_aspros', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'aspros', 'Aspros', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_athena', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'athena', 'Athena', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_camus', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'camus', 'Camus', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_cid', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'cid', 'Cid', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_dohko', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'dohko', 'Dohko', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_hyoga', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'hyoga', 'Hyoga', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_manigoldo', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'manigoldo', 'Manigoldo', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_mascara_da_morte', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'mascara-da-morte', 'Máscara da Morte', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_mu', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'mu', 'Mu', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_regulus', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'regulus', 'Régulus', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_saga', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'saga', 'Saga', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_shion', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'shion', 'Shion', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_shiryu', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'shiryu', 'Shiryu', '5d5c6a9e-b5cd-48db-9e89-8399cefb425c', 'owner_tag_instruction:2026-11-24'),
  ('char_cdz_shura', (SELECT id FROM franchises WHERE slug='cavaleiros-do-zodiaco'), 'shura', 'Shura', NULL, 'owner_tag_instruction:2026-11-24'),
  ('char_marvel_abutre', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'abutre', 'Abutre', '84fa8096-b592-4544-be5d-73472fa28361', 'owner_tag_instruction:2026-11-24');

INSERT INTO catalog_attributes
  (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_sign_leao', 'sign', 'leao', 'Leão', 'toei_and_owner_confirmed_saint_seiya'),
  ('attr_sign_sagitario', 'sign', 'sagitario', 'Sagitário', 'toei_and_owner_confirmed_saint_seiya'),
  ('attr_constellation_fenix', 'constellation', 'fenix', 'Fênix', 'owner_tag_instruction:2026-11-24'),
  ('attr_sign_peixes', 'sign', 'peixes', 'Peixes', 'toei_official_saint_seiya_characters'),
  ('attr_sign_touro', 'sign', 'touro', 'Touro', 'toei_official_saint_seiya_characters'),
  ('attr_sign_gemeos', 'sign', 'gemeos', 'Gêmeos', 'owner_reviewed_current_model_title'),
  ('attr_sign_aquario', 'sign', 'aquario', 'Aquário', 'toei_official_saint_seiya_characters'),
  ('attr_sign_capricornio', 'sign', 'capricornio', 'Capricórnio', 'owner_reviewed_current_model_title'),
  ('attr_sign_libra', 'sign', 'libra', 'Libra', 'toei_official_saint_seiya_characters'),
  ('attr_sign_cancer', 'sign', 'cancer', 'Câncer', 'owner_reviewed_current_model_title'),
  ('attr_sign_aries', 'sign', 'aries', 'Áries', 'toei_official_saint_seiya_characters'),
  ('attr_constellation_pegaso', 'constellation', 'pegaso', 'Pégaso', 'toei_official_saint_seiya_characters'),
  ('attr_constellation_cisne', 'constellation', 'cisne', 'Cisne', 'toei_official_saint_seiya_characters'),
  ('attr_constellation_dragao', 'constellation', 'dragao', 'Dragão', 'toei_official_saint_seiya_characters'),
  ('attr_publisher_dc', 'publisher', 'dc', 'DC', 'owner_tag_instruction:2026-11-24'),
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'owner_tag_instruction:2026-11-24'),
  ('attr_universe_homem_aranha', 'universe', 'homem-aranha', 'Homem-Aranha', 'owner_tag_instruction:2026-11-24');

INSERT INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_f944a6df942983a303e0', 'char_cdz_aiolia', 'owner_tag_instruction:2026-11-24', 'Owner requested separate character and sign tags: Aiolia · Leão. Toei official: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/.', 0),
  ('mdl_ae7d6066ee00d4648a9c', 'char_cdz_aiolos', 'owner_tag_instruction:2026-11-24', 'Owner requested name-only Aiolos and a separate Sagitário sign. Toei official: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/.', 0),
  ('mdl_50cc3e1a62f6a95d41e5', 'char_cdz_aiolos', 'owner_tag_instruction:2026-11-24', 'The owner requested individual character tags; the current model title identifies Aiolos.', 0),
  ('mdl_50cc3e1a62f6a95d41e5', 'char_cdz_seiya', 'owner_tag_instruction:2026-11-24', 'Individual character tag from the current model title Seiya e Aiolos.', 0),
  ('mdl_722e6301694f25bf7dc2', 'char_cdz_ikki', 'owner_tag_instruction:2026-11-24', 'Owner requested the name-only tag Ikki with Fênix as a separate constellation.', 0),
  ('mdl_0a45ae78a4b79c1998d7', 'char_avatar_aang', 'owner_tag_instruction:2026-11-24', 'Owner explicitly requested separate Aang, Appa and Momo tags for this model.', 0),
  ('mdl_0a45ae78a4b79c1998d7', 'char_avatar_appa', 'owner_tag_instruction:2026-11-24', 'Owner explicitly requested separate Aang, Appa and Momo tags for this model.', 0),
  ('mdl_0a45ae78a4b79c1998d7', 'char_avatar_momo', 'owner_tag_instruction:2026-11-24', 'Owner explicitly requested separate Aang, Appa and Momo tags for this model.', 0),
  ('mdl_96135f53934330514880', 'char_dc_adao_negro', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title Adão Negro e Doutor Destino.', 0),
  ('mdl_6f2055604a9114497064', 'char_dc_adao_negro', 'owner_tag_instruction:2026-11-24', 'Owner requested Adão Negro as the name-only tag, without costume description.', 0),
  ('mdl_bb6b835dce88fd473036', 'char_dc_adao_negro', 'owner_tag_instruction:2026-11-24', 'Owner requested Adão Negro as the name-only tag, without traje preto description.', 0),
  ('mdl_96135f53934330514880', 'char_marvel_doutor_destino', 'owner_tag_instruction:2026-11-24', 'Second individual character: Brazilian localized name Doutor Destino maps to Doctor Doom (Marvel), not Doctor Fate/Senhor Destino (DC).', 1),
  ('mdl_6da08c3616a60567b784', 'char_cdz_afrodite', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_83cd8b7f3b5ad599f4e1', 'char_cdz_afrodite', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_edff9dbf0060bcc14a26', 'char_cdz_aldebaran', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_28b62f72d4fae46c45c4', 'char_cdz_aspros', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_e0cfb7d66c14221261e2', 'char_cdz_athena', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_4f3d01c35f0ac623b509', 'char_cdz_camus', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_6d75c18e7adc6884cc54', 'char_cdz_camus', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_7fbcf007d7121448aa27', 'char_cdz_camus', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_2b42393bdba9a079f36f', 'char_cdz_cid', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_7d7ac8a18703d4f874aa', 'char_cdz_dohko', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_c45677699a78b645ce51', 'char_cdz_dohko', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_b877dcc30966969be72e', 'char_cdz_dohko', 'owner_tag_instruction:2026-11-24', 'Owner requested separate character chips for every character in a composite model.', 0),
  ('mdl_018dda8ba221ce7b7e8a', 'char_cdz_hyoga', 'owner_tag_instruction:2026-11-24', 'Name-only character tag; Cisne remains a separate constellation.', 0),
  ('mdl_00090b990afb6b5094e0', 'char_cdz_manigoldo', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_206d0b5d0dc1c50af617', 'char_cdz_mu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_8654e1f3ffcf3d8be070', 'char_cdz_mu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_f0a349b1e4552c48ff3f', 'char_cdz_mu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_008eea2a50ad9a5901dd', 'char_cdz_mascara_da_morte', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_49c8ab5db682a5b77092', 'char_cdz_mascara_da_morte', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_50703083343060617a9e', 'char_cdz_mascara_da_morte', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_155d5826998fa0741151', 'char_cdz_regulus', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title; sign held for source confirmation.', 0),
  ('mdl_7236acb44e30decb2c47', 'char_cdz_saga', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_0cfeeb6503fe0ea3f023', 'char_cdz_seiya', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_22819ea652a6699999c6', 'char_cdz_seiya', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_278355282252b6564ca5', 'char_cdz_seiya', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_67c6c76b70b29657e255', 'char_cdz_shion', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_840234444af880abb0ed', 'char_cdz_shiryu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag; Dragão remains a separate constellation.', 0),
  ('mdl_a623a5813f0a784a6de6', 'char_cdz_shiryu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag; Dragão remains a separate constellation.', 0),
  ('mdl_ea6647eccdec76f30ba7', 'char_cdz_shiryu', 'owner_tag_instruction:2026-11-24', 'Name-only character tag; Dragão remains a separate constellation.', 0),
  ('mdl_b877dcc30966969be72e', 'char_cdz_shiryu', 'owner_tag_instruction:2026-11-24', 'Owner requested separate character chips for every character in a composite model.', 0),
  ('mdl_0c760722fdcf53850eab', 'char_cdz_shura', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_927af35e41ad88f7890f', 'char_cdz_shura', 'owner_tag_instruction:2026-11-24', 'Name-only character tag from the current model title.', 0),
  ('mdl_f5244896766b44a5bfb5', 'char_marvel_abutre', 'owner_tag_instruction:2026-11-24', 'Owner confirmed Abutre as a Marvel character and Homem-Aranha villain; keep the character name separate from both tags.', 0);

INSERT INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_cdz_aiolia', 'attr_sign_leao', 'owner_tag_instruction:2026-11-24', 'Owner explicitly gave Aiolia · Leão as the separate sign tag.'),
  ('char_cdz_aiolos', 'attr_sign_sagitario', 'owner_tag_instruction:2026-11-24', 'Owner explicitly requested Aiolos as the name tag and Sagitário as a separate sign tag.'),
  ('char_cdz_ikki', 'attr_constellation_fenix', 'owner_tag_instruction:2026-11-24', 'Owner requested Ikki de Fênix with the character name and constellation separated.'),
  ('char_cdz_afrodite', 'attr_sign_peixes', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/tv/seiya_12/character/'),
  ('char_cdz_aldebaran', 'attr_sign_touro', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_aspros', 'attr_sign_gemeos', 'owner_reviewed_current_model_title', 'The current model title explicitly says Aspros de Gêmeos.'),
  ('char_cdz_camus', 'attr_sign_aquario', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_cid', 'attr_sign_capricornio', 'owner_reviewed_current_model_title', 'The current model title explicitly says Cid de Capricórnio.'),
  ('char_cdz_dohko', 'attr_sign_libra', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_hyoga', 'attr_constellation_cisne', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/tv/seiya_12/character/'),
  ('char_cdz_manigoldo', 'attr_sign_cancer', 'owner_reviewed_current_model_title', 'The current model title explicitly says Manigoldo de Câncer.'),
  ('char_cdz_mu', 'attr_sign_aries', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_mascara_da_morte', 'attr_sign_cancer', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/tv/seiya_12/character/'),
  ('char_cdz_saga', 'attr_sign_gemeos', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_shion', 'attr_sign_aries', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/tv/seiya_12/character/'),
  ('char_cdz_shiryu', 'attr_constellation_dragao', 'toei_official_saint_seiya_characters', 'Toei official profile: https://www.toei-anim.co.jp/tv/seiya/character.html'),
  ('char_cdz_shura', 'attr_sign_capricornio', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/ondem/saintseiya-gold/character/'),
  ('char_cdz_seiya', 'attr_constellation_pegaso', 'toei_official_saint_seiya_characters', 'Toei official profile: https://lineup.toei-anim.co.jp/ja/tv/seiya_12/character/'),
  ('char_dc_adao_negro', 'attr_publisher_dc', 'owner_tag_instruction:2026-11-24', 'Owner requested Adão Negro with DC as a separate tag.'),
  ('char_marvel_doutor_destino', 'attr_publisher_marvel', 'owner_tag_instruction:2026-11-24', 'Marvel publisher tag from the confirmed Marvel Comics Doctor Doom identity.'),
  ('char_marvel_abutre', 'attr_publisher_marvel', 'owner_tag_instruction:2026-11-24', 'Owner requested Marvel as a separate tag for Abutre.'),
  ('char_marvel_abutre', 'attr_universe_homem_aranha', 'owner_tag_instruction:2026-11-24', 'Owner requested Homem-Aranha as a separate universe tag for Abutre.');

INSERT INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_cdz_regulus', 'attr_sign_leao', 'akita_shoten_official_lost_canvas', 'Akita Shoten official description identifies Regulus as the Leo Gold Saint: https://www.akitashoten.co.jp/comics/4253216811');
