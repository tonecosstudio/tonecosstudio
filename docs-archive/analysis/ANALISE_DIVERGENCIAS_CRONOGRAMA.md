# 🔍 Análise de Divergências no Cronograma de Lançamento

**Data da Análise:** 24/02/2026  
**Status:** ⚠️ DIVERGÊNCIAS CRÍTICAS ENCONTRADAS

---

## 📊 Resumo Executivo

O projeto possui um sistema SSOT (Single Source of Truth) implementado para centralizar informações do cronograma, mas **vários componentes ainda usam dados hardcoded**, criando inconsistências e dificultando manutenção.

### Problemas Identificados

1. ❌ **Datas hardcoded** em múltiplos componentes
2. ❌ **Componente ReleaseTimeline não usa SSOT**
3. ❌ **Textos duplicados em FAQs**
4. ⚠️ **Divergências nos prazos de produção**

---

## 🎯 Análise Detalhada

### 1. Sistema SSOT (Implementado Corretamente)

#### ✅ Arquivos que USAM o sistema dinâmico:

**`src/components/content/BatchInfoBanner.tsx`**

- Busca dados de `system_settings` via `useContentSettings()`
- Usa `processContentVariables()` para substituir variáveis
- Usa `getFullScheduleText()` para formatar cronograma
- **Status:** ✅ CORRETO

**`supabase/migrations/20260222094000_add_content_settings.sql`**

- Define todas as configurações no banco de dados
- Variáveis disponíveis:
  - `current_batch_name`: "Fevereiro/Março"
  - `current_batch_sales_start`: 2026-02-15
  - `current_batch_sales_end`: 2026-03-15
  - `current_batch_production_start`: 2026-03-16
  - `current_batch_production_end`: 2026-03-30
  - `current_batch_shipping_month`: "Abril"
  - `current_batch_shipping_deadline`: 5
  - `sales_duration_days`: 30
  - `production_days_min`: 15
  - `production_days_max`: 20
  - `shipping_days`: 5
- **Status:** ✅ CORRETO

**`src/lib/services/contentService.ts`**

- Serviço centralizado com cache de 5 minutos
- Funções de formatação e processamento
- Fallbacks para valores padrão
- **Status:** ✅ CORRETO

---

### 2. Componentes com Dados HARDCODED

#### ❌ `src/components/collections/ReleaseTimeline.tsx`

**Problema:** Todas as datas e informações estão hardcoded no componente.

```typescript
const timeline = [
  {
    phase: "Vendas",
    period: "15/02 – 15/03", // ❌ HARDCODED
    duration: "30 dias", // ❌ HARDCODED
    // ...
  },
  {
    phase: "Produção",
    period: "16/03 – 30/03", // ❌ HARDCODED
    duration: "15 dias", // ❌ HARDCODED
    // ...
  },
  {
    phase: "Envio",
    period: "Até 5º dia útil", // ❌ HARDCODED
    duration: "5 dias úteis", // ❌ HARDCODED
    // ...
  },
  {
    phase: "Entrega",
    period: "Abril", // ❌ HARDCODED
    duration: "7-15 dias", // ❌ HARDCODED
    // ...
  },
];
```

**Texto hardcoded:**

```typescript
"📅 Padrão fixo: Todas as coleções e personagens são lançados no dia 15
de cada mês. Quando um lote encerra (dia 15), o próximo já começa
automaticamente. Envio em até 5 dias úteis (considera feriados).
Prazo total da compra até recebimento: 50-60 dias."
```

**Impacto:**

- Precisa ser atualizado manualmente todo mês
- Pode ficar desatualizado em relação ao banco de dados
- Duplica informações que já existem no SSOT

---

#### ❌ `src/pages/Collections.tsx` (linha 106-109)

**Problema:** Banner com informações hardcoded, mesmo tendo o `BatchInfoBanner` disponível.

```typescript
<span className="font-semibold text-lg">🔥 Lote Fevereiro/Março Aberto!</span>
<p className="text-sm text-muted-foreground mt-1">
  Vendas: 15/02 a 15/03 • Produção: 16-30/03 • Envio: Até 5º dia útil de Abril
</p>
```

**Solução:** Substituir por `<BatchInfoBanner />` que já existe e funciona corretamente.

---

#### ❌ `src/pages/Plans.tsx` (linha 322-325)

**Problema:** Texto hardcoded no FAQ.

```typescript
"Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15 do mês seguinte
(ou até atingir o limite de produção), produção de 15 dias, e envio em até 5
dias úteis (considera feriados). Exemplo: compra em 15/02-15/03, produção
16-30/03, envio até 5º dia útil de Abril."
```

**Solução:** Usar `content.faqFirstDelivery` do SSOT.

---

#### ❌ `src/pages/Collections.tsx` (linha 495)

**Problema:** FAQ com texto hardcoded (duplicado 3x no mesmo arquivo).

```typescript
a: "Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15 (30 dias),
produção de 15 dias, e envio em até 5 dias úteis (considera feriados).
Exemplo: compra em 15/02-15/03, produção 16-30/03, envio até 5º dia útil de Abril.
Todas as coleções seguem o mesmo padrão."
```

**Solução:** Usar `content.faqFirstDelivery` do SSOT.

---

#### ❌ `src/pages/CollectionDetails.tsx` (linha 807-810)

**Problema:** Texto hardcoded no FAQ.

```typescript
"Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15 do mês seguinte (ou
até atingir o limite de produção), produção de 15 dias, e envio em até 5 dias
úteis (considera feriados). Exemplo: compra em 15/02-15/03, produção 16-30/03,
envio até 5º dia útil de Abril."
```

**Solução:** Usar `content.faqFirstDelivery` do SSOT.

---

### 3. Divergências nos Prazos

#### ⚠️ Prazo de Produção

**Encontradas 2 versões diferentes:**

1. **"15 dias"** (mais comum)
   - `src/pages/Plans.tsx`
   - `src/pages/Collections.tsx`
   - `src/pages/CollectionDetails.tsx`
   - `src/components/collections/ReleaseTimeline.tsx`

2. **"15-20 dias"** ou **"aproximadamente 15 dias"**
   - `src/pages/Terms.tsx` (linha 77): "aproximadamente 15 dias"
   - `src/pages/About.tsx` (linha 299): "15 a 45 dias úteis"
   - `supabase/migrations`: `production_days_min: 15`, `production_days_max: 20`

**Recomendação:** Padronizar para "15-20 dias" conforme definido no SSOT.

---

## 📋 Plano de Correção

### Prioridade 🔴 CRÍTICA

#### 1. Atualizar `ReleaseTimeline.tsx`

**Antes:**

```typescript
const timeline = [
  { phase: "Vendas", period: "15/02 – 15/03", duration: "30 dias", ... },
  // ... hardcoded
];
```

**Depois:**

```typescript
import { useContentSettings } from "@/hooks/useContentSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ReleaseTimeline() {
  const { data: content, isLoading } = useContentSettings();

  if (isLoading) return <Skeleton />;
  if (!content) return null;

  const timeline = [
    {
      phase: "Vendas",
      period: `${format(content.currentBatchSalesStart, "dd/MM")} – ${format(content.currentBatchSalesEnd, "dd/MM")}`,
      duration: `${content.salesDurationDays} dias`,
      // ...
    },
    {
      phase: "Produção",
      period: `${format(content.currentBatchProductionStart, "dd/MM")} – ${format(content.currentBatchProductionEnd, "dd/MM")}`,
      duration: `${content.productionDaysMin}-${content.productionDaysMax} dias`,
      // ...
    },
    {
      phase: "Envio",
      period: `Até ${content.currentBatchShippingDeadline}º dia útil`,
      duration: `${content.shippingDays} dias úteis`,
      // ...
    },
    {
      phase: "Entrega",
      period: content.currentBatchShippingMonth,
      duration: "7-15 dias",
      // ...
    },
  ];

  // ... resto do componente
}
```

---

#### 2. Substituir banner hardcoded em `Collections.tsx`

**Antes (linha 100-117):**

```typescript
<Alert className="border-primary/20 bg-primary/5">
  <Calendar className="h-5 w-5 text-primary" />
  <AlertDescription className="ml-2">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <span className="font-semibold text-lg">🔥 Lote Fevereiro/Março Aberto!</span>
        <p className="text-sm text-muted-foreground mt-1">
          Vendas: 15/02 a 15/03 • Produção: 16-30/03 • Envio: Até 5º dia útil de Abril
        </p>
        // ...
```

**Depois:**

```typescript
import { BatchInfoBanner } from "@/components/content/BatchInfoBanner";

// No JSX:
<BatchInfoBanner showButton={true} buttonText="Ver Planos" buttonLink="/planos" />
```

---

#### 3. Atualizar FAQs para usar SSOT

**Em `src/pages/Plans.tsx`, `Collections.tsx`, `CollectionDetails.tsx`:**

**Antes:**

```typescript
"Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15...";
```

**Depois:**

```typescript
import { useContentSettings } from "@/hooks/useContentSettings";
import { processContentVariables } from "@/lib/services/contentService";

// No componente:
const { data: content } = useContentSettings();

// No FAQ:
a: content ? processContentVariables(content.faqFirstDelivery, content) : "Carregando...";
```

---

#### 4. Padronizar prazo de produção em `Terms.tsx`

**Antes (linha 77):**

```typescript
aproximadamente 15 dias para produção
```

**Depois:**

```typescript
import { useContentSettings } from "@/hooks/useContentSettings";
import { getProductionDeadlineText } from "@/lib/services/contentService";

// No componente:
const { data: content } = useContentSettings();

// No texto:
{content && getProductionDeadlineText(content)} para produção
```

---

## 📊 Resumo de Arquivos a Modificar

| Arquivo                                          | Problema               | Prioridade | Tempo Estimado |
| ------------------------------------------------ | ---------------------- | ---------- | -------------- |
| `src/components/collections/ReleaseTimeline.tsx` | Datas hardcoded        | 🔴 CRÍTICA | 30 min         |
| `src/pages/Collections.tsx`                      | Banner + FAQ hardcoded | 🔴 CRÍTICA | 20 min         |
| `src/pages/Plans.tsx`                            | FAQ hardcoded          | 🔴 CRÍTICA | 10 min         |
| `src/pages/CollectionDetails.tsx`                | FAQ hardcoded          | 🔴 CRÍTICA | 10 min         |
| `src/pages/Terms.tsx`                            | Prazo de produção      | 🟡 MÉDIA   | 10 min         |
| `src/pages/About.tsx`                            | Prazo de produção      | 🟡 MÉDIA   | 10 min         |

**Tempo Total Estimado:** ~1h30min

---

## ✅ Benefícios da Correção

1. **Manutenção Simplificada:** Atualizar datas em um único lugar (banco de dados)
2. **Consistência Garantida:** Todas as páginas mostram as mesmas informações
3. **Redução de Erros:** Elimina risco de esquecer de atualizar algum componente
4. **Escalabilidade:** Facilita adicionar novos lotes/ciclos
5. **Automação Futura:** Possibilita criar sistema automático de atualização de lotes

---

## 🔄 Processo de Atualização Mensal (Após Correção)

### Atual (Problemático)

1. Atualizar `ReleaseTimeline.tsx` ❌
2. Atualizar `Collections.tsx` ❌
3. Atualizar `Plans.tsx` ❌
4. Atualizar `CollectionDetails.tsx` ❌
5. Atualizar documentação ❌
6. **Total: 5+ arquivos para editar**

### Após Correção (Ideal)

1. Executar SQL no Supabase:

```sql
UPDATE system_settings SET value = 'Março/Abril' WHERE key = 'current_batch_name';
UPDATE system_settings SET value = '2026-03-15' WHERE key = 'current_batch_sales_start';
UPDATE system_settings SET value = '2026-04-15' WHERE key = 'current_batch_sales_end';
UPDATE system_settings SET value = '2026-04-16' WHERE key = 'current_batch_production_start';
UPDATE system_settings SET value = '2026-04-30' WHERE key = 'current_batch_production_end';
UPDATE system_settings SET value = 'Maio' WHERE key = 'current_batch_shipping_month';
```

2. **Total: 1 comando SQL, todas as páginas atualizam automaticamente** ✅

---

## 🎯 Conclusão

O projeto já possui a infraestrutura SSOT correta implementada, mas alguns componentes ainda não foram migrados para usá-la. As correções são simples e trarão benefícios significativos para manutenção e consistência do sistema.

**Recomendação:** Implementar todas as correções antes do próximo ciclo de lançamento (15/03/2026) para facilitar a atualização mensal.
