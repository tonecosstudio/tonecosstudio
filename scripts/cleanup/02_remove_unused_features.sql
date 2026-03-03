-- ============================================================================
-- SCRIPT 2: Remover Features Não Utilizadas
-- ============================================================================
-- ⚠️ ATENÇÃO: Execute apenas se tiver CERTEZA que não usa estas features
-- Revise cada seção e comente as que você USA
-- ============================================================================

-- ============================================================================
-- SEÇÃO 1: Sistema de AI (Vision, Name Generation, Processing)
-- ============================================================================
-- Descomente se NÃO USA sistema de AI
-- DROP TABLE IF EXISTS public.ai_vision_cache CASCADE;
-- DROP TABLE IF EXISTS public.ai_name_cache CASCADE;
-- DROP TABLE IF EXISTS public.ai_processing_jobs CASCADE;

-- ============================================================================
-- SEÇÃO 2: Sistema de Pré-venda (Preorders)
-- ============================================================================
-- Descomente se NÃO USA sistema de pré-venda
-- DROP TABLE IF EXISTS public.preorders CASCADE;
-- DROP TABLE IF EXISTS public.preorder_settings CASCADE;

-- ============================================================================
-- SEÇÃO 3: Sistema de Cotação (Quotes)
-- ============================================================================
-- Descomente se NÃO USA sistema de cotação/orçamento
-- DROP TABLE IF EXISTS public.quote_production_photos CASCADE;
-- DROP TABLE IF EXISTS public.quote_production_updates CASCADE;
-- DROP TABLE IF EXISTS public.quote_production CASCADE;
-- DROP TABLE IF EXISTS public.quote_items CASCADE;
-- DROP TABLE IF EXISTS public.quote_payments CASCADE;
-- DROP TABLE IF EXISTS public.quotes CASCADE;

-- ============================================================================
-- SEÇÃO 4: Landing Page Pública
-- ============================================================================
-- Descomente se NÃO TEM landing page com sugestões da comunidade
-- DROP TABLE IF EXISTS public.community_suggestions CASCADE;
-- DROP TABLE IF EXISTS public.founders_program CASCADE;

-- ============================================================================
-- SEÇÃO 5: Tabelas Temporárias/Migração
-- ============================================================================
-- Descomente se já completou a migração
-- DROP TABLE IF EXISTS public.order_migrations CASCADE;

-- ============================================================================
-- SEÇÃO 6: Sistema de Likes em Modelos
-- ============================================================================
-- Descomente se NÃO USA sistema de likes em modelos 3D
-- DROP TABLE IF EXISTS public.model_likes CASCADE;

-- ============================================================================
-- VERIFICAÇÃO: Listar tabelas que seriam removidas
-- ============================================================================
SELECT 
    'AI System' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN ('ai_vision_cache', 'ai_name_cache', 'ai_processing_jobs')

UNION ALL

SELECT 
    'Preorders' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN ('preorders', 'preorder_settings')

UNION ALL

SELECT 
    'Quotes System' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name LIKE 'quote%'

UNION ALL

SELECT 
    'Landing Page' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name IN ('community_suggestions', 'founders_program', 'order_migrations')

ORDER BY category, table_name;
