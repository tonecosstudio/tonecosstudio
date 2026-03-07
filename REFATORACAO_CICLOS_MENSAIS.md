# Refatoração: Ciclos Quinzenais → Ciclos Mensais

## Resumo

Sistema migrado de ciclos quinzenais (Ciclo 1 e Ciclo 2) para ciclos mensais, alinhando código com a arquitetura do banco de dados (SSOT).

## Mudanças Realizadas

### 1. delivery-scheduling-service.ts

#### Antes (Ciclos Quinzenais)
```typescript
interface Cycle {
  id: string;
  cycle_number: 1 | 2;  // ❌ Removido
  month: number;
  year: number;
}

// Lógica complexa baseada em Ciclo 1 vs Ciclo 2
if (entryCycle.cycle_number === 1) {
  // Primeira entrega no próximo mês
  currentMonth += 1;
} else {
  // Primeira entrega em 2 meses
  currentMonth += 2;
}
```

#### Depois (Ciclos Mensais)
```typescript
interface EntryCycle {
  id: string;
  month: number;  // ✅ Simplificado
  year: number;
}

// Lógica simples: sempre próximo mês
let currentMonth = entryCycle.month + 1;
let currentYear = entryCycle.year;
```

#### Mudanças Específicas
- ❌ Removida interface `Cycle` com `cycle_number`
- ✅ Simplificada interface `EntryCycle` (sem `cycle_number`)
- ❌ Removida lógica condicional de Ciclo 1 vs Ciclo 2
- ✅ Primeira entrega sempre no próximo mês
- ❌ Removido `cycleNumber` de `ScheduledDelivery`
- ✅ `getOrCreateCycle` agora usa RPC `populate_cycles` (SSOT)

### 2. standalone-purchase-service.ts

#### Antes
```typescript
cycles(id, cycle_number, month, year)  // ❌ cycle_number
```

#### Depois
```typescript
cycles(id, month, year)  // ✅ Sem cycle_number
```

#### Mudanças Específicas
- ❌ Removido `cycle_number` de 2 queries SELECT
- ✅ Queries agora usam apenas `month` e `year`

### 3. Testes Atualizados

#### ordax-integration-tests.test.ts
```typescript
// Antes
async function createTestCycle(month, year, cycleNumber: 1 | 2)
await createTestCycle(3, 2026, 1)  // ❌ 3 parâmetros

// Depois
async function createTestCycle(month, year)
await createTestCycle(3, 2026)  // ✅ 2 parâmetros
```

- ✅ Função `createTestCycle` usa RPC `populate_cycles`
- ✅ Atualizadas 4 chamadas em beforeEach
- ✅ Ciclos de teste agora em meses diferentes (3/2026 e 4/2026)

#### capacity-alert-integration.test.ts
- ✅ beforeEach usa RPC `populate_cycles`
- ❌ Removido insert manual com `cycle_number`

## Impacto

### Código Removido
- ~50 linhas de lógica complexa
- 3 interfaces com `cycle_number`
- Lógica condicional de Ciclo 1 vs Ciclo 2

### Código Simplificado
- Agendamento de entregas: 1 regra ao invés de 2
- Criação de ciclos: usa SSOT automaticamente
- Testes: menos parâmetros, mais claros

### Alinhamento
- ✅ Código alinhado com banco de dados
- ✅ Usa SSOT (system_settings) para prazos
- ✅ Sem dívida técnica

## Benefícios

### 1. Simplicidade
- Menos código para manter
- Lógica mais clara e direta
- Menos casos de teste

### 2. Consistência
- Código e banco alinhados
- Uma única fonte de verdade (SSOT)
- Sem contradições

### 3. Manutenibilidade
- Mudanças em prazos: apenas system_settings
- Ciclos calculados automaticamente
- Menos bugs potenciais

## Compatibilidade

### Breaking Changes
- ⚠️ `ScheduledDelivery.cycleNumber` removido
- ⚠️ `getOrCreateCycle` agora recebe 2 parâmetros (antes 3)
- ⚠️ Queries de `cycles` não retornam mais `cycle_number`

### Migração
- ✅ Serviços atualizados
- ✅ Testes atualizados
- ⚠️ Testes property-based pendentes (próximo passo)

## Próximos Passos

### Fase 1: Testes Property-Based ⏳
- [ ] Atualizar `subscription-capacity.test.ts`
- [ ] Atualizar `delivery-scheduling-service.test.ts`
- [ ] Remover referências a `cycle_number` dos mocks

### Fase 2: Validação ⏳
- [ ] Rodar suite completa de testes
- [ ] Verificar queries no banco
- [ ] Testar fluxo de assinatura end-to-end

### Fase 3: Documentação ⏳
- [ ] Atualizar README com nova arquitetura
- [ ] Documentar regras de agendamento
- [ ] Atualizar diagramas (se existirem)

## Arquivos Modificados

### Serviços (2 arquivos)
- `src/services/delivery-scheduling-service.ts` (-34 linhas)
- `src/services/standalone-purchase-service.ts` (-2 linhas)

### Testes (2 arquivos)
- `src/test/ordax-integration-tests.test.ts` (+10, -10 linhas)
- `src/services/__tests__/capacity-alert-integration.test.ts` (+8, -16 linhas)

### Total
- 4 arquivos modificados
- ~50 linhas removidas
- ~20 linhas adicionadas
- Saldo: -30 linhas (mais simples!)

## Referências

- Migration: `FIX_CYCLES_USE_SSOT.sql`
- RPC: `populate_cycles(p_start_month, p_start_year, p_num_months)`
- SSOT: `system_settings` (production_days, shipping_business_days)
