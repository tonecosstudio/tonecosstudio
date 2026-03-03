-- =====================================================
-- DIAGNÓSTICO PROFUNDO: Erro 406 persistente
-- =====================================================
-- Mesmo com RLS desabilitado, o erro persiste
-- Vamos investigar TODAS as possíveis causas
-- =====================================================

-- 1. VERIFICAR SE A TABELA EXISTE E SUA ESTRUTURA
SELECT 
  '1. ESTRUTURA DA TABELA chat_group_messages' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_group_messages'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE O GRUPO EXISTE NA TABELA chat_groups
SELECT 
  '2. VERIFICAÇÃO DO GRUPO NA TABELA chat_groups' as status,
  '95b093fe-083d-4b64-9a67-8d3b281dcd23' as group_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') 
    THEN '✅ Grupo existe em chat_groups'
    ELSE '❌ Grupo NÃO existe em chat_groups! (PROBLEMA GRAVE)'
  END as status_grupo,
  (SELECT name FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as nome_grupo;

-- 3. VERIFICAR SE HÁ DADOS NA TABELA
SELECT 
  '3. DADOS NA TABELA chat_group_messages' as status,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tem dados'
    ELSE '⚠️ Tabela VAZIA (mas não deveria causar 406)'
  END as status_dados
FROM chat_group_messages;

-- 4. VERIFICAR SE HÁ DADOS PARA O GRUPO ESPECÍFICO
SELECT 
  '4. DADOS PARA O GRUPO ESPECÍFICO' as status,
  COUNT(*) as mensagens_no_grupo,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tem mensagens para este grupo'
    ELSE '⚠️ Nenhuma mensagem para este grupo (pode ser normal)'
  END as status_mensagens
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 5. VERIFICAR RLS (mesmo que já saibamos que está desabilitado)
SELECT 
  '5. STATUS RLS (CONFIRMAÇÃO)' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN '❌ RLS HABILITADO (DEVERIA ESTAR DESABILITADO!)'
    ELSE '✅ RLS DESABILITADO (correto)'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 6. VERIFICAR SE HÁ CONSTRAINTS OU TRIGGERS QUE PODEM BLOQUEAR
SELECT 
  '6. CONSTRAINTS NA TABELA' as status,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'chat_group_messages'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 7. TESTAR A QUERY MANUALMENTE (forma mais simples possível)
SELECT 
  '7. TESTE DA QUERY SIMPLES' as status,
  'SELECT created_at FROM chat_group_messages WHERE group_id = ''95b093fe-083d-4b64-9a67-8d3b281dcd23'' LIMIT 1' as query_teste,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN '✅✅✅ QUERY SIMPLES FUNCIONA!'
    ELSE '⚠️ Query simples NÃO retorna dados'
  END as resultado_simples;

-- 8. TESTAR A QUERY EXATA (com ORDER BY e LIMIT)
SELECT 
  '8. TESTE DA QUERY EXATA' as status,
  'SELECT created_at FROM chat_group_messages WHERE group_id = ''95b093fe-083d-4b64-9a67-8d3b281dcd23'' ORDER BY created_at DESC LIMIT 1' as query_exata,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅✅✅ QUERY EXATA FUNCIONA!'
    ELSE '⚠️ Query exata NÃO retorna dados'
  END as resultado_exato;

-- 9. EXECUTAR A QUERY E VER RESULTADOS
SELECT 
  '9. EXECUÇÃO DA QUERY (se houver dados)' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 10. VERIFICAR SE O CAMPO created_at EXISTE
SELECT 
  '10. VERIFICAÇÃO DO CAMPO created_at' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_group_messages'
      AND column_name = 'created_at'
    ) THEN '✅ Campo created_at existe'
    ELSE '❌ Campo created_at NÃO existe! (PROBLEMA)'
  END as status_created_at;

-- 11. DIAGNÓSTICO FINAL
SELECT 
  '11. DIAGNÓSTICO FINAL' as titulo,
  'Possíveis causas do erro 406 (com RLS desabilitado):' as analise,
  '1. Grupo não existe na tabela chat_groups' as causa_1,
  '2. Tabela chat_group_messages não tem a estrutura esperada' as causa_2,
  '3. Problema com o campo created_at' as causa_3,
  '4. Cache do Supabase REST API precisa ser limpo' as causa_4,
  '5. Problema na query do frontend (parâmetros inválidos)' as causa_5,
  '' as espaco,
  'Soluções:' as solucoes,
  'A. Verificar se o grupo existe em chat_groups' as solucao_a,
  'B. Recriar a tabela chat_group_messages' as solucao_b,
  'C. Limpar cache do Supabase (aguardar 1-2 minutos)' as solucao_c,
  'D. Verificar a query do frontend' as solucao_d;