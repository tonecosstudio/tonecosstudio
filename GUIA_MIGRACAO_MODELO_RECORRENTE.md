# 🔄 GUIA DE MIGRAÇÃO: Modelo Único → Modelo Recorrente Mensal

**Data:** 24/02/2026  
**Versão:** 2.0  
**Status:** 📋 PLANEJAMENTO

---

## 📊 RESUMO DA MUDANÇA

### Modelo Antigo (v1)

- **1 ciclo por mês**
- Vendas: dia 15 de um mês até dia 15 do próximo (30 dias)
- Produção: 15 dias fixos
- Prazo: ~45 dias para todos

### Modelo Novo (v2)

- **2 ciclos por mês**
- Ciclo 1: dia 01-15 (primeira quinzena)
- Ciclo 2: dia 16-último dia (segunda quinzena)
- Prazos variados: 22-52 dias

---

## 🎯 OBJETIVOS DA MIGRAÇÃO

1. ✅ Implementar novo calculador de lotes
2. ✅ Atualizar banco de dados
3. ✅ Atualizar interface admin
4. ✅ Atualizar componentes frontend
5. ✅ Migrar dados existentes
6. ✅ Testar completamente
7. ✅ Documentar mudanças

---

## 📋 CHECKLIST DE MIGRAÇÃO

### Fase 1: Core (✅ CONCLUÍDO)

- [x] Criar novo `batchCalculator.ts` com lógica de 2 ciclos
- [x] Implementar cálculo de dias úteis
- [x] Implementar detecção automática de ciclo
- [x] Criar funções de formatação
- [x] Criar testes automatizados
- [x] Documentar modelo operacional

### Fase 2: Banco de Dados (🔄 PRÓXIMO)

#### 2.1 Criar Nova Migration

```sql
-- supabase/migrations/20260224000000_add_cycle_system.sql

-- Adicionar campos de ciclo em system_settings
INSERT INTO system_settings (key, value, description) VALUES
-- Ciclo Atual
('current_cycle_type', 'cycle1', 'Tipo do ciclo atual: cycle1 ou cycle2'),
('current_cycle_month', '3', 'Mês do ciclo atual (0-11)'),
('current_cycle_year', '2026', 'Ano do ciclo atual'),

-- Ciclo 1
('cycle1_sales_start', '2026-03-01', 'Início das vendas do Ciclo 1'),
('cycle1_sales_end', '2026-03-15', 'Fim das vendas do Ciclo 1'),
('cycle1_production_start', '2026-03-16', 'Início da produção do Ciclo 1'),
('cycle1_production_end', '2026-03-31', 'Fim da produção do Ciclo 1'),
('cycle1_shipping_deadline', '2026-04-07', 'Prazo de envio do Ciclo 1'),

-- Ciclo 2
('cycle2_sales_start', '2026-03-16', 'Início das vendas do Ciclo 2'),
('cycle2_sales_end', '2026-03-31', 'Fim das vendas do Ciclo 2'),
('cycle2_production_start', '2026-04-01', 'Início da produção do Ciclo 2'),
('cycle2_production_end', '2026-04-30', 'Fim da produção do Ciclo 2'),
('cycle2_shipping_deadline', '2026-05-07', 'Prazo de envio do Ciclo 2'),

-- Configurações
('shipping_business_days', '5', 'Prazo de envio em dias úteis')
ON CONFLICT (key) DO NOTHING;
```

#### 2.2 Migrar Dados Existentes

```sql
-- Backup dos dados antigos
CREATE TABLE system_settings_backup AS
SELECT * FROM system_settings
WHERE key LIKE 'current_batch%' OR key LIKE 'sales_%' OR key LIKE 'production_%';

-- Remover campos antigos (após validação)
-- DELETE FROM system_settings WHERE key IN (
--   'current_batch_name',
--   'current_batch_sales_start',
--   'current_batch_sales_end',
--   'current_batch_production_start',
--   'current_batch_production_end',
--   'current_batch_shipping_month',
--   'current_batch_shipping_deadline',
--   'sales_open_day',
--   'sales_duration_days',
--   'production_days_min',
--   'production_days_max'
-- );
```

#### 2.3 Atualizar Pedidos Existentes

```sql
-- Adicionar campo de ciclo em orders (se necessário)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_type VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_month INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_year INTEGER;

-- Atualizar pedidos existentes para Ciclo 1 de Março
UPDATE orders
SET
  cycle_type = 'cycle1',
  cycle_month = 2, -- Março (0-indexed)
  cycle_year = 2026
WHERE created_at >= '2026-03-01' AND created_at <= '2026-03-15';

UPDATE orders
SET
  cycle_type = 'cycle2',
  cycle_month = 2,
  cycle_year = 2026
WHERE created_at >= '2026-03-16' AND created_at <= '2026-03-31';
```

### Fase 3: Serviços (🔄 PRÓXIMO)

#### 3.1 Atualizar `contentService.ts`

```typescript
// Adicionar novos campos
export interface ContentSettings {
  // ... campos existentes ...

  // Novo modelo de ciclos
  currentCycleType: CycleType;
  currentCycleMonth: number;
  currentCycleYear: number;

  cycle1SalesStart: Date;
  cycle1SalesEnd: Date;
  cycle1ProductionStart: Date;
  cycle1ProductionEnd: Date;
  cycle1ShippingDeadline: Date;

  cycle2SalesStart: Date;
  cycle2SalesEnd: Date;
  cycle2ProductionStart: Date;
  cycle2ProductionEnd: Date;
  cycle2ShippingDeadline: Date;

  shippingBusinessDays: number;
}
```

#### 3.2 Criar Hook Personalizado

```typescript
// src/hooks/useBatchInfo.ts
import { useContentSettings } from "./useContentSettings";
import { calculateCurrentBatch, type CalculatedBatch } from "@/lib/services/batchCalculator";

export function useBatchInfo() {
  const { data: settings, isLoading } = useContentSettings();

  const currentBatch: CalculatedBatch | null = settings
    ? calculateCurrentBatch({ shippingBusinessDays: settings.shippingBusinessDays })
    : null;

  return {
    currentBatch,
    isLoading,
    settings,
  };
}
```

### Fase 4: Interface Admin (🔄 PRÓXIMO)

#### 4.1 Atualizar `AdminContentSettings.tsx`

Adicionar nova aba "Ciclos":

```typescript
<Tabs defaultValue="cycles">
  <TabsList>
    <TabsTrigger value="cycles">Ciclos</TabsTrigger>
    <TabsTrigger value="config">Configurações</TabsTrigger>
    <TabsTrigger value="policies">Políticas</TabsTrigger>
  </TabsList>

  <TabsContent value="cycles">
    <CycleManagement />
  </TabsContent>
</Tabs>
```

#### 4.2 Criar Componente `CycleManagement`

```typescript
// src/components/admin/CycleManagement.tsx
export function CycleManagement() {
  const { currentBatch } = useBatchInfo();

  return (
    <div>
      <CyclePreview batch={currentBatch} />
      <CycleCalendar batches={calculateFutureBatches(rules, 12)} />
      <CycleActions />
    </div>
  );
}
```

### Fase 5: Componentes Frontend (🔄 PRÓXIMO)

#### 5.1 Atualizar `ReleaseTimeline.tsx`

```typescript
export function ReleaseTimeline() {
  const { currentBatch, isLoading } = useBatchInfo();

  if (isLoading) return <Skeleton />;
  if (!currentBatch) return null;

  return (
    <div>
      <h3>{currentBatch.name}</h3>
      <Timeline>
        <Phase
          name="Vendas"
          start={currentBatch.salesStart}
          end={currentBatch.salesEnd}
          duration={currentBatch.salesDuration}
        />
        <Phase
          name="Produção"
          start={currentBatch.productionStart}
          end={currentBatch.productionEnd}
          duration={currentBatch.productionDuration}
        />
        <Phase
          name="Envio"
          deadline={currentBatch.shippingDeadlineDate}
          month={currentBatch.shippingMonth}
        />
      </Timeline>
    </div>
  );
}
```

#### 5.2 Atualizar `BatchInfoBanner.tsx`

```typescript
export function BatchInfoBanner() {
  const { currentBatch } = useBatchInfo();
  const daysLeft = getDaysUntilSalesEnd(currentBatch);

  return (
    <Alert>
      <AlertTitle>
        🔥 {currentBatch.name} Aberto!
      </AlertTitle>
      <AlertDescription>
        <p>Vendas: {formatBatchDate(currentBatch.salesStart)} a {formatBatchDate(currentBatch.salesEnd)}</p>
        <p>Produção: {formatBatchDate(currentBatch.productionStart)} a {formatBatchDate(currentBatch.productionEnd)}</p>
        <p>Envio: Até {formatBatchDateFull(currentBatch.shippingDeadlineDate)}</p>
        <p>⏰ Faltam {daysLeft} dias para o fechamento!</p>
      </AlertDescription>
    </Alert>
  );
}
```

#### 5.3 Criar Contador Regressivo

```typescript
// src/components/content/CycleCountdown.tsx
export function CycleCountdown({ batch }: { batch: CalculatedBatch }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(batch.salesEnd));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(batch.salesEnd));
    }, 1000);

    return () => clearInterval(timer);
  }, [batch.salesEnd]);

  return (
    <div className="countdown">
      <div>{timeLeft.days}d</div>
      <div>{timeLeft.hours}h</div>
      <div>{timeLeft.minutes}m</div>
      <div>{timeLeft.seconds}s</div>
    </div>
  );
}
```

### Fase 6: FAQs e Textos (🔄 PRÓXIMO)

#### 6.1 Atualizar FAQs

```typescript
// Antes
"Seguimos um cronograma mensal fixo: Vendas do dia 15 ao dia 15..."

// Depois
"Operamos com 2 ciclos por mês: Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia).
Cada ciclo tem seu próprio cronograma de produção e envio.
Exemplo: Ciclo 1 de Março (01-15/03) → Produção 16-31/03 → Envio até 07/04."
```

#### 6.2 Atualizar Banco de Dados

```sql
UPDATE system_settings
SET value = 'Operamos com 2 ciclos por mês: Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia). Cada ciclo tem seu próprio cronograma de produção e envio. Exemplo: Ciclo 1 de Março (01-15/03) → Produção 16-31/03 → Envio até 07/04.'
WHERE key = 'faq_first_delivery';
```

### Fase 7: Testes (🔄 PRÓXIMO)

#### 7.1 Testes Unitários

```bash
# Testar calculador
npm run test src/lib/services/batchCalculator.test.ts

# Testar hooks
npm run test src/hooks/useBatchInfo.test.ts
```

#### 7.2 Testes de Integração

```bash
# Testar fluxo completo
npm run test:e2e
```

#### 7.3 Testes Manuais

- [ ] Acessar admin e verificar ciclos
- [ ] Verificar banner em Collections
- [ ] Verificar timeline
- [ ] Verificar FAQs
- [ ] Verificar contador regressivo
- [ ] Testar em diferentes datas

### Fase 8: Deploy (🔄 PRÓXIMO)

#### 8.1 Preparação

```bash
# Build do projeto
npm run build

# Verificar erros
npm run type-check
npm run lint
```

#### 8.2 Migration

```bash
# Aplicar migration no Supabase
supabase db push

# Verificar dados
supabase db diff
```

#### 8.3 Deploy

```bash
# Deploy para produção
npm run deploy
```

---

## 🔄 PLANO DE ROLLBACK

Caso algo dê errado, seguir estes passos:

### 1. Restaurar Banco de Dados

```sql
-- Restaurar backup
INSERT INTO system_settings
SELECT * FROM system_settings_backup
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Remover novos campos
DELETE FROM system_settings WHERE key LIKE 'cycle%';
```

### 2. Reverter Código

```bash
# Voltar para versão anterior
git revert HEAD
git push
```

### 3. Rebuild e Deploy

```bash
npm run build
npm run deploy
```

---

## 📊 CRONOGRAMA DE MIGRAÇÃO

| Fase | Descrição         | Tempo Estimado | Status       |
| ---- | ----------------- | -------------- | ------------ |
| 1    | Core (calculador) | 2h             | ✅ Concluído |
| 2    | Banco de dados    | 1h             | 🔄 Próximo   |
| 3    | Serviços          | 1h             | ⏳ Pendente  |
| 4    | Interface admin   | 2h             | ⏳ Pendente  |
| 5    | Frontend          | 2h             | ⏳ Pendente  |
| 6    | FAQs e textos     | 1h             | ⏳ Pendente  |
| 7    | Testes            | 2h             | ⏳ Pendente  |
| 8    | Deploy            | 1h             | ⏳ Pendente  |

**Total:** ~12 horas

---

## ✅ VALIDAÇÃO PÓS-MIGRAÇÃO

### Checklist de Validação

- [ ] Ciclo atual é detectado corretamente
- [ ] Datas são calculadas corretamente
- [ ] Banner mostra informações corretas
- [ ] Timeline mostra fases corretas
- [ ] FAQs estão atualizados
- [ ] Contador regressivo funciona
- [ ] Admin permite gerenciar ciclos
- [ ] Pedidos são associados ao ciclo correto
- [ ] Emails contêm informações corretas
- [ ] Notificações funcionam

### Testes de Aceitação

1. **Teste de Ciclo 1**
   - Criar pedido no dia 05/03
   - Verificar se é associado ao Ciclo 1
   - Verificar prazo de envio

2. **Teste de Ciclo 2**
   - Criar pedido no dia 20/03
   - Verificar se é associado ao Ciclo 2
   - Verificar prazo de envio

3. **Teste de Virada de Ciclo**
   - Criar pedido no dia 15/03 às 23:59
   - Criar pedido no dia 16/03 às 00:01
   - Verificar se são associados a ciclos diferentes

---

## 📞 COMUNICAÇÃO COM CLIENTES

### Email de Anúncio

```
Assunto: 🎉 Novidade: Agora são 2 ciclos por mês!

Olá!

Temos uma novidade incrível: agora operamos com 2 ciclos por mês!

🔹 Ciclo 1 (Primeira Quinzena): Dia 01-15
🔹 Ciclo 2 (Segunda Quinzena): Dia 16-último dia

O que isso significa para você?
✅ Mais oportunidades de compra
✅ Prazos mais flexíveis
✅ Produção mais organizada

Confira o calendário completo em: [link]

Abraços,
Equipe Ordax
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos

- ✅ `src/lib/services/batchCalculator.ts` (v2)
- ✅ `MODELO_OPERACIONAL_RECORRENTE.md`
- ✅ `GUIA_MIGRACAO_MODELO_RECORRENTE.md`
- ✅ `test-batch-calculator-v2.cjs`
- ⏳ `supabase/migrations/20260224000000_add_cycle_system.sql`
- ⏳ `src/hooks/useBatchInfo.ts`
- ⏳ `src/components/admin/CycleManagement.tsx`
- ⏳ `src/components/content/CycleCountdown.tsx`

### Arquivos Modificados

- ⏳ `src/lib/services/contentService.ts`
- ⏳ `src/pages/admin/AdminContentSettings.tsx`
- ⏳ `src/components/content/BatchInfoBanner.tsx`
- ⏳ `src/components/collections/ReleaseTimeline.tsx`
- ⏳ `src/pages/Collections.tsx`
- ⏳ `src/pages/Plans.tsx`
- ⏳ `src/pages/CollectionDetails.tsx`

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Revisar e aprovar** este guia de migração
2. **Criar migration** do banco de dados
3. **Atualizar serviços** (contentService, hooks)
4. **Atualizar interface admin**
5. **Atualizar componentes frontend**
6. **Executar testes**
7. **Deploy em staging**
8. **Validação final**
9. **Deploy em produção**

---

**Status:** 📋 Planejamento completo  
**Próxima ação:** Criar migration do banco de dados
