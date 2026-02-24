-- =====================================================
-- DIAGNÓSTICO: Erro 406 para grupo específico
-- =====================================================
-- Grupo ID: 95b093fe-083d-4b64-9a67-8d3b281dcd23
-- =====================================================

-- 1. Verificar se o grupo existe
SELECT 
  '1. VERIFICAÇÃO DO GRUPO' as etapa,
  CASE 
    WHEN EXISTS (SELECT 1 FROM chat_groups WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23') 
    THEN '✅ Grupo existe'
    ELSE '❌ Grupo NÃO existe'
  END as status,
  g.name as nome_grupo,
  g.type as tipo_grupo,
  g.created_at as data_criacao,
  g.deleted_at as data_exclusao
FROM chat_groups g
WHERE g.id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 2. Verificar membros do grupo
SELECT 
  '2. MEMBROS DO GRUPO' as etapa,
  COUNT(*) as total_membros,
  STRING_AGG(u.email, ', ') as emails_membros
FROM chat_group_members gm
JOIN auth.users u ON u.id = gm.user_id
WHERE gm.group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 3. Verificar mensagens no grupo
SELECT 
  '3. MENSAGENS NO GRUPO' as etapa,
  COUNT(*) as total_mensagens,
  MIN(created_at) as primeira_mensagem,
  MAX(created_at) as ultima_mensagem
FROM chat_group_messages
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 4. Verificar RLS da tabela chat_group_messages
SELECT 
  '4. RLS DA TABELA chat_group_messages' as etapa,
  tablename,
  CASE WHEN rowsecurity THEN '✅ Habilitado' ELSE '❌ Desabilitado' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_group_messages') as total_policies
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_group_messages';

-- 5. Listar políticas específicas
SELECT 
  '5. POLÍTICAS ESPECÍFICAS' as etapa,
  policyname,
  cmd,
  roles,
  LEFT(qual, 100) || '...' as condicao
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 6. Verificar usuários do sistema
SELECT 
  '6. USUÁRIOS DO SISTEMA (últimos 5)' as etapa,
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 7. Testar consulta com diferentes usuários (simulação)
-- Primeiro, obter alguns IDs de usuário
WITH sample_users AS (
  SELECT id, email, raw_user_meta_data->>'role' as role
  FROM auth.users
  LIMIT 3
)
SELECT 
  '7. TESTE DE PERMISSÕES (simulação)' as etapa,
  su.email as usuario_teste,
  su.role as role_usuario,
  -- Verificar se é admin
  has_role(su.id, 'admin'::app_role) as is_admin,
  -- Verificar se é membro do grupo
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
    AND user_id = su.id
  ) as is_member,
  -- Verificar se pode ler mensagens (com base nas políticas)
  CASE 
    WHEN has_role(su.id, 'admin'::app_role) THEN '✅ Pode ler (admin)'
    WHEN EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
      AND user_id = su.id
    ) THEN '✅ Pode ler (membro)'
    ELSE '❌ NÃO pode ler (não é membro nem admin)'
  END as permissao_leitura
FROM sample_users su;

-- 8. Verificar se há algum problema com o app_role
SELECT 
  '8. VERIFICAÇÃO DE APP_ROLE' as etapa,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_type 
      WHERE typname = 'app_role'
    ) THEN '✅ Tipo app_role existe'
    ELSE '❌ Tipo app_role NÃO existe'
  END as status_tipo,
  (SELECT COUNT(*) FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) as total_valores_enum;

-- 9. Listar valores do enum app_role
SELECT 
  '9. VALORES DO ENUM app_role' as etapa,
  enumlabel as valor
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
ORDER BY enumsortorder;

-- 10. Verificar função has_role
SELECT 
  '10. VERIFICAÇÃO DA FUNÇÃO has_role' as etapa,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'has_role'
    ) THEN '✅ Função has_role existe'
    ELSE '❌ Função has_role NÃO existe'
  END as status_funcao;

-- 11. Causas possíveis do erro 406
SELECT 
  '11. CAUSAS POSSÍVEIS DO ERRO 406' as etapa,
  '1. Usuário não autenticado' as causa_1,
  '2. Usuário não é membro do grupo' as causa_2, 
  '3. Usuário não tem role de admin' as causa_3,
  '4. Políticas RLS muito restritivas' as causa_4,
  '5. Grupo não existe ou foi excluído' as causa_5,
  '6. Tipo app_role não configurado corretamente' as causa_6;

-- 12. Soluções recomendadas
SELECT 
  '12. SOLUÇÕES RECOMENDADAS' as etapa,
  'A. Execute o script fix-406-error-immediate.sql' as solucao_a,
  'B. Verifique se o usuário está autenticado' as solucao_b,
  'C. Adicione o usuário como membro do grupo' as solucao_c,
  'D. Atribua role de admin ao usuário' as solucao_d,
  'E. Verifique se o grupo existe' as solucao_e,
  'F. Configure o tipo app_role se necessário' as solucao_f;

-- 13. Comando para adicionar usuário como membro (se necessário)
SELECT 
  '13. COMANDO PARA ADICIONAR MEMBRO' as etapa,
  '-- Substitua USER_ID pelo ID do usuário' as instrucao_1,
  'INSERT INTO chat_group_members (group_id, user_id)' as comando_1,
  'VALUES (''95b093fe-083d-4b64-9a67-8d3b281dcd23'', USER_ID);' as comando_2,
  '-- ON CONFLICT (group_id, user_id) DO NOTHING;' as opcional;

-- 14. Comando para verificar autenticação atual
SELECT 
  '14. VERIFICAÇÃO DE AUTENTICAÇÃO ATUAL' as etapa,
  '-- Execute no contexto do usuário atual:' as instrucao,
  'SELECT auth.uid() as user_id, current_user as db_user;' as comando;