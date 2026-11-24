-- Small DC franchises reviewed individually through the canonical public API.
-- Candidate only; do not apply before the authorized M5 gate.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_dc_zatanna', (SELECT id FROM franchises WHERE slug='zatanna'), 'zatanna', 'Zatanna', NULL, 'https://www.dc.com/blog/2024/11/12/zatanna-d-cs-mistress-of-magic-is-back'),
  ('char_dc_exterminador', (SELECT id FROM franchises WHERE slug='exterminador'), 'exterminador', 'Exterminador', NULL, 'https://www.dc.com/characters/deathstroke');

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_dc_zatanna', 'attr_publisher_dc', 'https://www.dc.com/blog/2024/11/12/zatanna-d-cs-mistress-of-magic-is-back', 'DC identifies Zatanna Zatara as a DC Comics character.'),
  ('char_dc_exterminador', 'attr_publisher_dc', 'https://www.dc.com/characters/deathstroke', 'Localized public catalog name Exterminador corresponds to DC character Deathstroke/Slade Wilson.');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_7607c1117961570356c5', 'char_dc_supergirl', 'https://www.dc.com/characters/supergirl', 'Public API title names Supergirl; two views and rubble are model context.', 0),
  ('mdl_ff462d60a77175d98aa2', 'char_dc_supergirl', 'https://www.dc.com/characters/supergirl', 'Public API title names Supergirl; classic styling and rubble do not change identity.', 0),
  ('mdl_c600085918d7cb602210', 'char_dc_supergirl', 'https://www.dc.com/characters/supergirl', 'Public API title names Supergirl; multiple views represent one model.', 0),
  ('mdl_b87c4181813502e358e3', 'char_dc_darkseid', 'https://www.dc.com/characters/darkseid', 'Public API title names Darkseid; classic presentation and fortress base are model context.', 0),
  ('mdl_cfde54ee5ef0d4abe616', 'char_dc_darkseid', 'https://www.dc.com/characters/darkseid', 'Public API title names Darkseid; white and gold costume is a visual variant.', 0),
  ('mdl_aaadde19f8c15850a82e', 'char_dc_arqueiro_verde', 'https://www.dc.com/characters/green-arrow', 'Public API title names Arqueiro Verde (Green Arrow); double view is one model.', 0),
  ('mdl_2237e89e7a0752b47a53', 'char_dc_arqueiro_verde', 'https://www.dc.com/characters/green-arrow', 'Public API title names Arqueiro Verde (Green Arrow); bow and arrow are props.', 0),
  ('mdl_066edffce81f8844ce34', 'char_dc_zatanna', 'https://www.dc.com/blog/2024/11/12/zatanna-d-cs-mistress-of-magic-is-back', 'Public API title names Zatanna; hat and magic effects are model details.', 0),
  ('mdl_d62ca10dec0c15f5508b', 'char_dc_zatanna', 'https://www.dc.com/blog/2024/11/12/zatanna-d-cs-mistress-of-magic-is-back', 'Public API title names Zatanna; rabbit, hat, and skull are model context.', 0),
  ('mdl_a95afa4c87b16a6d2558', 'char_dc_exterminador', 'https://www.dc.com/characters/deathstroke', 'Public API title names Exterminador; DC identifies this localized identity as Deathstroke/Slade Wilson.', 0),
  ('mdl_1ac6f9f83f480f7d91f8', 'char_dc_exterminador', 'https://www.dc.com/characters/deathstroke', 'Public API title names Exterminador; rifle and alternative heads are model details, not extra character tags.', 0);
