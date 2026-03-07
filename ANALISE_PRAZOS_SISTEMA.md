# 📊 ANÁLISE COMPLETA DE PRAZOS DO SISTEMA

**Data da Análise:** 07/03/2026  
**Status:** ⚠️ INCONSISTÊNCIAS ENCONTRADAS

---

## 🎯 RESUMO EXECUTIVO

O sistema possui **múltiplas definições de prazos** em diferentes locais, com **valores inconsistentes** e **duplicações**. Isso pode causar confusão e comportamentos inesperados.

---

## 📋 PRAZOS CADASTRADOS NO SISTEMA

### 1. CONFIGURAÇÕES PRINCIPAIS (`system_settings`)

**Localização:** `supabase/migrations/20260222094000_add_content_settings.sql`

```sql
('production_days_min', '15', 'Prazo mínimo de produção em dias')
('production_days_max', '20', 'Prazo máximo de produção em dias')
('shipping_days', '5', 'Prazo de envio em dias úteis')
('sales_duration_days', '30', 'Duração do período de vendas em dias')
```

**Status:** ✅ Valores padrão corretos

---

### 2. ESTÁGIOS DE PRODUÇÃO (`production_stages`)

**Localização:** `supabase/migrations/20260428000002_create_production_stages.sql`

```sql
awaiting_choice  → 168 horas (7 dias)
design           → 48 horas  (2 dias)
production       → 120 horas (5 dias)
quality_check    → 24 horas  (1 dia)
packaging        → 12 horas  (0.5 dia)
```

**Total:** 372 horas = **15.5 dias**

**Status:** ✅ Alinhado com `production_days_min` (15 dias)

---

### 3. PRAZOS HARDCODED NO CÓDIGO

#### 3.1. Produção e Entrega

**Localização:** `supabase/migrations/20260504000002_create_subscription_business_functions.sql`

```sql
next_delivery_date = NOW() + INTERVAL '30 days'
next_production_start = NOW() + INTERVAL '15 days'
```

**Localização:** `supabase/migrations/20260202130000_add_production_start_date.sql`

```sql
next_production_start = next_delivery_date - INTERVAL '15 days'
```

**Status:** ✅ Consistente (15 dias de produção)

#### 3.2. Lembretes de Escolha de Personagem

**Localização:** `supabase/functions/cron-send-character-choice-reminders/index.ts`

```typescript
First reminder:  5 days before deadline
Second reminder: 2 days before deadline
Final reminder:  1 day before deadline
```

**Status:** ✅ Lógica de lembretes adequada

#### 3.3. Prazo de Pagamento de Saldo

**Localização:** `supabase/migrations/20260513000005_create_standalone_purchase_users.sql`

```sql
balance_due_date = NOW() + INTERVAL '5 days'
```

**Status:** ✅ Prazo de 5 dias para pagamento de saldo

---

## ⚠️ INCONSISTÊNCIAS ENCONTRADAS

### 1. DUPLICAÇÃO: `shipping_days` vs `shipping_business_days`

**Problema:** Duas chaves diferentes para o mesmo conceito

**Localizações:**
- `shipping_days` → `20260222094000_add_content_settings.sql`
- `shipping_business_days` → `20260224120000_add_cycle_system.sql`

**Valores:**
```sql
('shipping_days', '5', 'Prazo de envio em dias úteis')
('shipping_business_days', '5', 'Prazo de envio em dias úteis')
```

**Impacto:** ⚠️ MÉDIO - Pode causar confusão no código

**Recomendação:** Padronizar para `shipping_business_days` e remover `shipping_days`

---

### 2. VALORES DIFERENTES: Produção

**Problema:** Valores diferentes em locais diferentes

**Configuração:**
```sql
production_days_min = 15 dias
production_days_max = 20 dias
```

**Estágios de Produção (soma):**
```
7 + 2 + 5 + 1 + 0.5 = 15.5 dias
```

**Hardcoded:**
```sql
15 dias (várias migrations)
```

**Status:** ⚠️ BAIXO - Valores próximos, mas não exatamente iguais

**Recomendação:** Ajustar estágios para somar exatamente 15 dias ou usar 16 dias

---

### 3. PRAZO DE ENTREGA: 30 dias

**Problema:** Valor hardcoded em múltiplos locais

**Localizações encontradas:**
1. `supabase/migrations/20260504000002_create_subscription_business_functions.sql`
2. `supabase/migrations/20260504000004_cleanup_duplicate_subscriptions.sql`
3. `supabase/functions/create-subscription/index.ts`

**Valor:** `30 days` (hardcoded)

**Status:** ⚠️ MÉDIO - Não usa configuração de `system_settings`

**Recomendação:** Criar constante `delivery_interval_days` em `system_settings`

---

## 📊 TABELA CONSOLIDADA DE PRAZOS

| Prazo | Valor Padrão | Unidade | Configurável | Localização |
|-------|--------------|---------|--------------|-------------|
| **Produção Mínima** | 15 | dias | ✅ Sim | `system_settings.production_days_min` |
| **Produção Máxima** | 20 | dias | ✅ Sim | `system_settings.production_days_max` |
| **Envio** | 5 | dias úteis | ✅ Sim | `system_settings.shipping_days` |
| **Vendas** | 30 | dias | ✅ Sim | `system_settings.sales_duration_days` |
| **Intervalo Entregas** | 30 | dias | ❌ Não | Hardcoded em múltiplos locais |
| **Escolha Personagem** | 7 | dias | ❌ Não | `production_stages.awaiting_choice` |
| **Pagamento Saldo** | 5 | dias | ❌ Não | Hardcoded |
| **Expiração Créditos** | 30 | dias | ❌ Não | Hardcoded |

---

## 🔍 ANÁLISE POR TIPO DE PRAZO

### Prazos de Produção

```
┌─────────────────────────────────────────────────┐
│ FLUXO DE PRODUÇÃO (15-20 dias)                  │
├─────────────────────────────────────────────────┤
│ 1. Aguardando Escolha    → 7 dias               │
│ 2. Design                → 2 dias               │
│ 3. Produção              → 5 dias               │
│ 4. Controle Qualidade    → 1 dia                │
│ 5. Embalagem             → 0.5 dia              │
├─────────────────────────────────────────────────┤
│ TOTAL                    → 15.5 dias            │
└─────────────────────────────────────────────────┘
```

**Observação:** Soma dos estágios (15.5 dias) está entre min (15) e max (20)

### Prazos de Envio

```
┌─────────────────────────────────────────────────┐
│ ENVIO (5 dias úteis)                            │
├─────────────────────────────────────────────────┤
│ • Considera apenas dias úteis                   │
│ • Exclui sábados, domingos e feriados          │
│ • Calculado via função de dias úteis           │
└─────────────────────────────────────────────────┘
```

### Prazos de Ciclo

```
┌─────────────────────────────────────────────────┐
│ CICLO COMPLETO (Compra → Entrega)              │
├─────────────────────────────────────────────────┤
│ Vendas:      30 dias                            │
│ Produção:    15-20 dias                         │
│ Envio:       5 dias úteis (~7 dias corridos)    │
├─────────────────────────────────────────────────┤
│ TOTAL:       50-57 dias                         │
└─────────────────────────────────────────────────┘
```

---

## 🚨 PROBLEMAS CRÍTICOS

### 1. Falta de Centralização

**Problema:** Valores hardcoded em múltiplos arquivos

**Arquivos afetados:**
- 15+ migrations
- 5+ funções Edge
- 10+ arquivos TypeScript

**Risco:** Alteração de prazo requer mudança em múltiplos locais

### 2. Inconsistência de Nomenclatura

**Problema:** Mesma informação com nomes diferentes

**Exemplos:**
- `shipping_days` vs `shipping_business_days`
- `production_days` vs `production_days_min/max`
- `delivery_days` vs `days_to_next_delivery`

### 3. Valores Não Configuráveis

**Problema:** Prazos importantes hardcoded

**Exemplos:**
- Intervalo entre entregas (30 dias)
- Prazo de escolha de personagem (7 dias)
- Prazo de pagamento de saldo (5 dias)

---

## ✅ RECOMENDAÇÕES

### Curto Prazo (Urgente)

1. **Padronizar nomenclatura**
   - Usar apenas `shipping_business_days`
   - Remover `shipping_days` duplicado

2. **Documentar valores atuais**
   - Criar tabela de referência
   - Adicionar comentários no código

3. **Validar consistência**
   - Verificar se todos os locais usam os mesmos valores
   - Criar testes automatizados

### Médio Prazo

1. **Centralizar configurações**
   - Mover todos os prazos para `system_settings`
   - Criar constantes no código

2. **Criar função helper**
   ```typescript
   getDeliveryInterval(): number
   getProductionDays(): { min: number, max: number }
   getShippingDays(): number
   ```

3. **Adicionar validações**
   - Garantir que min < max
   - Validar valores positivos

### Longo Prazo

1. **Interface de configuração**
   - Permitir admin alterar prazos via UI
   - Histórico de alterações

2. **Cálculo dinâmico**
   - Considerar feriados regionais
   - Ajustar por tipo de produto

3. **Monitoramento**
   - Alertas se prazos não forem cumpridos
   - Métricas de performance

---

## 📁 ARQUIVOS COM PRAZOS HARDCODED

### Migrations (15 arquivos)
- `20260222094000_add_content_settings.sql` ✅ Configurável
- `20260224120000_add_cycle_system.sql` ⚠️ Duplicado
- `20260202130000_add_production_start_date.sql` ❌ Hardcoded
- `20260428000002_create_production_stages.sql` ❌ Hardcoded
- `20260504000002_create_subscription_business_functions.sql` ❌ Hardcoded
- `20260504000004_cleanup_duplicate_subscriptions.sql` ❌ Hardcoded
- ... (mais 9 arquivos)

### Edge Functions (3 arquivos)
- `create-subscription/index.ts` ❌ Hardcoded
- `cron-send-character-choice-reminders/index.ts` ❌ Hardcoded
- `cron-expire-character-choices/index.ts` ❌ Hardcoded

### TypeScript (5+ arquivos)
- `src/lib/services/contentService.ts` ✅ Usa configuração
- `src/pages/admin/AdminContentSettings.tsx` ✅ Interface de config
- `src/test/batchCalculator-v2.test.ts` ❌ Hardcoded
- ... (mais arquivos)

---

## 🎯 VALORES RECOMENDADOS (PADRÃO)

```typescript
// Prazos de Produção
PRODUCTION_DAYS_MIN = 15      // dias
PRODUCTION_DAYS_MAX = 20      // dias

// Prazos de Envio
SHIPPING_BUSINESS_DAYS = 5    // dias úteis

// Prazos de Ciclo
SALES_DURATION_DAYS = 30      // dias
DELIVERY_INTERVAL_DAYS = 30   // dias (entre entregas)

// Prazos de Ação
CHARACTER_CHOICE_DAYS = 7     // dias
BALANCE_PAYMENT_DAYS = 5      // dias
CREDIT_EXPIRY_DAYS = 30       // dias

// Lembretes
REMINDER_FIRST_DAYS = 5       // dias antes
REMINDER_SECOND_DAYS = 2      // dias antes
REMINDER_FINAL_DAYS = 1       // dia antes
```

---

## 📊 IMPACTO DAS INCONSISTÊNCIAS

### Baixo Impacto ✅
- Diferença entre 15 e 15.5 dias de produção
- Valores próximos em diferentes locais

### Médio Impacto ⚠️
- Duplicação de `shipping_days` / `shipping_business_days`
- Valores hardcoded em múltiplos locais

### Alto Impacto 🚨
- Nenhum identificado no momento

---

## 🔧 SCRIPT DE CORREÇÃO

```sql
-- 1. Remover duplicata
DELETE FROM system_settings WHERE key = 'shipping_days';

-- 2. Adicionar prazos faltantes
INSERT INTO system_settings (key, value, description) VALUES
('delivery_interval_days', '30', 'Intervalo entre entregas mensais'),
('character_choice_days', '7', 'Prazo para escolha de personagem'),
('balance_payment_days', '5', 'Prazo para pagamento de saldo'),
('credit_expiry_days', '30', 'Dias para expiração de créditos')
ON CONFLICT (key) DO NOTHING;

-- 3. Validar consistência
SELECT 
  key, 
  value::INTEGER as dias,
  description
FROM system_settings
WHERE key LIKE '%days%'
ORDER BY key;
```

---

**Status Final:** ⚠️ SISTEMA FUNCIONAL MAS COM INCONSISTÊNCIAS MENORES  
**Prioridade de Correção:** MÉDIA  
**Última Atualização:** 07/03/2026 - 18:00
