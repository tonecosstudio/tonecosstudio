-- Reviewed DC character chips for individually identified public franchises.
-- Staged only; apply through the authorized D1 writer after the M5 gate.

INSERT INTO catalog_characters
  (id, franchise_id, canonical_slug, display_name, editorial_identity_id, evidence_origin)
VALUES
  ('char_dc_arlequina', (SELECT id FROM franchises WHERE slug='batman'), 'arlequina', 'Arlequina', '298ace53-3e2f-4f4e-99d2-8cc6f58f1eca', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_asa_noturna', (SELECT id FROM franchises WHERE slug='batman'), 'asa-noturna', 'Asa Noturna', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_bane', (SELECT id FROM franchises WHERE slug='batman'), 'bane', 'Bane', '3c1dc85c-c710-4953-a561-cd5dac6b98b9', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_batgirl', (SELECT id FROM franchises WHERE slug='batman'), 'batgirl', 'Batgirl', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_batman', (SELECT id FROM franchises WHERE slug='batman'), 'batman', 'Batman', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_bruce_wayne', (SELECT id FROM franchises WHERE slug='batman'), 'bruce-wayne', 'Bruce Wayne', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_batman_que_ri', (SELECT id FROM franchises WHERE slug='batman'), 'batman-que-ri', 'Batman Que Ri', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_batwoman', (SELECT id FROM franchises WHERE slug='batman'), 'batwoman', 'Batwoman', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_capuz_vermelho', (SELECT id FROM franchises WHERE slug='batman'), 'capuz-vermelho', 'Capuz Vermelho', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_cavaleiro_arkham', (SELECT id FROM franchises WHERE slug='batman'), 'cavaleiro-de-arkham', 'Cavaleiro de Arkham', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_charada', (SELECT id FROM franchises WHERE slug='batman'), 'charada', 'Charada', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_coringa', (SELECT id FROM franchises WHERE slug='batman'), 'coringa', 'Coringa', 'aec62abb-e10b-4c6f-94b4-3e66d9bc2aae', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_duas_caras', (SELECT id FROM franchises WHERE slug='batman'), 'duas-caras', 'Duas-Caras', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_espantalho', (SELECT id FROM franchises WHERE slug='batman'), 'espantalho', 'Espantalho', 'bbbf3bca-8f16-4f4b-af54-7d8e6798c95d', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_hera_venenosa', (SELECT id FROM franchises WHERE slug='batman'), 'hera-venenosa', 'Hera Venenosa', '8ddc1fa3-4a90-4387-b4c8-da6e5ddc23d7', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_mulher_gato', (SELECT id FROM franchises WHERE slug='batman'), 'mulher-gato', 'Mulher-Gato', '9e82b21f-bd47-42ee-ad8e-a50800dfc8d2', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_pinguim', (SELECT id FROM franchises WHERE slug='batman'), 'pinguim', 'Pinguim', '76be8352-4497-4439-96b0-de511611e14a', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_robin', (SELECT id FROM franchises WHERE slug='batman'), 'robin', 'Robin', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_thomas_wayne', (SELECT id FROM franchises WHERE slug='batman'), 'thomas-wayne', 'Thomas Wayne', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_flash', (SELECT id FROM franchises WHERE slug='flash'), 'flash', 'Flash', '0e8d8467-1d3f-4dcd-a45b-be7ad3acc62f', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_flash_reverso', (SELECT id FROM franchises WHERE slug='flash'), 'flash-reverso', 'Flash Reverso', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_tubarao_rei', (SELECT id FROM franchises WHERE slug='flash'), 'tubarao-rei', 'Tubarão Rei', 'aa0464c5-995c-459c-807a-f042528fd690', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_superman', (SELECT id FROM franchises WHERE slug='superman'), 'superman', 'Superman', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_clark_kent', (SELECT id FROM franchises WHERE slug='superman'), 'clark-kent', 'Clark Kent', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_general_zod', (SELECT id FROM franchises WHERE slug='superman'), 'general-zod', 'General Zod', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_superman_ciborgue', (SELECT id FROM franchises WHERE slug='superman'), 'superman-ciborgue', 'Superman Ciborgue', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_superman_zumbi', (SELECT id FROM franchises WHERE slug='superman'), 'superman-zumbi', 'Superman Zumbi', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_mulher_maravilha', (SELECT id FROM franchises WHERE slug='mulher-maravilha'), 'mulher-maravilha', 'Mulher-Maravilha', 'dbeea112-e86b-4e6b-a634-420ef1c2bae2', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_aquaman', (SELECT id FROM franchises WHERE slug='aquaman'), 'aquaman', 'Aquaman', '32167cd3-4a03-459a-9c30-a77e2cd34860', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_arraia_negra', (SELECT id FROM franchises WHERE slug='aquaman'), 'arraia-negra', 'Arraia Negra', '090026e8-1f02-4790-8fee-c0c4a574c2d2', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_lanterna_verde', (SELECT id FROM franchises WHERE slug='lanterna-verde'), 'lanterna-verde', 'Lanterna Verde', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_hal_jordan', (SELECT id FROM franchises WHERE slug='lanterna-verde'), 'hal-jordan', 'Hal Jordan', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_jessica_cruz', (SELECT id FROM franchises WHERE slug='lanterna-verde'), 'jessica-cruz', 'Jessica Cruz', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_shazam', (SELECT id FROM franchises WHERE slug='shazam'), 'shazam', 'Shazam', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_freddy_freeman', (SELECT id FROM franchises WHERE slug='shazam'), 'freddy-freeman', 'Freddy Freeman', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_estelar', (SELECT id FROM franchises WHERE slug='titas'), 'estelar', 'Estelar', 'b1a769f3-8438-4763-aa38-48d838d9bc09', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_ravena', (SELECT id FROM franchises WHERE slug='titas'), 'ravena', 'Ravena', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_darkseid', (SELECT id FROM franchises WHERE slug='darkseid'), 'darkseid', 'Darkseid', '90287fe1-50ab-4ec7-88c4-c49f2181616c', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_arqueiro_verde', (SELECT id FROM franchises WHERE slug='arqueiro-verde'), 'arqueiro-verde', 'Arqueiro Verde', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_homem_gaviao', (SELECT id FROM franchises WHERE slug='homem-gaviao'), 'homem-gaviao', 'Homem-Gavião', NULL, 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_mulher_gaviao', (SELECT id FROM franchises WHERE slug='mulher-gaviao'), 'mulher-gaviao', 'Mulher-Gavião', '7724b324-55b7-498c-b223-feb35a096901', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_lobo', (SELECT id FROM franchises WHERE slug='lobo'), 'lobo', 'Lobo', '6f566122-ddb8-4068-895a-b18ffec36329', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_supergirl', (SELECT id FROM franchises WHERE slug='supergirl'), 'supergirl', 'Supergirl', 'a19f471a-aa42-4e2d-a0f1-0affd2e08e6c', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_senhor_destino', (SELECT id FROM franchises WHERE slug='sr-destino'), 'senhor-destino', 'Senhor Destino', 'f6165e84-00b0-4f20-9575-64930e626260', 'owner_reviewed_public_catalog:2026-11-24'),
  ('char_dc_constantine', (SELECT id FROM franchises WHERE slug='constantine'), 'constantine', 'Constantine', NULL, 'owner_reviewed_public_catalog:2026-11-24');

/* PENDING ITEM-BY-ITEM REVIEW. Do not apply this candidate map.
   Each selected model must be reviewed and moved to explicit model-ID rows.
WITH folder_links(franchise_slug, folder_path, character_id) AS (
  VALUES
    ('batman','arlequina','char_dc_arlequina'),('batman','asa-noturna','char_dc_asa_noturna'),
    ('batman','bane','char_dc_bane'),('batman','batgirl','char_dc_batgirl'),('batman','batman','char_dc_batman'),
    ('batman','batman-que-ri','char_dc_batman_que_ri'),('batman','batwoman','char_dc_batwoman'),
    ('batman','capuz-vermelho','char_dc_capuz_vermelho'),('batman','cavaleiro-de-arkham','char_dc_cavaleiro_arkham'),
    ('batman','charada','char_dc_charada'),('batman','coringa','char_dc_coringa'),('batman','duas-caras','char_dc_duas_caras'),
    ('batman','espantalho','char_dc_espantalho'),('batman','hera-venenosa','char_dc_hera_venenosa'),
    ('batman','mulher-gato','char_dc_mulher_gato'),('batman','pinguim','char_dc_pinguim'),
    ('batman','robin','char_dc_robin'),('batman','thomas-wayne','char_dc_thomas_wayne'),
    ('superman','general-zod','char_dc_general_zod'),('superman','superman-ciborgue','char_dc_superman_ciborgue'),
    ('superman','superman-zumbi','char_dc_superman_zumbi'),('aquaman','arraia-negra','char_dc_arraia_negra'),
    ('lanterna-verde','jessica-cruz','char_dc_jessica_cruz'),('titas','estelar','char_dc_estelar'),
    ('titas','ravena','char_dc_ravena')
), default_links(franchise_slug, character_id) AS (
  VALUES
    ('superman','char_dc_superman'),('mulher-maravilha','char_dc_mulher_maravilha'),('aquaman','char_dc_aquaman'),
    ('lanterna-verde','char_dc_lanterna_verde'),('shazam','char_dc_shazam'),('flash','char_dc_flash'),
    ('darkseid','char_dc_darkseid'),('arqueiro-verde','char_dc_arqueiro_verde'),
    ('homem-gaviao','char_dc_homem_gaviao'),('mulher-gaviao','char_dc_mulher_gaviao'),
    ('lobo','char_dc_lobo'),('supergirl','char_dc_supergirl'),('sr-destino','char_dc_senhor_destino'),
    ('constantine','char_dc_constantine')
), crossover_links(franchise_slug, folder_path, model_name, character_id) AS (
  VALUES
    ('lanterna-verde','','Lanterna verde hal jordan com energia verde','char_dc_hal_jordan'),
    ('flash','confrontos','Flash vs flash reverso','char_dc_flash_reverso'),
    ('flash','confrontos','Flash vs tubarao rei','char_dc_tubarao_rei')
)
INSERT INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
SELECT m.id, fl.character_id, 'owner_reviewed_public_catalog:2026-11-24',
  'Character identified by the current public model folder ' || cf.path || '.', 0
FROM models m
JOIN franchises f ON f.id=m.franchise_id
JOIN catalog_folders cf ON cf.id=m.folder_id
JOIN folder_links fl ON fl.franchise_slug=f.slug AND fl.folder_path=cf.path
UNION ALL
SELECT m.id, dl.character_id, 'owner_reviewed_public_catalog:2026-11-24',
  'Separate character explicitly named in this public crossover model.',
  CASE WHEN c.franchise_id<>m.franchise_id THEN 1 ELSE 0 END
FROM models m
JOIN franchises f ON f.id=m.franchise_id
LEFT JOIN catalog_folders cf ON cf.id=m.folder_id
JOIN crossover_links dl ON dl.franchise_slug=f.slug AND dl.folder_path=COALESCE(cf.path,'') AND lower(dl.model_name)=lower(m.name)
JOIN catalog_characters c ON c.id=dl.character_id
UNION ALL
SELECT m.id, dl.character_id, 'owner_reviewed_public_catalog:2026-11-24',
  'Freddy Freeman is a separately named character in this Shazam model.', 0
FROM models m
JOIN franchises f ON f.id=m.franchise_id AND f.slug='shazam'
JOIN catalog_characters c ON c.id='char_dc_freddy_freeman'
WHERE lower(m.name)=lower('Shazam e freddy freeman diorama cinza')
UNION ALL
SELECT m.id, d.character_id, 'owner_reviewed_public_catalog:2026-11-24',
  'Default single-character franchise tag, except models with a more specific folder character.', 0
FROM models m
JOIN franchises f ON f.id=m.franchise_id
JOIN default_links d ON d.franchise_slug=f.slug
LEFT JOIN catalog_folders cf ON cf.id=m.folder_id
WHERE NOT EXISTS (
  SELECT 1 FROM folder_links fl WHERE fl.franchise_slug=f.slug AND fl.folder_path=cf.path
)
AND NOT EXISTS (
  SELECT 1 FROM crossover_links dl WHERE dl.franchise_slug=f.slug AND dl.folder_path=COALESCE(cf.path,'')
    AND lower(dl.model_name)=lower(m.name) AND dl.character_id IN ('char_dc_batman','char_dc_flash','char_dc_shazam','char_dc_hal_jordan')
);
*/

-- Individually reviewed records: each character is a separate association.
INSERT INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_3cbf3e946dfb7e851f86', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Model title: Batman e coringa busto hibrido. Confirmed as one separate Batman character tag.', 0),
  ('mdl_3cbf3e946dfb7e851f86', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Model title: Batman e coringa busto hibrido. Confirmed as one separate Coringa character tag.', 0),
  ('mdl_9e7213da423e0abf8710', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Model title: Batman e flash busto hibrido. Confirmed as one separate Batman character tag.', 0),
  ('mdl_9e7213da423e0abf8710', 'char_dc_flash', 'owner_reviewed_model:2026-11-24', 'Model title: Batman e flash busto hibrido. Confirmed as one separate Flash character tag across franchises.', 1),
  ('mdl_46c56e734de37f452c3c', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Model title: Batman vs homem de ferro em diorama. Confirmed as one separate Batman character tag.', 0),
  ('mdl_46c56e734de37f452c3c', 'char_marvel_homem_de_ferro', 'owner_reviewed_model:2026-11-24', 'Model title: Batman vs homem de ferro em diorama. Confirmed as one separate Homem de Ferro tag across franchises.', 1),
  ('mdl_c895d5041056cd6029a9', 'char_dc_capuz_vermelho', 'owner_reviewed_model:2026-11-24', 'Model title: Capuz vermelho vs coringa em diorama. Confirmed as one separate Capuz Vermelho character tag.', 0),
  ('mdl_c895d5041056cd6029a9', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Model title: Capuz vermelho vs coringa em diorama. Confirmed as one separate Coringa character tag.', 0),
  ('mdl_cb51000743d4ca8f89da', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Model title: Batfamilia batman com jovens herois. Batman is named; other young heroes are not individually named and are left untagged.', 0),
  ('mdl_e32e50d2603e8b2285c2', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Model title: Batfamilia estilizada com batman e jovens herois. Batman is named; no unnamed group members were added as tags.', 0),
  ('mdl_526ad61e3ce855c3dc0b', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public title: Coringa e arlequina sentados em diorama. Coringa is recorded as an individual character.', 0),
  ('mdl_526ad61e3ce855c3dc0b', 'char_dc_arlequina', 'owner_reviewed_model:2026-11-24', 'Public title: Coringa e arlequina sentados em diorama. Arlequina is recorded as an individual character.', 0),
  ('mdl_023cf42b3596d70b93fd', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Batman and places it in the Batman folder. One Batman character association.', 0),
  ('mdl_02f8fcaccab93c11ce04', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Coringa and places it in the Coringa folder. One Coringa character association.', 0),
  ('mdl_07693ad24c8ef3ecd685', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Coringa and places it in the Coringa folder. One Coringa character association.', 0),
  ('mdl_08cf757918e46022b8bc', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Coringa and places it in the Coringa folder. One Coringa character association.', 0),
  ('mdl_15e4be7003756987df96', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Batman and places it in the Batman folder. One Batman character association.', 0),
  ('mdl_15f27ffaed7c34388d94', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Batman and places it in the Batman folder. One Batman character association.', 0),
  ('mdl_175e3ad27874605eceee', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Batman and places it in the Batman folder. One Batman character association.', 0),
  ('mdl_194bf4644afdcfddee9e', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Production model contract names this published model Coringa and places it in the Coringa folder. One Coringa character association.', 0),
  ('mdl_1b6d4681d1ce7ce2e8e0', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa, franchise Batman, and collection folder Coringa. Variant wording is not added to the character tag.', 0),
  ('mdl_1dd17d993d3c38d4ba01', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and collection folder Batman. One Batman character association.', 0),
  ('mdl_207e2f04c9295f1632a3', 'char_dc_duas_caras', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Duas-Caras, franchise Batman, and collection folder Duas-Caras. One individual character association.', 0),
  ('mdl_222a680601af42aa64a2', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa, franchise Batman, and collection folder Coringa. One individual character association.', 0),
  ('mdl_24f4f4558511632e9e5d', 'char_dc_robin', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Robin, franchise Batman, and collection folder Robin. One individual character association.', 0),
  ('mdl_2574aceac9fc3d65b8a5', 'char_dc_thomas_wayne', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Thomas Wayne, franchise Batman, and collection folder Thomas Wayne. One individual character association; variant is not part of the name tag.', 0),
  ('mdl_27500867faf0aa348081', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa, franchise Batman, and collection folder Coringa. One individual character association.', 0),
  ('mdl_27ac8bbb831c8b7370c4', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. The Heath Ledger description in the slug is variant context, not part of the character name.', 0),
  ('mdl_2aea02890f9b6b779ea7', 'char_dc_capuz_vermelho', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Capuz Vermelho, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_33ce7be57b240fc1b718', 'char_dc_batgirl', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batgirl, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_342764926b974b614426', 'char_dc_espantalho', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Espantalho, franchise Batman, and matching folder. Poison/crows in slug remain variant details, not character tags.', 0),
  ('mdl_375e5295b44392477123', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. TNT detail in the slug was not added as another character tag.', 0),
  ('mdl_415564b16a1dcdfc09a6', 'char_dc_batgirl', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batgirl, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_44c906449ddd263ea3b4', 'char_dc_hera_venenosa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Hera Venenosa, franchise Batman, and matching folder. Carnivorous-plant detail remains variant context.', 0),
  ('mdl_48a24a98c8efae6ea0d0', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Statue color and base details are not character tags.', 0),
  ('mdl_52becd73a5a675aec690', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Heath Ledger/weapon wording remains variant context, not part of the character tag.', 0),
  ('mdl_547db59ec157978aca35', 'char_dc_asa_noturna', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Asa Noturna, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_64fc898cc82a674f0f0e', 'char_dc_bane', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Bane, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_682d0f308732a9987af1', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms the title identifies Batman and the Batman franchise/folder. Bat-signal is an accessory, not a character tag.', 0),
  ('mdl_6f27029e51576e9bfc06', 'char_dc_arlequina', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Arlequina, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_7120657fdc8c5558fb1c', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Shark detail in the slug is not sufficient evidence for a second character tag.', 0),
  ('mdl_752795029ddfda3ad2a9', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Staircase detail is not a character tag.', 0),
  ('mdl_7ac94a08f91a26997e6a', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Heath Ledger/seat details remain variant context.', 0),
  ('mdl_8162a74fdab68ca50cc9', 'char_dc_bane', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Bane, franchise Batman, and matching folder. Tubes are variant details, not added to the character name.', 0),
  ('mdl_81c323cacd493c3e21fe', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Arkham descriptor remains model variant context.', 0),
  ('mdl_82447cdd9af5b334e789', 'char_dc_charada', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Charada, franchise Batman, and matching folder. Cane/bags remain model details.', 0),
  ('mdl_8372aba1f453dab37a0e', 'char_dc_batman_que_ri', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman Que Ri, franchise Batman, and matching folder. One individual canonical identity association.', 0),
  ('mdl_84516f55cfb068fd8b85', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Gargoyle/Crusader text remains variant context.', 0),
  ('mdl_8ad3ee741b623f9d5505', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Cesar Romero is version context, not part of the name tag.', 0),
  ('mdl_8e948f8b4e6e619bfa05', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Dark Knight/gargoyle wording remains version context.', 0),
  ('mdl_952cdae65a6fabb5e952', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Armor/weapon wording remains model variant context.', 0),
  ('mdl_9c836b70d0cde3e17f8b', 'char_dc_pinguim', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Pinguim, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_9f8b468334105b08735c', 'char_dc_mulher_gato', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Mulher-Gato, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_a2c3cd27fdd2b38cd3ff', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Batcave/throne details remain model context.', 0),
  ('mdl_b38c91e328ec3298f081', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Zack Snyder identifies version context, not a separate tag.', 0),
  ('mdl_b3b39f371cfe6388ba76', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Gothic tower is model context, not another character.', 0),
  ('mdl_b3d7635fd06c019778da', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Rock is a display base, not a character tag.', 0),
  ('mdl_b5c6834031dbd44f93e3', 'char_dc_robin', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Robin, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_b6c10bda28bbee1b6a82', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Bat-signal is an accessory, not another character.', 0),
  ('mdl_b8ca1abf2029e7137e27', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. Red outfit/dancing are version details, not separate tags.', 0),
  ('mdl_bcd3efa5d9bf83857d7a', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Begins/pedestal are version/display details.', 0),
  ('mdl_c0ec14dee3bb07edbdb7', 'char_dc_mulher_gato', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Mulher-Gato, franchise Batman, and matching folder. Cat in the slug is not enough evidence to add another character.', 0),
  ('mdl_c1d0f543497b64c64e52', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Axes are model variant details, not additional character tags.', 0),
  ('mdl_c2879806ea423c421029', 'char_dc_bane', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Bane, franchise Batman, and matching folder. Venom is a visual feature/detail, not a character association.', 0),
  ('mdl_c6a96b072f4007bfd229', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and folder Coringa. The slug says nurse but does not identify a second character.', 0),
  ('mdl_c721083b9ec07c93674b', 'char_dc_capuz_vermelho', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Capuz Vermelho, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_c83974608c9c8ac271d5', 'char_dc_coringa', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Coringa and matching folder. One individual character association.', 0),
  ('mdl_cbc13c8bfe6a96b51dce', 'char_dc_cavaleiro_arkham', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Cavaleiro de Arkham, franchise Batman, and matching folder. One character association.', 0),
  ('mdl_d4b057aaeec886e85652', 'char_dc_arlequina', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Arlequina, franchise Batman, and matching folder. Bat is model accessory context, not a second character.', 0),
  ('mdl_d539c403f943f6323516', 'char_dc_espantalho', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Espantalho, franchise Batman, and matching folder. Scythe/pumpkins remain prop details.', 0),
  ('mdl_d8fed0beef9cea5733d0', 'char_dc_thomas_wayne', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Thomas Wayne, franchise Batman, and matching folder. Flashpoint is model version context.', 0),
  ('mdl_f3b32e4eaa5c034a776c', 'char_dc_bruce_wayne', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Bruce Wayne. Use the individual public character name instead of the generic Batman collection tag.', 0),
  ('mdl_f3f3804fb9c693f2c368', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API names Batman. Batman Beyond is version context; the public title does not identify an individual successor by name.', 0),
  ('mdl_f45aec10b9366e71f742', 'char_dc_robin', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Robin, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_f57c1cf7636ec1178f96', 'char_dc_arlequina', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Arlequina, franchise Batman, and matching folder. Margot Robbie is version context, not part of the tag name.', 0),
  ('mdl_f6d22cf61510c59aa022', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Chibi is style context, not a separate character.', 0),
  ('mdl_f7b3e1158c2b4c30d5cd', 'char_dc_mulher_gato', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Mulher-Gato, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_fc2638f3965c08c743ff', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_fd9dfe132cbc686c8e2a', 'char_dc_batwoman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batwoman, franchise Batman, and matching folder. One individual character association.', 0),
  ('mdl_19f93c59d12a54c79613', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Brown finish/rock are display details.', 0),
  ('mdl_274cbc3cb49c4f49e925', 'char_dc_batman', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title Batman, franchise Batman, and matching folder. Grim Knight/weapon wording remains model version context.', 0),
  ('mdl_175e7bee8c49d5ba575d', 'char_dc_clark_kent', 'owner_reviewed_model:2026-11-24', 'Public catalog API names Clark Kent; the individual name is kept separate from the Superman franchise.', 0),
  ('mdl_a391fdda394f031519a3', 'char_dc_general_zod', 'owner_reviewed_model:2026-11-24', 'Public catalog API confirms title General Zod and franchise Superman. The character receives a separate name association.', 0),
  ('mdl_43abc38325ad6398f130', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Suit color/base details remain variant context, not additional character tags.', 0),
  ('mdl_3232944564828b763961', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Kneeling/debris details remain model context.', 0),
  ('mdl_7a76209648c8163ddc08', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Armor/cape/base are version details, not other characters.', 0),
  ('mdl_ac35b31b0a59ce763fee', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Beard/color are appearance details of the statue.', 0),
  ('mdl_da1fbe8b05079b5098fd', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Beard/skull details remain model styling, not other characters.', 0),
  ('mdl_1291a1198d1443a2f298', 'char_dc_superman_ciborgue', 'owner_reviewed_model:2026-11-24', 'Public catalog API names Superman Ciborgue as a distinct character, separate from Superman.', 0),
  ('mdl_3630726a42ea0e69598d', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API names Superman. Classic/cape/crystal details describe version/display, not separate characters.', 0),
  ('mdl_741c4e8b8034f6f83d37', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Classic/stylized describe the statue version.', 0),
  ('mdl_0510aa2d2710f61ec7da', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Classic/industrial-base wording is model context.', 0),
  ('mdl_bda3f9751db89785e4e0', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Classic/crystal-base wording is model context.', 0),
  ('mdl_87621409eb4d83dc4759', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Classic/pedestal describes version/display, not another character.', 0),
  ('mdl_df966668990d829ea5da', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Standing pose/debris are model context.', 0),
  ('mdl_ecacd08d22176e373319', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Gray finish/cape are appearance details of the statue.', 0),
  ('mdl_972a8142795fc7116ae7', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Floating pose/gray finish/base are model details.', 0),
  ('mdl_7a67e16cbe4747947138', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Gray finish/symbol are details of the statue.', 0),
  ('mdl_5be10a5030ba6fba1f8d', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Metal/heat-vision/skulls are model features, not additional characters.', 0),
  ('mdl_eecf829ba068be95fe72', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Dark suit/flames are appearance and display details.', 0),
  ('mdl_69757d97b1afb89fe191', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Black suit/standing pose/debris are model details.', 0),
  ('mdl_640a0b5cd19818dbf0ef', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Black suit/three views are model variant context.', 0),
  ('mdl_8127f939de8da8a9f5a7', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Black suit/statue variations are variant details.', 0),
  ('mdl_674df31809fb52f1b4df', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Flying pose/crystal base are model details.', 0),
  ('mdl_9f23375a9e66d4e9bc48', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. “Foto” is a record variant label, not a different character.', 0),
  ('mdl_3258ddc2f21ee28df674', 'char_dc_superman', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Superman. Flying pose/debris are model details.', 0),
  ('mdl_8cd028b8c191594de05d', 'char_dc_superman_zumbi', 'owner_reviewed_model:2026-11-24', 'Public catalog API names Superman Zumbi as a distinct character form, kept separate from Superman.', 0);

INSERT INTO catalog_model_characters
  (model_id, character_id, evidence_origin, evidence_note, cross_franchise_approved)
VALUES
  ('mdl_5c3065a90e33e340adab', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; one canonical character relation.', 0),
  ('mdl_c89e72e2b419ab086032', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; bust details do not change identity.', 0),
  ('mdl_340885b8074e795a4b24', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; classic/style details are model context.', 0),
  ('mdl_82695e7e8610c47788e1', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; shield and sword are props.', 0),
  ('mdl_4404dc11e00fae66d60c', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; pose/pedestal are model context.', 0),
  ('mdl_d11392b4beb126340f39', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; pose and base do not change identity.', 0),
  ('mdl_87901dd5eac26722ad75', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; rocks are display context.', 0),
  ('mdl_4c03221d673c6431ce5f', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; props are not other characters.', 0),
  ('mdl_1437614263b424880110', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; view count is variant metadata.', 0),
  ('mdl_0d890112a86c84371a2a', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; shield/sword are props.', 0),
  ('mdl_6ab911e0897291b8db94', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; diorama props do not add characters.', 0),
  ('mdl_7fc8c7c8970219cddae7', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; raised sword/flames are model details.', 0),
  ('mdl_3a117c9c9b9ee9487e9d', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; cape/lasso are costume details.', 0),
  ('mdl_6490416da0592b5a2df7', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; lasso and pedestal are model details.', 0),
  ('mdl_33988ac9f05dcb4f2e04', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; gray finish/pedestal are model context.', 0),
  ('mdl_a8d056f01ab65261739c', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; three views are a model variant.', 0),
  ('mdl_7bca641a9af2f8063853', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; golden finish/lasso are appearance details.', 0),
  ('mdl_ddd90c6d7c23a05b7cec', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; stylized costume is model context.', 0),
  ('mdl_c947f55fc592b55475c4', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; rear view is variant metadata.', 0),
  ('mdl_789beecc2f6d021e2571', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public API names Mulher-Maravilha and Diana Prince; DC identifies Diana Prince as Wonder Woman alias.', 0),
  ('mdl_33c0a632842ff82b3b98', 'char_dc_mulher_maravilha', 'owner_reviewed_model:2026-11-24', 'Public catalog API title names Mulher-Maravilha; red costume/diorama are model context.', 0);

INSERT INTO catalog_character_attributes
  (character_id, attribute_id, evidence_origin, evidence_note)
SELECT id, 'attr_publisher_dc', 'owner_reviewed_public_catalog:2026-11-24',
  'DC publisher classification for this individually reviewed public character.'
FROM catalog_characters
WHERE id IN (
  'char_dc_arlequina','char_dc_asa_noturna','char_dc_bane','char_dc_batgirl','char_dc_batman','char_dc_batman_que_ri',
  'char_dc_batwoman','char_dc_capuz_vermelho','char_dc_cavaleiro_arkham','char_dc_charada','char_dc_coringa',
  'char_dc_duas_caras','char_dc_espantalho','char_dc_hera_venenosa','char_dc_mulher_gato','char_dc_pinguim',
  'char_dc_robin','char_dc_thomas_wayne','char_dc_bruce_wayne','char_dc_flash','char_dc_flash_reverso','char_dc_tubarao_rei',
  'char_dc_superman','char_dc_clark_kent','char_dc_general_zod','char_dc_superman_ciborgue','char_dc_superman_zumbi',
  'char_dc_mulher_maravilha','char_dc_aquaman','char_dc_arraia_negra','char_dc_lanterna_verde','char_dc_hal_jordan',
  'char_dc_jessica_cruz','char_dc_shazam','char_dc_freddy_freeman','char_dc_estelar','char_dc_ravena','char_dc_darkseid',
  'char_dc_arqueiro_verde','char_dc_homem_gaviao','char_dc_mulher_gaviao','char_dc_lobo','char_dc_supergirl',
  'char_dc_senhor_destino','char_dc_constantine'
);
