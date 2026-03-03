-- ============================================================================
-- SCRIPT 4: Verificar Tabelas Vazias
-- ============================================================================
-- Este script identifica tabelas completamente vazias que podem ser removidas
-- NÃO remove nada, apenas lista para revisão
-- ============================================================================

-- Função auxiliar para contar linhas de uma tabela
CREATE OR REPLACE FUNCTION count_table_rows(schema_name text, table_name text)
RETURNS bigint AS $$
DECLARE
    row_count bigint;
BEGIN
    EXECUTE format('SELECT count(*) FROM %I.%I', schema_name, table_name) INTO row_count;
    RETURN row_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN -1; -- Erro ao contar
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANÁLISE 1: Tabelas Completamente Vazias
-- ============================================================================
SELECT 
    '🗑️ COMPLETAMENTE VAZIAS' as status,
    t.table_name,
    pg_size_pretty(pg_total_relation_size('public.'||t.table_name)) as total_size,
    pg_size_pretty(pg_relation_size('public.'||t.table_name)) as table_size,
    pg_size_pretty(pg_total_relation_size('public.'||t.table_name) - pg_relation_size('public.'||t.table_name)) as indexes_size,
    count_table_rows('public', t.table_name) as row_count,
    (SELECT count(*) FROM information_schema.columns c 
     WHERE c.table_schema = 'public' AND c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND pg_relation_size('public.'||t.table_name) = 0
ORDER BY pg_total_relation_size('public.'||t.table_name) DESC;

-- ============================================================================
-- ANÁLISE 2: Tabelas Muito Pequenas (< 16KB dados)
-- ============================================================================
SELECT 
    '⚠️ MUITO PEQUENAS' as status,
    t.table_name,
    pg_size_pretty(pg_total_relation_size('public.'||t.table_name)) as total_size,
    pg_size_pretty(pg_relation_size('public.'||t.table_name)) as table_size,
    count_table_rows('public', t.table_name) as row_count,
    (SELECT count(*) FROM information_schema.columns c 
     WHERE c.table_schema = 'public' AND c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND pg_relation_size('public.'||t.table_name) > 0
    AND pg_relation_size('public.'||t.table_name) < 16384 -- Menos de 16KB
ORDER BY pg_relation_size('public.'||t.table_name) DESC;

-- ============================================================================
-- ANÁLISE 3: Tabelas por Categoria (Vazias)
-- ============================================================================

-- Sistema de AI
SELECT 
    'AI System' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    count_table_rows('public', table_name) as rows,
    CASE 
        WHEN count_table_rows('public', table_name) = 0 THEN '🗑️ Pode remover'
        ELSE '✅ Tem dados'
    END as recommendation
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('ai_vision_cache', 'ai_name_cache', 'ai_processing_jobs')

UNION ALL

-- Sistema de Quotes
SELECT 
    'Quotes System' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    count_table_rows('public', table_name) as rows,
    CASE 
        WHEN count_table_rows('public', table_name) = 0 THEN '🗑️ Pode remover'
        ELSE '✅ Tem dados'
    END as recommendation
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name LIKE 'quote%'

UNION ALL

-- Sistema de Preorders
SELECT 
    'Preorders' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    count_table_rows('public', table_name) as rows,
    CASE 
        WHEN count_table_rows('public', table_name) = 0 THEN '🗑️ Pode remover'
        ELSE '✅ Tem dados'
    END as recommendation
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('preorders', 'preorder_settings')

UNION ALL

-- Landing Page
SELECT 
    'Landing Page' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    count_table_rows('public', table_name) as rows,
    CASE 
        WHEN count_table_rows('public', table_name) = 0 THEN '🗑️ Pode remover'
        ELSE '✅ Tem dados'
    END as recommendation
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('community_suggestions', 'founders_program', 'order_migrations')

ORDER BY category, table_name;

-- ============================================================================
-- ANÁLISE 4: Tabelas de Produção (Verificar se estão prontas)
-- ============================================================================
SELECT 
    'Production System' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    count_table_rows('public', table_name) as rows,
    CASE 
        WHEN count_table_rows('public', table_name) = 0 THEN '⏳ Aguardando uso'
        ELSE '✅ Em uso'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('production_queue', 'production_stages', 'character_choices')
ORDER BY table_name;

-- ============================================================================
-- ANÁLISE 5: Resumo Geral
-- ============================================================================
SELECT 
    'RESUMO GERAL' as section,
    count(*) as total_tables,
    count(*) FILTER (WHERE pg_relation_size('public.'||table_name) = 0) as empty_tables,
    count(*) FILTER (WHERE pg_relation_size('public.'||table_name) > 0) as tables_with_data,
    pg_size_pretty(sum(pg_total_relation_size('public.'||table_name))) as total_size
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

-- ============================================================================
-- LIMPEZA: Remover função auxiliar
-- ============================================================================
DROP FUNCTION IF EXISTS count_table_rows(text, text);

-- ============================================================================
-- INSTRUÇÕES
-- ============================================================================
/*
📋 COMO USAR ESTE RELATÓRIO:

1. Tabelas COMPLETAMENTE VAZIAS (0 bytes de dados):
   - Se não são parte do sistema de produção → REMOVER
   - Se são parte do sistema mas não usadas → REMOVER
   - Se serão usadas em breve → MANTER

2. Tabelas MUITO PEQUENAS (< 16KB):
   - Verificar se têm dados de teste
   - Verificar se são necessárias
   - Considerar consolidar com outras tabelas

3. Por Categoria:
   - AI System: Remover se não usa AI
   - Quotes: Remover se não usa sistema de cotação
   - Preorders: Remover se não tem pré-venda
   - Landing Page: Remover se não tem landing pública

4. Production System:
   - Manter mesmo se vazias (serão usadas)
   - Verificar se estrutura está correta

⚠️ ANTES DE REMOVER:
   - Verificar se não há foreign keys apontando para a tabela
   - Verificar se não é usada em funções/triggers
   - Fazer backup do banco
   - Testar em ambiente de desenvolvimento primeiro
*/
