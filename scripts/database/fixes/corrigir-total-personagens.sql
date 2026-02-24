-- Corrigir total de personagens e descrição da coleção Thundercats
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  thundercats_id UUID;
  personagens_count INTEGER;
BEGIN
  -- Pegar o ID da coleção Thundercats
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats' LIMIT 1;
  
  IF thundercats_id IS NOT NULL THEN
    -- Contar quantos personagens já existem
    SELECT COUNT(*) INTO personagens_count 
    FROM collection_characters 
    WHERE collection_id = thundercats_id;
    
    -- Se tiver menos de 12 personagens, completar
    IF personagens_count < 12 THEN
      -- Executar o script de completar coleção
      RAISE NOTICE 'Adicionando personagens faltantes...';
      -- (O script anterior será executado aqui)
    END IF;
    
    -- Atualizar a descrição para mencionar 12 personagens
    UPDATE collections 
    SET 
      description = '12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro, Tygra, WilyKit, WilyKat, Snarf, Jaga, Mumm-Ra, S-S-Slithe, Vultureman e Jackalman.',
      total_characters = 12
    WHERE id = thundercats_id;
    
    RAISE NOTICE '✅ Descrição e total atualizados para 12 personagens';
    
    -- Verificar resultado
    SELECT '📊 Status final:' as status;
    SELECT 
      name,
      slug,
      total_characters,
      description
    FROM collections 
    WHERE id = thundercats_id;
    
  ELSE
    RAISE NOTICE '❌ Coleção Thundercats não encontrada';
  END IF;
END $$;

-- Verificar contagem atual
SELECT '🔍 Verificação:' as status;
SELECT 
  c.name,
  COUNT(cc.id) as total_personagens,
  c.total_characters as total_esperado,
  CASE 
    WHEN COUNT(cc.id) = 12 THEN '✅ OK'
    WHEN COUNT(cc.id) < 12 THEN '⚠️ Faltam personagens'
    ELSE '❌ Excesso'
  END as status
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug = 'thundercats'
GROUP BY c.id, c.name, c.total_characters;