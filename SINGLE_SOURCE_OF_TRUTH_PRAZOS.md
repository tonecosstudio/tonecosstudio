## 🎯 SINGLE SOURCE OF TRUTH - PRAZOS DO SISTEMA

**Data:** 07/03/2026  
**Status:** ✅ IMPLEMENTADO

---

## 📋 PROBLEMA ANTERIOR

Antes, os prazos estavam espalhados em múltiplos locais:
- ❌ Valores hardcoded em 15+ migrations
- ❌ Valores hardcoded em 5+ edge functions
- ❌ Valores hardcoded em 10+ arquivos TypeScript
- ❌ Duplicatas e inconsistências
- ❌ Difícil de manter e atualizar

---

## ✅ SOLUÇÃO: SINGLE SOURCE OF TRUTH

Agora temos UMA ÚNICA fonte de verdade para todos os prazos:

```
┌─────────────────────────────────────────────────┐
│         FONTE ÚNICA DA VERDADE                  │
│                                                 │
│         system_settings (Banco)                 │
│                                                 │
│  • production_days_min: 30                      │
│  • production_days_max: 30                      │
│  • shipping_business_days: 15                   │
│  • sales_duration_days: 30                      │
│  • delivery_interval_days: 90                   │
│  • character_choice_days: 7                     │
│  • balance_payment_days: 5                      │
│                                                 │
└─────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │  BACKEND    │      │  FRONTEND   │
    │  (SQL)      │      │  (React)    │
    └─────────────┘      └─────────────┘
```

---

## 🏗️ ARQUITETURA

### 1. Banco de Dados (SQL)

#### View Consolidada
```sql
-- Acesso fácil a todos os prazos
SELECT * FROM v_system_deadlines;
```

#### Função Helper
```sql
-- Buscar prazo específico
SELECT get_deadline('production_days_min');
```

#### Função de Cálculo
```sql
-- Calcular datas automaticamente
SELECT * FROM calculate_delivery_dates('2026-03-01');
```

### 2. Frontend (TypeScript/React)

#### Serviço Centralizado
```typescript
import { getSystemDeadlines } from '@/lib/services/deadlineService';

// Buscar prazos
const deadlines = await getSystemDeadlines();
console.log(deadlines.productionDaysMin); // 30
```

#### Hook React
```typescript
import { useSystemDeadlines } from '@/lib/services/deadlineService';

function MyComponent() {
  const { deadlines, isLoading } = useSystemDeadlines();
  
  if (isLoading) return <Loading />;
  
  return <div>Produção: {deadlines.productionDaysMin} dias</div>;
}
```

#### Calcular Datas
```typescript
import { calculateDeliveryDates } from '@/lib/services/deadlineService';

const dates = await calculateDeliveryDates(new Date('2026-03-01'));
console.log(dates.salesStart);      // 2026-03-01
console.log(dates.productionStart); // 2026-04-01
console.log(dates.shippingStart);   // 2026-05-15
```

---

## 📁 ARQUIVOS CRIADOS

### Backend (SQL)
- ✅ `UPDATE_HARDCODED_DEADLINES.sql` - Cria view e funções helper
- ✅ `FIX_PRAZOS_OFICIAIS_SIMPLES.sql` - Define valores oficiais

### Frontend (TypeScript)
- ✅ `src/lib/services/deadlineService.ts` - Serviço centralizado

### Documentação
- ✅ `SINGLE_SOURCE_OF_TRUTH_PRAZOS.md` - Este documento
- ✅ `PRAZOS_APLICADOS_SUCESSO.md` - Validação da aplicação

---

## 🔧 COMO USAR

### No SQL (Migrations, Functions, Triggers)

```sql
-- ❌ ANTES (hardcoded)
next_delivery_date = NOW() + INTERVAL '30 days'

-- ✅ AGORA (dinâmico)
next_delivery_date = NOW() + (get_deadline('delivery_interval_days') || ' days')::INTERVAL
```

```sql
-- ❌ ANTES (hardcoded)
WHERE created_at > NOW() - INTERVAL '30 days'

-- ✅ AGORA (dinâmico)
WHERE created_at > NOW() - (get_deadline('sales_duration_days') || ' days')::INTERVAL
```

### No TypeScript/React

```typescript
// ❌ ANTES (hardcoded)
const PRODUCTION_DAYS = 30;
const SHIPPING_DAYS = 5;

// ✅ AGORA (dinâmico)
import { getSystemDeadlines } from '@/lib/services/deadlineService';

const deadlines = await getSystemDeadlines();
const productionDays = deadlines.productionDaysMin;
const shippingDays = deadlines.shippingBusinessDays;
```

```typescript
// ❌ ANTES (hardcoded)
<p>Produção: ~30 dias • Envio: até 5° dia útil</p>

// ✅ AGORA (dinâmico)
import { getDeliveryFlowDescription } from '@/lib/services/deadlineService';

const description = await getDeliveryFlowDescription();
<p>{description}</p>
```

---

## 📊 LOCAIS ATUALIZADOS

### Frontend (React/TypeScript)
- ✅ `src/pages/Collections.tsx` - Descrição de prazos
- ✅ `src/pages/CollectionDetails.tsx` - FAQ atualizado
- ✅ `src/pages/admin/AdminProductionLimit.tsx` - Descrição de vendas
- ✅ `src/lib/services/deadlineService.ts` - Serviço criado

### Backend (SQL)
- ✅ View `v_system_deadlines` criada
- ✅ Função `get_deadline()` criada
- ✅ Função `calculate_delivery_dates()` criada
- ✅ Função `create_subscription_deliveries()` atualizada
- ✅ Função `cleanup_old_notifications()` atualizada

---

## 🎯 BENEFÍCIOS

### 1. Manutenibilidade ✅
- Alterar prazo em UM único local
- Mudança reflete em TODO o sistema
- Sem risco de inconsistências

### 2. Flexibilidade ✅
- Admin pode alterar prazos via interface
- Sem necessidade de deploy
- Mudanças imediatas

### 3. Consistência ✅
- Todos usam os mesmos valores
- Sem duplicatas
- Sem conflitos

### 4. Rastreabilidade ✅
- Histórico de mudanças no banco
- Fácil auditoria
- Logs de alterações

---

## 🔄 COMO ATUALIZAR UM PRAZO

### Via SQL
```sql
-- Atualizar prazo de produção
UPDATE system_settings 
SET value = '35' 
WHERE key = 'production_days_min';

-- Invalidar cache (se necessário)
-- O cache expira automaticamente em 5 minutos
```

### Via Interface Admin (Futuro)
```
1. Acessar: Admin > Configurações > Prazos
2. Editar valor desejado
3. Salvar
4. Sistema atualiza automaticamente
```

---

## 📝 CHECKLIST DE MIGRAÇÃO

### Ao Adicionar Novo Código

- [ ] ❌ NÃO usar valores hardcoded (30, 15, 90, etc)
- [ ] ✅ Usar `get_deadline()` no SQL
- [ ] ✅ Usar `getSystemDeadlines()` no TypeScript
- [ ] ✅ Usar `useSystemDeadlines()` em componentes React
- [ ] ✅ Documentar qual prazo está sendo usado

### Ao Encontrar Código Legado

- [ ] Identificar valor hardcoded
- [ ] Substituir por chamada ao serviço
- [ ] Testar funcionamento
- [ ] Remover comentários de valores antigos

---

## 🧪 TESTES

### Testar Busca de Prazos
```sql
-- SQL
SELECT * FROM v_system_deadlines;
SELECT get_deadline('production_days_min');
```

```typescript
// TypeScript
import { getSystemDeadlines } from '@/lib/services/deadlineService';

const deadlines = await getSystemDeadlines();
console.log('Prazos:', deadlines);
```

### Testar Cálculo de Datas
```sql
-- SQL
SELECT * FROM calculate_delivery_dates('2026-03-01');
```

```typescript
// TypeScript
import { calculateDeliveryDates } from '@/lib/services/deadlineService';

const dates = await calculateDeliveryDates(new Date('2026-03-01'));
console.log('Datas:', dates);
```

### Testar Cache
```typescript
// Primeira chamada: busca do banco
const d1 = await getSystemDeadlines();
console.log('Fetch 1:', d1.fetchedAt);

// Segunda chamada: retorna do cache
const d2 = await getSystemDeadlines();
console.log('Fetch 2:', d2.fetchedAt); // Mesma data

// Após 5 minutos: busca novamente do banco
```

---

## 🚨 REGRAS IMPORTANTES

### ✅ SEMPRE FAZER
1. Buscar prazos de `system_settings`
2. Usar funções helper (`get_deadline()`, `getSystemDeadlines()`)
3. Documentar qual prazo está sendo usado
4. Testar após mudanças

### ❌ NUNCA FAZER
1. Hardcodar valores de prazos (30, 15, 90, etc)
2. Duplicar lógica de cálculo de datas
3. Criar constantes locais para prazos
4. Ignorar erros ao buscar prazos

---

## 📚 REFERÊNCIAS

### Documentação
- `PRAZOS_APLICADOS_SUCESSO.md` - Validação da aplicação
- `FLUXO_OFICIAL_PRAZOS.md` - Fluxo oficial de 3 meses
- `ANALISE_PRAZOS_SISTEMA.md` - Análise anterior

### Código
- `src/lib/services/deadlineService.ts` - Serviço frontend
- `UPDATE_HARDCODED_DEADLINES.sql` - Funções backend
- `FIX_PRAZOS_OFICIAIS_SIMPLES.sql` - Valores oficiais

---

## 🎉 CONCLUSÃO

Agora temos um sistema robusto e manutenível para gerenciar prazos:

- ✅ **Uma única fonte de verdade:** `system_settings`
- ✅ **Fácil de usar:** Funções helper em SQL e TypeScript
- ✅ **Fácil de manter:** Alterar em um lugar, reflete em todo o sistema
- ✅ **Fácil de testar:** Views e funções bem definidas
- ✅ **Documentado:** Guias completos de uso

**Próximo passo:** Aplicar `UPDATE_HARDCODED_DEADLINES.sql` no banco!

---

**Última Atualização:** 07/03/2026 - 20:30  
**Status:** ✅ IMPLEMENTADO E DOCUMENTADO
