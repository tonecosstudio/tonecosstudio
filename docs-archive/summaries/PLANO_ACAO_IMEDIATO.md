# 🚀 PLANO DE AÇÃO IMEDIATO - Modelo v2.0

**Data:** 24/02/2026  
**Prioridade:** 🔴 ALTA  
**Tempo estimado:** 7 horas

---

## ✅ FASE 1: CORE (CONCLUÍDO)

**Status:** ✅ 100% Completo  
**Tempo gasto:** 2 horas

### Entregas

- [x] `src/lib/services/batchCalculator.ts` (v2) - Calculador de ciclos
- [x] `MODELO_OPERACIONAL_RECORRENTE.md` - Documentação do modelo
- [x] `GUIA_MIGRACAO_MODELO_RECORRENTE.md` - Guia de migração
- [x] `test-batch-calculator-v2.cjs` - Testes automatizados
- [x] `supabase/migrations/20260224000000_add_cycle_system.sql` - Migration
- [x] `INDICE_SSOT.md` (atualizado) - Índice v2.0
- [x] `RESUMO_EXECUTIVO_MODELO_V2.md` - Resumo executivo

---

## 🔄 FASE 2: BANCO DE DADOS (PRÓXIMO)

**Status:** 📋 Pronto para executar  
**Tempo estimado:** 30 minutos  
**Prioridade:** 🔴 CRÍTICA

### Passo a Passo

#### 1. Backup Atual (5 min)

```bash
# Fazer backup do banco antes de qualquer alteração
supabase db dump > backup_pre_v2_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. Executar Migration (10 min)

```bash
# Aplicar migration
supabase db push

# Verificar se foi aplicada
supabase db diff
```

#### 3. Validar Dados (10 min)

```sql
-- Verificar se todos os campos foram criados
SELECT key, value FROM system_settings
WHERE key LIKE 'cycle%' OR key = 'shipping_business_days'
ORDER BY key;

-- Verificar função
SELECT * FROM get_current_cycle();

-- Verificar view
SELECT * FROM current_cycle_info;

-- Verificar pedidos migrados
SELECT cycle_type, cycle_month, cycle_year, COUNT(*)
FROM orders
WHERE cycle_type IS NOT NULL
GROUP BY cycle_type, cycle_month, cycle_year;
```

#### 4. Testar Rollback (5 min)

```bash
# Testar se o rollback funciona (não executar em produção)
# supabase db reset
# supabase db push backup_pre_v2_*.sql
```

### Checklist

- [ ] Backup criado
- [ ] Migration executada sem erros
- [ ] Todos os campos criados
- [ ] Função `get_current_cycle()` funciona
- [ ] View `current_cycle_info` retorna dados
- [ ] Pedidos existentes migrados
- [ ] Rollback testado (em ambiente de dev)

---

## 🔄 FASE 3: SERVIÇOS (PRÓXIMO)

**Status:** ⏳ Aguardando Fase 2  
**Tempo estimado:** 1 hora  
**Prioridade:** 🔴 ALTA

### 3.1 Atualizar `contentService.ts` (30 min)

```typescript
// Adicionar novos campos na interface
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

// Atualizar função fetchContentSettings
async function fetchContentSettings(): Promise<ContentSettings> {
  // ... código existente ...

  // Adicionar novos campos
  settings.currentCycleType = get("current_cycle_type", "cycle1") as CycleType;
  settings.currentCycleMonth = getNum("current_cycle_month", 2);
  settings.currentCycleYear = getNum("current_cycle_year", 2026);

  settings.cycle1SalesStart = getDate("cycle1_sales_start", new Date());
  settings.cycle1SalesEnd = getDate("cycle1_sales_end", new Date());
  // ... etc

  settings.shippingBusinessDays = getNum("shipping_business_days", 5);

  return settings;
}
```

### 3.2 Criar Hook `useBatchInfo.ts` (30 min)

```typescript
// src/hooks/useBatchInfo.ts
import { useContentSettings } from "./useContentSettings";
import {
  calculateCurrentBatch,
  type CalculatedBatch,
  type BatchRules,
} from "@/lib/services/batchCalculator";

export function useBatchInfo() {
  const { data: settings, isLoading, error } = useContentSettings();

  const rules: BatchRules = {
    shippingBusinessDays: settings?.shippingBusinessDays ?? 5,
  };

  const currentBatch: CalculatedBatch | null = settings ? calculateCurrentBatch(rules) : null;

  return {
    currentBatch,
    rules,
    settings,
    isLoading,
    error,
  };
}
```

### Checklist

- [ ] `contentService.ts` atualizado
- [ ] `useBatchInfo.ts` criado
- [ ] Testes unitários passam
- [ ] TypeScript compila sem erros

---

## 🔄 FASE 4: INTERFACE ADMIN (PRÓXIMO)

**Status:** ⏳ Aguardando Fase 3  
**Tempo estimado:** 2 horas  
**Prioridade:** 🟡 MÉDIA

### 4.1 Atualizar `AdminContentSettings.tsx` (1h)

```typescript
// Adicionar nova aba "Ciclos"
<Tabs defaultValue="cycles">
  <TabsList>
    <TabsTrigger value="cycles">Ciclos</TabsTrigger>
    <TabsTrigger value="batch">Lote Atual (Legado)</TabsTrigger>
    <TabsTrigger value="deadlines">Prazos</TabsTrigger>
    <TabsTrigger value="policies">Políticas</TabsTrigger>
  </TabsList>

  <TabsContent value="cycles">
    <CycleManagement />
  </TabsContent>
</Tabs>
```

### 4.2 Criar `CycleManagement.tsx` (1h)

```typescript
// src/components/admin/CycleManagement.tsx
export function CycleManagement() {
  const { currentBatch, rules } = useBatchInfo();
  const futureBatches = calculateFutureBatches(rules, 6);

  return (
    <div className="space-y-6">
      {/* Preview do ciclo atual */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclo Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <CyclePreview batch={currentBatch} />
        </CardContent>
      </Card>

      {/* Calendário dos próximos ciclos */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Ciclos</CardTitle>
        </CardHeader>
        <CardContent>
          <CycleCalendar batches={futureBatches} />
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAdvanceCycle}>
            Avançar para Próximo Ciclo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Checklist

- [ ] Aba "Ciclos" adicionada
- [ ] `CycleManagement.tsx` criado
- [ ] Preview do ciclo atual funciona
- [ ] Calendário de próximos ciclos funciona
- [ ] Botão "Avançar Ciclo" funciona
- [ ] Interface responsiva

---

## 🔄 FASE 5: FRONTEND (PRÓXIMO)

**Status:** ⏳ Aguardando Fase 4  
**Tempo estimado:** 2 horas  
**Prioridade:** 🟡 MÉDIA

### 5.1 Atualizar `ReleaseTimeline.tsx` (30 min)

```typescript
export function ReleaseTimeline() {
  const { currentBatch, isLoading } = useBatchInfo();

  if (isLoading) return <Skeleton />;
  if (!currentBatch) return null;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">{currentBatch.name}</h3>
      <div className="space-y-4">
        <TimelinePhase
          name="Vendas"
          start={currentBatch.salesStart}
          end={currentBatch.salesEnd}
          duration={currentBatch.salesDuration}
          icon={<ShoppingCart />}
        />
        <TimelinePhase
          name="Produção"
          start={currentBatch.productionStart}
          end={currentBatch.productionEnd}
          duration={currentBatch.productionDuration}
          icon={<Factory />}
        />
        <TimelinePhase
          name="Envio"
          deadline={currentBatch.shippingDeadlineDate}
          month={currentBatch.shippingMonth}
          icon={<Truck />}
        />
      </div>
    </div>
  );
}
```

### 5.2 Atualizar `BatchInfoBanner.tsx` (30 min)

```typescript
export function BatchInfoBanner() {
  const { currentBatch } = useBatchInfo();
  const daysLeft = getDaysUntilSalesEnd(currentBatch);

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Calendar className="h-5 w-5 text-primary" />
      <AlertTitle className="text-lg font-semibold">
        🔥 {currentBatch.name} Aberto!
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2 mt-2">
          <p>
            <strong>Vendas:</strong> {formatBatchDate(currentBatch.salesStart)} a {formatBatchDate(currentBatch.salesEnd)}
          </p>
          <p>
            <strong>Produção:</strong> {formatBatchDate(currentBatch.productionStart)} a {formatBatchDate(currentBatch.productionEnd)}
          </p>
          <p>
            <strong>Envio:</strong> Até {formatBatchDateFull(currentBatch.shippingDeadlineDate)}
          </p>
          <p className="text-orange-600 font-semibold">
            ⏰ Faltam {daysLeft} dias para o fechamento!
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

### 5.3 Atualizar FAQs (30 min)

```typescript
// Em Collections.tsx, Plans.tsx, CollectionDetails.tsx
const { currentBatch } = useBatchInfo();

const faqItems = [
  {
    q: "Quando recebo a primeira peça?",
    a: `Operamos com 2 ciclos por mês: Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia). 
        Você está no ${currentBatch.name}. 
        Vendas: ${formatBatchDate(currentBatch.salesStart)} a ${formatBatchDate(currentBatch.salesEnd)}. 
        Produção: ${formatBatchDate(currentBatch.productionStart)} a ${formatBatchDate(currentBatch.productionEnd)}. 
        Envio: Até ${formatBatchDateFull(currentBatch.shippingDeadlineDate)}.`,
  },
  // ... outros FAQs
];
```

### 5.4 Criar Contador Regressivo (30 min)

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
    <div className="flex gap-4 justify-center">
      <TimeUnit value={timeLeft.days} label="Dias" />
      <TimeUnit value={timeLeft.hours} label="Horas" />
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <TimeUnit value={timeLeft.seconds} label="Seg" />
    </div>
  );
}
```

### Checklist

- [ ] `ReleaseTimeline.tsx` atualizado
- [ ] `BatchInfoBanner.tsx` atualizado
- [ ] FAQs atualizados em todas as páginas
- [ ] `CycleCountdown.tsx` criado
- [ ] Todos os componentes responsivos
- [ ] Skeleton loading implementado

---

## 🔄 FASE 6: TESTES E DEPLOY (FINAL)

**Status:** ⏳ Aguardando Fase 5  
**Tempo estimado:** 1.5 horas  
**Prioridade:** 🔴 CRÍTICA

### 6.1 Testes Automatizados (30 min)

```bash
# Compilar TypeScript
npm run type-check

# Executar testes unitários
npm run test

# Executar testes do calculador
node test-batch-calculator-v2.cjs

# Executar linter
npm run lint
```

### 6.2 Testes Manuais (30 min)

- [ ] Acessar `/admin/configuracoes-conteudo`
- [ ] Verificar aba "Ciclos"
- [ ] Verificar preview do ciclo atual
- [ ] Verificar calendário de próximos ciclos
- [ ] Acessar `/colecoes`
- [ ] Verificar banner com informações do ciclo
- [ ] Verificar timeline
- [ ] Verificar FAQs
- [ ] Verificar contador regressivo
- [ ] Testar em mobile

### 6.3 Build e Deploy (30 min)

```bash
# Build do projeto
npm run build

# Verificar se build passou
echo $?

# Deploy para staging
npm run deploy:staging

# Validar em staging
curl https://staging.ordax.com/api/health

# Deploy para produção (após validação)
npm run deploy:production
```

### Checklist Final

- [ ] Todos os testes passam
- [ ] TypeScript compila sem erros
- [ ] Linter sem warnings
- [ ] Build bem-sucedido
- [ ] Deploy em staging OK
- [ ] Validação manual em staging OK
- [ ] Deploy em produção OK
- [ ] Monitoramento ativo
- [ ] Rollback testado e pronto

---

## 📊 RESUMO DO PROGRESSO

### Concluído ✅

- [x] Fase 1: Core (2h)
  - Calculador de ciclos
  - Testes automatizados
  - Migration
  - Documentação

### Em Andamento 🔄

- [ ] Fase 2: Banco de Dados (30min)
- [ ] Fase 3: Serviços (1h)
- [ ] Fase 4: Interface Admin (2h)
- [ ] Fase 5: Frontend (2h)
- [ ] Fase 6: Testes e Deploy (1.5h)

**Total:** 2h concluído / 7h restantes = **22% completo**

---

## 🎯 PRÓXIMA AÇÃO IMEDIATA

### O QUE FAZER AGORA:

1. **Revisar este plano** (10 min)
2. **Aprovar implementação** (5 min)
3. **Executar Fase 2** (30 min)
   - Fazer backup
   - Executar migration
   - Validar dados

### Comando para começar:

```bash
# 1. Fazer backup
supabase db dump > backup_pre_v2_$(date +%Y%m%d_%H%M%S).sql

# 2. Executar migration
supabase db push

# 3. Validar
supabase db diff
```

---

## 📞 CONTATOS DE EMERGÊNCIA

**Se algo der errado:**

1. **Rollback imediato:**

   ```bash
   git revert HEAD
   supabase db reset
   npm run deploy
   ```

2. **Restaurar backup:**

   ```bash
   supabase db reset
   supabase db push backup_pre_v2_*.sql
   ```

3. **Comunicar:**
   - Email: dev@ordax.com
   - Slack: #emergencias
   - Telefone: (XX) XXXX-XXXX

---

## ✅ CRITÉRIOS DE SUCESSO

### Técnicos

- [ ] Zero erros de compilação
- [ ] 100% dos testes passam
- [ ] Performance < 100ms
- [ ] Zero downtime

### Funcionais

- [ ] Ciclo atual detectado corretamente
- [ ] Datas calculadas corretamente
- [ ] Interface admin funcional
- [ ] Componentes frontend atualizados

### Negócio

- [ ] Sistema em produção
- [ ] Usuários conseguem usar
- [ ] Zero reclamações críticas
- [ ] Métricas positivas

---

**Status:** 🚀 Pronto para executar  
**Próxima ação:** Executar Fase 2 (Banco de Dados)  
**Tempo estimado restante:** 7 horas
