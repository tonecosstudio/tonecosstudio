# Configuração de Testes - Sistema de Assinaturas com Créditos

## ✅ Configuração Completa

O framework de testes foi configurado com sucesso para o projeto. Este documento resume a configuração e como utilizá-la.

## Tecnologias Instaladas

### Jest (v29.7.0)
Framework de testes principal para JavaScript/TypeScript.

**Configuração**: `jest.config.js`
- Preset: `ts-jest` para suporte a TypeScript
- Ambiente: Node.js
- Suporte a ESM (ES Modules)
- Cobertura de código configurada

### fast-check (v3.15.0)
Framework de Property-Based Testing para validar propriedades críticas.

**Uso**: Gera automaticamente milhares de casos de teste para validar invariantes matemáticas.

### ts-jest (v29.1.1)
Transformador TypeScript para Jest.

## Estrutura de Testes

```
subscription-api/
├── tests/
│   ├── properties/              # Property-Based Tests (PBT)
│   │   ├── credit-balance.property.test.ts
│   │   ├── immediate-debit.property.test.ts
│   │   ├── balance-validation.property.test.ts
│   │   ├── plan-credits.property.test.ts
│   │   ├── credit-accumulation.property.test.ts
│   │   └── refund-calculation.property.test.ts
│   ├── unit/                    # Testes unitários (futuro)
│   ├── integration/             # Testes de integração (futuro)
│   ├── README.md                # Documentação completa
│   └── QUICK_START.md           # Guia rápido
├── jest.config.js               # Configuração do Jest
└── package.json                 # Scripts de teste
```

## Scripts Disponíveis

### Executar todos os testes
```bash
npm test
```

### Executar apenas testes de propriedades
```bash
npm run test:properties
```

### Executar apenas testes unitários
```bash
npm run test:unit
```

### Executar apenas testes de integração
```bash
npm run test:integration
```

### Modo watch (desenvolvimento)
```bash
npm run test:watch
```

### Cobertura de código
```bash
npm run test:coverage
```

## Propriedades Críticas Implementadas (6/10)

### ✅ 1. Invariante de Saldo de Créditos
**Valida**: Requisito 3.4  
**Propriedade**: `available_credits = total_credits - used_credits`  
**Casos de teste**: 3000

### ✅ 2. Débito Imediato em Compras Individuais
**Valida**: Requisitos 5.3, 5.7  
**Propriedade**: Compras individuais debitam créditos imediatamente  
**Casos de teste**: 3000

### ✅ 3. Validação de Saldo Antes de Compra
**Valida**: Requisitos 5.1, 5.2  
**Propriedade**: Sistema valida saldo antes de permitir compra  
**Casos de teste**: 5000

### ✅ 4. Cálculo Correto de Créditos por Plano
**Valida**: Requisitos 1.2, 1.3, 1.4, 1.5  
**Propriedade**: Trimestral = 600, Semestral = 1400  
**Casos de teste**: 4200

### ✅ 5. Acumulação de Créditos na Renovação
**Valida**: Requisitos 2.4, 2.5  
**Propriedade**: Renovação soma créditos (não reseta)  
**Casos de teste**: 6000

### ✅ 6. Cálculo de Reembolso Proporcional
**Valida**: Requisitos 2.1.1, 2.1.2, 2.1.3  
**Propriedade**: `reembolso = (preço * dias_restantes) / dias_totais`  
**Casos de teste**: 7000

## Propriedades Pendentes (4/10)

### ⏳ 7. Débito no Fechamento de Ciclo
**Valida**: Requisitos 6.6, 6.7, 6.8  
**Será implementado**: Task 6.4

### ⏳ 8. Expiração de Créditos ao Cancelar
**Valida**: Requisitos 2.2, 2.1.2  
**Será implementado**: Task 6.4

### ⏳ 9. Mudança de Plano Só na Renovação
**Valida**: Requisitos 8.1, 8.2, 8.3  
**Será implementado**: Task 4.8

### ⏳ 10. Concorrência em Transações de Crédito
**Valida**: Requisito 13.3, 13.4  
**Será implementado**: Testes de integração

## Estatísticas

- **Total de propriedades testadas**: 30
- **Total de casos de teste gerados**: ~28,200
- **Tempo de execução**: ~40s
- **Taxa de sucesso**: 100% ✅

## Exemplo de Uso

### Teste de Propriedade Simples

```typescript
import * as fc from 'fast-check';

describe('Property: Exemplo', () => {
  it('propriedade deve ser sempre verdadeira', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // gerador de valores
        (value) => {
          // Sua propriedade aqui
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1000);
        }
      ),
      { numRuns: 1000 } // número de casos de teste
    );
  });
});
```

## Configuração do Jest

O arquivo `jest.config.js` está configurado com:

- **Preset**: `ts-jest` para TypeScript
- **Ambiente**: Node.js
- **Padrões de teste**: `**/*.test.ts`, `**/*.spec.ts`
- **Cobertura**: Coleta de `src/**/*.ts` (exceto testes e index)
- **Relatórios**: text, lcov, html
- **ESM**: Suporte completo a ES Modules

## Próximos Passos

1. ✅ Configurar Jest e fast-check
2. ✅ Criar 6 propriedades críticas iniciais
3. ⏳ Implementar 4 propriedades restantes (durante tasks 4.8 e 6.4)
4. ⏳ Adicionar testes unitários para serviços
5. ⏳ Adicionar testes de integração para APIs
6. ⏳ Configurar CI/CD para executar testes automaticamente

## Recursos

- **Documentação completa**: `tests/README.md`
- **Guia rápido**: `tests/QUICK_START.md`
- **fast-check**: https://github.com/dubzzz/fast-check
- **Jest**: https://jestjs.io/

## Notas Importantes

### Property-Based Testing
- Testes são **não-determinísticos** (usam aleatoriedade)
- Se um teste falha, o **seed** é mostrado para reprodução
- Propriedades devem ser **sempre verdadeiras**, não "geralmente"
- PBT **complementa** testes unitários, não os substitui

### Foco do MVP
Este setup foca nas **~10 propriedades críticas** que protegem dinheiro/créditos:
- Invariantes de saldo
- Débitos imediatos e no fechamento
- Validações de saldo
- Cálculos de créditos e reembolsos
- Acumulação e expiração

### Performance
- Testes de propriedade são mais lentos que unitários (~40s total)
- Cada propriedade testa 1000 casos por padrão
- Use `test:watch` durante desenvolvimento para feedback rápido

## Suporte

Para dúvidas ou problemas:
1. Consulte `tests/README.md` para documentação detalhada
2. Veja exemplos nos arquivos `*.property.test.ts`
3. Consulte o design document em `.kiro/specs/subscription-credit-system/design.md`
