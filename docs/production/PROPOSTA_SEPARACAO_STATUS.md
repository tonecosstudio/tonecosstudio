# Proposta: Separação de Status de Pagamento e Produção

## 🎯 Problema Atual

Atualmente, o sistema mistura conceitos de pagamento e produção:
- `production_status` é usado para indicar tanto pagamento quanto produção
- `current_stage` indica o estágio físico de produção
- Confusão entre "aguardando pagamento" e "em produção"

## ✅ Proposta: Dois Status Independentes

### 1. Payment Status (Status de Pagamento)

**Campo**: `payment_status`  
**Responsabilidade**: Controlar o fluxo financeiro

```typescript
type PaymentStatus = 
  | 'pending'           // Aguardando pagamento inicial
  | 'deposit_paid'      // Depósito pago, aguardando saldo
  | 'balance_pending'   // Produto pronto, aguardando saldo
  | 'paid'              // Pagamento completo
  | 'overdue'           // Pagamento atrasado
  | 'cancelled';        // Cancelado
```

**Fluxo**:
```
pending → deposit_paid → balance_pending → paid
                              ↓
                          overdue
```

### 2. Production Status (Status de Produção)

**Campo**: `production_status`  
**Responsabilidade**: Controlar o fluxo de produção física

```typescript
type ProductionStatus = 
  | 'not_started'       // Não iniciado (aguardando pagamento)
  | 'ready_to_start'    // Pronto para iniciar (pagamento OK)
  | 'in_production'     // Em produção
  | 'quality_check'     // Em controle de qualidade
  | 'ready_to_ship'     // Pronto para envio
  | 'shipped'           // Enviado
  | 'delivered'         // Entregue
  | 'on_hold'           // Pausado/Bloqueado
  | 'cancelled';        // Cancelado
```

**Fluxo**:
```
not_started → ready_to_start → in_production → quality_check → ready_to_ship → shipped → delivered
                                     ↓
                                 on_hold
```

### 3. Production Stage (Estágio de Produção)

**Campo**: `current_stage` (já existe)  
**Responsabilidade**: Detalhar o estágio específico dentro da produção

```typescript
type ProductionStage = 
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'awaiting_choice'
  | 'model_preparation'
  | 'printing'
  | 'post_processing'
  | 'painting'
  | 'quality_check'
  | 'packaging'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered';
```

## 📊 Exemplo de Uso Combinado

### Cenário 1: Compra Avulsa - Fluxo Normal

```
Momento 1: Cliente faz pedido
├─ payment_status: pending
├─ production_status: not_started
└─ current_stage: awaiting_payment

Momento 2: Cliente paga depósito
├─ payment_status: deposit_paid
├─ production_status: ready_to_start
└─ current_stage: payment_confirmed

Momento 3: Produção inicia
├─ payment_status: deposit_paid
├─ production_status: in_production
└─ current_stage: model_preparation

Momento 4: Imprimindo
├─ payment_status: deposit_paid
├─ production_status: in_production
└─ current_stage: printing

Momento 5: Produto pronto
├─ payment_status: balance_pending ⚠️ AGUARDANDO SALDO
├─ production_status: quality_check
└─ current_stage: packaging

Momento 6: Cliente paga saldo
├─ payment_status: paid ✅
├─ production_status: ready_to_ship
└─ current_stage: ready_to_ship

Momento 7: Enviado
├─ payment_status: paid
├─ production_status: shipped
└─ current_stage: shipped

Momento 8: Entregue
├─ payment_status: paid
├─ production_status: delivered
└─ current_stage: delivered
```

### Cenário 2: Assinatura - Fluxo Normal

```
Momento 1: Assinatura criada, aguardando escolha
├─ payment_status: paid (já pago mensalmente)
├─ production_status: not_started
└─ current_stage: awaiting_choice

Momento 2: Cliente escolhe personagem
├─ payment_status: paid
├─ production_status: ready_to_start
└─ current_stage: payment_confirmed

Momento 3: Em produção
├─ payment_status: paid
├─ production_status: in_production
└─ current_stage: printing

... (continua normalmente)
```

## 🎨 Visualização no Dashboard

### Card de Status

```
┌─────────────────────────────────────┐
│ Pedido #9254ac09                    │
├─────────────────────────────────────┤
│ 💰 Pagamento: Depósito Pago         │
│    ⚠️ Aguardando saldo (R$ 400)     │
│                                     │
│ 🏭 Produção: Em Produção            │
│    📐 Preparação do Modelo          │
│                                     │
│ 📅 Previsão: 15/03/2026             │
└─────────────────────────────────────┘
```

### Filtros Separados

```
Filtros de Pagamento:
☐ Pendente
☑ Depósito Pago
☐ Aguardando Saldo
☐ Pago Completo

Filtros de Produção:
☐ Não Iniciado
☑ Em Produção
☐ Pronto para Envio
☐ Enviado
```

## 🔧 Implementação

### 1. Adicionar Campo `payment_status`

```sql
-- Adicionar à tabela standalone_purchases
ALTER TABLE standalone_purchases
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
CHECK (payment_status IN (
  'pending', 'deposit_paid', 'balance_pending', 
  'paid', 'overdue', 'cancelled'
));

-- Adicionar à tabela subscription_deliveries
ALTER TABLE subscription_deliveries
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid'
CHECK (payment_status IN (
  'pending', 'paid', 'overdue', 'cancelled'
));

-- Adicionar à tabela production_queue (denormalizado)
ALTER TABLE production_queue
ADD COLUMN payment_status TEXT;
```

### 2. Atualizar `production_status`

```sql
-- Simplificar valores de production_status
ALTER TABLE production_queue
DROP CONSTRAINT IF EXISTS production_queue_production_status_check;

ALTER TABLE production_queue
ADD CONSTRAINT production_queue_production_status_check
CHECK (production_status IN (
  'not_started', 'ready_to_start', 'in_production',
  'quality_check', 'ready_to_ship', 'shipped',
  'delivered', 'on_hold', 'cancelled'
));
```

### 3. Trigger de Sincronização

```sql
CREATE OR REPLACE FUNCTION sync_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Para standalone_purchases
  IF TG_TABLE_NAME = 'standalone_purchases' THEN
    NEW.payment_status := CASE
      WHEN NEW.balance_paid_at IS NOT NULL THEN 'paid'
      WHEN NEW.deposit_paid_at IS NOT NULL THEN 'deposit_paid'
      ELSE 'pending'
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Atualizar Serviços TypeScript

```typescript
// src/types/admin/orders.ts
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

// Adicionar aos tipos UnifiedOrder
export interface UnifiedOrder {
  // ... campos existentes
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  currentStage: ProductionStage;
}
```

## 📋 Benefícios

1. **Clareza**: Separação clara entre financeiro e produção
2. **Flexibilidade**: Permite diferentes fluxos de pagamento
3. **Validação**: Regras de negócio mais precisas
4. **Relatórios**: Métricas separadas de pagamento e produção
5. **UX**: Interface mais clara para usuários

## ⚠️ Migração de Dados

```sql
-- Migrar dados existentes
UPDATE standalone_purchases
SET payment_status = CASE
  WHEN balance_paid_at IS NOT NULL THEN 'paid'
  WHEN deposit_paid_at IS NOT NULL THEN 'deposit_paid'
  ELSE 'pending'
END;

UPDATE production_queue pq
SET payment_status = (
  SELECT CASE
    WHEN sp.balance_paid_at IS NOT NULL THEN 'paid'
    WHEN sp.deposit_paid_at IS NOT NULL THEN 'deposit_paid'
    ELSE 'pending'
  END
  FROM standalone_purchases sp
  WHERE sp.id = pq.order_id
  AND pq.order_type = 'standalone_purchase'
);
```

## ✅ Conclusão

A separação de `payment_status` e `production_status` torna o sistema:
- Mais profissional
- Mais fácil de entender
- Mais fácil de manter
- Mais flexível para diferentes modelos de negócio

**Recomendação**: Implementar em próxima sprint.
