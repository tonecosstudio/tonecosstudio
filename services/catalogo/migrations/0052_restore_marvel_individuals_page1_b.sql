-- Continue restoring individually reviewed models after the lost 0032 seed.
-- The public API page and progress registry provide the reviewed IDs/names.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_blade', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'blade', 'Blade', NULL, 'https://www.marvel.com/characters/blade-eric-brooks'),
  ('char_marvel_cable', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'cable', 'Cable', NULL, 'https://www.marvel.com/teams-and-groups/x-force'),
  ('char_marvel_camaleao', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'camaleao', 'Camaleão', NULL, 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics'),
  ('char_marvel_carnificina', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'carnificina', 'Carnificina', NULL, 'https://www.marvel.com/characters/carnage-cletus-kasady'),
  ('char_marvel_cavaleiro_da_lua', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'cavaleiro-da-lua', 'Cavaleiro da Lua', NULL, 'https://www.marvel.com/teams-and-groups/avengers/in-comics'),
  ('char_marvel_doutor_octopus', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'doutor-octopus', 'Doutor Octopus', NULL, 'https://www.marvel.com/characters/doctor-octopus-otto-octavius'),
  ('char_marvel_duende_macabro', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'duende-macabro', 'Duende Macabro', NULL, 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan'),
  ('char_marvel_duende_verde', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'duende-verde', 'Duende Verde', NULL, 'https://share.marvel.com/comics/discover/984/green-goblin');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_blade', 'attr_publisher_marvel', 'https://www.marvel.com/characters/blade-eric-brooks', 'Official Marvel profile identifies Blade/Eric Brooks.'),
  ('char_marvel_cable', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-force', 'Official X-Force roster identifies Cable/Nathan Summers.'),
  ('char_marvel_camaleao', 'attr_publisher_marvel', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Marvel identifies Chameleon as an individual Spider-Man adversary.'),
  ('char_marvel_camaleao', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Marvel identifies Chameleon among Spider-Man foes; public collection is Homem-Aranha / Camaleão.'),
  ('char_marvel_carnificina', 'attr_publisher_marvel', 'https://www.marvel.com/characters/carnage-cletus-kasady', 'Official Marvel profile identifies Carnage/Cletus Kasady.'),
  ('char_marvel_carnificina', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/carnage-cletus-kasady', 'Marvel connects Carnage with Spider-Man; public collection is Homem-Aranha / Carnificina.'),
  ('char_marvel_cavaleiro_da_lua', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Marvel roster identifies Moon Knight/Marc Spector.'),
  ('char_marvel_doutor_octopus', 'attr_publisher_marvel', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Official Marvel profile identifies Doctor Octopus/Otto Octavius.'),
  ('char_marvel_doutor_octopus', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Marvel identifies Doctor Octopus among Spider-Man foes; public collection is Homem-Aranha / Doutor Octopus.'),
  ('char_marvel_duende_macabro', 'attr_publisher_marvel', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Official Marvel history identifies Roderick Kingsley as Hobgoblin.'),
  ('char_marvel_duende_macabro', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Marvel places Hobgoblin in Spider-Man stories; public collection is Homem-Aranha / Duende Macabro.'),
  ('char_marvel_duende_verde', 'attr_publisher_marvel', 'https://share.marvel.com/comics/discover/984/green-goblin', 'Official Marvel reading list identifies Green Goblin/Norman Osborn.'),
  ('char_marvel_duende_verde', 'attr_universe_homem_aranha', 'https://share.marvel.com/comics/discover/984/green-goblin', 'Marvel identifies Green Goblin as Spider-Man’s major enemy; public collection is Homem-Aranha / Duende Verde.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_4c053fcb2d0dffb2ecbf', 'char_marvel_blade', 'https://www.marvel.com/characters/blade-eric-brooks', 'Public API title and collection both identify Blade.' , 0),
  ('mdl_5ad326e9d50c917cec1a', 'char_marvel_blade', 'https://www.marvel.com/characters/blade-eric-brooks', 'Second Blade model ID; title and collection independently confirmed.', 0),
  ('mdl_df795c42d3a25e5b4b4f', 'char_marvel_blade', 'https://www.marvel.com/characters/blade-eric-brooks', 'Third Blade model ID; title and collection independently confirmed.', 0),
  ('mdl_ac2b7f773900551345e2', 'char_marvel_cable', 'https://www.marvel.com/teams-and-groups/x-force', 'Public API title and collection identify Cable; no team tag inferred from the solo collection.', 0),
  ('mdl_5ae22a89da972a2623c4', 'char_marvel_camaleao', 'https://www.marvel.com/characters/spider-man-peter-parker/in-comics', 'Public API title and collection identify Camaleão in the Homem-Aranha folder.', 0),
  ('mdl_41a9d15b07d167aade22', 'char_marvel_capitao_america', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'First individually reviewed Capitão América model ID.', 0),
  ('mdl_5e995a66a78b1bfa81cc', 'char_marvel_capitao_america', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Second individually reviewed Capitão América model ID.', 0),
  ('mdl_e771181439bc3c733bed', 'char_marvel_capitao_america', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Third individually reviewed Capitão América model ID.', 0),
  ('mdl_ed202714037c3cbe2114', 'char_marvel_capitao_america', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Fourth individually reviewed Capitão América model ID.', 0),
  ('mdl_ff7b1599f6e09f516fb1', 'char_marvel_capitao_america', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Fifth individually reviewed Capitão América model ID.', 0),
  ('mdl_19d715f2e7f87d2559b0', 'char_marvel_carnificina', 'https://www.marvel.com/characters/carnage-cletus-kasady', 'Public API title and collection identify Carnificina in the Homem-Aranha folder.', 0),
  ('mdl_728cd766abb425ff41fa', 'char_marvel_carnificina', 'https://www.marvel.com/characters/carnage-cletus-kasady', 'Second Carnificina model ID; title and collection independently confirmed.', 0),
  ('mdl_cec453cfa7155cc7e53c', 'char_marvel_carnificina', 'https://www.marvel.com/characters/carnage-cletus-kasady', 'Third Carnificina model ID; title and collection independently confirmed.', 0),
  ('mdl_af4e79ab1b1854699b86', 'char_marvel_cavaleiro_da_lua', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'First Cavaleiro da Lua model ID; Marvel confirms Marc Spector as a character.', 0),
  ('mdl_cd903f70701e58e1fc1b', 'char_marvel_cavaleiro_da_lua', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Second Cavaleiro da Lua model ID; title and collection independently confirmed.', 0),
  ('mdl_03f752bfccb2f731995a', 'char_marvel_ciclope', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'First individually reviewed Ciclope model ID.', 0),
  ('mdl_e3f20347f8844f262e8c', 'char_marvel_ciclope', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Second individually reviewed Ciclope model ID.', 0),
  ('mdl_e8b7dbb7a866acd3b7a1', 'char_marvel_ciclope', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Third individually reviewed Ciclope model ID.', 0),
  ('mdl_ed82814e1b950e33465f', 'char_marvel_ciclope', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Fourth individually reviewed Ciclope model ID.', 0),
  ('mdl_edf8fc56a59b1b587f3d', 'char_marvel_ciclope', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Fifth individually reviewed Ciclope model ID.', 0),
  ('mdl_00a72955776c4d5cdd0c', 'char_marvel_coisa', 'https://www.marvel.com/teams-and-groups/fantastic-four/in-comics', 'Public API title and collection identify Coisa.' , 0),
  ('mdl_2af3651c51a2c84fc162', 'char_marvel_colossus', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Public API title and collection identify Colossus.', 0),
  ('mdl_29cffd7561426a065549', 'char_marvel_deadpool', 'https://www.marvel.com/characters/deadpool-wade-wilson', 'First individually reviewed Deadpool model ID.', 0),
  ('mdl_570b3486982cbe957f4c', 'char_marvel_deadpool', 'https://www.marvel.com/characters/deadpool-wade-wilson', 'Second individually reviewed Deadpool model ID.', 0),
  ('mdl_6c0e9e5971d9623626d3', 'char_marvel_deadpool', 'https://www.marvel.com/characters/deadpool-wade-wilson', 'Third individually reviewed Deadpool model ID.', 0),
  ('mdl_01ff628d762b1f1cddd5', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'First individually reviewed Demolidor model ID.', 0),
  ('mdl_083d3bc3ad66f40e51a8', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Second individually reviewed Demolidor model ID.', 0),
  ('mdl_47d64d5326d5ec394de2', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Third individually reviewed Demolidor model ID.', 0),
  ('mdl_4cc22eb42fd13df06a21', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Fourth individually reviewed Demolidor model ID.', 0),
  ('mdl_4ed92fe1249ffcd7b6cb', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Fifth individually reviewed Demolidor model ID.', 0),
  ('mdl_f7fc82d9947ce5caa333', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Sixth individually reviewed Demolidor model ID.', 0),
  ('mdl_fdba17f2c69398ba456c', 'char_marvel_demolidor', 'https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen', 'Seventh individually reviewed Demolidor model ID.', 0),
  ('mdl_00a81c101ba466e34e57', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'First individually reviewed Doutor Octopus model ID; collection identifies Homem-Aranha.', 0),
  ('mdl_494c48db754d22258e85', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Second individually reviewed Doutor Octopus model ID.', 0),
  ('mdl_687712d3dcbd80f7d2f0', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Third individually reviewed Doutor Octopus model ID.', 0),
  ('mdl_960324bb4aa775f2abc2', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Fourth individually reviewed Doutor Octopus model ID.', 0),
  ('mdl_b1381150036f81520c04', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Fifth individually reviewed Doutor Octopus model ID.', 0),
  ('mdl_fb753fe96c65851a8bff', 'char_marvel_doutor_octopus', 'https://www.marvel.com/characters/doctor-octopus-otto-octavius', 'Sixth individually reviewed Doutor Octopus model ID.', 0),
  ('mdl_405eb430d5b5db8a30dc', 'char_marvel_duende_macabro', 'https://www.marvel.com/characters/scorpion-macdonald-mac-gargan', 'Public API title and collection identify Duende Macabro in the Homem-Aranha folder.', 0),
  ('mdl_8c562fc99b41cdbf9255', 'char_marvel_duende_verde', 'https://share.marvel.com/comics/discover/984/green-goblin', 'First Duende Verde model ID; collection identifies Homem-Aranha.', 0),
  ('mdl_fca0faf4da7ed5ac7e63', 'char_marvel_duende_verde', 'https://share.marvel.com/comics/discover/984/green-goblin', 'Second Duende Verde model ID; title and collection independently confirmed.', 0);
