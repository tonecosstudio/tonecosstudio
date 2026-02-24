-- Completar coleção Thundercats com TODOS os 12 personagens
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  thundercats_id UUID;
BEGIN
  -- Pegar o ID da coleção Thundercats
  SELECT id INTO thundercats_id FROM collections WHERE slug = 'thundercats' LIMIT 1;
  
  IF thundercats_id IS NOT NULL THEN
    -- Primeiro, limpar personagens existentes (opcional - remove os 4 atuais)
    -- DELETE FROM collection_characters WHERE collection_id = thundercats_id;
    
    -- Inserir TODOS os 12 personagens dos Thundercats
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status, release_date)
    VALUES
    -- Personagens 1-4: Já lançados/revelados
    (gen_random_uuid(), thundercats_id, 'Lion-O', 'Líder dos Thundercats, portador da Espada do Omens', 1, 'released', CURRENT_DATE - INTERVAL '30 days'),
    (gen_random_uuid(), thundercats_id, 'Cheetara', 'A mais rápida dos Thundercats, usa um bastão telescópico', 2, 'released', CURRENT_DATE - INTERVAL '15 days'),
    (gen_random_uuid(), thundercats_id, 'Panthro', 'Engenheiro e estrategista, construtor do Thundertank', 3, 'revealed', CURRENT_DATE + INTERVAL '15 days'),
    (gen_random_uuid(), thundercats_id, 'Tygra', 'Irmão de Lion-O, mestre da invisibilidade', 4, 'revealed', CURRENT_DATE + INTERVAL '45 days'),
    
    -- Personagens 5-8: Em breve (próximos meses)
    (gen_random_uuid(), thundercats_id, 'WilyKit', 'Irmã gêmea de WilyKat, especialista em acrobacias', 5, 'upcoming', CURRENT_DATE + INTERVAL '75 days'),
    (gen_random_uuid(), thundercats_id, 'WilyKat', 'Irmão gêmeo de WilyKit, mestre em disfarces', 6, 'upcoming', CURRENT_DATE + INTERVAL '105 days'),
    (gen_random_uuid(), thundercats_id, 'Snarf', 'Fiel companheiro e conselheiro de Lion-O', 7, 'upcoming', CURRENT_DATE + INTERVAL '135 days'),
    (gen_random_uuid(), thundercats_id, 'Jaga', 'Guardião espiritual dos Thundercats', 8, 'upcoming', CURRENT_DATE + INTERVAL '165 days'),
    
    -- Personagens 9-12: Futuros (últimos da coleção)
    (gen_random_uuid(), thundercats_id, 'Mumm-Ra', 'O vilão imortal, eterno inimigo dos Thundercats', 9, 'upcoming', CURRENT_DATE + INTERVAL '195 days'),
    (gen_random_uuid(), thundercats_id, 'S-S-Slithe', 'Líder dos Mutantes, principal aliado de Mumm-Ra', 10, 'upcoming', CURRENT_DATE + INTERVAL '225 days'),
    (gen_random_uuid(), thundercats_id, 'Vultureman', 'Mutante especialista em armas e tecnologia', 11, 'upcoming', CURRENT_DATE + INTERVAL '255 days'),
    (gen_random_uuid(), thundercats_id, 'Jackalman', 'Mutante feroz com força sobre-humana', 12, 'upcoming', CURRENT_DATE + INTERVAL '285 days')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ 12 personagens inseridos para Thundercats';
    
    -- Atualizar o total de personagens na coleção
    UPDATE collections 
    SET total_characters = 12 
    WHERE id = thundercats_id;
    
    RAISE NOTICE '✅ Total de personagens atualizado para 12';
  ELSE
    RAISE NOTICE '❌ Coleção Thundercats não encontrada';
  END IF;
END $$;

-- Verificar
SELECT '✅ Coleção Thundercats completa:' as status;
SELECT 
  c.name as colecao,
  c.total_characters,
  COUNT(cc.id) as personagens_cadastrados,
  SUM(CASE WHEN cc.status = 'released' THEN 1 ELSE 0 END) as lancados,
  SUM(CASE WHEN cc.status = 'revealed' THEN 1 ELSE 0 END) as revelados,
  SUM(CASE WHEN cc.status = 'upcoming' THEN 1 ELSE 0 END) as em_breve
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug = 'thundercats'
GROUP BY c.id, c.name, c.total_characters;

-- Listar todos os personagens
SELECT '📋 Lista completa de personagens:' as status;
SELECT 
  release_order as "#",
  name,
  status,
  CASE 
    WHEN status = 'released' THEN '✅ Disponível'
    WHEN status = 'revealed' THEN '👁️ Revelado'
    WHEN status = 'upcoming' THEN '⏳ Em breve'
  END as status_desc,
  TO_CHAR(release_date, 'DD/MM/YYYY') as data_lancamento
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug = 'thundercats'
ORDER BY release_order;