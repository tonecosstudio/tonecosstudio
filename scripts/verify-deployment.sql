-- =====================================================
-- DEPLOYMENT VERIFICATION - Manual Payment System
-- =====================================================
-- Este script verifica se o deployment foi realizado corretamente
-- Execute no SQL Editor do Supabase Dashboard

-- =====================================================
-- 1. VERIFICAR TABELAS
-- =====================================================

SELECT '=== VERIFICAÇÃO DE TABELAS ===' as section;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log') 
        THEN '✓ OK'
        ELSE '✗ ERRO'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
ORDER BY table_name;

-- Verificar coluna payment_id em support_conversations
SELECT 
    'support_conversations.payment_id' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_conversations' 
            AND column_name = 'payment_id'
        ) THEN '✓ OK'
        ELSE '✗ ERRO: Coluna payment_id não encontrada'
    END as status;

-- Resumo de tabelas
SELECT 
    COUNT(*) as tables_found,
    CASE 
        WHEN COUNT(*) = 4 THEN '✓ OK: Todas as 4 tabelas criadas'
        ELSE '✗ ERRO: Esperado 4 tabelas, encontrado ' || COUNT(*)
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);

-- =====================================================
-- 2. VERIFICAR ÍNDICES
-- =====================================================

SELECT '=== VERIFICAÇÃO DE ÍNDICES ===' as section;

SELECT 
    tablename,
    indexname,
    '✓ OK' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
ORDER BY tablename, indexname;

-- Contar índices
SELECT 
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✓ OK: Índices criados'
        ELSE '⚠ AVISO: Esperado pelo menos 15 índices, encontrado ' || COUNT(*)
    END as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);

-- =====================================================
-- 3. VERIFICAR RLS POLICIES
-- =====================================================

SELECT '=== VERIFICAÇÃO DE POLÍTICAS RLS ===' as section;

-- Verificar RLS habilitado
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✓ OK: RLS habilitado'
        ELSE '✗ ERRO: RLS não habilitado'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
ORDER BY tablename;

-- Listar políticas
SELECT 
    tablename,
    policyname,
    cmd as operation,
    '✓ OK' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
ORDER BY tablename, policyname;

-- Contar políticas
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✓ OK: Políticas criadas'
        ELSE '⚠ AVISO: Esperado pelo menos 10 políticas, encontrado ' || COUNT(*)
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
);

-- =====================================================
-- 4. VERIFICAR FUNÇÕES
-- =====================================================

SELECT '=== VERIFICAÇÃO DE FUNÇÕES ===' as section;

SELECT 
    routine_name,
    routine_type,
    '✓ OK' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'generate_payment_reference',
    'trigger_payment_status_change',
    'trigger_first_file_upload',
    'ensure_single_default_admin_payment_method'
)
ORDER BY routine_name;

-- Contar funções
SELECT 
    COUNT(*) as function_count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✓ OK: Todas as 4 funções criadas'
        ELSE '✗ ERRO: Esperado 4 funções, encontrado ' || COUNT(*)
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'generate_payment_reference',
    'trigger_payment_status_change',
    'trigger_first_file_upload',
    'ensure_single_default_admin_payment_method'
);

-- =====================================================
-- 5. VERIFICAR TRIGGERS
-- =====================================================

SELECT '=== VERIFICAÇÃO DE TRIGGERS ===' as section;

SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    '✓ OK' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'payment_status_change',
    'first_file_upload',
    'trigger_ensure_single_default_admin_payment_method',
    'update_admin_payment_methods_updated_at',
    'update_manual_payments_updated_at'
)
ORDER BY event_object_table, trigger_name;

-- Contar triggers
SELECT 
    COUNT(*) as trigger_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✓ OK: Triggers criados'
        ELSE '⚠ AVISO: Esperado pelo menos 5 triggers, encontrado ' || COUNT(*)
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'payment_status_change',
    'first_file_upload',
    'trigger_ensure_single_default_admin_payment_method',
    'update_admin_payment_methods_updated_at',
    'update_manual_payments_updated_at'
);

-- =====================================================
-- 6. VERIFICAR CONSTRAINTS
-- =====================================================

SELECT '=== VERIFICAÇÃO DE CONSTRAINTS ===' as section;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    '✓ OK' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.table_name IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =====================================================
-- 7. VERIFICAR STORAGE BUCKET
-- =====================================================

SELECT '=== VERIFICAÇÃO DE STORAGE ===' as section;

SELECT 
    name as bucket_name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN name = 'payment-proofs' AND public = false THEN '✓ OK: Bucket configurado corretamente'
        WHEN name = 'payment-proofs' AND public = true THEN '✗ ERRO: Bucket deve ser privado!'
        ELSE '✗ ERRO: Bucket não encontrado'
    END as status
FROM storage.buckets
WHERE name = 'payment-proofs';

-- Verificar políticas do bucket
SELECT 
    policyname,
    cmd as operation,
    '✓ OK' as status
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%payment proof%'
ORDER BY policyname;

-- Contar políticas do bucket
SELECT 
    COUNT(*) as storage_policy_count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✓ OK: Todas as 4 políticas de storage criadas'
        ELSE '⚠ AVISO: Esperado 4 políticas, encontrado ' || COUNT(*)
    END as status
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%payment proof%';

-- =====================================================
-- 8. VERIFICAR DADOS INICIAIS
-- =====================================================

SELECT '=== VERIFICAÇÃO DE DADOS INICIAIS ===' as section;

-- Verificar métodos de pagamento
SELECT 
    name,
    type,
    is_active,
    is_default,
    display_order,
    CASE 
        WHEN is_active THEN '✓ Ativo'
        ELSE '✗ Inativo'
    END as status,
    CASE 
        WHEN is_default THEN '★ Padrão'
        ELSE ''
    END as default_flag
FROM admin_payment_methods
ORDER BY display_order;

-- Contar métodos de pagamento
SELECT 
    COUNT(*) as total_methods,
    COUNT(*) FILTER (WHERE is_active = true) as active_methods,
    COUNT(*) FILTER (WHERE is_default = true) as default_methods,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✓ OK: Métodos de pagamento inseridos'
        ELSE '⚠ AVISO: Poucos métodos de pagamento'
    END as status,
    CASE 
        WHEN COUNT(*) FILTER (WHERE is_default = true) = 1 THEN '✓ OK: Exatamente 1 método padrão'
        WHEN COUNT(*) FILTER (WHERE is_default = true) = 0 THEN '✗ ERRO: Nenhum método padrão'
        ELSE '✗ ERRO: Mais de 1 método padrão'
    END as default_status
FROM admin_payment_methods;

-- =====================================================
-- 9. VERIFICAR INTEGRIDADE REFERENCIAL
-- =====================================================

SELECT '=== VERIFICAÇÃO DE INTEGRIDADE ===' as section;

-- Verificar foreign keys
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✓ OK' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'admin_payment_methods',
    'manual_payments',
    'payment_files',
    'payment_audit_log'
)
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 10. TESTE DE FUNCIONALIDADE
-- =====================================================

SELECT '=== TESTE DE FUNCIONALIDADE ===' as section;

-- Testar geração de número de referência
SELECT 
    generate_payment_reference() as sample_reference_1,
    generate_payment_reference() as sample_reference_2,
    generate_payment_reference() as sample_reference_3,
    CASE 
        WHEN generate_payment_reference() LIKE 'PAY-%' THEN '✓ OK: Função gerando referências'
        ELSE '✗ ERRO: Formato de referência inválido'
    END as status;

-- =====================================================
-- 11. RESUMO FINAL
-- =====================================================

SELECT '=== RESUMO FINAL ===' as section;

WITH verification_summary AS (
    SELECT 
        'Tabelas' as component,
        CASE WHEN COUNT(*) = 4 THEN '✓' ELSE '✗' END as status
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log')
    
    UNION ALL
    
    SELECT 
        'Índices' as component,
        CASE WHEN COUNT(*) >= 15 THEN '✓' ELSE '⚠' END as status
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log')
    
    UNION ALL
    
    SELECT 
        'Políticas RLS' as component,
        CASE WHEN COUNT(*) >= 10 THEN '✓' ELSE '⚠' END as status
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log')
    
    UNION ALL
    
    SELECT 
        'Funções' as component,
        CASE WHEN COUNT(*) = 4 THEN '✓' ELSE '✗' END as status
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('generate_payment_reference', 'trigger_payment_status_change', 'trigger_first_file_upload', 'ensure_single_default_admin_payment_method')
    
    UNION ALL
    
    SELECT 
        'Triggers' as component,
        CASE WHEN COUNT(*) >= 5 THEN '✓' ELSE '⚠' END as status
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name IN ('payment_status_change', 'first_file_upload', 'trigger_ensure_single_default_admin_payment_method', 'update_admin_payment_methods_updated_at', 'update_manual_payments_updated_at')
    
    UNION ALL
    
    SELECT 
        'Storage Bucket' as component,
        CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'payment-proofs' AND public = false) THEN '✓' ELSE '✗' END as status
    
    UNION ALL
    
    SELECT 
        'Métodos de Pagamento' as component,
        CASE WHEN COUNT(*) >= 2 THEN '✓' ELSE '⚠' END as status
    FROM admin_payment_methods
)
SELECT 
    component,
    status,
    CASE 
        WHEN status = '✓' THEN 'OK'
        WHEN status = '⚠' THEN 'Aviso'
        ELSE 'Erro'
    END as description
FROM verification_summary
ORDER BY 
    CASE status 
        WHEN '✗' THEN 1 
        WHEN '⚠' THEN 2 
        ELSE 3 
    END,
    component;

-- Mensagem final
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM verification_summary WHERE status = '✗'
        ) THEN '✓✓✓ DEPLOYMENT VERIFICADO COM SUCESSO! ✓✓✓'
        ELSE '✗✗✗ DEPLOYMENT INCOMPLETO - VERIFIQUE OS ERROS ACIMA ✗✗✗'
    END as final_status
FROM (
    SELECT 
        CASE WHEN COUNT(*) = 4 THEN '✓' ELSE '✗' END as status
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('admin_payment_methods', 'manual_payments', 'payment_files', 'payment_audit_log')
) verification_summary;

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================

SELECT '=== PRÓXIMOS PASSOS ===' as section;

SELECT 
    step_number,
    description,
    priority
FROM (
    VALUES 
        (1, 'Configurar templates de email no Supabase Dashboard', 'Alta'),
        (2, 'Configurar monitoramento e alertas', 'Alta'),
        (3, 'Executar testes de integração', 'Alta'),
        (4, 'Configurar backup automático', 'Média'),
        (5, 'Revisar e ajustar métodos de pagamento', 'Média'),
        (6, 'Treinar equipe de suporte', 'Média'),
        (7, 'Preparar documentação para clientes', 'Baixa')
) AS steps(step_number, description, priority)
ORDER BY 
    CASE priority 
        WHEN 'Alta' THEN 1 
        WHEN 'Média' THEN 2 
        ELSE 3 
    END,
    step_number;

-- =====================================================
-- FIM DA VERIFICAÇÃO
-- =====================================================
