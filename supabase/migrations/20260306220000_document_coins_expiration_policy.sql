-- ============================================================================
-- Migration: Document Coins Expiration Policy
-- Description: Adiciona comentários SQL documentando política de expiração
-- Date: 2026-03-06 22:00:00
-- ============================================================================

-- ============================================================================
-- DOCUMENTAÇÃO: Política de Expiração de Coins
-- ============================================================================

-- Tabela: subscriptions - coins_balance
COMMENT ON COLUMN subscriptions.coins_balance IS 
'Saldo atual de coins do assinante.

REGRAS DE EXPIRAÇÃO:
- Coins NÃO expiram enquanto assinatura estiver ativa (status = ''active'')
- Coins acumulam mês a mês sem prazo de validade durante assinatura ativa
- Coins expiram IMEDIATAMENTE em cancelamento com reembolso
- Coins expiram na data de término (end_date) em não-renovação
- Coins não são reembolsáveis isoladamente
- Coins não possuem valor monetário

CANCELAMENTO COM REEMBOLSO:
- Todos os coins expiram imediatamente (coins_balance = 0)
- Reembolso calculado apenas por personagens recebidos
- Fórmula CDC: Valor Pago - (Personagens Recebidos × Valor Avulso)
- Coins não entram no cálculo de reembolso
- Acesso à plataforma é encerrado imediatamente

NÃO-RENOVAÇÃO (auto_renew = false):
- Coins permanecem válidos até end_date
- Cliente pode usar normalmente até data de expiração
- Coins expiram automaticamente em end_date
- Sem reembolso de coins ou assinatura
- Acesso mantido até end_date

CONFORMIDADE LEGAL:
- Coins são moeda virtual da plataforma
- Servem APENAS para seleção de personagens
- NÃO podem ser convertidos em dinheiro
- NÃO podem ser transferidos entre usuários
- Regras claras nos Termos de Uso
- Avisos em pontos críticos (cancelamento)
- Aceite explícito obrigatório';

-- Tabela: subscriptions - coins_initial
COMMENT ON COLUMN subscriptions.coins_initial IS 
'Saldo inicial de coins recebido na assinatura.

VALORES POR PLANO:
- Trimestral (3 meses): 600 coins
- Semestral (6 meses): 1300 coins
- Anual (12 meses): 2800 coins

FINALIDADE:
- Usado para cálculo de coins gastos
- Usado para estatísticas e relatórios
- Base para cálculo de saldo (coins_balance = coins_initial - coins_spent)
- Não afeta regras de expiração

IMPORTANTE:
- Valor fixo, não muda durante assinatura
- Definido no momento da criação da assinatura
- Não é atualizado em renovações (nova assinatura = novo coins_initial)';

-- Tabela: subscriptions - status
COMMENT ON COLUMN subscriptions.status IS 
'Status da assinatura.

VALORES POSSÍVEIS:
- active: Assinatura ativa, coins válidos e utilizáveis
- cancelled: Assinatura cancelada, coins expirados (balance = 0)
- expired: Assinatura expirada, coins expirados automaticamente
- paused: Assinatura pausada, coins mantidos (funcionalidade futura)

IMPACTO NOS COINS:
- active → Coins válidos, podem ser usados normalmente
- cancelled → Coins expiram imediatamente (zeramos balance)
- expired → Coins expiram automaticamente na data de término
- paused → Coins mantidos, mas não podem ser usados até reativação

TRANSIÇÕES:
- active → cancelled: Cancelamento com reembolso (coins = 0)
- active → expired: Fim do período sem renovação (coins = 0)
- active → paused: Pausar assinatura (coins mantidos)
- paused → active: Reativar assinatura (coins restaurados)';

-- Tabela: subscriptions - active_collection_id
COMMENT ON COLUMN subscriptions.active_collection_id IS 
'Coleção ativa/prioritária do assinante.

PREÇO CONTEXTUAL:
- Personagens da coleção ativa: 200 coins (preço prioritário)
- Personagens de outras coleções: 240-450 coins (preço contextual)

TROCA DE COLEÇÃO:
- Cliente pode trocar coleção ativa a qualquer momento
- Escolhas já feitas mantêm preço original
- Novas escolhas usam preço da nova coleção ativa
- Não há custo para trocar coleção

LANÇAMENTOS MENSAIS:
- Cada coleção tem 1 personagem lançado por mês
- Personagem da coleção ativa é sugerido automaticamente
- Cliente pode escolher personagem de qualquer coleção

SELEÇÃO AUTOMÁTICA:
- Se cliente não escolher até dia 15, sistema seleciona automaticamente
- Seleção automática sempre usa personagem da coleção ativa
- Preço da seleção automática: 200 coins (preço prioritário)';

-- Tabela: subscription_monthly_selections - status
COMMENT ON COLUMN subscription_monthly_selections.status IS 
'Status da escolha mensal do personagem.

VALORES POSSÍVEIS:
- pending: Escolha feita, aguardando confirmação (pode trocar)
- confirmed: Escolha confirmada, aguardando produção (pode trocar até dia 15)
- in_production: Peça em produção (NÃO pode mais trocar)
- shipped: Peça enviada (NÃO pode mais trocar)
- delivered: Peça entregue (NÃO pode mais trocar)

REGRAS DE TROCA:
- pending/confirmed: Cliente PODE trocar personagem
- in_production/shipped/delivered: Cliente NÃO PODE trocar
- Prazo limite para troca: dia 15 do mês às 23:59
- Após prazo ou início da produção: troca bloqueada

TRANSIÇÕES:
- pending → confirmed: Confirmação manual ou automática (dia 15)
- confirmed → in_production: Início da produção
- in_production → shipped: Envio da peça
- shipped → delivered: Entrega confirmada

IMPORTANTE:
- Status controla se troca é permitida
- Validação deve ser feita no backend e frontend
- Mensagens claras ao usuário sobre bloqueio';

-- Tabela: subscription_monthly_selections - coins_spent
COMMENT ON COLUMN subscription_monthly_selections.coins_spent IS 
'Quantidade de coins gastos nesta escolha.

PREÇOS CONTEXTUAIS:
- Coleção ativa: 200 coins
- Coleção secundária: 240 coins
- Catálogo geral: 300 coins
- Personagem premium: 450 coins

CÁLCULO AUTOMÁTICO:
- Preço calculado pela função get_contextual_character_price()
- Baseado na coleção ativa do assinante
- Armazenado no momento da escolha (não recalculado)

ATUALIZAÇÃO DE SALDO:
- Trigger atualiza coins_balance automaticamente
- coins_balance = coins_initial - SUM(coins_spent)
- Não é necessário atualizar manualmente

IMPORTANTE:
- Valor fixo após escolha (não muda se trocar coleção)
- Usado para cálculo de saldo
- Histórico de gastos do assinante';

-- Tabela: subscription_monthly_selections - is_auto_selected
COMMENT ON COLUMN subscription_monthly_selections.is_auto_selected IS 
'Indica se escolha foi feita automaticamente pelo sistema.

SELEÇÃO AUTOMÁTICA:
- Ocorre quando cliente não escolhe até dia 15 do mês
- Sistema seleciona personagem da coleção ativa automaticamente
- Preço: 200 coins (preço prioritário da coleção ativa)
- Status inicial: pending

FINALIDADE:
- Diferenciar escolhas manuais de automáticas
- Estatísticas e relatórios
- Auditoria de comportamento do usuário

VALORES:
- true: Escolha automática pelo sistema
- false: Escolha manual pelo cliente (padrão)

IMPORTANTE:
- Cliente pode trocar escolha automática (se status permitir)
- Após troca manual, is_auto_selected permanece true (histórico)
- Não afeta funcionalidade, apenas rastreamento';

-- ============================================================================
-- TRIGGER: Expirar Coins em Cancelamento (Opcional)
-- ============================================================================

-- Função para expirar coins automaticamente ao cancelar
CREATE OR REPLACE FUNCTION expire_coins_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para 'cancelled', expirar coins
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.coins_balance := 0;
    
    -- Log de auditoria (se tabela existir)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'subscription_audit_log'
    ) THEN
      INSERT INTO subscription_audit_log (
        subscription_id,
        action,
        old_value,
        new_value,
        reason,
        created_at
      ) VALUES (
        NEW.id,
        'coins_expired',
        OLD.coins_balance::TEXT,
        '0',
        'Assinatura cancelada - coins expirados conforme política',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (se não existir)
DROP TRIGGER IF EXISTS trigger_expire_coins_on_cancellation ON subscriptions;
CREATE TRIGGER trigger_expire_coins_on_cancellation
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION expire_coins_on_cancellation();

COMMENT ON FUNCTION expire_coins_on_cancellation IS 
'Expira coins automaticamente quando assinatura é cancelada.
Trigger executado em UPDATE de subscriptions.
Zera coins_balance quando status muda para ''cancelled''.';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
