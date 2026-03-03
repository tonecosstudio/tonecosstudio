-- ============================================================================
-- SCRIPT 1: Remover Tabelas de Backup Órfãs
-- ============================================================================
-- Este script remove tabelas de backup que não são mais necessárias
-- SEGURO: Estas tabelas são apenas backups temporários de testes
-- ============================================================================

-- Verificar se existem antes de remover
DO $$
BEGIN
    -- Remover backup órfão do chat
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'chat_group_messages_backup') THEN
        DROP TABLE public.chat_group_messages_backup CASCADE;
        RAISE NOTICE 'Tabela chat_group_messages_backup removida';
    ELSE
        RAISE NOTICE 'Tabela chat_group_messages_backup não existe';
    END IF;

    -- Verificar outros backups temporários
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'system_settings_backup') THEN
        RAISE WARNING 'Tabela system_settings_backup existe - REVISAR ANTES DE REMOVER';
    END IF;
END $$;

-- Listar todas as tabelas com "backup" no nome para revisão
SELECT 
    table_schema,
    table_name,
    pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name LIKE '%backup%'
ORDER BY table_name;
