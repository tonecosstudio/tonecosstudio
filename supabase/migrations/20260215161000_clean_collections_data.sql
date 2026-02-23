-- Limpar dados problemáticos das coleções

-- 1. Desativar coleções sem personagens
UPDATE collections
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT c.id 
  FROM collections c
  LEFT JOIN collection_characters cc ON c.id = cc.collection_id
  GROUP BY c.id
  HAVING COUNT(cc.id) = 0
);

-- 2. Corrigir descrições teste
UPDATE collections
SET description = NULL, updated_at = NOW()
WHERE description IN ('aaa', 'test', 'teste', '');

-- 3. Remover coleções duplicadas (manter apenas a primeira de cada nome)
WITH duplicates AS (
  SELECT id, name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY created_at) as rn
  FROM collections
)
UPDATE collections
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Comentário: Coleções limpas e validadas
