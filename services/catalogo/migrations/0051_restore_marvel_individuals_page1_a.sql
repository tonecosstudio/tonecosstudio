-- Restore individually reviewed Marvel character relations after the lost 0032 seed.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_adam_warlock', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'adam-warlock', 'Adam Warlock', NULL, 'https://www.marvel.com/characters/magus-adam-warlock'),
  ('char_marvel_agente_venom', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'agente-venom', 'Agente Venom', NULL, 'https://www.marvel.com/characters/flash-thompson'),
  ('char_marvel_anti_venom', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'anti-venom', 'Anti-Venom', NULL, 'https://www.marvel.com/characters/flash-thompson'),
  ('char_marvel_aranha_escarlate', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'aranha-escarlate', 'Aranha Escarlate', NULL, 'https://www.marvel.com/characters/scarlet-spider-ben-reilly');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_adam_warlock', 'attr_publisher_marvel', 'https://www.marvel.com/characters/magus-adam-warlock', 'Official Marvel character profile.'),
  ('char_marvel_agente_venom', 'attr_publisher_marvel', 'https://www.marvel.com/characters/flash-thompson', 'Marvel identifies Flash Thompson as Agent Venom.'),
  ('char_marvel_agente_venom', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/flash-thompson', 'Official profile describes Agent Venom as an ally of Spider-Man; public collection is Homem-Aranha / Agente Venom.'),
  ('char_marvel_anti_venom', 'attr_publisher_marvel', 'https://www.marvel.com/characters/flash-thompson', 'Marvel identifies Anti-Venom as a separate symbiote identity; the catalog title does not specify a host.'),
  ('char_marvel_anti_venom', 'attr_universe_homem_aranha', 'https://www.marvel.com/characters/flash-thompson', 'Official Marvel profile connects the Anti-Venom identity with Spider-Man stories; public collection is Homem-Aranha / Anti-Venom.'),
  ('char_marvel_aranha_escarlate', 'attr_publisher_marvel', 'https://www.marvel.com/characters/scarlet-spider-ben-reilly', 'Official Marvel character profile for Scarlet Spider; the catalog name does not assume which bearer is depicted.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_5bc659ffcbd1f6b7191e', 'char_marvel_adam_warlock', 'https://www.marvel.com/characters/magus-adam-warlock', 'Public API title and collection both identify Adam Warlock.', 0),
  ('mdl_b513dc634e08c0b480b3', 'char_marvel_agente_venom', 'https://www.marvel.com/characters/flash-thompson', 'Public API title names Agente Venom and collection names Homem-Aranha; Marvel identifies Flash Thompson as Agent Venom.', 0),
  ('mdl_73cc20bb867213405b66', 'char_marvel_anti_venom', 'https://www.marvel.com/characters/flash-thompson', 'Public API title names Anti-Venom and collection names Homem-Aranha; host not inferred.', 0),
  ('mdl_ecefa5a60b0f2646e483', 'char_marvel_anti_venom', 'https://www.marvel.com/characters/flash-thompson', 'Second Anti-Venom model ID; title and collection separately confirmed; host not inferred.', 0),
  ('mdl_0ddf22aace42077df2f0', 'char_marvel_aranha_escarlate', 'https://www.marvel.com/characters/scarlet-spider-ben-reilly', 'Public API title and collection identify Aranha Escarlate; specific bearer not inferred.', 0);
