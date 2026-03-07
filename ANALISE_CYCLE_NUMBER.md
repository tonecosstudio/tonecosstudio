# Análise: Referências a cycle_number no Código

## Status Atual

A coluna `cycle_number` foi removida do banco de dados, mas ainda é referenciada em:

### Serviços Críticos
1. `src/services/delivery-scheduling-service.ts` - Agendamento de entregas
2. `src/services/standalone-purchase-service.ts` - Compras avulsas

### Testes
- `src/test/ordax-integration-tests.test.ts`
- `src/services/__tests__/capacity-alert-integration.test.ts`
- `src/services/subscription-capacity.test.ts`
- `src/services/delivery-scheduling-service.test.ts`

## Impacto dos Serviços

### delivery-scheduling-service.ts
**Uso**: Determina em qual ciclo (1 ou 2) uma entrega deve ser agendada

**Lógica Atual**:
```typescript
if (entryCycle.cycle_number === 1) {
  // Cycle 1 entry: first delivery in next month
  currentMonth += 1;
} else {
  // Cycle 2 entry: first delivery in second subsequent month
  currentMonth += 2;
}
```

**Problema**: Tenta ler `cycle_number` do banco, mas a coluna não existe mais.

### standalone-purchase-service.ts
**Uso**: Apenas exibe `cycle_number` em queries de listagem

**Queries**:
```typescript
cycles(id, cycle_number, month, year)
```

**Problema**: Query falha porque coluna não existe.

## Opções de Solução

### Opção 1: Remover Conceito de Ciclos Quinzenais (RECOMENDADO)

**Ação**: Atualizar serviços para trabalhar apenas com ciclos mensais

**Vantagens**:
- Alinhado com a nova estrutura do banco
- Sistema mais simples (1 ciclo por mês)
- Sem necessidade de restaurar coluna

**Desvantagens**:
- Requer refatoração dos serviços
- Precisa atualizar lógica de agendamento
- Todos os testes precisam ser atualizados

**Impacto**:
- delivery-scheduling-service.ts: Remover lógica de Ciclo 1 vs Ciclo 2
- standalone-purchase-service.ts: Remover `cycle_number` das queries
- Atualizar ~10 arquivos de teste

### Opção 2: Restaurar Coluna cycle_number

**Ação**: Criar migration para adicionar coluna de volta

**Vantagens**:
- Código continua funcionando sem mudanças
- Sem necessidade de refatoração

**Desvantagens**:
- Contradiz a evolução do sistema (mensal)
- Mantém complexidade desnecessária
- Conflita com migrations recentes (FIX_CYCLES_USE_SSOT.sql)

**Impacto**:
- Criar migration para adicionar coluna
- Popular coluna com valor padrão (sempre 1?)
- Sistema fica inconsistente (coluna existe mas não é usada)

## Recomendação

**Opção 1: Remover Conceito de Ciclos Quinzenais**

### Justificativa
1. Sistema evoluiu para ciclos mensais (SSOT)
2. Página de gerenciamento já foi removida
3. Manter `cycle_number` seria técnico debt
4. Alinhamento com arquitetura atual

### Plano de Ação

#### Fase 1: Atualizar delivery-scheduling-service.ts
- Remover lógica de Ciclo 1 vs Ciclo 2
- Simplificar para: "primeira entrega no próximo mês"
- Remover interface `Cycle` com `cycle_number`

#### Fase 2: Atualizar standalone-purchase-service.ts
- Remover `cycle_number` das queries
- Manter apenas `month` e `year`

#### Fase 3: Atualizar Testes
- Remover `cycle_number` de todos os mocks
- Atualizar lógica de teste para ciclos mensais

#### Fase 4: Verificar Impacto
- Rodar testes
- Verificar se há outras dependências

## Próximos Passos

1. Confirmar decisão com usuário
2. Se Opção 1: Iniciar refatoração dos serviços
3. Se Opção 2: Criar migration para restaurar coluna

## Observações

- A funcionalidade de capacidade ainda funciona (capacity-service.ts)
- O banco de dados está funcionando corretamente (ciclos mensais)
- O problema é apenas compatibilidade de código legado
