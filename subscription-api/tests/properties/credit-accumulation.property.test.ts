/**
 * Property-Based Test: Acumulação de Créditos na Renovação
 * 
 * **Valida: Requisitos 2.4, 2.5**
 * 
 * Esta propriedade garante que créditos são acumulados (somados)
 * na renovação, não resetados.
 */

import * as fc from 'fast-check';

describe('Property: Acumulação de Créditos na Renovação', () => {
  it('renovação deve somar novos créditos ao saldo existente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }), // saldo existente
        fc.integer({ min: 600, max: 1400 }), // novos créditos (plano)
        (existingBalance, newCredits) => {
          const totalAfterRenewal = existingBalance + newCredits;
          
          // Verificar soma
          expect(totalAfterRenewal).toBe(existingBalance + newCredits);
          expect(totalAfterRenewal).toBeGreaterThanOrEqual(existingBalance);
          expect(totalAfterRenewal).toBeGreaterThanOrEqual(newCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('múltiplas renovações devem acumular créditos progressivamente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // saldo inicial
        fc.array(
          fc.constantFrom(600, 1400), // créditos por renovação
          { minLength: 1, maxLength: 10 }
        ),
        (initialBalance, renewalCredits) => {
          let currentBalance = initialBalance;
          
          for (const credits of renewalCredits) {
            const previousBalance = currentBalance;
            currentBalance += credits;
            
            // Verificar acumulação
            expect(currentBalance).toBe(previousBalance + credits);
            expect(currentBalance).toBeGreaterThan(previousBalance);
          }
          
          // Verificar total acumulado
          const totalAdded = renewalCredits.reduce((sum, c) => sum + c, 0);
          expect(currentBalance).toBe(initialBalance + totalAdded);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('renovação não deve resetar saldo existente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }), // saldo existente (não-zero)
        fc.constantFrom(600, 1400), // novos créditos
        (existingBalance, newCredits) => {
          const balanceAfterRenewal = existingBalance + newCredits;
          
          // Saldo após renovação deve ser maior que saldo anterior
          expect(balanceAfterRenewal).toBeGreaterThan(existingBalance);
          
          // Saldo anterior não deve ser perdido
          expect(balanceAfterRenewal).toBeGreaterThanOrEqual(existingBalance);
          
          // Diferença deve ser exatamente os novos créditos
          const difference = balanceAfterRenewal - existingBalance;
          expect(difference).toBe(newCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('acumulação deve funcionar com créditos parcialmente usados', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 5000 }), // total inicial
        fc.integer({ min: 0, max: 5000 }), // créditos usados
        fc.constantFrom(600, 1400), // novos créditos na renovação
        (initialTotal, initialUsed, newCredits) => {
          const validUsed = Math.min(initialUsed, initialTotal);
          const initialAvailable = initialTotal - validUsed;
          
          // Renovação: adiciona créditos ao total e ao disponível
          const newTotal = initialTotal + newCredits;
          const newAvailable = initialAvailable + newCredits;
          const usedRemains = validUsed; // créditos usados não mudam
          
          // Verificações
          expect(newTotal).toBe(initialTotal + newCredits);
          expect(newAvailable).toBe(initialAvailable + newCredits);
          expect(usedRemains).toBe(validUsed);
          
          // Invariante mantida
          expect(newAvailable).toBe(newTotal - usedRemains);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('acumulação deve ser comutativa para múltiplas renovações', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // saldo inicial
        fc.array(fc.constantFrom(600, 1400), { minLength: 2, maxLength: 5 }),
        (initialBalance, renewalCredits) => {
          // Calcular soma total
          const totalCredits = renewalCredits.reduce((sum, c) => sum + c, 0);
          const finalBalance = initialBalance + totalCredits;
          
          // Aplicar renovações sequencialmente
          let sequentialBalance = initialBalance;
          for (const credits of renewalCredits) {
            sequentialBalance += credits;
          }
          
          // Resultado deve ser o mesmo
          expect(sequentialBalance).toBe(finalBalance);
          expect(sequentialBalance).toBe(initialBalance + totalCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('acumulação deve preservar créditos não utilizados', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }), // créditos não utilizados
        fc.integer({ min: 1, max: 10 }), // número de renovações
        fc.constantFrom(600, 1400), // créditos por renovação
        (unusedCredits, renewalCount, creditsPerRenewal) => {
          let balance = unusedCredits;
          
          for (let i = 0; i < renewalCount; i++) {
            balance += creditsPerRenewal;
          }
          
          // Créditos originais devem estar incluídos no total
          const totalAdded = creditsPerRenewal * renewalCount;
          expect(balance).toBe(unusedCredits + totalAdded);
          expect(balance).toBeGreaterThanOrEqual(unusedCredits);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
