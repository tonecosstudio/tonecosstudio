-- =====================================================
-- INVESTIGAÇÃO COMPLETA: Erro 406 persistente
-- =====================================================
-- Vamos investigar POR QUE o erro 406 ainda ocorre
-- mesmo com políticas super permissivas
-- =====================================================

-- 1. VERIFICAR SE A TABELA EXISTE
SELECT 
  '1. VERIFICAÇÃO DA TABELA chat_group_messages' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_group_messages') 
    THEN '✅ Tabela existe'
    ELSE '❌ Tabela NÃO existe!'
  END as tabela_existe;

-- 2. VERIFICAR RLS DA TABELA
SELECT 
  '2. VERIFICAÇÃO RLS DA TABELA' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESABILITADO (pode ser o problema!)'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 3. VERIFICAR TODAS AS POLÍTICAS ATUAIS
SELECT 
  '3. POLÍTICAS ATUAIS EM chat_group_messages' as status,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'NULL (sem restrição?)'
    WHEN qual = 'true' THEN '✅ SUPER PERMISSIVA (true)'
    ELSE LEFT(qual, 100)
  END as condicao,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE LEFT(with_check, 100)
  END as with_check
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 4. VERIFICAR SE O GRUPO EXISTE
SELECT 
  '4. VERIFICAÇÃO DO GRUPO ESPECÍFICO' as status,
  '95b093fe-083d-4b64-9a67-8d3b281dcd23' as group_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') 
    THEN '✅ Grupo existe'
    ELSE '❌ Grupo NÃO existe!'
  END as grupo_existe,
  (SELECT name FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') as nome_grupo;

-- 5. VERIFICAR SE HÁ MENSAGENS NO GRUPO
SELECT 
  '5. VERIFICAÇÃO DE MENSAGENS NO GRUPO' as status,
  COUNT(*) as total_mensagens,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tem mensagens'
    ELSE '⚠️ Grupo VAZIO (mas não deveria causar 406)'
  END as status_mensagens
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 6. TESTAR A QUERY EXATA COMO USUÁRIO ANÔNIMO (simulação)
-- Primeiro, verificar se a tabela tem RLS habilitado para anon
SELECT 
  '6. TESTE DE ACESSO ANÔNIMO (simulação)' as status,
  'Nota: Se RLS estiver habilitado e não houver política para anon, causa 406' as explicacao;

-- 7. VERIFICAR SE HÁ POLÍTICA PARA 'anon' (usuários não autenticados)
SELECT 
  '7. VERIFICAÇÃO DE POLÍTICAS PARA anon' as status,
  COUNT(*) as politicas_para_anon,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Tem políticas para anon'
    ELSE '❌ NÃO tem políticas para anon (pode ser o problema!)'
  END as status_anon
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
AND roles @> ARRAY['anon']::name[];

-- 8. TESTAR A QUERY MANUALMENTE (como superuser para ver se funciona)
SELECT 
  '8. TESTE DA QUERY COMO SUPERUSER' as status,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅ Query funciona (dados existem)'
    ELSE '⚠️ Query não retorna dados (grupo vazio)'
  END as resultado,
  (SELECT created_at FROM chat_group_messages WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23' ORDER BY created_at DESC LIMIT 1) as ultima_mensagem;

-- 9. VERIFICAR SE HÁ ALGUM TRIGGER QUE PODE CAUSAR 406
SELECT 
  '9. VERIFICAÇÃO DE TRIGGERS' as status,
  tgname as trigger_name,
  relname as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE relname = 'chat_group_messages'
AND tgenabled != 'D';

-- 10. DIAGNÓSTICO FINAL
SELECT 
  '10. DIAGNÓSTICO FINAL' as titulo,
  'Possíveis causas do erro 406:' as analise,
  '1. RLS habilitado SEM políticas para "anon"' as causa_1,
  '2. Políticas existentes mas com condições inválidas' as causa_2,
  '3. Trigger bloqueando acesso' as causa_3,
  '4. Cache do Supabase REST API' as causa_4,
  '' as espaco,
  'Soluções:' as solucoes,
  'A. Criar política para "anon" (se necessário)' as solucao_a,
  'B. Desabilitar RLS temporariamente' as solucao_b,
  'C. Recriar a tabela' as solucao_c,
  'D. Limpar cache do Supabase' as solucao_d;

-- 11. COMANDOS PARA TESTAR
SELECT 
  '11. COMANDOS DE TESTE' as titulo,
  '-- Testar como anon:' as teste_1,
  'SET ROLE anon; SELECT created_at FROM chat_group_messages WHERE group_id = ''95b093fe-083d-4b64-9a67-8d3b281dcd23'' LIMIT 1; RESET ROLE;' as comando_1,
  '' as espaco1,
  '-- Desabilitar RLS temporariamente:' as teste_2,
  'ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;' as comando_2,
  '' as espaco2,
  '-- Habilitar RLS novamente:' as teste_3,
  'ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;' as comando_3;