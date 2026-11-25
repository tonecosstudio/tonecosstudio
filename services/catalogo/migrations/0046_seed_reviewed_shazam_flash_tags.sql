-- Shazam and Flash public franchise records reviewed individually by model ID.
-- Candidate only; apply through the authorized D1 writer after the M5 gate.

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_6dcec9f6e77013ebeffc', 'char_dc_shazam', 'https://www.dc.com/characters/shazam', 'Public API title names Shazam and Billy Batson. DC identifies Billy Batson as Shazam’s alter ego; keep one canonical Shazam relation. The unnamed magical figure is not identified as another character.', 0),
  ('mdl_2796214bc4da505aa613', 'char_dc_shazam', 'https://www.dc.com/characters/shazam', 'Public API title names Shazam and Billy Batson. They are one character identity, so do not create a duplicate Billy Batson tag.', 0),
  ('mdl_9f5e752ea99121dc578d', 'char_dc_shazam', 'https://www.dc.com/characters/shazam', 'Public API title names Shazam as one character in the diorama; DC identifies Shazam as Billy Batson’s alter ego.', 0),
  ('mdl_9f5e752ea99121dc578d', 'char_dc_freddy_freeman', 'https://www.dc.com/characters/shazam-family', 'Public API title separately names Freddy Freeman; DC lists him as an individual member of the Shazam Family.', 0),
  ('mdl_1ea4c594b90bc53fb2eb', 'char_dc_shazam', 'https://www.dc.com/characters/shazam', 'Public API title names Shazam; three views are presentation of one model, not additional identities.', 0),
  ('mdl_3ec2dd9221c4382caca6', 'char_dc_shazam', 'https://www.dc.com/characters/shazam', 'Public API title names Shazam; statue views and snack are model details.', 0),
  ('mdl_86425f2eeca770f7ae0d', 'char_dc_flash', 'https://www.dc.com/characters/the-flash', 'Public API title names the Flash identity; gray bust styling does not identify a specific mantle bearer.', 0),
  ('mdl_f29c8bd63e0a7fa06715', 'char_dc_flash', 'https://www.dc.com/characters/the-flash', 'Public API title names the Flash identity; lightning and base are model details.', 0),
  ('mdl_21d446f336a06ad1bddb', 'char_dc_flash', 'https://www.dc.com/characters/the-flash', 'Public API title names Flash as one character in the confrontation.', 0),
  ('mdl_21d446f336a06ad1bddb', 'char_dc_flash_reverso', 'https://www.dc.com/characters/reverse-flash', 'Public API title separately names Flash Reverso; DC confirms Reverse-Flash is an individual character and Flash antagonist.', 0),
  ('mdl_7d67f172b46e60111987', 'char_dc_flash', 'https://www.dc.com/characters/the-flash', 'Public API title names Flash as one character in the confrontation.', 0),
  ('mdl_7d67f172b46e60111987', 'char_dc_tubarao_rei', 'https://www.dc.com/characters/king-shark', 'Public API title separately names Tubarão Rei; DC identifies King Shark as an individual character.', 0);
