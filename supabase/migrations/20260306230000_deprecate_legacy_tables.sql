-- ============================================================================
-- Migration: Deprecate Legacy Tables
-- Description: Marca tabelas e colunas legadas como DEPRECATED
-- Date: 2026-03-06 23:00:00
-- ============================================================================

-- ============================================================================
-- TABELAS LEGADAS - DEPRECATED
-- ============================================================================

-- Tabela: subscription_collections (DEPRECATED)
COMMENT ON TABLE subscription_collections IS 
'⚠️ DEPRECATED - NÃO USAR ⚠️

Esta tabela foi substituída pelo sistema híbrido de assinatura.

SUBSTITUÍDA POR:
- subscriptions.active_collection_id (coleção ativa/prioritária)
- subscription_monthly_selections (escolhas mensais)

MOTIVO DA DEPRECAÇÃO:
- Modelo antigo: 1 assinatura = 1 coleção fixa
- Modelo novo: 1 assinatura = 1 coleção ativa + escolhas mensais flexíveis
- Cliente pode trocar coleção ativa a qualquer momento
- Cliente pode escolher personagens de qualquer coleção

IMPACTO:
- Tabela mantida por compatibilidade temporária
- NÃO deve ser usada em novos desenvolvimentos
- Será removida em versão futura (após migração completa)

DATA DE DEPRECAÇÃO: 2026-03-06
REMOÇÃO PLANEJADA: 2026-06-01 (3 meses)

MIGRAÇÃO:
- Dados existentes devem ser migrados para novo modelo
- Script de migração disponível em: migrations/migrate_legacy_collections.sql';

-- ============================================================================
-- COLUNAS LEGADAS - DEPRECATED
-- ============================================================================

-- Coluna: subscriptions.collection_id (DEPRECATED)
COMMENT ON COLUMN subscriptions.collection_id IS 
'⚠️ DEPRECATED - NÃO USAR ⚠️

Esta coluna foi substituída por active_collection_id.

SUBSTITUÍDA POR:
- subscriptions.active_collection_id

DIFERENÇAS:
- collection_id (antigo): Coleção fixa, não pode trocar
- active_collection_id (novo): Coleção ativa, pode trocar a qualquer momento

MOTIVO DA DEPRECAÇÃO:
- Modelo antigo não permitia flexibilidade
- Modelo novo permite troca de coleção ativa
- Melhor experiência para o cliente

IMPACTO:
- Coluna mantida por compatibilidade temporária
- NÃO deve ser usada em novos desenvolvimentos
- Será removida em versão futura

DATA DE DEPRECAÇÃO: 2026-03-06
REMOÇÃO PLANEJADA: 2026-06-01 (3 meses)

MIGRAÇÃO:
- Copiar valor de collection_id para active_collection_id
- Atualizar código para usar active_collection_id
- Remover referências a collection_id';

-- ============================================================================
-- VIEWS LEGADAS - DEPRECATED
-- ============================================================================

-- Se existir view legada, marcar como deprecated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'subscription_collections_view'
  ) THEN
    COMMENT ON VIEW subscription_collections_view IS 
    '⚠️ DEPRECATED - NÃO USAR ⚠️
    
    Esta view foi substituída por subscription_selections_detailed.
    
    DATA DE DEPRECAÇÃO: 2026-03-06
    REMOÇÃO PLANEJADA: 2026-06-01';
  END IF;
END $$;

-- ============================================================================
-- FUNÇÕES LEGADAS - DEPRECATED
-- ============================================================================

-- Se existir função legada, marcar como deprecated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_subscription_collection'
  ) THEN
    COMMENT ON FUNCTION get_subscription_collection IS 
    '⚠️ DEPRECATED - NÃO USAR ⚠️
    
    Esta função foi substituída pelo sistema híbrido.
    Use subscriptions.active_collection_id diretamente.
    
    DATA DE DEPRECAÇÃO: 2026-03-06
    REMOÇÃO PLANEJADA: 2026-06-01';
  END IF;
END $$;

-- ============================================================================
-- SCRIPT DE MIGRAÇÃO DE DADOS (Opcional)
-- ============================================================================

-- Migrar dados de collection_id para active_collection_id
-- EXECUTAR APENAS UMA VEZ, APÓS VALIDAÇÃO

-- UPDATE subscriptions
-- SET active_collection_id = collection_id
-- WHERE active_collection_id IS NULL
--   AND collection_id IS NOT NULL;

-- ============================================================================
-- DOCUMENTAÇÃO: Plano de Remoção
-- ============================================================================

/*
PLANO DE REMOÇÃO DE TABELAS LEGADAS

FASE 1 - DEPRECAÇÃO (2026-03-06 a 2026-04-01)
- ✅ Marcar tabelas/colunas como DEPRECATED
- ✅ Adicionar comentários SQL
- ✅ Atualizar documentação
- ⏳ Comunicar equipe de desenvolvimento
- ⏳ Identificar código que usa tabelas legadas

FASE 2 - MIGRAÇÃO (2026-04-01 a 2026-05-01)
- ⏳ Migrar dados de collection_id para active_collection_id
- ⏳ Atualizar código para usar novo modelo
- ⏳ Remover referências a tabelas legadas
- ⏳ Testar em ambiente de staging
- ⏳ Validar com equipe de QA

FASE 3 - REMOÇÃO (2026-05-01 a 2026-06-01)
- ⏳ Backup de dados legados
- ⏳ Remover tabelas/colunas deprecated
- ⏳ Limpar código legado
- ⏳ Atualizar documentação final
- ⏳ Deploy em produção

FASE 4 - VALIDAÇÃO (2026-06-01 a 2026-06-15)
- ⏳ Monitorar erros em produção
- ⏳ Validar funcionalidades
- ⏳ Confirmar remoção bem-sucedida
- ⏳ Documentar lições aprendidas

TABELAS/COLUNAS A REMOVER:
1. subscription_collections (tabela completa)
2. subscriptions.collection_id (coluna)
3. subscription_collections_view (view, se existir)
4. get_subscription_collection() (função, se existir)

IMPACTO ESTIMADO:
- Código afetado: ~10 arquivos
- Queries afetadas: ~15 queries
- Tempo de migração: 2-3 semanas
- Risco: BAIXO (dados migrados, modelo novo já funcional)

ROLLBACK:
- Manter backup de dados por 6 meses
- Script de rollback disponível
- Possível restaurar tabelas se necessário
*/

-- ============================================================================
-- QUERIES ÚTEIS PARA AUDITORIA
-- ============================================================================

-- Verificar uso de collection_id (deve retornar 0 após migração)
-- SELECT COUNT(*) FROM subscriptions WHERE collection_id IS NOT NULL AND active_collection_id IS NULL;

-- Verificar dados em subscription_collections (deve estar vazio após migração)
-- SELECT COUNT(*) FROM subscription_collections;

-- Listar assinaturas sem coleção ativa (deve ser investigado)
-- SELECT id, user_id, plan_type, status FROM subscriptions WHERE active_collection_id IS NULL AND status = 'active';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
