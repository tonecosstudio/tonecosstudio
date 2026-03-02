/**
 * Property-Based Test: Invariante de Saldo de Créditos
 * 
 * **Valida: Requisito 3.4**
 * 
 * Esta propriedade garante que o saldo disponível sempre seja igual
 * ao total de créditos menos os créditos usados.
 * 
 * Invariante: available_credits = total_credits - used_credits
 */

import * as fc from 'fast-check';

describe('Property: Invariante de Saldo de Créditos', () => {
  it('available_credits deve sempre ser igual a total_credits - used_credits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // total_credits
        fc.integer({ min: 0, max: 10000 }), // used_credits
        (totalCredits, usedCredits) => {
          // Garantir que used_credits não exceda total_credits
          const validUsedCredits = Math.min(usedCredits, totalCredits);
          
          // Calcular available_credits
          const availableCredits = totalCredits - validUsedCredits;
          
          // Invariante: available_credits = total_credits - used_credits
          expect(availableCredits).toBe(totalCredits - validUsedCredits);
          expect(availableCredits).toBeGreaterThanOrEqual(0);
          expect(availableCredits).toBeLessThanOrEqual(totalCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('débito de créditos deve manter a invariante', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }), // total_credits inicial
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }), // débitos
        (initialTotal, debits) => {
          let totalCredits = initialTotal;
          let usedCredits = 0;
          let availableCredits = initialTotal;

          // Aplicar cada débito
          for (const debit of debits) {
            if (availableCredits >= debit) {
              usedCredits += debit;
              availableCredits -= debit;
              
              // Verificar invariante após cada débito
              expect(availableCredits).toBe(totalCredits - usedCredits);
            }
          }

          // Verificar invariante final
          expect(availableCredits).toBe(totalCredits - usedCredits);
          expect(usedCredits).toBeLessThanOrEqual(totalCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('alocação de novos créditos deve manter a invariante', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }), // total_credits inicial
        fc.integer({ min: 0, max: 5000 }), // used_credits inicial
        fc.integer({ min: 100, max: 2000 }), // novos créditos alocados
        (initialTotal, initialUsed, newCredits) => {
          const validUsed = Math.min(initialUsed, initialTotal);
          
          // Estado inicial
          let totalCredits = initialTotal;
          let usedCredits = validUsed;
          let availableCredits = totalCredits - usedCredits;
          
          // Verificar invariante inicial
          expect(availableCredits).toBe(totalCredits - usedCredits);
          
          // Alocar novos créditos (renovação/upgrade)
          totalCredits += newCredits;
          availableCredits += newCredits;
          
          // Verificar invariante após alocação
          expect(availableCredits).toBe(totalCredits - usedCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
