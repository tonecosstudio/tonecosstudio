-- ============================================
-- MIGRAÇÃO: Franquias Existentes nos Modelos
-- ============================================
-- Este script migra franquias que já existem nos modelos
-- para a tabela canônica "franchises"

-- 1. Ver quantos modelos têm franquia
SELECT COUNT(*) as modelos_com_franquia 
FROM models 
WHERE franchise IS NOT NULL AND franchise != '';

-- 2. Ver franquias únicas nos modelos
SELECT DISTINCT franchise, COUNT(*) as quantidade
FROM models 
WHERE franchise IS NOT NULL AND franchise != ''
GROUP BY franchise
ORDER BY quantidade DESC, franchise;

-- 3. Ver quantas franquias canônicas já existem
SELECT COUNT(*) as franchises_existentes FROM franchises;

-- 4. MIGRAÇÃO: Inserir franquias dos modelos na tabela franchises
-- (apenas as que ainda não existem)
INSERT INTO franchises (canonical, aliases)
SELECT DISTINCT 
  franchise as canonical,
  ARRAY[franchise] as aliases
FROM models
WHERE franchise IS NOT NULL 
  AND franchise != ''
  AND franchise NOT IN (SELECT canonical FROM franchises)
ORDER BY franchise;

-- 5. Verificar resultado
SELECT COUNT(*) as total_franchises FROM franchises;

-- 6. Ver todas as franquias criadas
SELECT canonical, aliases, created_at 
FROM franchises 
ORDER BY canonical;

-- 7. Estatísticas finais
SELECT 
  (SELECT COUNT(*) FROM models WHERE franchise IS NOT NULL) as modelos_com_franquia,
  (SELECT COUNT(*) FROM franchises) as franchises_canonicas,
  (SELECT COUNT(DISTINCT franchise) FROM models WHERE franchise IS NOT NULL) as franchises_unicas_nos_modelos;
