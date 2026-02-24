-- Script SIMPLES para inserir coleções no Supabase
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

-- 1. Inserir coleção Thundercats
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '099d78fc-b85f-46da-b9c2-68d54aec0266',
  'Thundercats',
  'thundercats',
  '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
  true,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir coleção X-Men  
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'X-Men',
  'x-men',
  '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
  true,
  2
)
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir coleção Vilões do Homem-Aranha
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  '22222222-3333-4444-5555-666666666666',
  'Vilões do Homem-Aranha',
  'viloes-homem-aranha',
  '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
  true,
  3
)
ON CONFLICT (id) DO NOTHING;

-- 4. Verificar
SELECT '✅ Coleções inseridas:' as status;
SELECT id, name, slug FROM collections WHERE is_active = true ORDER BY display_order;

-- 5. Inserir personagens de exemplo para Thundercats
INSERT INTO collection_characters (id, collection_id, name, description, release_order, status)
VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1', '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2', '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Cheetara', 'A mais rápida', 2, 'released'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3', '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4', '099d78fc-b85f-46da-b9c2-68d54aec0266', 'Tygra', 'Mestre da invisibilidade', 4, 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- 6. Verificar personagens
SELECT '✅ Personagens inseridos:' as status;
SELECT name, release_order, status FROM collection_characters WHERE collection_id = '099d78fc-b85f-46da-b9c2-68d54aec0266' ORDER BY release_order;