-- Page 4 of Equipes e Grupos, audited by public model ID.
-- Hulkbuster records are equipment, not characters, and intentionally receive no character relation.
-- Local candidate only. Nothing here is applied to production; M5 authorization remains required.

INSERT OR IGNORE INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_marvel_jane_foster', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'jane-foster', 'Jane Foster', NULL, 'https://marvel.com/comics/discover/291/avenging-women'),
  ('char_marvel_jean_grey', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'jean-grey', 'Jean Grey', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_jubileu', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'jubileu', 'Jubileu', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_juggernaut', (SELECT id FROM franchises WHERE slug='viloes'), 'juggernaut', 'Juggernaut', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_kitty_pryde', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'kitty-pryde', 'Kitty Pryde', NULL, 'https://www.marvel.com/characters/kitty-pryde'),
  ('char_marvel_madelyne', (SELECT id FROM franchises WHERE slug='viloes'), 'madelyne', 'Madelyne', NULL, 'https://www.marvel.com/characters/mister-sinister'),
  ('char_marvel_maestro', (SELECT id FROM franchises WHERE slug='viloes'), 'maestro', 'Maestro', NULL, 'https://www.marvel.com/comics/issue/90443/MAESTRO_1_'),
  ('char_marvel_magia', (SELECT id FROM franchises WHERE slug='herois-individuais'), 'magia', 'Magia', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('char_marvel_magneto', (SELECT id FROM franchises WHERE slug='viloes'), 'magneto', 'Magneto', NULL, 'https://www.marvel.com/teams-and-groups/x-men/in-comics');

INSERT OR IGNORE INTO catalog_attributes (id, kind, canonical_slug, display_name, evidence_origin)
VALUES
  ('attr_publisher_marvel', 'publisher', 'marvel', 'Marvel', 'https://www.marvel.com/'),
  ('attr_universe_x-men', 'universe', 'x-men', 'X-Men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics'),
  ('attr_universe_vingadores', 'universe', 'vingadores', 'Vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics');

INSERT OR IGNORE INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_2846e5d9cbbd30abb8e9', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Hulk vs Juggernaut: title explicitly names Hulk; separate relation.', 1),
  ('mdl_2846e5d9cbbd30abb8e9', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Hulk vs Juggernaut: title explicitly names Juggernaut; separate relation.', 1),
  ('mdl_587e5e7ec50f747fffd4', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Hulk vs Wolverine: title explicitly names Hulk; separate relation.', 1),
  ('mdl_587e5e7ec50f747fffd4', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Hulk vs Wolverine: title explicitly names Wolverine; separate relation.', 1),
  ('mdl_fd4a4ab0deab878edd88', 'char_marvel_hulk', 'owner_reviewed_model:2026-11-24', 'Hulk vs Wolverine: title explicitly names Hulk; separate relation.', 1),
  ('mdl_fd4a4ab0deab878edd88', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Hulk vs Wolverine: title explicitly names Wolverine; separate relation.', 1),
  ('mdl_4f7972d53b3b06439010', 'char_marvel_jane_foster', 'owner_reviewed_model:2026-11-24', 'Jane Foster in Vingadores/Jane Foster; Marvel identifies her among heroines who served as Avengers.', 1),
  ('mdl_7776f83ec5b1e3a1c764', 'char_marvel_jane_foster', 'owner_reviewed_model:2026-11-24', 'Second Jane Foster model; public title and Vingadores collection reviewed by ID.', 1),
  ('mdl_2b4865a1234f4fcf4d13', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Jean Grey in X-Men/Jean Grey; official X-Men roster identifies Jean Grey/Phoenix.', 1),
  ('mdl_2b6e0aa443c728752e5d', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Second Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_2e9168139d49f8bf2304', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Third Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_3dc3334d332145a0d69c', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Fourth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_832710fc3258de8a355f', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Fifth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_8c5f0f18662de3c15090', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Sixth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_a1b19a09f174f3b4d1b0', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Seventh Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_b07e6f139bf40d77bdf5', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Eighth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_c39bb637ee5c32c0225a', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Ninth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_fd3c43c28a00e6c9461c', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Tenth Jean Grey model; public ID and X-Men folder reviewed separately.', 1),
  ('mdl_dc0b010cf4d5f6ee8c4e', 'char_marvel_jean_grey', 'owner_reviewed_model:2026-11-24', 'Jean Grey e Ciclope: title explicitly names Jean Grey; separate relation.', 1),
  ('mdl_dc0b010cf4d5f6ee8c4e', 'char_marvel_ciclope', 'owner_reviewed_model:2026-11-24', 'Jean Grey e Ciclope: title explicitly names Ciclope; separate relation.', 1),
  ('mdl_e4186b0c460d460150b0', 'char_marvel_jubileu', 'owner_reviewed_model:2026-11-24', 'Jubileu in X-Men/Jubileu; public title and official Marvel X-Men material confirm the character.', 1),
  ('mdl_0103db191730eff9600b', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Juggernaut in X-Men villains; official Marvel history identifies him as an X-Men adversary.', 1),
  ('mdl_293b0dd0f653f220cf00', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Second Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_3b6ddb5fe7e7b645d0a3', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Third Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_606186469e9e63417669', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Fourth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_63fefad353aacafe2b1b', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Fifth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_6b25d42324e7d62c2e0c', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Sixth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_84c84f9efee44e225693', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Seventh Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_c1e6f6c9ea71292472c3', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Eighth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_e21e87cd80d42a9529d2', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Ninth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_e479420615bcfd655fc3', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Tenth Juggernaut model; public ID and villain folder checked.', 1),
  ('mdl_7ad57b284173f430ce73', 'char_marvel_juggernaut', 'owner_reviewed_model:2026-11-24', 'Juggernaut e Colossus: title explicitly names Juggernaut; separate relation.', 1),
  ('mdl_7ad57b284173f430ce73', 'char_marvel_colossus', 'owner_reviewed_model:2026-11-24', 'Juggernaut e Colossus: title explicitly names Colossus; separate relation.', 1),
  ('mdl_7024e38b7de211a59c6d', 'char_marvel_kitty_pryde', 'owner_reviewed_model:2026-11-24', 'Kitty Pryde in X-Men/Kitty Pryde; official Marvel profile confirms the character.', 1),
  ('mdl_6049287e6d3f455a76bd', 'char_marvel_wolverine', 'owner_reviewed_model:2026-11-24', 'Logan is the same canonical identity as Wolverine; official Marvel reference identifies James Howlett a.k.a. Logan.', 1),
  ('mdl_2e68b58620d11e03e1d6', 'char_marvel_madelyne', 'owner_reviewed_model:2026-11-24', 'Public title Madelyne and X-Men villain folder; official Marvel history identifies Madelyne Pryor as an X-Men story character.', 1),
  ('mdl_221f3f3090389c694fd6', 'char_marvel_maestro', 'owner_reviewed_model:2026-11-24', 'Maestro in Vingadores/Hulk/Maestro; official Marvel issue identifies Maestro as a future Hulk identity.', 1),
  ('mdl_7b5c708bad4e14c77b73', 'char_marvel_maestro', 'owner_reviewed_model:2026-11-24', 'Second Maestro model; public ID and folder reviewed separately.', 1),
  ('mdl_ec3421b4ea57a7667b21', 'char_marvel_maestro', 'owner_reviewed_model:2026-11-24', 'Third Maestro model; public ID and folder reviewed separately.', 1),
  ('mdl_0253debc7d16302e8aed', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Magia in X-Men/Magia; official Marvel roster lists Magik/Illyana Rasputin, the same character.', 1),
  ('mdl_18857d463c4db5b0fd80', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Second Magia model; public ID and folder reviewed separately.', 1),
  ('mdl_34e248d2a59ddfcc7b0b', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Third Magia model; public ID and folder reviewed separately.', 1),
  ('mdl_613a7b65f2b7e3eb440c', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Fourth Magia model; public ID and folder reviewed separately.', 1),
  ('mdl_7c76ead83f4d89402ae8', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Fifth Magia model; public ID and folder reviewed separately.', 1),
  ('mdl_a58d3274014a9e536a13', 'char_marvel_magia', 'owner_reviewed_model:2026-11-24', 'Sixth Magia model; public ID and folder reviewed separately.', 1),
  ('mdl_4e4490599a12e4a72151', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Magneto in X-Men villains; official Marvel history identifies him as the team’s first foe.', 1),
  ('mdl_7e13f00e9f85b9b7a128', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Second Magneto model; public ID and villain folder checked.', 1),
  ('mdl_82f74cd1d69d839b5b31', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Third Magneto model; public ID and villain folder checked.', 1),
  ('mdl_95fac75e1bccd40f4664', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Fourth Magneto model; public ID and villain folder checked.', 1),
  ('mdl_970952862a741f258853', 'char_marvel_magneto', 'owner_reviewed_model:2026-11-24', 'Fifth Magneto model; public ID and villain folder checked.', 1);

INSERT OR IGNORE INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
VALUES
  ('char_marvel_jane_foster', 'attr_publisher_marvel', 'https://www.marvel.com/comics/discover/291/avenging-women', 'Official Marvel Avenging Women reading list.'),
  ('char_marvel_jane_foster', 'attr_universe_vingadores', 'https://www.marvel.com/comics/discover/291/avenging-women', 'Official Marvel page states Jane Foster served as an Avenger; public folder agrees.'),
  ('char_marvel_jean_grey', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster.'),
  ('char_marvel_jean_grey', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster and public X-Men collection.'),
  ('char_marvel_jubileu', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men material.'),
  ('char_marvel_jubileu', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel identifies Jubilee among X-Men; public folder agrees.'),
  ('char_marvel_juggernaut', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men history.'),
  ('char_marvel_juggernaut', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men history describes Juggernaut attacking and opposing the team; public folder is X-Men villains.'),
  ('char_marvel_kitty_pryde', 'attr_publisher_marvel', 'https://www.marvel.com/characters/kitty-pryde', 'Official Marvel Kitty Pryde profile.'),
  ('char_marvel_kitty_pryde', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster lists Kitty Pryde; public folder agrees.'),
  ('char_marvel_madelyne', 'attr_publisher_marvel', 'https://www.marvel.com/characters/mister-sinister', 'Official Marvel history names Madelyne Pryor.'),
  ('char_marvel_madelyne', 'attr_universe_x-men', 'https://www.marvel.com/characters/mister-sinister', 'Official Marvel history places Madelyne Pryor in the X-Men storyline; public folder is X-Men villains.'),
  ('char_marvel_maestro', 'attr_publisher_marvel', 'https://www.marvel.com/comics/issue/90443/MAESTRO_1_', 'Official Marvel Maestro issue.'),
  ('char_marvel_magia', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster lists Magik/Illyana Rasputin.'),
  ('char_marvel_magia', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster and public X-Men folder.'),
  ('char_marvel_magneto', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men history identifies Magneto.'),
  ('char_marvel_magneto', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel identifies Magneto as the X-Men’s first foe; public folder confirms the tree.'),
  ('char_marvel_hulk', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history includes Hulk.'),
  ('char_marvel_hulk', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers history and public collection support this tag.'),
  ('char_marvel_homem_de_ferro', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster identifies Iron Man.'),
  ('char_marvel_homem_de_ferro', 'attr_universe_vingadores', 'https://www.marvel.com/teams-and-groups/avengers/in-comics', 'Official Avengers roster and public Homem de Ferro folder support this tag.'),
  ('char_marvel_wolverine', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official Marvel X-Men roster.'),
  ('char_marvel_wolverine', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official roster lists Wolverine/Logan; public folder confirms X-Men context.'),
  ('char_marvel_colossus', 'attr_publisher_marvel', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster.'),
  ('char_marvel_colossus', 'attr_universe_x-men', 'https://www.marvel.com/teams-and-groups/x-men/in-comics', 'Official X-Men roster lists Colossus; public folder confirms context.');