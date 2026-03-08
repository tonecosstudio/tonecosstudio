# Implementação: Separação de Status de Pagamento e Produção

## ✅ Status: PRONTO PARA APLICAR

Data: 08/03/2026

## 🎯 Objetivo

Separar claramente o status de pagamento do status de produção para melhor controle e clareza do sistema.

## 📋 Arquivos Criados/Modificados

### 1. Migration SQL
**Arquivo**: `supabase/migrations/20260308200000_add_payment_status.sql`

**O que faz**:
1. Adiciona campo `payment_status` em:
   - `standalone_purchases`
   - `subscription_deliveries`
   - `production_queue` (denormalizado)

2. Migra dados existentes automaticamente

3. Atualiza `production_status` para focar em produção:
   - `awaiting_choice` → `not_started`
   - `ready_for_production` → `ready_to_start`
   - Mantém: `in_production`, `on_hold`, `cancelled`
   - Adiciona: `quality_check`, `ready_to_ship`, `shipped`, `delivered`

4. Cria trigger para auto-atualizar `payment_status`

5. Adiciona índices para performance

### 2. Tipos TypeScript
**Arquivo**: `src/types/admin/orders.ts`

**Adicionado**:
```typescript
export type PaymentStatus =
  | 'pending'
  | 'deposit_paid'
  | 'balance_pending'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type ProductionStatus =
  | 'not_started'
  | 'ready_to_start'
  | 'in_production'
  | 'quality_check'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'on_hold'
  | 'cancelled';

// Adicionado ao UnifiedOrder
interface UnifiedOrder {
  // ... campos existentes
  paymentStatus?: PaymentStatus;
  productionStatus?: ProductionStatus;
}
```

### 3. Script de Aplicação
**Arquivo**: `scripts/database/apply-payment-status-migration.mjs`

Fornece o SQL para executar no Supabase Dashboard.

## 📊 Novos Campos

### payment_status

| Valor | Significado | Quando Usar |
|-------|-------------|-------------|
| `pending` | Aguardando pagamento inicial | Pedido criado, sem pagamento |
| `deposit_paid` | Depósito pago | Depósito confirmado, aguardando saldo |
| `balance_pending` | Aguardando saldo | Produto pronto, aguardando pagamento final |
| `paid` | Pago completo | Pagamento 100% confirmado |
| `overdue` | Atrasado | Pagamento vencido |
| `cancelled` | Cancelado | Pedido cancelado |

### production_status

| Valor | Significado | Quando Usar |
|-------|-------------|-------------|
| `not_started` | Não iniciado | Aguardando pagamento ou escolha |
| `ready_to_start` | Pronto para iniciar | Pagamento OK, pode iniciar produção |
| `in_production` | Em produção | Produção em andamento |
| `quality_check` | Controle de qualidade | Verificação final |
| `ready_to_ship` | Pronto para envio | Embalado, aguardando coleta |
| `shipped` | Enviado | Despachado |
| `delivered` | Entregue | Cliente recebeu |
| `on_hold` | Pausado | Produção bloqueada |
| `cancelled` | Cancelado | Produção cancelada |

## 🔄 Exemplo de Fluxo

### Compra Avulsa - Pagamento em 2 Parcelas

```
1. Cliente faz pedido
   payment_status: pending
   production_status: not_started
   current_stage: awaiting_payment

2. Cliente paga depósito
   payment_status: deposit_paid ✅
   production_status: ready_to_start
   current_stage: payment_confirmed

3. Produção inicia
   payment_status: deposit_paid
   production_status: in_production
   current_stage: model_preparation

4. Imprimindo
   payment_status: deposit_paid
   production_status: in_production
   current_stage: printing

5. Produto pronto
   payment_status: balance_pending ⚠️ AGUARDANDO SALDO
   production_status: quality_check
   current_stage: packaging

6. Cliente paga saldo
   payment_status: paid ✅
   production_status: ready_to_ship
   current_stage: ready_to_ship

7. Enviado
   payment_status: paid
   production_status: shipped
   current_stage: shipped

8. Entregue
   payment_status: paid
   production_status: delivered
   current_stage: delivered
```

## 🚀 Como Aplicar

### Passo 1: Executar Migration

```bash
node scripts/database/apply-payment-status-migration.mjs
```

Isso mostrará o SQL para executar no Supabase Dashboard.

### Passo 2: Executar SQL no Supabase

1. Acesse: Supabase Dashboard → SQL Editor
2. Copie o SQL do arquivo: `supabase/migrations/20260308200000_add_payment_status.sql`
3. Execute

### Passo 3: Verificar

```sql
-- Verificar payment_status
SELECT payment_status, COUNT(*) 
FROM standalone_purchases 
GROUP BY payment_status;

-- Verificar production_status
SELECT production_status, COUNT(*) 
FROM production_queue 
GROUP BY production_status;
```

## 📝 Próximos Passos (Frontend)

Após aplicar a migration, atualizar:

1. **Badges de Status**
   - Criar `PaymentStatusBadge` component
   - Atualizar `ProductionStatusBadge` para usar `production_status`

2. **Filtros**
   - Adicionar filtro por `payment_status`
   - Atualizar filtro de `production_status`

3. **Dashboard**
   - Mostrar ambos os status separadamente
   - Indicadores visuais para "Aguardando Saldo"

4. **Serviços**
   - Atualizar `orders-service-v3.ts` para mapear novos campos
   - Atualizar transformers

## ⚠️ Compatibilidade

- ✅ Backward compatible (campos opcionais)
- ✅ Dados migrados automaticamente
- ✅ Triggers mantêm sincronização
- ✅ Índices para performance

## ✅ Benefícios

1. **Clareza**: Separação clara entre financeiro e produção
2. **Flexibilidade**: Suporta diferentes fluxos de pagamento
3. **Validação**: Regras de negócio mais precisas
4. **UX**: Interface mais clara para usuários
5. **Relatórios**: Métricas separadas

## 📚 Documentação Relacionada

- `docs/production/PROPOSTA_SEPARACAO_STATUS.md` - Proposta completa
- `docs/production/FLUXO_PAGAMENTO_COMPRAS_AVULSA.md` - Fluxo de pagamento

## ✅ Conclusão

Implementação profissional completa da separação de status. Sistema pronto para aplicação em produção após execução da migration SQL.
