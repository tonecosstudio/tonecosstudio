-- 🚀 FIX: Completar Thundercats com 12 personagens
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

-- 1. Primeiro, verificar se a coluna total_characters existe
DO $$
BEGIN
  -- Adicionar coluna se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'total_characters'
  ) THEN
    ALTER TABLE collections ADD COLUMN total_characters INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Coluna total_characters criada';
  END IF;
END $$;

-- 2. Completar personagens da Thundercats (12 no total)
DO $$
DECLARE
  thundercats_id UUID;
BEGIN
  -- Pegar ID da Thundercats
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats';
  
  -- Limpar personagens existentes (opcional - comente se quiser manter os atuais)
  -- DELETE FROM collection_characters WHERE collection_id = thundercats_id;
  
  -- Inserir 12 personagens
  INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
  -- Lançados (2)
  (gen_random_uuid(), thundercats_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
  (gen_random_uuid(), thundercats_id, 'Cheetara', 'A mais rápida', 2, 'released'),
  
  -- Revelados (2)  
  (gen_random_uuid(), thundercats_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
  (gen_random_uuid(), thundercats_id, 'Tygra', 'Mestre da invisibilidade', 4, 'revealed'),
  
  -- Em breve (8) - completando 12
  (gen_random_uuid(), thundercats_id, 'WilyKit', 'Especialista em acrobacias', 5, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'WilyKat', 'Mestre em disfarces', 6, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'Snarf', 'Fiel companheiro', 7, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'Jaga', 'Guardião espiritual', 8, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'Mumm-Ra', 'Vilão imortal', 9, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'S-S-Slithe', 'Líder dos Mutantes', 10, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'Vultureman', 'Especialista em armas', 11, 'upcoming'),
  (gen_random_uuid(), thundercats_id, 'Jackalman', 'Força sobre-humana', 12, 'upcoming')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ 12 personagens inseridos';
END $$;

-- 3. Atualizar contagem na coleção
UPDATE collections 
SET total_characters = 12 
WHERE slug = 'thundercats';

-- 4. Verificar resultado
SELECT '🎉 RESULTADO FINAL:' as status;
SELECT 
  c.name as "Nome da Coleção",
  c.slug,
  c.total_characters as "Total (deveria ser 12)",
  COUNT(cc.id) as "Personagens cadastrados",
  SUM(CASE WHEN cc.status = 'released' THEN 1 ELSE 0 END) as "Disponíveis",
  SUM(CASE WHEN cc.status = 'revealed' THEN 1 ELSE 0 END) as "Revelados",
  SUM(CASE WHEN cc.status = 'upcoming' THEN 1 ELSE 0 END) as "Em breve"
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug = 'thundercats'
GROUP BY c.id, c.name, c.slug, c.total_characters;

-- 5. Listar todos os personagens
SELECT '📋 LISTA COMPLETA (12 personagens):' as status;
SELECT 
  cc.release_order as "#",
  cc.name as "Nome do Personagem",
  CASE cc.status
    WHEN 'released' THEN '✅ Disponível'
    WHEN 'revealed' THEN '👁️ Revelado'  
    WHEN 'upcoming' THEN '⏳ Em breve'
  END as status
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug = 'thundercats'
ORDER BY cc.release_order;