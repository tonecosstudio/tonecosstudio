# Quick Start - Testes de Propriedades Críticas

## Instalação

Se ainda não instalou as dependências:

```bash
npm install
```

## Executar Testes

### Todos os testes de propriedades
```bash
npm test -- --testPathPattern=properties
```

### Teste específico
```bash
npm test -- credit-balance.property.test.ts
```

### Com modo verbose
```bash
npm test -- --verbose --testPathPattern=properties
```

### Com cobertura
```bash
npm run test:coverage
```

## Propriedades Implementadas ✅

### 1. Invariante de Saldo de Créditos
- **Arquivo**: `properties/credit-balance.property.test.ts`
- **Testes**: 3 propriedades
- **Valida**: Requisito 3.4
- **Tempo**: ~5s (3000 casos de teste)

### 2. Débito Imediato em Compras Individuais
- **Arquivo**: `properties/immediate-debit.property.test.ts`
- **Testes**: 3 propriedades
- **Valida**: Requisitos 5.3, 5.7
- **Tempo**: ~6s (3000 casos de teste)

### 3. Validação de Saldo Antes de Compra
- **Arquivo**: `properties/balance-validation.property.test.ts`
- **Testes**: 5 propriedades
- **Valida**: Requisitos 5.1, 5.2
- **Tempo**: ~10s (5000 casos de teste)

### 4. Cálculo Correto de Créditos por Plano
- **Arquivo**: `properties/plan-credits.property.test.ts`
- **Testes**: 6 propriedades
- **Valida**: Requisitos 1.2, 1.3, 1.4, 1.5
- **Tempo**: ~2s (4200 casos de teste)

### 5. Acumulação de Créditos na Renovação
- **Arquivo**: `properties/credit-accumulation.property.test.ts`
- **Testes**: 6 propriedades
- **Valida**: Requisitos 2.4, 2.5
- **Tempo**: ~12s (6000 casos de teste)

### 6. Cálculo de Reembolso Proporcional
- **Arquivo**: `properties/refund-calculation.property.test.ts`
- **Testes**: 7 propriedades
- **Valida**: Requisitos 2.1.1, 2.1.2, 2.1.3
- **Tempo**: ~3s (7000 casos de teste)

## Total de Cobertura

- **30 propriedades testadas**
- **~28,200 casos de teste gerados automaticamente**
- **Tempo total**: ~40s
- **Taxa de sucesso**: 100% ✅

## Próximas Propriedades a Implementar

7. **Débito no Fechamento de Ciclo** (Requisitos 6.6, 6.7, 6.8)
8. **Expiração de Créditos ao Cancelar** (Requisitos 2.2, 2.1.2)
9. **Mudança de Plano Só na Renovação** (Requisitos 8.1, 8.2, 8.3)
10. **Concorrência em Transações de Crédito** (Requisito 13.3, 13.4)

## Interpretando Resultados

### Teste Passou ✅
```
PASS  tests/properties/credit-balance.property.test.ts
  Property: Invariante de Saldo de Créditos
    ✓ available_credits deve sempre ser igual a total_credits - used_credits (354 ms)
```

### Teste Falhou ❌
```
FAIL  tests/properties/credit-balance.property.test.ts
  Property: Invariante de Saldo de Créditos
    ✕ available_credits deve sempre ser igual a total_credits - used_credits

Property failed after 234 tests
{ totalCredits: 1000, usedCredits: 1500 }
Shrunk 5 time(s)
Got error: Expected 1000 to be greater than or equal to 1500
```

O **counterexample** mostra exatamente qual input quebrou a propriedade.

## Dicas

### Reproduzir uma falha
Se um teste falhar, fast-check mostra o seed:
```
Seed: 1234567890
```

Para reproduzir:
```typescript
fc.assert(
  fc.property(...),
  { seed: 1234567890 }
);
```

### Aumentar número de testes
```typescript
fc.assert(
  fc.property(...),
  { numRuns: 10000 } // padrão é 1000
);
```

### Debug de propriedades
```typescript
fc.assert(
  fc.property(
    fc.integer(),
    (value) => {
      console.log('Testing with:', value);
      // ...
    }
  )
);
```

## Recursos

- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Jest Documentation](https://jestjs.io/)

## Suporte

Para dúvidas sobre os testes, consulte:
1. `tests/README.md` - Documentação completa
2. Comentários nos arquivos de teste
3. Design document: `.kiro/specs/subscription-credit-system/design.md`
