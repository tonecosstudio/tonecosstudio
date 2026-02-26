# 🔄 Integração das Chaves de Pagamento - Checklist

**Data:** 26 de Fevereiro de 2026  
**Status:** Pendente de Integração

---

## ❌ Locais que AINDA NÃO estão usando o novo sistema

### 1. PreorderCheckout.tsx ❌
**Localização:** `src/pages/PreorderCheckout.tsx`  
**Tipo de Pagamento:** `onetime` (compra avulsa) ou `voucher` (entrada)  
**Status Atual:** Usa seleção manual de método (PIX/Cartão) mas não exibe chaves

**O que fazer:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Adicionar após seleção de método de pagamento:
<PaymentInstructions
  paymentType={paymentOption === "preorder" ? "voucher" : "onetime"}
  amount={finalAmount}
/>
```

**Linha sugerida:** Após linha ~200 (onde mostra resumo do pagamento)

---

### 2. PaymentPage.tsx ❌
**Localização:** `src/pages/PaymentPage.tsx`  
**Tipo de Pagamento:** `onetime` (quote) ou `subscription` (assinatura)  
**Status Atual:** Usa componente `PaymentInitiationFlow` mas não exibe chaves

**O que fazer:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Para quote:
<PaymentInstructions
  paymentType="onetime"
  amount={quote.total_amount}
/>

// Para subscription:
<PaymentInstructions
  paymentType="subscription"
  subscriptionPeriod={subscription.plan_type} // 'quarterly', 'semiannual', 'annual'
  amount={subscription.amount}
/>
```

**Linha sugerida:** Dentro do componente PaymentInitiationFlow ou após ele

---

### 3. SubscribeCollection.tsx ❌
**Localização:** `src/pages/SubscribeCollection.tsx`  
**Tipo de Pagamento:** `subscription`  
**Status Atual:** Seleção de plano mas não mostra chaves de pagamento

**O que fazer:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Mapear planType para subscriptionPeriod:
const periodMap = {
  trimestral: 'quarterly',
  semestral: 'semiannual',
  anual: 'annual'
};

// Adicionar:
<PaymentInstructions
  paymentType="subscription"
  subscriptionPeriod={periodMap[planType]}
  amount={selectedPlan?.price}
/>
```

**Linha sugerida:** Após seleção do plano (linha ~150-200)

---

### 4. PaymentDetails.tsx ❓
**Localização:** `src/pages/PaymentDetails.tsx`  
**Tipo de Pagamento:** Variável (depende do pagamento)  
**Status Atual:** Não verificado ainda

**O que fazer:**
- Verificar se já mostra informações de pagamento
- Se não, adicionar `PaymentInstructions` baseado no tipo do pagamento

---

### 5. BuyCharacter.tsx ❓
**Localização:** `src/pages/BuyCharacter.tsx`  
**Tipo de Pagamento:** `onetime` (compra avulsa)  
**Status Atual:** Não verificado ainda

**O que fazer:**
- Verificar se existe checkout nesta página
- Se sim, adicionar `PaymentInstructions` com `paymentType="onetime"`

---

## ✅ Locais que JÁ estão prontos

### 1. AdminPaymentKeys.tsx ✅
**Localização:** `src/pages/admin/AdminPaymentKeys.tsx`  
**Status:** Interface admin para configurar chaves - PRONTO

### 2. PaymentInstructions.tsx ✅
**Localização:** `src/components/payment/PaymentInstructions.tsx`  
**Status:** Componente pronto para uso - PRONTO

### 3. usePaymentKeys.ts ✅
**Localização:** `src/hooks/usePaymentKeys.ts`  
**Status:** Hooks prontos - PRONTO

---

## 📋 Checklist de Integração

### Fase 1: Aplicar Migration
- [ ] Aplicar `supabase/migrations/20260226000000_add_payment_keys_settings.sql`
- [ ] Verificar se funções SQL foram criadas
- [ ] Testar funções SQL no Supabase Dashboard

### Fase 2: Configurar Chaves
- [ ] Acessar `/admin/chaves-pagamento`
- [ ] Configurar chave PIX para compra avulsa
- [ ] Configurar chave PIX para voucher
- [ ] Configurar chave PIX para assinatura trimestral
- [ ] Configurar chave PIX para assinatura semestral
- [ ] Configurar chave PIX para assinatura anual
- [ ] Configurar link de cartão para compra avulsa
- [ ] Configurar link de cartão para voucher
- [ ] Configurar link de cartão para assinatura trimestral
- [ ] Configurar link de cartão para assinatura semestral
- [ ] Configurar link de cartão para assinatura anual

### Fase 3: Integrar em Páginas
- [ ] Integrar em `PreorderCheckout.tsx`
- [ ] Integrar em `PaymentPage.tsx`
- [ ] Integrar em `SubscribeCollection.tsx`
- [ ] Verificar e integrar em `PaymentDetails.tsx`
- [ ] Verificar e integrar em `BuyCharacter.tsx`

### Fase 4: Testar
- [ ] Testar checkout de quote (compra avulsa)
- [ ] Testar checkout de voucher (entrada R$ 100)
- [ ] Testar checkout de assinatura trimestral
- [ ] Testar checkout de assinatura semestral
- [ ] Testar checkout de assinatura anual
- [ ] Testar botão copiar chave PIX
- [ ] Testar link de cartão abre em nova aba
- [ ] Testar em mobile

---

## 🔧 Exemplos de Integração

### Exemplo 1: PreorderCheckout.tsx

**Antes:**
```typescript
// Linha ~200
<Card>
  <CardHeader>
    <CardTitle>Resumo do Pagamento</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Total: R$ {finalAmount.toFixed(2)}</p>
    <Button onClick={() => processPaymentMutation.mutate()}>
      Confirmar Pagamento
    </Button>
  </CardContent>
</Card>
```

**Depois:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Linha ~200
<Card>
  <CardHeader>
    <CardTitle>Resumo do Pagamento</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <div>
      <p className="text-2xl font-bold">R$ {finalAmount.toFixed(2)}</p>
      <p className="text-sm text-muted-foreground">
        {paymentOption === "preorder" ? "Entrada (Voucher)" : "Pagamento Total"}
      </p>
    </div>

    <PaymentInstructions
      paymentType={paymentOption === "preorder" ? "voucher" : "onetime"}
      amount={finalAmount}
    />

    <Button 
      onClick={() => processPaymentMutation.mutate()}
      className="w-full"
    >
      Confirmar e Enviar Comprovante
    </Button>
  </CardContent>
</Card>
```

---

### Exemplo 2: SubscribeCollection.tsx

**Antes:**
```typescript
// Linha ~150
<Card>
  <CardHeader>
    <CardTitle>Método de Pagamento</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="pix" id="pix" />
        <Label htmlFor="pix">PIX</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="credit_card" id="credit_card" />
        <Label htmlFor="credit_card">Cartão de Crédito</Label>
      </div>
    </RadioGroup>
  </CardContent>
</Card>
```

**Depois:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Mapear planType
const periodMap = {
  trimestral: 'quarterly' as const,
  semestral: 'semiannual' as const,
  anual: 'annual' as const
};

// Linha ~150
<Card>
  <CardHeader>
    <CardTitle>Informações de Pagamento</CardTitle>
  </CardHeader>
  <CardContent>
    <PaymentInstructions
      paymentType="subscription"
      subscriptionPeriod={periodMap[planType]}
      amount={selectedPlan?.price}
    />
  </CardContent>
</Card>
```

---

### Exemplo 3: PaymentPage.tsx

**Antes:**
```typescript
// Linha ~100
<PaymentInitiationFlow
  quoteId={quoteId}
  subscriptionId={subscriptionId}
  amount={amount}
  onSuccess={(paymentId) => navigate(`/pagamentos/${paymentId}`)}
/>
```

**Depois:**
```typescript
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";

// Determinar tipo de pagamento
const getPaymentType = () => {
  if (quoteId) return 'onetime';
  if (subscriptionId) return 'subscription';
  return 'onetime';
};

const getSubscriptionPeriod = () => {
  if (!subscriptionQuery.data) return undefined;
  const plan = subscriptionQuery.data.plans;
  // Mapear do banco para o tipo correto
  if (plan.billing_cycle === 'quarterly') return 'quarterly';
  if (plan.billing_cycle === 'semiannual') return 'semiannual';
  if (plan.billing_cycle === 'annual') return 'annual';
  return 'quarterly';
};

// Linha ~100
<div className="space-y-6">
  <PaymentInstructions
    paymentType={getPaymentType()}
    subscriptionPeriod={getSubscriptionPeriod()}
    amount={amount}
  />

  <PaymentInitiationFlow
    quoteId={quoteId}
    subscriptionId={subscriptionId}
    amount={amount}
    onSuccess={(paymentId) => navigate(`/pagamentos/${paymentId}`)}
  />
</div>
```

---

## 🎯 Prioridade de Integração

### Alta Prioridade (Fazer Primeiro)
1. **PreorderCheckout.tsx** - Checkout principal de quotes
2. **SubscribeCollection.tsx** - Checkout de assinaturas
3. **PaymentPage.tsx** - Página genérica de pagamento

### Média Prioridade
4. **PaymentDetails.tsx** - Detalhes do pagamento (verificar se precisa)

### Baixa Prioridade
5. **BuyCharacter.tsx** - Compra de personagem (verificar se existe)

---

## 🧪 Como Testar Cada Integração

### 1. Testar PreorderCheckout
```
1. Criar um quote
2. Ir para checkout: /orcamento/checkout?quote=xxx
3. Selecionar "Entrada" (voucher) ou "Pagamento Total"
4. Verificar se chave PIX correta aparece
5. Testar botão copiar
6. Testar link de cartão
```

### 2. Testar SubscribeCollection
```
1. Acessar uma coleção
2. Clicar em "Assinar"
3. Selecionar plano (trimestral/semestral/anual)
4. Verificar se chave PIX correta aparece
5. Testar botão copiar
6. Testar link de cartão
```

### 3. Testar PaymentPage
```
1. Acessar /orcamento/pagamento?quote=xxx
2. Verificar se chave PIX aparece
3. Testar botão copiar
4. Testar link de cartão
```

---

## ⚠️ Pontos de Atenção

### 1. Mapeamento de Períodos
Certifique-se de mapear corretamente os períodos do banco para o tipo esperado:
```typescript
// Banco de dados pode ter:
'quarterly', 'semiannual', 'annual'
// Ou em português:
'trimestral', 'semestral', 'anual'

// Componente espera:
'quarterly' | 'semiannual' | 'annual'
```

### 2. Tipo de Pagamento
```typescript
// Voucher = entrada de R$ 100
paymentType="voucher"

// Compra avulsa = quote completo
paymentType="onetime"

// Assinatura = recorrente
paymentType="subscription"
```

### 3. Valores
Sempre passe o valor correto:
- Voucher: R$ 100 (ou valor configurado)
- Quote: Total do orçamento
- Assinatura: Valor do plano selecionado

---

## 📊 Status Atual

| Página | Status | Prioridade | Estimativa |
|--------|--------|------------|------------|
| PreorderCheckout | ❌ Pendente | Alta | 15 min |
| PaymentPage | ❌ Pendente | Alta | 20 min |
| SubscribeCollection | ❌ Pendente | Alta | 15 min |
| PaymentDetails | ❓ Verificar | Média | 10 min |
| BuyCharacter | ❓ Verificar | Baixa | 10 min |

**Tempo Total Estimado:** ~70 minutos

---

## ✅ Conclusão

O sistema de chaves de pagamento está **implementado e funcional**, mas precisa ser **integrado nas páginas de checkout existentes**.

**Próximo passo:** Integrar o componente `<PaymentInstructions />` nas 3 páginas principais de checkout.

---

**Criado por:** Kiro AI  
**Data:** 26/02/2026  
**Versão:** 1.0.0
