-- 🚀 MIGRAÇÃO FINAL: Dados para coleções (versão robusta)
-- Funciona independente do estado atual do banco
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  thundercats_id UUID;
  xmen_id UUID;
  viloes_id UUID;
BEGIN
  -- ============================================
  -- 1. THUNDERCATS
  -- ============================================
  
  -- Verificar se já existe
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats';
  
  IF thundercats_id IS NULL THEN
    -- Criar nova
    INSERT INTO collections (id, name, slug, description, is_active, display_order)
    VALUES (
      '099d78fc-b85f-46da-b9c2-68d54aec0266',
      'Thundercats',
      'thundercats',
      '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
      true,
      1
    ) RETURNING id INTO thundercats_id;
    RAISE NOTICE 'Thundercats criada';
  ELSE
    -- Atualizar existente
    UPDATE collections 
    SET 
      name = 'Thundercats',
      description = '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
      is_active = true,
      display_order = 1
    WHERE id = thundercats_id;
    RAISE NOTICE 'Thundercats atualizada';
  END IF;
  
  -- ============================================
  -- 2. X-MEN
  -- ============================================
  
  SELECT id INTO xmen_id FROM collections WHERE slug = 'x-men';
  
  IF xmen_id IS NULL THEN
    INSERT INTO collections (id, name, slug, description, is_active, display_order)
    VALUES (
      gen_random_uuid(),
      'X-Men',
      'x-men',
      '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
      true,
      2
    ) RETURNING id INTO xmen_id;
    RAISE NOTICE 'X-Men criada';
  ELSE
    UPDATE collections 
    SET 
      name = 'X-Men',
      description = '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
      is_active = true,
      display_order = 2
    WHERE id = xmen_id;
    RAISE NOTICE 'X-Men atualizada';
  END IF;
  
  -- ============================================
  -- 3. VILÕES DO HOMEM-ARANHA
  -- ============================================
  
  SELECT id INTO viloes_id FROM collections WHERE slug = 'viloes-homem-aranha';
  
  IF viloes_id IS NULL THEN
    INSERT INTO collections (id, name, slug, description, is_active, display_order)
    VALUES (
      gen_random_uuid(),
      'Vilões do Homem-Aranha',
      'viloes-homem-aranha',
      '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
      true,
      3
    ) RETURNING id INTO viloes_id;
    RAISE NOTICE 'Vilões criada';
  ELSE
    UPDATE collections 
    SET 
      name = 'Vilões do Homem-Aranha',
      description = '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
      is_active = true,
      display_order = 3
    WHERE id = viloes_id;
    RAISE NOTICE 'Vilões atualizada';
  END IF;
  
  -- ============================================
  -- 4. PERSONAGENS (4 por coleção)
  -- ============================================
  
  -- Limpar personagens existentes
  DELETE FROM collection_characters WHERE collection_id IN (thundercats_id, xmen_id, viloes_id);
  RAISE NOTICE 'Personagens antigos removidos';
  
  -- Thundercats
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), thundercats_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
  (gen_random_uuid(), thundercats_id, 'Cheetara', 'A mais rápida', 2, 'released'),
  (gen_random_uuid(), thundercats_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
  (gen_random_uuid(), thundercats_id, 'Tygra', 'Mestre da invisibilidade', 4, 'upcoming');
  RAISE NOTICE 'Thundercats: 4 personagens inseridos';
  
  -- X-Men
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), xmen_id, 'Wolverine', 'Mutante com garras de adamantium', 1, 'released'),
  (gen_random_uuid(), xmen_id, 'Ciclope', 'Líder dos X-Men', 2, 'released'),
  (gen_random_uuid(), xmen_id, 'Tempestade', 'Controla o clima', 3, 'revealed'),
  (gen_random_uuid(), xmen_id, 'Jean Grey', 'Telepata poderosa', 4, 'upcoming');
  RAISE NOTICE 'X-Men: 4 personagens inseridos';
  
  -- Vilões
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), viloes_id, 'Duende Verde', 'Norman Osborn', 1, 'released'),
  (gen_random_uuid(), viloes_id, 'Venom', 'Simbiote alienígena', 2, 'released'),
  (gen_random_uuid(), viloes_id, 'Doutor Octopus', 'Otto Octavius', 3, 'revealed'),
  (gen_random_uuid(), viloes_id, 'Carnificina', 'Simbiote vermelho', 4, 'upcoming');
  RAISE NOTICE 'Vilões: 4 personagens inseridos';
  
  RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
END $$;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT '🎉 RESULTADO DA MIGRAÇÃO:' as titulo;

SELECT 
  c.name as colecao,
  c.slug,
  COUNT(cc.id) as personagens,
  SUM(CASE WHEN cc.status = 'released' THEN 1 ELSE 0 END) as disponiveis,
  SUM(CASE WHEN cc.status = 'revealed' THEN 1 ELSE 0 END) as revelados,
  SUM(CASE WHEN cc.status = 'upcoming' THEN 1 ELSE 0 END) as em_breve
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
GROUP BY c.id, c.name, c.slug
ORDER BY c.display_order;

SELECT '🚀 TESTE AGORA:' as titulo;
SELECT 'http://localhost:8080/colecoes/thundercats' as url;
SELECT 'http://localhost:8080/colecoes/x-men' as url;
SELECT 'http://localhost:8080/colecoes/viloes-homem-aranha' as url;