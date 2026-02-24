-- Script SIMPLES para inserir coleções no Supabase
-- Usa gen_random_uuid() para gerar IDs automaticamente
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

-- 1. Inserir coleção Thundercats (com ID fixo para referência)
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  gen_random_uuid(),
  'Thundercats',
  'thundercats',
  '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
  true,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- 2. Inserir coleção X-Men  
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  gen_random_uuid(),
  'X-Men',
  'x-men',
  '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
  true,
  2
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- 3. Inserir coleção Vilões do Homem-Aranha
INSERT INTO collections (id, name, slug, description, is_active, display_order)
VALUES (
  gen_random_uuid(),
  'Vilões do Homem-Aranha',
  'viloes-homem-aranha',
  '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
  true,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- 4. Verificar coleções inseridas
SELECT '✅ Coleções inseridas/atualizadas:' as status;
SELECT id, name, slug FROM collections WHERE is_active = true ORDER BY display_order;

-- 5. Inserir personagens de exemplo para Thundercats
-- Primeiro, pegar o ID da coleção Thundercats
DO $$
DECLARE
  thundercats_id UUID;
BEGIN
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats' LIMIT 1;
  
  IF thundercats_id IS NOT NULL THEN
    -- Inserir personagens
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status)
    VALUES
    (gen_random_uuid(), thundercats_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
    (gen_random_uuid(), thundercats_id, 'Cheetara', 'A mais rápida', 2, 'released'),
    (gen_random_uuid(), thundercats_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
    (gen_random_uuid(), thundercats_id, 'Tygra', 'Mestre da invisibilidade', 4, 'upcoming')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Personagens inseridos para Thundercats';
  ELSE
    RAISE NOTICE '❌ Coleção Thundercats não encontrada';
  END IF;
END $$;

-- 6. Verificar personagens inseridos
SELECT '✅ Personagens da coleção Thundercats:' as status;
SELECT 
  cc.name, 
  cc.release_order, 
  cc.status,
  c.name as collection_name
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug = 'thundercats'
ORDER BY cc.release_order;