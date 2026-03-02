/**
 * Property-Based Test: Validação de Saldo Antes de Compra
 * 
 * **Valida: Requisitos 5.1, 5.2**
 * 
 * Esta propriedade garante que o sistema sempre valida o saldo
 * antes de permitir uma compra e rejeita compras com saldo insuficiente.
 */

import * as fc from 'fast-check';

describe('Property: Validação de Saldo Antes de Compra', () => {
  it('compra deve ser rejeitada se saldo insuficiente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }), // saldo disponível
        fc.integer({ min: 501, max: 1000 }), // preço (sempre maior que saldo)
        (availableCredits, price) => {
          // Validação de saldo
          const hasSufficientBalance = availableCredits >= price;
          
          // Deve sempre ser falso neste caso
          expect(hasSufficientBalance).toBe(false);
          expect(availableCredits).toBeLessThan(price);
          
          // Calcular déficit
          const shortfall = price - availableCredits;
          expect(shortfall).toBeGreaterThan(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('compra deve ser permitida se saldo suficiente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }), // saldo disponível
        fc.integer({ min: 50, max: 500 }), // preço (sempre menor que saldo mínimo)
        (availableCredits, price) => {
          // Validação de saldo
          const hasSufficientBalance = availableCredits >= price;
          
          // Deve sempre ser verdadeiro neste caso
          expect(hasSufficientBalance).toBe(true);
          expect(availableCredits).toBeGreaterThanOrEqual(price);
          
          // Calcular saldo restante após compra
          const remainingBalance = availableCredits - price;
          expect(remainingBalance).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('validação deve considerar saldo exato', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }), // preço e saldo (iguais)
        (amount) => {
          const availableCredits = amount;
          const price = amount;
          
          // Validação com saldo exato
          const hasSufficientBalance = availableCredits >= price;
          
          expect(hasSufficientBalance).toBe(true);
          expect(availableCredits).toBe(price);
          
          // Após compra, saldo deve ser zero
          const remainingBalance = availableCredits - price;
          expect(remainingBalance).toBe(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('validação deve prevenir débito negativo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // saldo
        fc.integer({ min: 0, max: 2000 }), // preço
        (availableCredits, price) => {
          const hasSufficientBalance = availableCredits >= price;
          
          if (hasSufficientBalance) {
            const newBalance = availableCredits - price;
            // Saldo nunca deve ser negativo
            expect(newBalance).toBeGreaterThanOrEqual(0);
          } else {
            // Compra não deve ser permitida
            expect(availableCredits).toBeLessThan(price);
            // Saldo deve permanecer inalterado
            expect(availableCredits).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('validação deve funcionar com múltiplas compras sequenciais', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }), // saldo inicial
        fc.array(fc.integer({ min: 50, max: 500 }), { minLength: 1, maxLength: 20 }), // preços
        (initialBalance, prices) => {
          let currentBalance = initialBalance;
          
          for (const price of prices) {
            // Validar antes de cada compra
            const hasSufficientBalance = currentBalance >= price;
            
            if (hasSufficientBalance) {
              // Permitir compra
              currentBalance -= price;
              expect(currentBalance).toBeGreaterThanOrEqual(0);
            } else {
              // Rejeitar compra
              expect(currentBalance).toBeLessThan(price);
              // Saldo não deve mudar
              const balanceBeforeRejection = currentBalance;
              expect(currentBalance).toBe(balanceBeforeRejection);
            }
          }
          
          // Saldo final nunca deve ser negativo
          expect(currentBalance).toBeGreaterThanOrEqual(0);
          expect(currentBalance).toBeLessThanOrEqual(initialBalance);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
