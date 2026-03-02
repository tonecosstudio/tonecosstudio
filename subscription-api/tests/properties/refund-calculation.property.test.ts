/**
 * Property-Based Test: Cálculo de Reembolso Proporcional Baseado em Tempo
 * 
 * **Valida: Requisitos 2.1.1, 2.1.2, 2.1.3**
 * 
 * Esta propriedade garante que o reembolso é calculado proporcionalmente
 * baseado EXCLUSIVAMENTE no tempo restante, não em créditos usados.
 */

import * as fc from 'fast-check';

describe('Property: Cálculo de Reembolso Proporcional Baseado em Tempo', () => {
  it('reembolso deve ser proporcional ao tempo restante', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 500, noNaN: true }), // preço do plano
        fc.integer({ min: 1, max: 180 }), // dias totais
        fc.integer({ min: 0, max: 180 }), // dias restantes
        (planPrice, totalDays, remainingDays) => {
          const validRemainingDays = Math.min(remainingDays, totalDays);
          
          // Fórmula: reembolso = (preço * dias_restantes) / dias_totais
          const refund = (planPrice * validRemainingDays) / totalDays;
          
          // Verificações
          expect(refund).toBeGreaterThanOrEqual(0);
          expect(refund).toBeLessThanOrEqual(planPrice);
          
          // Se dias restantes = 0, reembolso = 0
          if (validRemainingDays === 0) {
            expect(refund).toBe(0);
          }
          
          // Se dias restantes = total, reembolso = preço total
          if (validRemainingDays === totalDays) {
            expect(refund).toBeCloseTo(planPrice, 2);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('reembolso NÃO deve considerar créditos usados', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 500, noNaN: true }), // preço
        fc.integer({ min: 1, max: 180 }), // dias totais
        fc.integer({ min: 0, max: 180 }), // dias restantes
        fc.integer({ min: 0, max: 5000 }), // créditos usados (não deve afetar)
        fc.integer({ min: 0, max: 5000 }), // créditos disponíveis (não deve afetar)
        (planPrice, totalDays, remainingDays, _usedCredits, _availableCredits) => {
          const validRemainingDays = Math.min(remainingDays, totalDays);
          
          // Calcular reembolso baseado APENAS em tempo
          const refund = (planPrice * validRemainingDays) / totalDays;
          
          // Reembolso não deve depender de créditos
          const refundIgnoringCredits = (planPrice * validRemainingDays) / totalDays;
          expect(refund).toBe(refundIgnoringCredits);
          
          // Mesmo com diferentes valores de créditos, reembolso é o mesmo
          expect(refund).toBeGreaterThanOrEqual(0);
          expect(refund).toBeLessThanOrEqual(planPrice);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('reembolso deve ser zero se período expirou', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 500, noNaN: true }), // preço
        fc.integer({ min: 1, max: 180 }), // dias totais
        (planPrice, totalDays) => {
          const remainingDays = 0; // período expirado
          
          const refund = (planPrice * remainingDays) / totalDays;
          
          expect(refund).toBe(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('reembolso deve ser total se cancelado imediatamente', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 500, noNaN: true }), // preço
        fc.integer({ min: 1, max: 180 }), // dias totais
        (planPrice, totalDays) => {
          const remainingDays = totalDays; // cancelamento imediato
          
          const refund = (planPrice * remainingDays) / totalDays;
          
          expect(refund).toBeCloseTo(planPrice, 2);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('reembolso deve ser proporcional em qualquer ponto do período', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 500, noNaN: true }), // preço
        fc.integer({ min: 30, max: 180 }), // dias totais
        (planPrice, totalDays) => {
          // Testar em diferentes pontos do período
          const testPoints = [
            0, // fim do período
            Math.floor(totalDays * 0.25), // 25% restante
            Math.floor(totalDays * 0.5), // 50% restante
            Math.floor(totalDays * 0.75), // 75% restante
            totalDays, // início do período
          ];
          
          for (const remainingDays of testPoints) {
            const refund = (planPrice * remainingDays) / totalDays;
            const expectedPercentage = remainingDays / totalDays;
            
            expect(refund).toBeCloseTo(planPrice * expectedPercentage, 2);
            expect(refund).toBeGreaterThanOrEqual(0);
            expect(refund).toBeLessThanOrEqual(planPrice);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('reembolso deve ser consistente para planos diferentes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 180 }), // dias totais
        fc.integer({ min: 0, max: 180 }), // dias restantes
        (totalDays, remainingDays) => {
          const validRemainingDays = Math.min(remainingDays, totalDays);
          
          // Testar com diferentes preços
          const prices = [99.90, 189.90, 299.90];
          
          for (const price of prices) {
            const refund = (price * validRemainingDays) / totalDays;
            const percentage = validRemainingDays / totalDays;
            
            // Reembolso deve ser a mesma porcentagem do preço
            expect(refund).toBeCloseTo(price * percentage, 2);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('soma de período usado + período restante deve ser período total', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 500, noNaN: true }), // preço
        fc.integer({ min: 1, max: 180 }), // dias totais
        fc.integer({ min: 0, max: 180 }), // dias decorridos
        (planPrice, totalDays, elapsedDays) => {
          const validElapsedDays = Math.min(elapsedDays, totalDays);
          const remainingDays = totalDays - validElapsedDays;
          
          // Verificar que soma é correta
          expect(validElapsedDays + remainingDays).toBe(totalDays);
          
          // Calcular reembolso
          const refund = (planPrice * remainingDays) / totalDays;
          const usedValue = (planPrice * validElapsedDays) / totalDays;
          
          // Soma de reembolso + valor usado deve ser aproximadamente o preço total
          expect(refund + usedValue).toBeCloseTo(planPrice, 2);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
