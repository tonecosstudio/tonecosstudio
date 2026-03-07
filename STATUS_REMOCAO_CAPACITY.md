# Status: Remoção do Sistema de Capacidade Quinzenal

## ✅ Concluído

### Página Admin Removida
- ❌ `CapacityManagement.tsx` (700 linhas) - DELETADO
- ❌ Rota `/admin/capacidade` - REMOVIDA
- ❌ Item da navegação admin - REMOVIDO

### Componentes Removidos (6 arquivos)
- ❌ `CapacityAlertConfig.tsx`
- ❌ `CapacityAllocationBreakdown.tsx`
- ❌ `CapacityForecast.tsx`
- ❌ `CapacityReservation.tsx`
- ❌ `CapacityUsageCard.tsx`
- ❌ `CapacityUsageWidget.tsx`

### Testes Removidos (8 arquivos)
- ❌ Testes de componentes (4 arquivos)
- ❌ Testes de página (2 arquivos)
- ❌ Testes unitários (2 arquivos)

**Total Removido**: 14 arquivos, ~2.500 linhas de código

## ⚠️ Pendente: Serviços com cycle_number

### Serviços Críticos Afetados

#### 1. delivery-scheduling-service.ts
**Status**: ⚠️ QUEBRADO
**Erro**: Tenta ler `cycle_number` do banco (coluna não existe)
**Uso**: Agendamento automático de entregas de assinaturas

**Lógica Atual**:
```typescript
if (entryCycle.cycle_number === 1) {
  // Primeira entrega no próximo mês
} else {
  // Primeira entrega em 2 meses
}
```

#### 2. standalone-purchase-service.ts
**Status**: ⚠️ QUEBRADO
**Erro**: Query inclui `cycle_number` (coluna não existe)
**Uso**: Listagem de compras avulsas

**Query Atual**:
```typescript
cycles(id, cycle_number, month, year)
```

### Testes Afetados
- `ordax-integration-tests.test.ts`
- `capacity-alert-integration.test.ts`
- `subscription-capacity.test.ts`
- `delivery-scheduling-service.test.ts`

## 🎯 Decisão Necessária

### Opção A: Remover Conceito de Ciclos Quinzenais (RECOMENDADO)

**Ação**: Refatorar serviços para trabalhar com ciclos mensais

**Prós**:
- ✅ Alinhado com nova arquitetura (SSOT)
- ✅ Sistema mais simples
- ✅ Sem dívida técnica

**Contras**:
- ⚠️ Requer refatoração de 2 serviços
- ⚠️ Atualizar ~10 arquivos de teste

**Impacto**: 2-3 horas de trabalho

### Opção B: Restaurar Coluna cycle_number

**Ação**: Criar migration para adicionar coluna de volta

**Prós**:
- ✅ Código funciona sem mudanças
- ✅ Rápido (30 minutos)

**Contras**:
- ❌ Contradiz evolução do sistema
- ❌ Mantém complexidade desnecessária
- ❌ Dívida técnica

## 📊 Comparação

| Aspecto | Opção A (Refatorar) | Opção B (Restaurar) |
|---------|---------------------|---------------------|
| Tempo | 2-3 horas | 30 minutos |
| Alinhamento | ✅ Perfeito | ❌ Conflita |
| Manutenção | ✅ Simples | ⚠️ Complexo |
| Dívida Técnica | ✅ Zero | ❌ Alta |
| Risco | ⚠️ Médio | ✅ Baixo |

## 💡 Recomendação

**Opção A: Remover Conceito de Ciclos Quinzenais**

### Justificativa
1. Sistema já evoluiu para ciclos mensais (FIX_CYCLES_USE_SSOT.sql)
2. Página de gerenciamento já foi removida
3. Manter `cycle_number` seria retrocesso
4. Investimento de 2-3 horas elimina dívida técnica permanentemente

### Plano de Execução

#### Fase 1: delivery-scheduling-service.ts (1 hora)
- Remover lógica de Ciclo 1 vs Ciclo 2
- Simplificar: "primeira entrega sempre no próximo mês"
- Atualizar interfaces

#### Fase 2: standalone-purchase-service.ts (30 min)
- Remover `cycle_number` das queries
- Manter apenas `month, year`

#### Fase 3: Testes (1 hora)
- Atualizar mocks
- Remover referências a `cycle_number`
- Validar funcionamento

#### Fase 4: Validação (30 min)
- Rodar suite completa de testes
- Verificar queries no banco
- Testar fluxo de assinatura

## 📝 Próximos Passos

1. **Aguardar decisão do usuário**
2. Se Opção A: Iniciar refatoração
3. Se Opção B: Criar migration

## 🔍 Observações Importantes

- ✅ Funcionalidade de capacidade ainda funciona (capacity-service.ts)
- ✅ Banco de dados está correto (ciclos mensais)
- ⚠️ Problema é apenas compatibilidade de código legado
- ⚠️ Serviços não estão sendo usados ativamente (sistema em desenvolvimento)
