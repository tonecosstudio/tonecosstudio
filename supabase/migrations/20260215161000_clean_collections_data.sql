-- Limpar dados problemÃƒÂ¡ticos das coleÃƒÂ§ÃƒÂµes

-- 1. Desativar coleÃƒÂ§ÃƒÂµes sem personagens
UPDATE collections
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT c.id 
  FROM collections c
  LEFT JOIN collection_characters cc ON c.id = cc.collection_id
  GROUP BY c.id
  HAVING COUNT(cc.id) = 0
);

-- 2. Corrigir descriÃƒÂ§ÃƒÂµes teste
UPDATE collections
SET description = NULL, updated_at = NOW()
WHERE description IN ('aaa', 'test', 'teste', '');

-- 3. Remover coleÃƒÂ§ÃƒÂµes duplicadas (manter apenas a primeira de cada nome)
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

-- ComentÃƒÂ¡rio: ColeÃƒÂ§ÃƒÂµes limpas e validadas
