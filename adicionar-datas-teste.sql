-- ============================================
-- ADICIONAR DATAS DE TESTE AOS PERSONAGENS
-- ============================================
-- Este script adiciona datas aos personagens existentes

-- 1. Ver personagens existentes
SELECT 
  cc.id,
  cc.name,
  cc.release_order,
  c.name as collection_name,
  cc.release_date,
  cc.status
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
ORDER BY c.name, cc.release_order;

-- 2. Atualizar TODOS os personagens com datas progressivas
-- (Cada personagem lança 7 dias após o anterior)
WITH numbered_characters AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY release_order) as row_num
  FROM collection_characters
)
UPDATE collection_characters cc
SET 
  release_date = CURRENT_DATE + (nc.row_num * 7 || ' days')::INTERVAL,
  reveal_date = CURRENT_DATE + ((nc.row_num * 7) - 3 || ' days')::INTERVAL,
  auto_reveal = true,
  auto_release = true
FROM numbered_characters nc
WHERE cc.id = nc.id;

-- 3. Verificar resultado
SELECT 
  cc.name,
  cc.release_order,
  cc.release_date,
  cc.reveal_date,
  (cc.release_date - CURRENT_DATE) as days_until_release,
  cc.status,
  c.name as collection_name
FROM collection_characters cc
JOIN collections c ON c.id = cc.collection_id
ORDER BY cc.release_date;

-- 4. Ver próximo lançamento
SELECT * FROM get_next_release();

-- 5. Testar atualização automática
SELECT auto_update_character_status();

-- 6. Ver se algum status mudou
SELECT 
  name,
  status,
  release_date,
  revealed_at,
  released_at
FROM collection_characters
WHERE revealed_at IS NOT NULL OR released_at IS NOT NULL;
