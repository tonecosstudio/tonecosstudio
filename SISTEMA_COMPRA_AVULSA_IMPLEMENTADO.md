# Sistema de Compra Avulsa - Implementado ✅

## Status: 100% IMPLEMENTADO

O sistema de compra avulsa (standalone purchase) está **completamente implementado** e funcional.

---

## 📋 Regra de Negócio

### Caso 11: Compra Avulsa

```
✅ Cliente SEM assinatura pode comprar diretamente
✅ Clientes avulsos NÃO usam coins
✅ Pagamento em REAIS (R$)
✅ Modelo de depósito: R$ 100 + saldo
```

---

## 🏗️ Arquitetura Implementada

### 1. Banco de Dados (PostgreSQL)

**Migration:** `supabase/migrations/20260315000001_create_standalone_purchases.sql`

**Tabela:** `standalone_purchases`

```sql
CREATE TABLE standalone_purchases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  cycle_id UUID NOT NULL,
  
  -- Status workflow
  status TEXT CHECK (status IN (
    'deposit_paid',      -- Depósito pago
    'awaiting_balance',  -- Aguardando saldo
    'balance_paid',      -- Saldo pago
    'shipped',           -- Enviado
    'delivered',         -- Entregue
    'cancelled'          -- Cancelado
  )),
  
  -- Valores financeiros
  deposit_amount DECIMAL(10,2) DEFAULT 100.00,  -- R$ 100 fixo
  balance_amount DECIMAL(10,2),                 -- Preço - 100
  total_amount DECIMAL(10,2),                   -- Preço total
  
  -- Timestamps
  deposit_paid_at TIMESTAMPTZ,
  balance_due_date TIMESTAMPTZ,  -- 5 dias úteis após produção
  balance_paid_at TIMESTAMPTZ,
  production_complete_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Detalhes
  cancellation_reason TEXT,
  tracking_code TEXT,
  payment_voucher_deposit_url TEXT,
  payment_voucher_balance_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_standalone_purchases_user` - Busca por usuário
- `idx_standalone_purchases_cycle` - Busca por ciclo
- `idx_standalone_purchases_status` - Filtro por status
- `idx_standalone_purchases_balance_due` - Prazos de pagamento

---

### 2. Serviço TypeScript

**Arquivo:** `src/services/standalone-purchase-service.ts`

#### Funções Principais:

**`createWithDeposit(params)`**
- Cria compra avulsa com depósito de R$ 100
- Valida cutoff (dia 15)
- Verifica capacidade do ciclo
- Reserva capacidade
- Calcula valores: depósito + saldo

**`canCreateStandalonePurchase(cycleId)`**
- Verifica se pode criar compra
- Checa cutoff, status do ciclo, capacidade
- Retorna razão se não puder criar

**`getUserStandalonePurchases(userId)`**
- Lista compras do usuário
- Ordenado por data (mais recente primeiro)

**`getStandalonePurchase(purchaseId)`**
- Busca compra específica por ID

**`cancelStandalonePurchase(purchaseId, reason, adminUserId)`**
- Cancela compra
- Libera capacidade (se antes do cutoff)
- Registra log de auditoria

**`processBalancePayment(purchaseId, voucherUrl)`**
- Processa pagamento do saldo
- Valida prazo (5 dias úteis)
- Gera código de rastreamento
- Atualiza status para 'balance_paid'

**`markProductionComplete(purchaseId, adminUserId)`**
- Marca produção como completa
- Calcula prazo de pagamento (5 dias úteis)
- Atualiza status para 'awaiting_balance'
- Envia notificação ao cliente

**`cancelForNonPayment(purchaseId)`**
- Cancela por falta de pagamento
- Retém depósito (Arras Confirmatórias)
- Libera capacidade
- Envia notificação de cancelamento

**`getAllStandalonePurchases(filters)`**
- Lista todas as compras (admin)
- Filtros: status, ciclo, data, busca
- Paginação
- Joins com profiles, collections, cycles

**`searchStandalonePurchasesByCustomer(searchTerm)`**
- Busca por nome ou email do cliente

**`approvePaymentVoucher(purchaseId, voucherType)`**
- Aprova comprovante de pagamento
- Tipos: 'deposit' ou 'balance'

**`rejectPaymentVoucher(purchaseId, voucherType, reason)`**
- Rejeita comprovante
- Permite reenvio

---

### 3. Tipos TypeScript

**Arquivo:** `src/types/database.ts`

```typescript
export interface StandalonePurchase {
  id: string;
  user_id: string;
  collection_id: string;
  cycle_id: string;
  status: StandalonePurchaseStatus;
  deposit_amount: number;
  balance_amount: number;
  total_amount: number;
  deposit_paid_at: Date | null;
  balance_due_date: Date | null;
  balance_paid_at: Date | null;
  production_complete_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  tracking_code: string | null;
  payment_voucher_deposit_url: string | null;
  payment_voucher_balance_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export type StandalonePurchaseStatus =
  | 'awaiting_deposit'
  | 'deposit_paid'
  | 'awaiting_balance'
  | 'balance_paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
```

---

### 4. Integração com Sistema Unificado

**Arquivo:** `src/types/admin/orders.ts`

O sistema de compras avulsas está **integrado** ao sistema unificado de pedidos:

```typescript
export interface UnifiedOrder {
  id: string;
  type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
  status: OrderStatus;
  // ... outros campos
  standalonePurchase?: StandalonePurchaseData;
}

export function isStandalonePurchase(order: UnifiedOrder): boolean {
  return order.type === 'standalone_purchase' && !!order.standalonePurchase;
}
```

---

## 💰 Modelo Financeiro

### Valores

```
Depósito:  R$ 100,00 (fixo, não reembolsável - Arras Confirmatórias)
Saldo:     Preço da coleção - R$ 100,00
Total:     Preço da coleção
```

### Exemplo

```
Coleção Standard: R$ 500,00
├─ Depósito:      R$ 100,00 (pago na criação)
└─ Saldo:         R$ 400,00 (pago após produção)

Coleção Premium: R$ 900,00
├─ Depósito:      R$ 100,00 (pago na criação)
└─ Saldo:         R$ 800,00 (pago após produção)
```

---

## 🔄 Fluxo de Compra Avulsa

```
1. CRIAÇÃO
   ├─ Cliente escolhe coleção
   ├─ Sistema valida cutoff (antes do dia 15)
   ├─ Sistema verifica capacidade do ciclo
   ├─ Cliente paga depósito de R$ 100
   └─ Status: deposit_paid

2. PRODUÇÃO
   ├─ Admin marca produção como completa
   ├─ Sistema calcula prazo: +5 dias úteis
   ├─ Sistema envia notificação ao cliente
   └─ Status: awaiting_balance

3. PAGAMENTO DO SALDO
   ├─ Cliente tem 5 dias úteis para pagar
   ├─ Cliente envia comprovante
   ├─ Admin aprova pagamento
   ├─ Sistema gera código de rastreamento
   └─ Status: balance_paid

4. ENVIO
   ├─ Admin marca como enviado
   ├─ Cliente recebe código de rastreamento
   └─ Status: shipped

5. ENTREGA
   ├─ Admin marca como entregue
   └─ Status: delivered

CANCELAMENTO (se não pagar saldo)
   ├─ Prazo de 5 dias úteis expira
   ├─ Sistema cancela automaticamente
   ├─ Depósito é retido (Arras Confirmatórias)
   ├─ Capacidade é liberada
   └─ Status: cancelled
```

---

## 🎯 Diferenças: Assinante vs Avulso

| Aspecto | Assinante | Avulso |
|---------|-----------|--------|
| **Moeda** | Coins | Reais (R$) |
| **Pagamento** | Mensal/Trimestral/Semestral/Anual | Depósito + Saldo |
| **Depósito** | Não | R$ 100 fixo |
| **Escolha** | Mensal (1 personagem/mês) | Única (1 coleção) |
| **Preço** | Contextual (200-450 coins) | Fixo (R$ 500 ou R$ 900) |
| **Cancelamento** | Reembolso proporcional CDC | Depósito não reembolsável |

---

## 🧪 Testes Implementados

### Testes de Integração

**Arquivo:** `src/test/ordax-integration-tests.test.ts`

```typescript
describe('Standalone Purchase Deposit Flow Integration Test', () => {
  it('should complete standalone purchase flow: deposit → production → balance → shipping', async () => {
    // 1. Check capacity
    // 2. Create purchase with deposit
    // 3. Verify capacity reserved
    // 4. Mark production complete
    // 5. Process balance payment
    // 6. Mark as shipped
    // 7. Verify final status
  });

  it('should cancel purchase for non-payment and retain deposit', async () => {
    // 1. Create purchase
    // 2. Mark production complete
    // 3. Let deadline pass
    // 4. Cancel for non-payment
    // 5. Verify deposit retained
    // 6. Verify capacity released
  });
});
```

### Testes Unitários

**Arquivo:** `src/services/standalone-purchase-service.test.ts`

- Criação de compra com validações
- Verificação de capacidade
- Processamento de pagamentos
- Cancelamentos
- Aprovação/rejeição de comprovantes

---

## 📊 Validações Implementadas

### Criação de Compra

✅ Cutoff não passou (antes do dia 15)
✅ Ciclo está aberto
✅ Capacidade disponível
✅ Coleção existe e está ativa
✅ Usuário autenticado

### Pagamento do Saldo

✅ Status é 'awaiting_balance'
✅ Prazo não expirou (5 dias úteis)
✅ Comprovante válido

### Cancelamento

✅ Compra existe
✅ Não está já cancelada
✅ Capacidade liberada (se antes do cutoff)
✅ Log de auditoria registrado

---

## 🔐 Segurança e Auditoria

### RLS (Row Level Security)

- Usuários veem apenas suas próprias compras
- Admins veem todas as compras
- Políticas de INSERT/UPDATE/DELETE restritas

### Log de Auditoria

Função: `log_standalone_admin_action()`

Registra:
- ID da compra
- ID do admin
- Tipo de ação
- Status anterior/novo
- Notas
- Metadata (JSON)
- Timestamp

---

## 📝 Documentação

### Comentários SQL

```sql
COMMENT ON TABLE standalone_purchases IS 
  'Stores standalone purchases with R$100 deposit model (arras confirmatórias). 
   Balance must be paid within 5 business days after production completion.';

COMMENT ON COLUMN standalone_purchases.deposit_amount IS 
  'Fixed R$100.00 deposit (non-refundable arras confirmatórias)';

COMMENT ON COLUMN standalone_purchases.balance_due_date IS 
  'Deadline for balance payment (5 business days after production completion)';

COMMENT ON COLUMN standalone_purchases.cancellation_reason IS 
  'Reason for cancellation, typically "Balance payment not received within deadline (Arras Confirmatórias)"';
```

---

## ✅ Checklist de Implementação

- [x] Tabela `standalone_purchases` criada
- [x] Índices de performance
- [x] Triggers de atualização
- [x] Serviço TypeScript completo
- [x] Tipos e interfaces
- [x] Validações de negócio
- [x] Integração com sistema unificado
- [x] Testes de integração
- [x] Testes unitários
- [x] Log de auditoria
- [x] RLS policies
- [x] Documentação SQL
- [x] Comentários no código

---

## 🎯 Conclusão

O sistema de compra avulsa está **100% implementado e funcional**, permitindo que:

✅ Clientes sem assinatura comprem diretamente
✅ Pagamento em REAIS (não usa coins)
✅ Modelo de depósito + saldo
✅ Validações de cutoff e capacidade
✅ Fluxo completo de produção e entrega
✅ Cancelamento automático por falta de pagamento
✅ Retenção de depósito (Arras Confirmatórias)
✅ Integração com sistema unificado de pedidos
✅ Auditoria completa de ações admin

O sistema está pronto para uso em produção.
