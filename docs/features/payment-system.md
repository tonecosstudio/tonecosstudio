# 💳 Sistema de Pagamentos - Ordax

Documentação completa do sistema de pagamentos e precificação.

---

## 📋 Visão Geral

Sistema robusto de pagamentos com múltiplas formas de pagamento, parcelamento configurável, descontos e análise financeira completa.

### Características Principais
- 💰 Preços configuráveis (global e por coleção)
- 💳 Múltiplos métodos de pagamento
- 📊 Parcelamento em até 10x
- 🎁 Desconto PIX (5%)
- 📈 Análise financeira detalhada
- 🔗 Links de pagamento manual
- 🧮 Calculadora de preços
- 📧 Notificações automáticas

---

## 💰 Estrutura de Preços

### Preços Padrão

| Produto | Preço Full | Preço PIX (5% OFF) | Peças | Preço/Peça |
|---------|------------|-------------------|-------|------------|
| Avulso | R$ 500,00 | R$ 475,00 | 1 | R$ 500,00 |
| Trimestral | R$ 1.350,00 | R$ 1.282,50 | 3 | R$ 450,00 |
| Semestral | R$ 2.700,00 | R$ 2.565,00 | 7 | R$ 385,71 |

### Sistema de Entrada

**Entrada Fixa**: R$ 100,00
- Não reembolsável
- Garante vaga no lote
- Paga no momento da compra

**Restante**: Pago quando peça estiver pronta
- PIX: Com 5% de desconto
- Parcelado: Até 10x com juros

---

## 🏗️ Arquitetura

### Banco de Dados

#### Tabela: collections
```sql
price_full NUMERIC(10,2) DEFAULT 500.00
price_pix NUMERIC(10,2) DEFAULT 475.00
deposit_amount NUMERIC(10,2) DEFAULT 100.00
is_price_custom BOOLEAN DEFAULT false

-- Custos (para análise financeira)
cost_material NUMERIC(10,2)
cost_labor NUMERIC(10,2)
cost_packaging NUMERIC(10,2)
cost_shipping NUMERIC(10,2)
cost_other NUMERIC(10,2)
```

#### Tabela: system_settings
```sql
-- Preços padrão
default_price_full = '500.00'
default_price_pix = '475.00'
default_deposit_amount = '100.00'
pix_discount_percentage = '5.00'
```

#### Tabela: payment_methods
```sql
- id (uuid)
- name (text)
- type (enum: pix, credit_card, bank_slip, manual)
- is_active (boolean)
- installments_max (integer)
- has_interest (boolean)
- discount_percentage (numeric)
```

#### Tabela: manual_payment_links
```sql
- id (uuid)
- user_id (uuid)
- subscription_id (uuid)
- amount (numeric)
- payment_method (text)
- status (enum: pending, paid, expired)
- expires_at (timestamp)
- paid_at (timestamp)
```

### Funções SQL

#### calculate_pix_price(price_full, discount_percentage)
Calcula preço PIX com desconto:
```sql
SELECT calculate_pix_price(500, 5); -- Retorna 475.00
```

#### get_collection_pricing(collection_id)
Retorna preços de uma coleção:
```sql
SELECT * FROM get_collection_pricing('uuid');
```

Retorna:
- price_full, price_pix, deposit_amount
- remaining_full, remaining_pix
- is_custom

---

## 💳 Métodos de Pagamento

### 1. PIX (Recomendado)

**Vantagens**:
- 5% de desconto
- Taxa baixa (1%)
- Confirmação instantânea

**Exemplo R$ 500**:
- Cliente paga: R$ 475,00
- Taxa MP: R$ 4,75 (1%)
- Você recebe: R$ 470,25
- **Lucro líquido: Melhor opção**

### 2. Cartão 6x sem juros

**Características**:
- Loja paga juros
- Taxa alta (14,94%)
- Cliente não paga juros

**Exemplo R$ 500**:
- Cliente paga: R$ 500,00
- Taxa MP: R$ 74,70 (14,94%)
- Você recebe: R$ 425,30
- **Lucro líquido: Menor**

### 3. Cartão 10x sem juros (Loja paga)

**Características**:
- Loja paga juros
- Taxa muito alta (25,63%)
- Cliente não paga juros

**Exemplo R$ 500**:
- Cliente paga: R$ 500,00
- Taxa MP: R$ 128,15 (25,63%)
- Você recebe: R$ 371,85
- **Lucro líquido: Muito menor**

### 4. Cartão 10x com juros (Cliente paga)

**Características**:
- Cliente paga juros
- Taxa normal (4,98%)
- Melhor para loja

**Exemplo R$ 500**:
- Cliente paga: R$ 603,25 (20,65% juros)
- Taxa MP: R$ 24,90 (4,98%)
- Você recebe: R$ 475,10
- **Lucro líquido: Quase igual ao PIX**

### 5. Pagamento Manual

**Características**:
- Link gerado pelo admin
- Transferência bancária
- Boleto
- Sem taxas de intermediário

---

## 🎨 Interface Admin

### AdminPricing (/admin/precos)

**Configurações Globais**:
- Preço cheio padrão
- Entrada padrão
- Desconto PIX (%)
- Preview automático

**Preços por Coleção**:
- Toggle "Usar preço customizado"
- Campos editáveis
- Preview calculado
- Salvar individual

### AdminCollectionFinancials (/admin/financeiro)

**Análise Financeira**:
- Custos detalhados por coleção
- Lucro bruto e líquido
- Margem de lucro
- ROI (Return on Investment)
- Breakeven
- Comparação de formas de pagamento

**4 Tabs**:
1. **Visão Geral**: Resumo de todas as coleções
2. **Custos**: Editar custos por coleção
3. **Comparação**: PIX vs Cartão
4. **Recomendações**: Sugestões automáticas

### AdminPayments (/admin/pagamentos)

**Gestão de Pagamentos**:
- Lista de todos os pagamentos
- Filtros por status/método
- Detalhes de cada pagamento
- Confirmação manual
- Reembolsos

### PaymentCalculator (/admin/calculadora)

**Calculadora de Preços**:
- Simular diferentes preços
- Ver impacto das taxas
- Comparar métodos
- Calcular lucro líquido

---

## 💻 Hooks e Serviços

### useCollectionPricing

```typescript
import { useCollectionPricing } from '@/hooks/useCollectionPricing';

function MyComponent({ collectionId }) {
  const { data: pricing, isLoading } = useCollectionPricing(collectionId);
  
  return (
    <div>
      <p>Preço: R$ {pricing?.price_full}</p>
      <p>PIX: R$ {pricing?.price_pix}</p>
      <p>Entrada: R$ {pricing?.deposit_amount}</p>
      <p>Restante: R$ {pricing?.remaining_pix}</p>
    </div>
  );
}
```

### useGlobalPricingSettings

```typescript
import { useGlobalPricingSettings } from '@/hooks/useCollectionPricing';

function MyComponent() {
  const { data: settings } = useGlobalPricingSettings();
  
  return (
    <div>
      <p>Preço padrão: R$ {settings?.default_price_full}</p>
      <p>Desconto PIX: {settings?.pix_discount_percentage}%</p>
    </div>
  );
}
```

### paymentService

```typescript
import { paymentService } from '@/lib/payment-service';

// Criar pagamento
const payment = await paymentService.create({
  user_id: userId,
  amount: 475.00,
  method: 'pix',
  subscription_id: subscriptionId
});

// Confirmar pagamento
await paymentService.confirm(paymentId);

// Listar pagamentos
const payments = await paymentService.list({ status: 'pending' });
```

---

## 📊 Análise Financeira

### Custos por Coleção

**Categorias**:
- Material/Resina
- Mão de Obra
- Embalagem
- Frete
- Outros

**Exemplo Marvel**:
```
Material: R$ 60
Mão de Obra: R$ 100
Embalagem: R$ 40
Frete: R$ 50
Total: R$ 250
```

### Métricas Calculadas

**Lucro Bruto**:
```
Preço - Custo Total
R$ 665 - R$ 250 = R$ 415
```

**Lucro Líquido** (com taxas MP):
```
PIX (1%): R$ 665 - R$ 6,65 - R$ 250 = R$ 408,35
10x juros (4,98%): R$ 603,25 - R$ 30,04 - R$ 250 = R$ 323,21
```

**Margem de Lucro**:
```
(Lucro Líquido / Preço) × 100
(R$ 408,35 / R$ 665) × 100 = 61,4%
```

**ROI** (Return on Investment):
```
(Lucro Líquido / Custo) × 100
(R$ 408,35 / R$ 250) × 100 = 163,3%
```

**Breakeven**:
```
Custos Fixos / Lucro por Unidade
Exemplo: R$ 1.000 / R$ 408,35 = 3 unidades
```

### Recomendações Automáticas

O sistema analisa e sugere:

- **Margem < 30%**: ⚠️ Aumentar preço ou reduzir custos
- **Margem > 60%**: ✅ Excelente! Escalar produção
- **ROI < 100%**: ⚠️ Revisar estrutura de custos
- **ROI > 200%**: ✅ Ótimo! Investir em divulgação
- **Maior custo**: ℹ️ Negociar com fornecedores

---

## 🔗 Links de Pagamento Manual

### Criar Link

```typescript
import { manualPaymentService } from '@/lib/manual-payment-service';

const link = await manualPaymentService.createLink({
  user_id: userId,
  subscription_id: subscriptionId,
  amount: 475.00,
  payment_method: 'bank_transfer',
  expires_in_days: 7
});

// Enviar link para cliente
const url = `${BASE_URL}/pagamento/${link.id}`;
```

### Confirmar Pagamento

```typescript
await manualPaymentService.confirmPayment(linkId, {
  paid_at: new Date(),
  transaction_id: 'TXN123',
  notes: 'Transferência confirmada'
});
```

---

## 🧮 Calculadora de Preços

### Página: /admin/calculadora

**Funcionalidades**:
- Simular diferentes preços
- Ver impacto das taxas MP
- Comparar todos os métodos
- Calcular lucro líquido
- Exportar comparação

**Exemplo de Uso**:
```
1. Inserir preço base: R$ 500
2. Inserir custos: R$ 250
3. Ver comparação automática:
   - PIX: Lucro R$ 220,25
   - 6x: Lucro R$ 175,30
   - 10x juros: Lucro R$ 225,10
4. Decisão: Incentivar PIX ou 10x com juros
```

---

## 📧 Notificações

### Eventos de Pagamento

**Pagamento Criado**:
- Email para cliente com instruções
- Link de pagamento (se manual)
- Prazo de vencimento

**Pagamento Confirmado**:
- Email de confirmação
- Recibo em PDF
- Próximos passos

**Pagamento Vencido**:
- Email de lembrete
- Novo link de pagamento
- Opções de contato

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Mercado Pago
VITE_MP_PUBLIC_KEY=APP_USR-xxx
MP_ACCESS_TOKEN=APP_USR-xxx (backend)

# Taxas (configurável no admin)
PIX_DISCOUNT_PERCENTAGE=5.00
DEFAULT_PRICE_FULL=500.00
DEFAULT_DEPOSIT=100.00
```

### Secrets do Supabase

```bash
# Configurar no Dashboard
MP_ACCESS_TOKEN=APP_USR-xxx
WEBHOOK_SECRET=xxx
```

---

## 🧪 Testes

### Testar Fluxo Completo

1. **Criar assinatura**
2. **Gerar pagamento**
3. **Simular pagamento PIX**
4. **Verificar confirmação**
5. **Checar notificações**

### Testar Calculadora

1. **Acessar /admin/calculadora**
2. **Inserir valores**
3. **Verificar cálculos**
4. **Comparar métodos**

### Testar Análise Financeira

1. **Acessar /admin/financeiro**
2. **Configurar custos**
3. **Verificar métricas**
4. **Validar recomendações**

---

## 📚 Referências

### Código-Fonte

**Serviços**:
- `src/lib/payment-service.ts`
- `src/lib/manual-payment-service.ts`
- `src/lib/admin-payment-service.ts`

**Hooks**:
- `src/hooks/useCollectionPricing.ts`
- `src/hooks/usePricingSettings.ts`
- `src/hooks/usePaginatedPayments.ts`

**Páginas Admin**:
- `src/pages/admin/AdminPricing.tsx`
- `src/pages/admin/AdminCollectionFinancials.tsx`
- `src/pages/admin/AdminPayments.tsx`
- `src/pages/admin/PaymentCalculator.tsx`

**Páginas Cliente**:
- `src/pages/PaymentPage.tsx`
- `src/pages/MyPaymentsPage.tsx`
- `src/pages/PaymentDetails.tsx`

### Migrations

- `20260202100001_create_payment_methods.sql`
- `20260214000000_add_manual_payment_links.sql`
- `20260215120000_update_pricing_structure.sql`
- `20260215130000_update_pix_discount_5_percent.sql`
- `20260215140000_add_collection_pricing.sql`
- `20260215150000_add_collection_costs_analytics.sql`
- `20260216000000_create_manual_payment_system.sql`

---

## 🎯 Melhores Práticas

### Para Maximizar Lucro

1. **Incentivar PIX**: 5% desconto, taxa baixa
2. **Oferecer 10x com juros**: Cliente paga juros
3. **Evitar 6x e 10x sem juros**: Taxas muito altas
4. **Usar análise financeira**: Otimizar custos

### Para Melhor UX

1. **Mostrar economia PIX**: Destacar desconto
2. **Calculadora transparente**: Cliente vê parcelas
3. **Múltiplas opções**: Flexibilidade
4. **Confirmação rápida**: Notificações automáticas

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
