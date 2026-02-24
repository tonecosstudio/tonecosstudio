-- 🚀 MIGRAÇÃO INICIAL: Dados para sistema de coleções
-- NÃO é gambiarra: É migração legítima de dados iniciais
-- Depois desta migração, use o painel admin para manutenção
-- Execute no Supabase SQL Editor

-- ============================================
-- 1. VERIFICAR E CRIAR ESTRUTURA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Verificando estrutura do banco...';
  
  -- Verificar se tabelas existem
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') THEN
    RAISE EXCEPTION '❌ Tabela collections não existe. Execute as migrações primeiro.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_characters') THEN
    RAISE EXCEPTION '❌ Tabela collection_characters não existe. Execute as migrações primeiro.';
  END IF;
  
  -- Adicionar coluna total_characters se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'total_characters'
  ) THEN
    ALTER TABLE collections ADD COLUMN total_characters INTEGER DEFAULT 12;
    RAISE NOTICE '✅ Coluna total_characters criada';
  END IF;
  
  RAISE NOTICE '✅ Estrutura verificada com sucesso';
END $$;

-- ============================================
-- 2. DADOS INICIAIS DAS COLEÇÕES
-- ============================================

DO $$
DECLARE
  thundercats_id UUID;
  xmen_id UUID;
  viloes_id UUID;
BEGIN
  RAISE NOTICE '📦 Inserindo dados iniciais das coleções...';
  
  -- Thundercats (já existe, apenas atualizar)
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats';
  IF thundercats_id IS NULL THEN
    INSERT INTO collections (id, name, slug, description, is_active, display_order, total_characters)
    VALUES (
      gen_random_uuid(),
      'Thundercats',
      'thundercats',
      '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.',
      true,
      1,
      12
    ) RETURNING id INTO thundercats_id;
    RAISE NOTICE '✅ Thundercats criada';
  ELSE
    UPDATE collections 
    SET total_characters = 12,
        description = '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.'
    WHERE id = thundercats_id;
    RAISE NOTICE '✅ Thundercats atualizada';
  END IF;
  
  -- X-Men
  SELECT id INTO xmen_id FROM collections WHERE slug = 'x-men';
  IF xmen_id IS NULL THEN
    INSERT INTO collections (id, name, slug, description, is_active, display_order, total_characters)
    VALUES (
      gen_random_uuid(),
      'X-Men',
      'x-men',
      '12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.',
      true,
      2,
      12
    ) RETURNING id INTO xmen_id;
    RAISE NOTICE '✅ X-Men criada';
  ELSE
    UPDATE collections SET total_characters = 12 WHERE id = xmen_id;
    RAISE NOTICE '✅ X-Men atualizada';
  END IF;
  
  -- Vilões do Homem-Aranha
  SELECT id INTO viloes_id FROM collections WHERE slug = 'viloes-homem-aranha';
  IF viloes_id IS NULL THEN
    INSERT INTO collections (id, name, slug, description, is_active, display_order, total_characters)
    VALUES (
      gen_random_uuid(),
      'Vilões do Homem-Aranha',
      'viloes-homem-aranha',
      '12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.',
      true,
      3,
      12
    ) RETURNING id INTO viloes_id;
    RAISE NOTICE '✅ Vilões do Homem-Aranha criada';
  ELSE
    UPDATE collections SET total_characters = 12 WHERE id = viloes_id;
    RAISE NOTICE '✅ Vilões do Homem-Aranha atualizada';
  END IF;
  
  -- ============================================
  -- 3. PERSONAGENS INICIAIS (APENAS PARA DEMO)
  -- ============================================
  
  RAISE NOTICE '👥 Inserindo personagens de demonstração...';
  
  -- Limpar personagens existentes (apenas para esta migração)
  DELETE FROM collection_characters WHERE collection_id IN (thundercats_id, xmen_id, viloes_id);
  
  -- Thundercats: 4 personagens (demo)
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), thundercats_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
  (gen_random_uuid(), thundercats_id, 'Cheetara', 'A mais rápida', 2, 'released'),
  (gen_random_uuid(), thundercats_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
  (gen_random_uuid(), thundercats_id, 'Tygra', 'Mestre da invisibilidade', 4, 'upcoming');
  
  -- X-Men: 4 personagens (demo)
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), xmen_id, 'Wolverine', 'Mutante com garras de adamantium', 1, 'released'),
  (gen_random_uuid(), xmen_id, 'Ciclope', 'Líder dos X-Men, raios ópticos', 2, 'released'),
  (gen_random_uuid(), xmen_id, 'Tempestade', 'Controla o clima', 3, 'revealed'),
  (gen_random_uuid(), xmen_id, 'Jean Grey', 'Telepata poderosa', 4, 'upcoming');
  
  -- Vilões: 4 personagens (demo)
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  (gen_random_uuid(), viloes_id, 'Duende Verde', 'Norman Osborn, vilão clássico', 1, 'released'),
  (gen_random_uuid(), viloes_id, 'Venom', 'Simbiote alienígena', 2, 'released'),
  (gen_random_uuid(), viloes_id, 'Doutor Octopus', 'Otto Octavius, tentáculos', 3, 'revealed'),
  (gen_random_uuid(), viloes_id, 'Carnificina', 'Simbiote vermelho', 4, 'upcoming');
  
  RAISE NOTICE '✅ 12 personagens de demonstração inseridos (4 por coleção)';
  RAISE NOTICE '📝 NOTA: Use o painel admin para completar os 12 personagens de cada coleção';
  
END $$;

-- ============================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================

SELECT '🎉 MIGRAÇÃO CONCLUÍDA' as status;
SELECT '================================' as separator;

SELECT '📊 STATUS DAS COLEÇÕES:' as titulo;
SELECT 
  c.name as colecao,
  c.slug,
  c.total_characters as total_esperado,
  COUNT(cc.id) as personagens_inseridos,
  CASE 
    WHEN COUNT(cc.id) = 4 THEN '✅ DEMO PRONTA'
    WHEN COUNT(cc.id) = 12 THEN '✅ COMPLETA'
    ELSE '⚠️ INCOMPLETA'
  END as status,
  'Use o admin para adicionar mais personagens' as acao
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
GROUP BY c.id, c.name, c.slug, c.total_characters
ORDER BY c.display_order;

SELECT '================================' as separator;
SELECT '🚀 PRÓXIMOS PASSOS:' as titulo;
SELECT '1. Acesse: http://localhost:8080/admin/colecoes' as passo;
SELECT '2. Clique em cada coleção' as passo;
SELECT '3. Use "Adicionar Personagem" para completar 12' as passo;
SELECT '4. O frontend será atualizado automaticamente' as passo;