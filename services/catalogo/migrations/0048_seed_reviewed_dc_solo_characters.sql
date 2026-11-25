-- Remaining individually named single-character DC records from the public API.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_dc_cacador_de_marte', (SELECT id FROM franchises WHERE slug='cacador-de-marte'), 'cacador-de-marte', 'Caçador de Marte', NULL, 'https://www.dc.com/characters/martian-manhunter'),
  ('char_dc_pacificador', (SELECT id FROM franchises WHERE slug='pacificador'), 'pacificador', 'Pacificador', NULL, 'https://www.dc.com/characters/peacemaker'),
  ('char_dc_solomon_grundy', (SELECT id FROM franchises WHERE slug='solomon-grundy'), 'solomon-grundy', 'Solomon Grundy', NULL, 'https://www.dc.com/characters/solomon-grundy'),
  ('char_dc_super_choque', (SELECT id FROM franchises WHERE slug='super-choque'), 'super-choque', 'Super Choque', NULL, 'https://www.dc.com/characters/static');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_dc_cacador_de_marte', 'attr_publisher_dc', 'https://www.dc.com/characters/martian-manhunter', 'Caçador de Marte is Martian Manhunter, a DC character.'),
  ('char_dc_pacificador', 'attr_publisher_dc', 'https://www.dc.com/characters/peacemaker', 'Peacemaker is a DC character; Brazilian public name is Pacificador.'),
  ('char_dc_solomon_grundy', 'attr_publisher_dc', 'https://www.dc.com/characters/solomon-grundy', 'Solomon Grundy is a DC character.'),
  ('char_dc_super_choque', 'attr_publisher_dc', 'https://www.dc.com/characters/static', 'Super Choque is the localized identity corresponding to DC character Static/Virgil Hawkins.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_311d57cb311dee4dbbac', 'char_dc_cacador_de_marte', 'https://www.dc.com/characters/martian-manhunter', 'Public API title names Caçador de Marte; flight and green energy are model details.', 0),
  ('mdl_ad36bb14ef40240a4bb8', 'char_dc_constantine', 'https://www.dc.com/characters/john-constantine', 'Public API title names Constantine; magic and tentacles are model details.', 0),
  ('mdl_c37d85eb002096310fd1', 'char_dc_pacificador', 'https://www.dc.com/characters/peacemaker', 'Public API title names Pacificador; weapons, eagle, and debris are model details.', 0),
  ('mdl_1892bc682cd0eb73d858', 'char_dc_solomon_grundy', 'https://www.dc.com/characters/solomon-grundy', 'Public API title names Solomon Grundy; tomb and diorama are model context.', 0),
  ('mdl_a830e65b50c076e1f3e0', 'char_dc_senhor_destino', 'https://www.dc.com/characters/doctor-fate', 'Public API title names Senhor Destino; DC confirms Doctor Fate as an individual character. Statue and Egyptian base are model details.', 0),
  ('mdl_ed80ee4573626a8e12c4', 'char_dc_super_choque', 'https://www.dc.com/characters/static', 'Public API title names Super Choque; board and electricity effects are model details.', 0);
