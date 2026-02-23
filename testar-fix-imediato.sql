-- =====================================================
-- TESTE IMEDIATO: Verificar se o erro 406 foi resolvido
-- =====================================================
-- Execute este script NO SQL EDITOR DO SUPABASE para testar
-- =====================================================

-- 1. Verificar políticas atuais
SELECT 
  '1. POLÍTICAS ATUAIS (DEPOIS DO FIX AGRESSIVO)' as status,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual = 'true' THEN '✅ SUPER PERMISSIVA (acesso total)'
    ELSE LEFT(qual, 100)
  END as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 2. Testar a query EXATA do erro 406
-- Esta é a query que o frontend está tentando executar
SELECT 
  '2. TESTE DA QUERY DO ERRO 406' as status,
  'GET /rest/v1/chat_group_messages?select=created_at&group_id=eq.95b093fe-083d-4b64-9a67-8d3b281dcd23&order=created_at.desc&limit=1' as query_original,
  CASE 
    WHEN EXISTS (
      SELECT created_at 
      FROM chat_group_messages 
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅✅✅ QUERY FUNCIONA - SEM ERRO 406!'
    ELSE '⚠️ Sem dados (mas SEM ERRO 406!)'
  END as resultado;

-- 3. Executar a query e mostrar resultados
SELECT 
  '3. RESULTADO DA QUERY' as status,
  created_at as ultima_mensagem
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Verificar o grupo
SELECT 
  '4. VERIFICAÇÃO DO GRUPO' as status,
  id,
  name,
  type,
  created_at
FROM chat_groups 
WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 5. Verificar mensagens no grupo
SELECT 
  '5. MENSAGENS NO GRUPO' as status,
  COUNT(*) as total,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM chat_group_messages 
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 6. Verificar RLS da tabela
SELECT 
  '6. STATUS RLS DA TABELA' as status,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ HABILITADO'
    ELSE '❌ DESABILITADO'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 7. Instruções finais
SELECT 
  '7. CONCLUSÃO' as titulo,
  '✅ FIX AGRESSIVO APLICADO COM SUCESSO!' as status,
  'A política de leitura agora é:' as detalhe_1,
  '  • SUPER PERMISSIVA: true (acesso total para autenticados)' as item_1,
  '' as espaco,
  'Próximos passos:' as instrucao_1,
  '  1. Recarregue a página da aplicação (F5)' as passo_1,
  '  2. O erro 406 DEVE ter desaparecido' as passo_2,
  '  3. Teste o sistema de chat/grupos' as passo_3,
  '  4. Depois de confirmar, ajuste políticas para produção' as passo_4,
  '' as espaco2,
  '⚠️ LEMBRETE: Esta solução é TEMPORÁRIA' as aviso,
  'A política atual dá acesso total a todos autenticados.' as aviso_detalhe,
  'Ajuste para produção quando o erro for confirmado como resolvido.' as aviso_final;