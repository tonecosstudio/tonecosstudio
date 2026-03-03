# Análise Completa do Sistema de Pedidos/Transações

**Data**: 2026-04-27  
**Objetivo**: Mapear TODOS os tipos de transações/pedidos do sistema para expansão da página consolidada

---

## 1. TIPOS DE TRANSAÇÕES IDENTIFICADAS

### 1.1 ✅ Entregas de Assinatura (`subscription_deliveries`)
**Status**: JÁ INCLUÍDO na página consolidada

**Tabela**: `subscription_deliveries`

**Campos principais**:
- `id`, `subscription_id`, `delivery_number`
- `status`: scheduled, pending_choice, confirmed, in_production, shipped, delivered, revealed, cancelled
- `tracking_code`, `expected_delivery_date`, `actual_delivery_date`, `reveal_date`
- `character_id` (personagem escolhido)

**Relacionamentos**:
- `subscriptions` → `profiles` (cliente)
- `subscriptions` → `collections` (coleção)
- `collection_characters` (personagem)

**Fluxo**:
1. Cliente assina uma coleção
2. Sistema cria entregas automáticas por ciclo
3. Cliente escolhe personagem (se aplicável)
4. Produção → Envio → Entrega → Revelação

---

### 1.2 ✅ Compras Avulsas (`standalone_purchases`)
**Status**: JÁ INCLUÍDO na página consolidada

**Tabela**: `standalone_purchases`

**Campos principais**:
- `id`, `user_id`, `collection_id`, `cycle_id`, `character_id`
- `status`: awaiting_deposit, deposit_paid, awaiting_balance, balance_paid, in_production, shipped, delivered, completed, cancelled
- `price_deposit`, `price_balance`, `price_full`
- `deposit_paid_at`, `balance_paid_at`, `balance_due_date`
- `deposit_voucher_url`, `balance_voucher_url`
- `tracking_code`, `expected_delivery_date`, `actual_delivery_date`

**Relacionamentos**:
- `profiles` (cliente)
- `collections` (coleção)
- `cycles` (ciclo de produção)
- `collection_characters` (personagem)

**Fluxo**:
1. Cliente faz compra avulsa de personagem
2. Paga entrada (50%)
3. Paga saldo (50%) antes do prazo
4. Produção → Envio → Entrega

---

### 1.3 ❌ Orçamentos (`quotes`)
**Status**: NÃO INCLUÍDO na página consolidada

**Tabelas**: 
- `quotes` (orçamento principal)
- `quote_items` (itens do orçamento)

**Campos principais de `quotes`**:
- `id`, `user_id`
- `status`: pending, approved, rejected, expired
- `deadline` (prazo para resposta)
- `notes` (observações)
- `created_at`, `updated_at`

**Campos principais de `quote_items`**:
- `id`, `quote_id`, `model_id`
- `quantity` (quantidade)
- `scale` (escala: 1/6, 1/4, etc)

**Relacionamentos**:
- `profiles` (cliente)
- `models` (modelos/personagens)
- `quote_items` (itens do orçamento)

**Fluxo**:
1. Cliente solicita orçamento para modelos customizados
2. Admin analisa e responde com prazo e valor
3. Cliente aprova ou rejeita
4. Se aprovado, pode virar uma compra/pedido

**Página atual**: `/admin/orcamentos` (AdminQuotesPage.tsx)

---

### 1.4 ❌ Pagamentos Manuais (`manual_payments`)
**Status**: NÃO INCLUÍDO na página consolidada

**Tabelas**:
- `manual_payments` (pagamento principal)
- `payment_files` (comprovantes)
- `payment_audit_log` (histórico de mudanças)
- `admin_payment_methods` (métodos configurados)

**Campos principais de `manual_payments`**:
- `id`, `reference_number` (número de referência único)
- `user_id`, `payment_method_id`
- `quote_id` OR `subscription_id` (vinculação XOR)
- `amount`, `currency`
- `payment_type`: one_time, recurring
- `status`: pending, under_review, requires_info, approved, rejected
- `rejection_reason`
- `approved_at`, `approved_by`

**Campos principais de `payment_files`**:
- `id`, `payment_id`
- `file_name`, `file_path`, `file_size`, `file_type`
- `thumbnail_path`
- `uploaded_by`

**Relacionamentos**:
- `profiles` (cliente)
- `admin_payment_methods` (método de pagamento)
- `quotes` OU `subscriptions` (vinculação)
- `payment_files` (comprovantes)

**Fluxo**:
1. Cliente faz pagamento via PIX/transferência (R$ 100 ou outro valor)
2. Cliente envia comprovante
3. Admin revisa comprovante
4. Admin aprova ou rejeita
5. Se aprovado, crédito é liberado

**Página atual**: `/admin/pagamentos` (AdminPayments.tsx) - mas é uma página separada

---

### 1.5 ⚠️ Pré-vendas (`preorders`)
**Status**: EXISTE mas pode estar obsoleto

**Tabela**: `preorders`

**Observação**: Mencionado em migrations e rotas, mas pode ter sido substituído pelo sistema de quotes ou standalone_purchases.

---

### 1.6 ℹ️ Sistema de Créditos (Subscription Credits)
**Status**: NÃO é um "pedido" mas afeta transações

**Tabelas**: Sistema complexo com múltiplas tabelas (ver subscription-api)

**Observação**: Sistema de créditos/moedas para assinaturas. Não é um tipo de pedido em si, mas afeta o financeiro e pode gerar transações.

---

## 2. ANÁLISE DA PÁGINA ATUAL `/admin/pedidos`

### 2.1 O que está incluído
- ✅ Entregas de Assinatura (`subscription_deliveries`)
- ✅ Compras Avulsas (`standalone_purchases`)

### 2.2 O que está faltando
- ❌ Orçamentos (`quotes`)
- ❌ Pagamentos Manuais (`manual_payments`)

### 2.3 Funcionalidades implementadas
- Visualização unificada em tabela
- Filtros por tipo (assinatura/avulsa)
- Filtros por status (múltiplos)
- Busca por nome, email, ID, código de rastreamento
- Painel de detalhes lateral
- Atualização de status individual
- Ações em massa (atualização de status)
- Geração de etiquetas
- Exportação CSV
- Histórico de status
- Paginação

---

## 3. RECOMENDAÇÕES PARA EXPANSÃO

### 3.1 Incluir Orçamentos (`quotes`)

**Justificativa**:
- Orçamentos são parte do fluxo de vendas
- Admin precisa gerenciar orçamentos junto com pedidos
- Orçamentos aprovados podem virar pedidos

**Campos a adicionar no UnifiedOrder**:
```typescript
quote?: {
  quoteId: string;
  items: Array<{
    modelId: string;
    modelName: string;
    quantity: number;
    scale: string;
  }>;
  deadline: string | null;
  notes: string | null;
}
```

**Status de orçamentos**:
- `pending` - Aguardando resposta do admin
- `approved` - Aprovado pelo admin
- `rejected` - Rejeitado
- `expired` - Prazo expirado

**Impacto**:
- Adicionar tipo `quote` ao filtro de tipo
- Adicionar status de quotes aos filtros
- Criar componente `QuoteDetails` para painel lateral
- Adaptar transformer para incluir quotes

---

### 3.2 Incluir Pagamentos Manuais (`manual_payments`)

**Justificativa**:
- Pagamentos manuais são transações financeiras importantes
- Admin precisa revisar comprovantes
- Vinculados a quotes ou subscriptions

**Campos a adicionar no UnifiedOrder**:
```typescript
manualPayment?: {
  paymentId: string;
  referenceNumber: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentType: 'one_time' | 'recurring';
  linkedTo: {
    type: 'quote' | 'subscription';
    id: string;
  };
  files: Array<{
    id: string;
    fileName: string;
    filePath: string;
    thumbnailPath: string | null;
  }>;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}
```

**Status de pagamentos manuais**:
- `pending` - Aguardando revisão
- `under_review` - Em análise
- `requires_info` - Requer mais informações
- `approved` - Aprovado
- `rejected` - Rejeitado

**Impacto**:
- Adicionar tipo `manual_payment` ao filtro de tipo
- Adicionar status de pagamentos aos filtros
- Criar componente `ManualPaymentDetails` para painel lateral
- Adicionar visualização de comprovantes (imagens/PDFs)
- Adicionar ações de aprovar/rejeitar
- Adaptar transformer para incluir manual_payments

---

### 3.3 Estrutura de Tipos Expandida

```typescript
export type UnifiedOrderType = 
  | 'subscription_delivery' 
  | 'standalone_purchase'
  | 'quote'              // NOVO
  | 'manual_payment';    // NOVO

export type OrderStatus = 
  | SubscriptionDeliveryStatus 
  | StandalonePurchaseStatus
  | QuoteStatus          // NOVO
  | ManualPaymentStatus; // NOVO

export type QuoteStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export type ManualPaymentStatus =
  | 'pending'
  | 'under_review'
  | 'requires_info'
  | 'approved'
  | 'rejected';
```

---

## 4. PRIORIZAÇÃO

### Prioridade ALTA
1. **Pagamentos Manuais** - Crítico para operação financeira
   - Admin precisa revisar comprovantes diariamente
   - Impacta diretamente no fluxo de caixa

### Prioridade MÉDIA
2. **Orçamentos** - Importante para vendas
   - Admin precisa responder orçamentos
   - Pode ser gerenciado em página separada temporariamente

### Prioridade BAIXA
3. **Pré-vendas** - Verificar se ainda está em uso
   - Pode estar obsoleto
   - Investigar antes de incluir

---

## 5. IMPACTO NA ARQUITETURA

### 5.1 Banco de Dados
- ✅ Tabelas já existem
- ✅ Relacionamentos já definidos
- ⚠️ Pode precisar de índices adicionais para performance

### 5.2 Backend (orders-service.ts)
- Adicionar funções `fetchQuotes()` e `fetchManualPayments()`
- Adaptar `fetchUnifiedOrders()` para incluir novos tipos
- Criar transformers para quotes e manual_payments

### 5.3 Frontend
- Expandir `OrderFilters` com novos tipos e status
- Criar componentes de detalhes específicos
- Adicionar ações específicas (aprovar pagamento, responder orçamento)

### 5.4 Tipos TypeScript
- Expandir `UnifiedOrder` interface
- Adicionar novos status types
- Criar type guards para novos tipos

---

## 6. ESTIMATIVA DE ESFORÇO

### Incluir Pagamentos Manuais
- **Backend**: 4-6 horas
  - Queries e transformers
  - Lógica de aprovação/rejeição
- **Frontend**: 6-8 horas
  - Componente de detalhes
  - Visualização de comprovantes
  - Ações de aprovação
- **Total**: 10-14 horas

### Incluir Orçamentos
- **Backend**: 3-4 horas
  - Queries e transformers
  - Lógica de resposta
- **Frontend**: 4-6 horas
  - Componente de detalhes
  - Visualização de itens
  - Ações de resposta
- **Total**: 7-10 horas

### Total Geral: 17-24 horas

---

## 7. CONCLUSÃO

A página atual `/admin/pedidos` cobre apenas 2 dos 4 tipos principais de transações do sistema:
- ✅ Entregas de Assinatura
- ✅ Compras Avulsas
- ❌ Orçamentos
- ❌ Pagamentos Manuais

Para ter uma página verdadeiramente consolidada que atenda TODO o sistema, é necessário incluir Orçamentos e Pagamentos Manuais.

**Recomendação**: Começar com Pagamentos Manuais (prioridade alta) e depois adicionar Orçamentos.
