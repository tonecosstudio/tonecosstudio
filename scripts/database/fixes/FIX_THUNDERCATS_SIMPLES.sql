-- 🚀 FIX SIMPLES: Completar Thundercats com 12 personagens
-- Versão corrigida sem ambiguidade de colunas
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna total_characters se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'collections' AND column_name = 'total_characters'
  ) THEN
    ALTER TABLE collections ADD COLUMN total_characters INTEGER DEFAULT 0;
    RAISE NOTICE 'Coluna total_characters criada';
  END IF;
END $$;

-- 2. Pegar ID da coleção Thundercats
DO $$
DECLARE
  collection_id UUID;
BEGIN
  -- Buscar ID da Thundercats
  SELECT id INTO collection_id FROM collections WHERE slug = 'thundercats';
  
  IF collection_id IS NOT NULL THEN
    -- 3. Inserir 12 personagens (substitui os existentes)
    DELETE FROM collection_characters WHERE collection_id = collection_id;
    
    -- Inserir 12 personagens completos
    INSERT INTO collection_characters (id, collection_id, name, description, release_order, status) VALUES
    -- Personagens 1-12
    (gen_random_uuid(), collection_id, 'Lion-O', 'Líder dos Thundercats', 1, 'released'),
    (gen_random_uuid(), collection_id, 'Cheetara', 'A mais rápida', 2, 'released'),
    (gen_random_uuid(), collection_id, 'Panthro', 'Engenheiro e estrategista', 3, 'revealed'),
    (gen_random_uuid(), collection_id, 'Tygra', 'Mestre da invisibilidade', 4, 'revealed'),
    (gen_random_uuid(), collection_id, 'WilyKit', 'Especialista em acrobacias', 5, 'upcoming'),
    (gen_random_uuid(), collection_id, 'WilyKat', 'Mestre em disfarces', 6, 'upcoming'),
    (gen_random_uuid(), collection_id, 'Snarf', 'Fiel companheiro', 7, 'upcoming'),
    (gen_random_uuid(), collection_id, 'Jaga', 'Guardião espiritual', 8, 'upcoming'),
    (gen_random_uuid(), collection_id, 'Mumm-Ra', 'Vilão imortal', 9, 'upcoming'),
    (gen_random_uuid(), collection_id, 'S-S-Slithe', 'Líder dos Mutantes', 10, 'upcoming'),
    (gen_random_uuid(), collection_id, 'Vultureman', 'Especialista em armas', 11, 'upcoming'),
    (gen_random_uuid(), collection_id, 'Jackalman', 'Força sobre-humana', 12, 'upcoming');
    
    RAISE NOTICE '12 personagens inseridos com sucesso';
    
    -- 4. Atualizar contagem na coleção
    UPDATE collections 
    SET total_characters = 12 
    WHERE id = collection_id;
    
    RAISE NOTICE 'Contagem atualizada para 12 personagens';
    
  ELSE
    RAISE NOTICE 'ERRO: Coleção Thundercats não encontrada';
  END IF;
END $$;

-- 5. VERIFICAÇÃO FINAL
-- 5.1. Verificar coleção
SELECT 'VERIFICAÇÃO DA COLEÇÃO:' as titulo;
SELECT 
  name as colecao,
  slug,
  total_characters
FROM collections 
WHERE slug = 'thundercats';

-- 5.2. Contar personagens
SELECT 'CONTAGEM DE PERSONAGENS:' as titulo;
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) as disponiveis,
  SUM(CASE WHEN status = 'revealed' THEN 1 ELSE 0 END) as revelados,
  SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) as em_breve
FROM collection_characters cc
WHERE collection_id = (SELECT id FROM collections WHERE slug = 'thundercats');

-- 5.3. Listar todos os personagens
SELECT 'LISTA COMPLETA (12 PERSONAGENS):' as titulo;
SELECT 
  release_order as ordem,
  name as personagem,
  CASE status
    WHEN 'released' THEN 'DISPONÍVEL'
    WHEN 'revealed' THEN 'REVELADO'
    WHEN 'upcoming' THEN 'EM BREVE'
  END as status
FROM collection_characters
WHERE collection_id = (SELECT id FROM collections WHERE slug = 'thundercats')
ORDER BY release_order;