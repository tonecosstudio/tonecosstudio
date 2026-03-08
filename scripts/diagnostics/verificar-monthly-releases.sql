-- ============================================================================
-- Verificar uso da funcionalidade de Lançamentos Mensais
-- ============================================================================

-- 1. Verificar dados na tabela collection_monthly_releases
SELECT 
  'DADOS_TABELA' as tipo,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN is_active THEN 1 END) as ativos,
  COUNT(DISTINCT collection_id) as colecoes_diferentes,
  COUNT(DISTINCT release_month) as meses_diferentes
FROM collection_monthly_releases;

-- 2. Verificar uso em subscription_monthly_selections
SELECT 
  'USO_EM_SELECTIONS' as tipo,
  COUNT(*) as total_escolhas,
  COUNT(CASE WHEN is_auto_selected THEN 1 END) as escolhas_automaticas
FROM subscription_monthly_selections;

-- 3. Verificar se há subscriptions com active_collection_id
SELECT 
  'SUBSCRIPTIONS_COM_COLECAO_ATIVA' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN active_collection_id IS NOT NULL THEN 1 END) as com_colecao_ativa
FROM subscriptions;

-- 4. Verificar se a função auto_select é usada
SELECT 
  'FUNCAO_AUTO_SELECT' as tipo,
  COUNT(*) as escolhas_automaticas_existentes
FROM subscription_monthly_selections
WHERE is_auto_selected = true;

-- 5. Verificar character_choices (sistema atual)
SELECT 
  'CHARACTER_CHOICES_ATUAL' as tipo,
  COUNT(*) as total_escolhas,
  COUNT(CASE WHEN choice_status = 'approved' THEN 1 END) as aprovadas,
  COUNT(CASE WHEN choice_status = 'pending' THEN 1 END) as pendentes
FROM character_choices;
