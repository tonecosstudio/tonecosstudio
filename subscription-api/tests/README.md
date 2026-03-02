# Testes do Sistema de Assinaturas com Créditos

Este diretório contém os testes do sistema, com foco em **Property-Based Testing (PBT)** para validar propriedades críticas que protegem dinheiro e créditos.

## Estrutura de Testes

```
tests/
├── properties/          # Testes de propriedades críticas (PBT)
│   ├── credit-balance.property.test.ts
│   ├── immediate-debit.property.test.ts
│   ├── balance-validation.property.test.ts
│   ├── plan-credits.property.test.ts
│   ├── credit-accumulation.property.test.ts
│   └── refund-calculation.property.test.ts
├── unit/               # Testes unitários (a serem criados)
└── integration/        # Testes de integração (a serem criados)
```

## Property-Based Testing (PBT)

### O que é PBT?

Property-Based Testing é uma técnica de teste onde você define **propriedades** (invariantes) que devem ser verdadeiras para **todos** os inputs possíveis, e o framework gera automaticamente centenas ou milhares de casos de teste aleatórios para validar essas propriedades.

### Por que usar PBT?

1. **Cobertura Ampla**: Testa casos que você nunca pensaria manualmente
2. **Proteção Financeira**: Essencial para sistemas que lidam com dinheiro/créditos
3. **Invariantes Claras**: Documenta regras de negócio como propriedades matemáticas
4. **Detecção de Edge Cases**: Encontra bugs em casos extremos

### Framework: fast-check

Usamos [fast-check](https://github.com/dubzzz/fast-check) para PBT em TypeScript.

## Propriedades Críticas (~10)

### 1. Invariante de Saldo de Créditos
**Arquivo**: `properties/credit-balance.property.test.ts`  
**Valida**: Requisito 3.4  
**Propriedade**: `available_credits = total_credits - used_credits`

Esta é a propriedade mais fundamental do sistema. Garante que o saldo disponível sempre seja consistente com o total e o usado.

### 2. Débito Imediato em Compras Individuais
**Arquivo**: `properties/immediate-debit.property.test.ts`  
**Valida**: Requisitos 5.3, 5.7  
**Propriedade**: Compras individuais debitam créditos imediatamente e atomicamente

Garante que não há delay ou inconsistência no débito de créditos em compras individuais.

### 3. Validação de Saldo Antes de Compra
**Arquivo**: `properties/balance-validation.property.test.ts`  
**Valida**: Requisitos 5.1, 5.2  
**Propriedade**: Sistema sempre valida saldo antes de permitir compra

Previne débitos negativos e garante que compras com saldo insuficiente sejam rejeitadas.

### 4. Cálculo Correto de Créditos por Plano
**Arquivo**: `properties/plan-credits.property.test.ts`  
**Valida**: Requisitos 1.2, 1.3, 1.4, 1.5  
**Propriedade**: 
- Trimestral = 600 créditos
- Semestral = 1200 + 200 bônus = 1400 créditos

Garante que a alocação de créditos por plano está sempre correta.

### 5. Acumulação de Créditos na Renovação
**Arquivo**: `properties/credit-accumulation.property.test.ts`  
**Valida**: Requisitos 2.4, 2.5  
**Propriedade**: Renovação soma créditos ao saldo existente (não reseta)

Previne perda de créditos não utilizados na renovação.

### 6. Cálculo de Reembolso Proporcional Baseado em Tempo
**Arquivo**: `properties/refund-calculation.property.test.ts`  
**Valida**: Requisitos 2.1.1, 2.1.2, 2.1.3  
**Propriedade**: `reembolso = (preço * dias_restantes) / dias_totais`  
**Importante**: Reembolso NÃO considera créditos usados, apenas tempo

Garante que o cálculo de reembolso é justo e baseado exclusivamente no tempo restante.

### Propriedades Adicionais (a serem implementadas)

7. **Débito no Fechamento de Ciclo** (Requisitos 6.6, 6.7, 6.8)
8. **Expiração de Créditos ao Cancelar** (Requisitos 2.2, 2.1.2)
9. **Mudança de Plano Só na Renovação** (Requisitos 8.1, 8.2, 8.3)
10. **Concorrência em Transações de Crédito** (Requisito 13.3, 13.4)

## Executando os Testes

### Todos os testes
```bash
npm test
```

### Apenas testes de propriedades
```bash
npm test -- properties
```

### Teste específico
```bash
npm test -- credit-balance.property.test.ts
```

### Com cobertura
```bash
npm run test:coverage
```

### Modo watch (desenvolvimento)
```bash
npm run test:watch
```

## Configuração do fast-check

Os testes de propriedade usam as seguintes configurações:

- **numRuns**: 1000 (padrão) - número de casos de teste gerados
- **seed**: aleatório - pode ser fixado para reproduzir falhas
- **verbose**: true - mostra detalhes de falhas

### Exemplo de Falha

Quando um teste de propriedade falha, fast-check mostra o **counterexample** (contra-exemplo) que quebrou a propriedade:

```
Property failed after 234 tests
{ totalCredits: 1000, usedCredits: 1500 }
Shrunk 5 time(s)
Got error: Expected 1000 to be greater than or equal to 1500
```

Isso ajuda a identificar exatamente qual input causou o problema.

## Boas Práticas

### 1. Propriedades devem ser simples e claras
```typescript
// BOM: propriedade clara
expect(availableCredits).toBe(totalCredits - usedCredits);

// RUIM: lógica complexa no teste
if (condition1 && condition2) {
  // muita lógica...
}
```

### 2. Use geradores apropriados
```typescript
// BOM: gera valores válidos
fc.integer({ min: 0, max: 10000 })

// RUIM: pode gerar valores inválidos
fc.integer()
```

### 3. Teste invariantes, não implementações
```typescript
// BOM: testa a propriedade matemática
expect(result).toBe(expected);

// RUIM: testa detalhes de implementação
expect(mockFunction).toHaveBeenCalledWith(...);
```

### 4. Documente o que está sendo testado
```typescript
/**
 * Property: Invariante de Saldo
 * Valida: Requisito 3.4
 * Garante que available = total - used
 */
```

## Próximos Passos

1. Implementar as 4 propriedades restantes
2. Adicionar testes unitários para serviços
3. Adicionar testes de integração para APIs
4. Configurar CI/CD para executar testes automaticamente

## Recursos

- [fast-check Documentation](https://github.com/dubzzz/fast-check/blob/main/documentation/README.md)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## Notas Importantes

- Testes de propriedade são **não-determinísticos** por natureza (usam aleatoriedade)
- Se um teste falha, o seed é mostrado para reprodução
- Propriedades devem ser **sempre verdadeiras**, não "geralmente verdadeiras"
- PBT complementa testes unitários, não os substitui
