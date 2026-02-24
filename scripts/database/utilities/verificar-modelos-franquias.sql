-- ============================================
-- DIAGNÓSTICO COMPLETO: Modelos e Franquias
-- ============================================

-- 1. Quantos modelos existem no total?
SELECT COUNT(*) as total_modelos FROM models;

-- 2. Ver todos os modelos (primeiros 20)
SELECT id, name, franchise, category, subcategory, created_at 
FROM models 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Quantos modelos têm franchise preenchida?
SELECT COUNT(*) as modelos_com_franchise 
FROM models 
WHERE franchise IS NOT NULL AND franchise != '';

-- 4. Quantos modelos têm franchise NULL ou vazia?
SELECT COUNT(*) as modelos_sem_franchise 
FROM models 
WHERE franchise IS NULL OR franchise = '';

-- 5. Ver franquias únicas nos modelos (se houver)
SELECT franchise, COUNT(*) as quantidade
FROM models 
WHERE franchise IS NOT NULL AND franchise != ''
GROUP BY franchise
ORDER BY quantidade DESC;

-- 6. Ver estrutura da tabela models
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'models'
ORDER BY ordinal_position;

-- 7. Quantas franquias canônicas existem?
SELECT COUNT(*) as total_franchises FROM franchises;

-- 8. Ver todas as franquias canônicas (se houver)
SELECT * FROM franchises ORDER BY canonical;

-- 9. Verificar se a tabela franchises existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'franchises'
) as tabela_franchises_existe;

-- 10. Ver itens na fila de processamento
SELECT id, name, franchise, status, created_at
FROM images_queue
ORDER BY created_at DESC
LIMIT 10;
