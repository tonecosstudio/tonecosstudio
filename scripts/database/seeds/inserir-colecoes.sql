-- Script para inserir coleções no banco de dados
-- Execute este script no Supabase SQL Editor

-- Inserir coleção Thundercats
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Thundercats',
  'thundercats',
  '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
  true,
  1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- Inserir coleção X-Men
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'X-Men',
  'x-men',
  '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
  true,
  2
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- Inserir coleção Vilões do Homem-Aranha
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '22222222-3333-4444-5555-666666666666',
  'Vilões do Homem-Aranha',
  'viloes-homem-aranha',
  '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
  true,
  3
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- Verificar as coleções inseridas
SELECT id, name, slug, is_active, display_order 
FROM collections 
WHERE is_active = true 
ORDER BY display_order;

-- Comentário: Agora você pode acessar:
-- http://localhost:8080/colecoes/thundercats
-- http://localhost:8080/colecoes/x-men  
-- http://localhost:8080/colecoes/viloes-homem-aranha

-- Inserir personagens para a coleção Thundercats
INSERT INTO collection_characters (
  id,
  collection_id,
  name,
  description,
  image_url,
  release_order,
  release_month,
  release_date,
  status
) VALUES
(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1',
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Lion-O',
  'Líder dos Thundercats, portador da Espada do Omens',
  'https://pabxpvqwtvbjaunjejud.supabase.co/storage/v1/object/public/models/characters/lion-o.jpg',
  1,
  1,
  CURRENT_DATE - INTERVAL '30 days', -- Lançado há 30 dias
  'released'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2',
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Cheetara',
  'A mais rápida dos Thundercats, usa um bastão telescópico',
  'https://pabxpvqwtvbjaunjejud.supabase.co/storage/v1/object/public/models/characters/cheetara.jpg',
  2,
  2,
  CURRENT_DATE - INTERVAL '15 days', -- Lançado há 15 dias
  'released'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3',
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Panthro',
  'Engenheiro e estrategista, construtor do Thundertank',
  'https://pabxpvqwtvbjaunjejud.supabase.co/storage/v1/object/public/models/characters/panthro.jpg',
  3,
  3,
  CURRENT_DATE + INTERVAL '15 days', -- Lança em 15 dias
  'revealed'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4',
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Tygra',
  'Irmão de Lion-O, mestre da invisibilidade',
  NULL, -- Ainda não revelado
  4,
  4,
  CURRENT_DATE + INTERVAL '45 days', -- Lança em 45 dias
  'upcoming'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  release_order = EXCLUDED.release_order,
  release_date = EXCLUDED.release_date,
  status = EXCLUDED.status;

-- Verificar personagens inseridos
SELECT 
  cc.name as character_name,
  cc.release_order,
  cc.status,
  cc.release_date,
  c.name as collection_name
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug = 'thundercats'
ORDER BY cc.release_order;