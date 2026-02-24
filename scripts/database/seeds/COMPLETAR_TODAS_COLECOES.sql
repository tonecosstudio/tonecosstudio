-- 🚀 SISTEMA COMPLETO: Completar TODAS as coleções
-- Script genérico e escalável para todas as coleções
-- Execute no Supabase SQL Editor

-- 1. FUNÇÃO: Completar coleção com personagens
CREATE OR REPLACE FUNCTION completar_colecao(
  p_slug TEXT,
  p_total_personagens INTEGER DEFAULT 12
) RETURNS TEXT AS $$
DECLARE
  v_collection_id UUID;
  v_colecao_nome TEXT;
  v_personagens_existentes INTEGER;
  v_personagens_adicionados INTEGER;
BEGIN
  -- Buscar coleção
  SELECT id, name INTO v_collection_id, v_colecao_nome 
  FROM collections WHERE slug = p_slug;
  
  IF v_collection_id IS NULL THEN
    RETURN 'ERRO: Coleção ' || p_slug || ' não encontrada';
  END IF;
  
  -- Contar personagens existentes
  SELECT COUNT(*) INTO v_personagens_existentes
  FROM collection_characters 
  WHERE collection_id = v_collection_id;
  
  -- Se já tem personagens suficientes
  IF v_personagens_existentes >= p_total_personagens THEN
    RETURN 'OK: ' || v_colecao_nome || ' já tem ' || v_personagens_existentes || ' personagens';
  END IF;
  
  -- Remover personagens existentes (para recriar)
  DELETE FROM collection_characters WHERE collection_id = v_collection_id;
  
  -- Inserir personagens baseado na coleção
  IF p_slug = 'thundercats' THEN
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
    (gen_random_uuid(), v_collection_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
    (gen_random_uuid(), v_collection_id, 'Cheetara', 'A mais rápida', 2, 'released'),
    (gen_random_uuid(), v_collection_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'Tygra', 'Mestre da invisibilidade', 4, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'WilyKit', 'Especialista em acrobacias', 5, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'WilyKat', 'Mestre em disfarces', 6, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Snarf', 'Fiel companheiro', 7, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Jaga', 'Guardião espiritual', 8, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Mumm-Ra', 'Vilão imortal', 9, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'S-S-Slithe', 'Líder dos Mutantes', 10, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Vultureman', 'Especialista em armas', 11, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Jackalman', 'Força sobre-humana', 12, 'upcoming');
    
  ELSIF p_slug = 'x-men' THEN
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
    (gen_random_uuid(), v_collection_id, 'Wolverine', 'Mutante com garras de adamantium', 1, 'released'),
    (gen_random_uuid(), v_collection_id, 'Ciclope', 'Líder dos X-Men, raios ópticos', 2, 'released'),
    (gen_random_uuid(), v_collection_id, 'Tempestade', 'Controla o clima', 3, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'Jean Grey', 'Telepata poderosa', 4, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'Professor X', 'Fundador dos X-Men', 5, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Magneto', 'Mestre do magnetismo', 6, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Fera', 'Gênio científico', 7, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Vampira', 'Absorve poderes', 8, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Noturno', 'Teletransporte', 9, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Colossus', 'Pele de aço orgânico', 10, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Deadpool', 'Mercenário tagarela', 11, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Cable', 'Soldado do futuro', 12, 'upcoming');
    
  ELSIF p_slug = 'viloes-homem-aranha' THEN
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
    (gen_random_uuid(), v_collection_id, 'Duende Verde', 'Norman Osborn, vilão clássico', 1, 'released'),
    (gen_random_uuid(), v_collection_id, 'Venom', 'Simbiote alienígena', 2, 'released'),
    (gen_random_uuid(), v_collection_id, 'Doutor Octopus', 'Otto Octavius, tentáculos', 3, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'Carnificina', 'Simbiote vermelho', 4, 'revealed'),
    (gen_random_uuid(), v_collection_id, 'Homem-Areia', 'Flint Marko', 5, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Lagarto', 'Dr. Curt Connors', 6, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Electro', 'Max Dillon', 7, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Mysterio', 'Quentin Beck', 8, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Camaleão', 'Mestre dos disfarces', 9, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Escorpião', 'Mac Gargan', 10, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Rei do Crime', 'Wilson Fisk', 11, 'upcoming'),
    (gen_random_uuid(), v_collection_id, 'Kraven', 'Caçador', 12, 'upcoming');
    
  ELSE
    RETURN 'ERRO: Coleção ' || p_slug || ' não tem template definido';
  END IF;
  
  -- Atualizar contagem
  UPDATE collections 
  SET total_characters = p_total_personagens 
  WHERE id = v_collection_id;
  
  GET DIAGNOSTICS v_personagens_adicionados = ROW_COUNT;
  
  RETURN 'OK: ' || v_colecao_nome || ' completada com ' || p_total_personagens || ' personagens';
END;
$$ LANGUAGE plpgsql;

-- 2. EXECUTAR PARA TODAS AS COLEÇÕES
DO $$
DECLARE
  resultado TEXT;
BEGIN
  -- Thundercats (já deve ter)
  SELECT completar_colecao('thundercats', 12) INTO resultado;
  RAISE NOTICE '%', resultado;
  
  -- X-Men
  SELECT completar_colecao('x-men', 12) INTO resultado;
  RAISE NOTICE '%', resultado;
  
  -- Vilões do Homem-Aranha
  SELECT completar_colecao('viloes-homem-aranha', 12) INTO resultado;
  RAISE NOTICE '%', resultado;
END $$;

-- 3. VERIFICAÇÃO FINAL DE TODAS
SELECT '📊 STATUS FINAL DE TODAS AS COLEÇÕES:' as titulo;
SELECT 
  c.name as colecao,
  c.slug,
  c.total_characters as total_esperado,
  COUNT(cc.id) as personagens_cadastrados,
  CASE 
    WHEN COUNT(cc.id) = 12 THEN '✅ COMPLETA'
    WHEN COUNT(cc.id) = 0 THEN '❌ VAZIA'
    ELSE '⚠️ INCOMPLETA'
  END as status
FROM collections c
LEFT JOIN collection_characters cc ON cc.collection_id = c.id
WHERE c.slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
GROUP BY c.id, c.name, c.slug, c.total_characters
ORDER BY c.display_order;

-- 4. LISTAR PERSONAGENS POR COLEÇÃO
SELECT '📋 PERSONAGENS POR COLEÇÃO:' as titulo;
SELECT 
  c.name as colecao,
  cc.release_order as ordem,
  cc.name as personagem,
  CASE cc.status
    WHEN 'released' THEN '✅'
    WHEN 'revealed' THEN '👁️'
    WHEN 'upcoming' THEN '⏳'
  END as status
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
WHERE c.slug IN ('thundercats', 'x-men', 'viloes-homem-aranha')
ORDER BY c.display_order, cc.release_order;