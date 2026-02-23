# 🎯 Análise Completa SSOT - Projeto Ordax

## 📊 SITUAÇÃO ATUAL

### Valores Hardcoded Encontrados

#### 1. **PreorderCheckout.tsx**
```typescript
const pixDiscount = 0.05; // ❌ HARDCODED
const depositAmount = quote?.deposit_amount || settings?.default_deposit_fixed || 100; // ❌ FALLBACK HARDCODED
```

#### 2. **Collections.tsx**
```typescript
const avulsoPrice = 500; // ❌ HARDCODED
const avulsoEntrada = 100; // ❌ HARDCODED
const avulsoRestante = 400; // ❌ HARDCODED
```

#### 3. **BuyCharacter.tsx**
```typescript
const priceFull = pricing?.price_full || 500; // ❌ FALLBACK HARDCODED
const pricePix = pricing?.price_pix || 475; // ❌ FALLBACK HARDCODED
const depositAmount = pricing?.deposit_amount || 100; // ❌ FALLBACK HARDCODED
```

#### 4. **PaymentCalculator.tsx**
```typescript
const TAXA_PIX = 0.01; // ✅ OK (taxa fixa do MP)
const TAXA_VENDA_PARCELADO = 0.0498; // ✅ OK (taxa fixa do MP)
const DESCONTO_PIX = 0.05; // ❌ HARDCODED (deveria vir do banco)
```

#### 5. **AdminPricing.tsx**
```typescript
const [priceFull, setPriceFull] = useState(collection.price_full || 500); // ❌ FALLBACK HARDCODED
const [depositAmount, setDepositAmount] = useState(collection.deposit_amount || 100); // ❌ FALLBACK HARDCODED
const effectivePriceFull = isCustom ? priceFull : globalSettings?.default_price_full || 500; // ❌ FALLBACK HARDCODED
```

## 🎯 SOLUÇÃO IMPLEMENTADA

### 1. Serviço Centralizado: `pricingService.ts`

Criado serviço que:
- ✅ Busca TODAS as configurações de `system_settings`
- ✅ Implementa cache de 5 minutos
- ✅ Fornece funções de cálculo padronizadas
- ✅ Exporta taxas fixas do Mercado Pago
- ✅ Calcula valores líquidos após taxas

### 2. Configurações Disponíveis (SSOT)

```typescript
interface PricingSettings {
  // Preços
  defaultPriceFull: number;        // R$ 500,00
  defaultPricePix: number;         // R$ 475,00
  defaultDepositAmount: number;    // R$ 100,00
  
  // Descontos
  pixDiscountPercentage: number;   // 5%
  
  // Limites
  monthlyProductionLimit: number;  // 20 peças
  salesOpenDay: number;            // Dia 15
  
  // Dados em Tempo Real
  currentMonthLimit: number;       // Limite do mês
  currentMonthSold: number;        // Vendas do mês
  currentMonthAvailable: number;   // Vagas restantes
  currentMonthPercentage: number;  // % vendido
}
```

### 3. Taxas do Mercado Pago (Fixas)

```typescript
const TAX_RATES = {
  taxPix: 0.01,                    // 1%
  taxSaleInstallment: 0.0498,      // 4,98%
  taxInstallment6x: 0.0996,        // 9,96%
  taxInstallment10xStore: 0.1493,  // 14,93%
  taxInstallment10xClient: 0.2065, // 20,65%
};
```

## 📝 ARQUIVOS QUE PRECISAM SER ATUALIZADOS

### Prioridade ALTA (Páginas Públicas)

1. ✅ **src/pages/PreorderCheckout.tsx**
   - Substituir `pixDiscount = 0.05` por `fetchPricingSettings()`
   - Remover fallbacks hardcoded

2. ✅ **src/pages/Collections.tsx**
   - Substituir `avulsoPrice = 500` por `settings.defaultPriceFull`
   - Substituir `avulsoEntrada = 100` por `settings.defaultDepositAmount`
   - Calcular `avulsoRestante` dinamicamente

3. ✅ **src/pages/BuyCharacter.tsx**
   - Remover fallbacks hardcoded (500, 475, 100)
   - Usar `fetchPricingSettings()` como fallback

4. ✅ **src/pages/SubscribeCollection.tsx** (se existir)
   - Verificar e atualizar valores hardcoded

### Prioridade MÉDIA (Admin)

5. ✅ **src/pages/admin/PaymentCalculator.tsx**
   - Substituir `DESCONTO_PIX = 0.05` por `settings.pixDiscountPercentage`
   - Manter taxas do MP (são fixas)

6. ✅ **src/pages/admin/AdminPricing.tsx**
   - Remover fallbacks hardcoded
   - Usar `fetchPricingSettings()` para valores padrão

7. ✅ **src/pages/admin/AdminPlans.tsx** (se existir)
   - Verificar cálculos de desconto

### Prioridade BAIXA (Componentes)

8. ✅ **src/components/pricing/** (se existir)
   - Verificar componentes de exibição de preços

9. ✅ **src/components/checkout/** (se existir)
   - Verificar componentes de checkout

10. ✅ **src/components/collections/** (se existir)
    - Verificar componentes de coleções

## 🔧 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Criar Hook React ✅

```typescript
// src/hooks/usePricingSettings.ts
import { useQuery } from "@tanstack/react-query";
import { fetchPricingSettings } from "@/lib/services/pricingService";

export function usePricingSettings() {
  return useQuery({
    queryKey: ["pricing-settings"],
    queryFn: fetchPricingSettings,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}
```

### Fase 2: Atualizar Páginas Públicas

#### PreorderCheckout.tsx
```typescript
// ANTES
const pixDiscount = 0.05;

// DEPOIS
const { data: pricingSettings } = usePricingSettings();
const pixDiscount = pricingSettings?.pixDiscountPercentage / 100 || 0.05;
```

#### Collections.tsx
```typescript
// ANTES
const avulsoPrice = 500;
const avulsoEntrada = 100;

// DEPOIS
const { data: pricingSettings } = usePricingSettings();
const avulsoPrice = pricingSettings?.defaultPriceFull || 500;
const avulsoEntrada = pricingSettings?.defaultDepositAmount || 100;
```

#### BuyCharacter.tsx
```typescript
// ANTES
const priceFull = pricing?.price_full || 500;

// DEPOIS
const { data: pricingSettings } = usePricingSettings();
const priceFull = pricing?.price_full || pricingSettings?.defaultPriceFull || 500;
```

### Fase 3: Atualizar Admin

#### PaymentCalculator.tsx
```typescript
// ANTES
const DESCONTO_PIX = 0.05;

// DEPOIS
const { data: pricingSettings } = usePricingSettings();
const DESCONTO_PIX = pricingSettings?.pixDiscountPercentage / 100 || 0.05;
```

### Fase 4: Atualizar Templates (JÁ FEITO ✅)

Templates já usam SSOT via `templateService.ts`

## 🎉 BENEFÍCIOS DA IMPLEMENTAÇÃO

### 1. Consistência Total
- ✅ Todos os lugares mostram os mesmos valores
- ✅ Alterar no banco → atualiza em todo o site
- ✅ Zero discrepâncias entre páginas

### 2. Manutenção Zero
- ✅ Mudar desconto PIX: 1 UPDATE no banco
- ✅ Mudar preços: 1 UPDATE no banco
- ✅ Sem deploy necessário

### 3. Performance
- ✅ Cache de 5 minutos
- ✅ Reduz queries ao banco
- ✅ Resposta instantânea

### 4. Escalabilidade
- ✅ Fácil adicionar novas configurações
- ✅ Suporte a múltiplas moedas (futuro)
- ✅ A/B testing de preços (futuro)

## 📊 EXEMPLO PRÁTICO

### Cenário: Alterar Desconto PIX de 5% para 7%

**ANTES (sem SSOT)**:
```typescript
// Precisa alterar em 5+ arquivos
PreorderCheckout.tsx: const pixDiscount = 0.05; → 0.07
Collections.tsx: calcular manualmente novo preço PIX
BuyCharacter.tsx: atualizar fallback
PaymentCalculator.tsx: const DESCONTO_PIX = 0.05; → 0.07
Templates: atualizar mensagens hardcoded
```

**DEPOIS (com SSOT)**:
```sql
-- 1 linha no banco
UPDATE system_settings 
SET value = '7' 
WHERE key = 'pix_discount_percentage';

-- Resultado: TODO o site atualiza automaticamente! ✅
```

## 🧪 TESTES NECESSÁRIOS

### 1. Teste de Integração
- [ ] Alterar desconto PIX no banco
- [ ] Verificar PreorderCheckout mostra novo valor
- [ ] Verificar Collections mostra novo preço PIX
- [ ] Verificar BuyCharacter calcula corretamente
- [ ] Verificar Templates mostram novo desconto

### 2. Teste de Performance
- [ ] Verificar cache funciona (5 minutos)
- [ ] Verificar não há queries excessivas
- [ ] Verificar tempo de carregamento

### 3. Teste de Fallback
- [ ] Desconectar banco temporariamente
- [ ] Verificar fallbacks funcionam
- [ ] Verificar mensagens de erro apropriadas

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── lib/
│   └── services/
│       ├── pricingService.ts ✅ (CRIADO)
│       └── templateService.ts ✅ (JÁ USA SSOT)
├── hooks/
│   └── usePricingSettings.ts ⏳ (CRIAR)
└── pages/
    ├── PreorderCheckout.tsx ⏳ (ATUALIZAR)
    ├── Collections.tsx ⏳ (ATUALIZAR)
    ├── BuyCharacter.tsx ⏳ (ATUALIZAR)
    └── admin/
        ├── PaymentCalculator.tsx ⏳ (ATUALIZAR)
        └── AdminPricing.tsx ⏳ (ATUALIZAR)
```

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar `pricingService.ts` (FEITO)
2. ⏳ Criar `usePricingSettings.ts` hook
3. ⏳ Atualizar PreorderCheckout.tsx
4. ⏳ Atualizar Collections.tsx
5. ⏳ Atualizar BuyCharacter.tsx
6. ⏳ Atualizar PaymentCalculator.tsx
7. ⏳ Atualizar AdminPricing.tsx
8. ⏳ Testar tudo
9. ⏳ Documentar para o time

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Serviços
- [x] Criar `pricingService.ts`
- [ ] Criar `usePricingSettings.ts` hook
- [ ] Adicionar testes unitários

### Páginas Públicas
- [ ] PreorderCheckout.tsx
- [ ] Collections.tsx
- [ ] BuyCharacter.tsx
- [ ] SubscribeCollection.tsx (se existir)

### Admin
- [ ] PaymentCalculator.tsx
- [ ] AdminPricing.tsx
- [ ] AdminPlans.tsx (se existir)

### Componentes
- [ ] Verificar todos os componentes de pricing
- [ ] Verificar todos os componentes de checkout
- [ ] Verificar todos os componentes de collections

### Testes
- [ ] Testes de integração
- [ ] Testes de performance
- [ ] Testes de fallback

### Documentação
- [ ] Documentar uso do pricingService
- [ ] Documentar como adicionar novas configurações
- [ ] Criar guia para o time

---

**Status**: 🟡 EM PROGRESSO
**Prioridade**: 🔴 ALTA
**Impacto**: 🟢 ALTO (Consistência total do sistema)
