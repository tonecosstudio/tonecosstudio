# Remoção da Página de Gerenciamento de Capacidade

## Contexto

A página `CapacityManagement` estava quebrada devido a mudanças na estrutura do banco de dados. O sistema evoluiu de ciclos quinzenais (Ciclo 1 e Ciclo 2) para ciclos mensais, tornando a página obsoleta.

## Problema Identificado

```
Error: column cycles.cycle_number does not exist
```

A coluna `cycle_number` foi removida do banco de dados nas migrations:
- `FIX_CYCLES_USE_SSOT.sql` - Removeu ciclos quinzenais
- `FIX_CYCLES_PRAZOS_OFICIAIS.sql` - Confirmou remoção

## Mudança no Sistema

### Antes (Sistema Quinzenal)
- Ciclo 1: Dias 1-15 do mês
- Ciclo 2: Dias 16-fim do mês
- Coluna `cycle_number` (1 ou 2)
- Constraint: `UNIQUE(cycle_number, month, year)`

### Depois (Sistema Mensal)
- Um ciclo por mês completo
- Sem coluna `cycle_number`
- Constraint: `UNIQUE(month, year)`
- Datas calculadas automaticamente via SSOT (system_settings)

## Arquivos Removidos

### Página Principal
- `src/pages/admin/CapacityManagement.tsx` (~700 linhas)

### Componentes Relacionados
- `src/components/admin/CapacityAlertConfig.tsx`
- `src/components/admin/CapacityAllocationBreakdown.tsx`
- `src/components/admin/CapacityForecast.tsx`
- `src/components/admin/CapacityReservation.tsx`
- `src/components/admin/CapacityUsageCard.tsx`
- `src/components/admin/CapacityUsageWidget.tsx`

### Testes
- `src/pages/admin/__tests__/CapacityManagement.test.tsx`
- `src/pages/admin/__tests__/capacity-management-reservation.test.tsx`
- `src/components/admin/__tests__/CapacityAlertConfig.test.tsx`
- `src/components/admin/__tests__/CapacityAllocationBreakdown.test.tsx`
- `src/components/admin/__tests__/CapacityForecast.test.tsx`
- `src/components/admin/__tests__/CapacityReservation.test.tsx`
- `src/components/admin/CapacityUsageCard.test.tsx`
- `src/components/admin/CapacityUsageWidget.test.tsx`

### Configuração
- Removido item "Gerenciar Capacidade" da navegação admin
- Removida rota `/admin/capacidade` do App.tsx

## Total Removido

- 1 página principal
- 6 componentes
- 8 arquivos de teste
- ~2.500 linhas de código legado

## Impacto

### Positivo
- Sistema mais limpo e sem código quebrado
- Navegação admin sem links quebrados
- Redução de complexidade

### Sem Impacto Negativo
- Página estava inacessível (erro 400)
- Componentes não eram usados em outros lugares
- Funcionalidade de capacidade ainda existe via:
  - `capacity-service.ts` (lógica de negócio)
  - Tabela `cycles` no banco (estrutura mensal)
  - System settings (SSOT para prazos)

## Próximos Passos (Opcional)

Se houver necessidade de gerenciar capacidade no futuro, criar nova página baseada no sistema mensal:
- Usar `month` e `year` ao invés de `cycle_number`
- Integrar com `system_settings` (SSOT)
- Focar em capacidade mensal, não quinzenal

## Referências

- Migration: `FIX_CYCLES_USE_SSOT.sql`
- Service: `src/services/capacity-service.ts`
- Tabela: `cycles` (estrutura mensal)
