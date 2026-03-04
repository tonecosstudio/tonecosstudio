-- =====================================================
-- DIAGNÃƒâ€œSTICO PROFUNDO: Erro 406 persistente
-- =====================================================
-- Mesmo com RLS desabilitado, o erro persiste
-- Vamos investigar TODAS as possÃƒÂ­veis causas
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
  '2. VERIFICAÃƒâ€¡ÃƒÆ’O DO GRUPO NA TABELA chat_groups' as status,
  '95b093fe-083d-4b64-9a67-8d3b281dcd23' as group_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') 
    THEN 'Ã¢Å“â€¦ Grupo existe em chat_groups'
    ELSE 'Ã¢ÂÅ’ Grupo NÃƒÆ’O existe em chat_groups! (PROBLEMA GRAVE)'
  END as status_grupo,
  (SELECT name FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as nome_grupo;

-- 3. VERIFICAR SE HÃƒÂ DADOS NA TABELA
SELECT 
  '3. DADOS NA TABELA chat_group_messages' as status,
  COUNT(*) as total_registros,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Ã¢Å“â€¦ Tem dados'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Tabela VAZIA (mas nÃƒÂ£o deveria causar 406)'
  END as status_dados
FROM chat_group_messages;

-- 4. VERIFICAR SE HÃƒÂ DADOS PARA O GRUPO ESPECÃƒÂFICO
SELECT 
  '4. DADOS PARA O GRUPO ESPECÃƒÂFICO' as status,
  COUNT(*) as mensagens_no_grupo,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Ã¢Å“â€¦ Tem mensagens para este grupo'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Nenhuma mensagem para este grupo (pode ser normal)'
  END as status_mensagens
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 5. VERIFICAR RLS (mesmo que jÃƒÂ¡ saibamos que estÃƒÂ¡ desabilitado)
SELECT 
  '5. STATUS RLS (CONFIRMAÃƒâ€¡ÃƒÆ’O)' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'Ã¢ÂÅ’ RLS HABILITADO (DEVERIA ESTAR DESABILITADO!)'
    ELSE 'Ã¢Å“â€¦ RLS DESABILITADO (correto)'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 6. VERIFICAR SE HÃƒÂ CONSTRAINTS OU TRIGGERS QUE PODEM BLOQUEAR
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

-- 7. TESTAR A QUERY MANUALMENTE (forma mais simples possÃƒÂ­vel)
SELECT 
  '7. TESTE DA QUERY SIMPLES' as status,
  'SELECT created_at FROM chat_group_messages WHERE group_id = ''95b093fe-083d-4b64-9a67-8d3b281dcd23'' LIMIT 1' as query_teste,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      LIMIT 1
    ) THEN 'Ã¢Å“â€¦Ã¢Å“â€¦Ã¢Å“â€¦ QUERY SIMPLES FUNCIONA!'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Query simples NÃƒÆ’O retorna dados'
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
    ) THEN 'Ã¢Å“â€¦Ã¢Å“â€¦Ã¢Å“â€¦ QUERY EXATA FUNCIONA!'
    ELSE 'Ã¢Å¡Â Ã¯Â¸Â Query exata NÃƒÆ’O retorna dados'
  END as resultado_exato;

-- 9. EXECUTAR A QUERY E VER RESULTADOS
SELECT 
  '9. EXECUÃƒâ€¡ÃƒÆ’O DA QUERY (se houver dados)' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 10. VERIFICAR SE O CAMPO created_at EXISTE
SELECT 
  '10. VERIFICAÃƒâ€¡ÃƒÆ’O DO CAMPO created_at' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chat_group_messages'
      AND column_name = 'created_at'
    ) THEN 'Ã¢Å“â€¦ Campo created_at existe'
    ELSE 'Ã¢ÂÅ’ Campo created_at NÃƒÆ’O existe! (PROBLEMA)'
  END as status_created_at;

-- 11. DIAGNÃƒâ€œSTICO FINAL
SELECT 
  '11. DIAGNÃƒâ€œSTICO FINAL' as titulo,
  'PossÃƒÂ­veis causas do erro 406 (com RLS desabilitado):' as analise,
  '1. Grupo nÃƒÂ£o existe na tabela chat_groups' as causa_1,
  '2. Tabela chat_group_messages nÃƒÂ£o tem a estrutura esperada' as causa_2,
  '3. Problema com o campo created_at' as causa_3,
  '4. Cache do Supabase REST API precisa ser limpo' as causa_4,
  '5. Problema na query do frontend (parÃƒÂ¢metros invÃƒÂ¡lidos)' as causa_5,
  '' as espaco,
  'SoluÃƒÂ§ÃƒÂµes:' as solucoes,
  'A. Verificar se o grupo existe em chat_groups' as solucao_a,
  'B. Recriar a tabela chat_group_messages' as solucao_b,
  'C. Limpar cache do Supabase (aguardar 1-2 minutos)' as solucao_c,
  'D. Verificar a query do frontend' as solucao_d;