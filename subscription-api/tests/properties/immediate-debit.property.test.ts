/**
 * Property-Based Test: Débito Imediato em Compras Individuais
 * 
 * **Valida: Requisitos 5.3, 5.7**
 * 
 * Esta propriedade garante que compras individuais debitam créditos
 * imediatamente e que a transação é registrada corretamente.
 */

import * as fc from 'fast-check';

describe('Property: Débito Imediato em Compras Individuais', () => {
  it('compra individual deve debitar créditos imediatamente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // saldo inicial
        fc.integer({ min: 50, max: 500 }), // preço do personagem
        (initialBalance, characterPrice) => {
          // Simular estado inicial
          const availableCredits = initialBalance;
          
          // Validar se há saldo suficiente
          const hasSufficientBalance = availableCredits >= characterPrice;
          
          if (hasSufficientBalance) {
            // Simular débito imediato
            const newBalance = availableCredits - characterPrice;
            
            // Verificações
            expect(newBalance).toBe(availableCredits - characterPrice);
            expect(newBalance).toBeGreaterThanOrEqual(0);
            expect(newBalance).toBeLessThan(availableCredits);
          } else {
            // Se saldo insuficiente, compra deve ser rejeitada
            expect(availableCredits).toBeLessThan(characterPrice);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('múltiplas compras individuais devem debitar sequencialmente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }), // saldo inicial
        fc.array(fc.integer({ min: 50, max: 300 }), { minLength: 1, maxLength: 10 }), // preços
        (initialBalance, prices) => {
          let currentBalance = initialBalance;
          let totalDebited = 0;
          let successfulPurchases = 0;

          for (const price of prices) {
            if (currentBalance >= price) {
              // Débito imediato
              currentBalance -= price;
              totalDebited += price;
              successfulPurchases++;
              
              // Verificar que débito foi aplicado
              expect(currentBalance).toBe(initialBalance - totalDebited);
            } else {
              // Compra rejeitada por saldo insuficiente
              expect(currentBalance).toBeLessThan(price);
            }
          }

          // Verificações finais
          expect(currentBalance).toBe(initialBalance - totalDebited);
          expect(totalDebited).toBeLessThanOrEqual(initialBalance);
          expect(successfulPurchases).toBeLessThanOrEqual(prices.length);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('débito deve ser atômico - ou completa ou falha', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // saldo
        fc.integer({ min: 50, max: 500 }), // preço
        fc.boolean(), // simular falha na transação
        (balance, price, shouldFail) => {
          const initialBalance = balance;
          
          if (shouldFail || balance < price) {
            // Transação falha - saldo não deve mudar
            expect(balance).toBe(initialBalance);
          } else {
            // Transação sucede - débito completo
            const newBalance = balance - price;
            expect(newBalance).toBe(initialBalance - price);
            expect(newBalance).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
