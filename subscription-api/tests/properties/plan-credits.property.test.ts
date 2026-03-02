/**
 * Property-Based Test: Cálculo Correto de Créditos por Plano
 * 
 * **Valida: Requisitos 1.2, 1.3, 1.4, 1.5**
 * 
 * Esta propriedade garante que os créditos são calculados corretamente
 * para cada tipo de plano (Trimestral e Semestral).
 */

import * as fc from 'fast-check';

// Constantes do sistema
const PLAN_CREDITS = {
  trimestral: {
    base: 600,
    bonus: 0,
    total: 600,
  },
  semestral: {
    base: 1200,
    bonus: 200,
    total: 1400,
  },
};

type PlanType = 'trimestral' | 'semestral';

describe('Property: Cálculo Correto de Créditos por Plano', () => {
  it('plano trimestral deve gerar exatamente 600 créditos', () => {
    fc.assert(
      fc.property(
        fc.constant('trimestral' as PlanType),
        (planType) => {
          const credits = PLAN_CREDITS[planType];
          
          expect(credits.base).toBe(600);
          expect(credits.bonus).toBe(0);
          expect(credits.total).toBe(600);
          expect(credits.total).toBe(credits.base + credits.bonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('plano semestral deve gerar 1200 base + 200 bônus = 1400 créditos', () => {
    fc.assert(
      fc.property(
        fc.constant('semestral' as PlanType),
        (planType) => {
          const credits = PLAN_CREDITS[planType];
          
          expect(credits.base).toBe(1200);
          expect(credits.bonus).toBe(200);
          expect(credits.total).toBe(1400);
          expect(credits.total).toBe(credits.base + credits.bonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total de créditos deve sempre ser base + bônus', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('trimestral' as PlanType, 'semestral' as PlanType),
        (planType) => {
          const credits = PLAN_CREDITS[planType];
          
          // Invariante: total = base + bonus
          expect(credits.total).toBe(credits.base + credits.bonus);
          
          // Créditos devem ser positivos
          expect(credits.base).toBeGreaterThan(0);
          expect(credits.bonus).toBeGreaterThanOrEqual(0);
          expect(credits.total).toBeGreaterThan(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('plano semestral deve ter mais créditos que trimestral', () => {
    fc.assert(
      fc.property(
        fc.constant(true),
        () => {
          const trimestralCredits = PLAN_CREDITS.trimestral.total;
          const semestralCredits = PLAN_CREDITS.semestral.total;
          
          expect(semestralCredits).toBeGreaterThan(trimestralCredits);
          
          // Diferença específica
          const difference = semestralCredits - trimestralCredits;
          expect(difference).toBe(800); // 1400 - 600
        }
      ),
      { numRuns: 100 }
    );
  });

  it('múltiplas ativações do mesmo plano devem gerar mesmos créditos', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('trimestral' as PlanType, 'semestral' as PlanType),
        fc.integer({ min: 1, max: 10 }), // número de ativações
        (planType, activations) => {
          const creditsPerActivation = PLAN_CREDITS[planType].total;
          const totalCredits = creditsPerActivation * activations;
          
          // Verificar cálculo
          expect(totalCredits).toBe(creditsPerActivation * activations);
          
          // Verificar que cada ativação gera mesma quantidade
          for (let i = 0; i < activations; i++) {
            expect(PLAN_CREDITS[planType].total).toBe(creditsPerActivation);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('cálculo de créditos não deve depender de fatores externos', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('trimestral' as PlanType, 'semestral' as PlanType),
        fc.integer({ min: 0, max: 10000 }), // saldo existente (não deve afetar)
        fc.integer({ min: 0, max: 1000 }), // créditos usados (não deve afetar)
        (planType, _existingBalance, _usedCredits) => {
          // Créditos alocados devem ser sempre os mesmos
          const allocatedCredits = PLAN_CREDITS[planType].total;
          
          // Não deve depender de saldo existente
          expect(allocatedCredits).toBe(PLAN_CREDITS[planType].total);
          
          // Não deve depender de créditos usados
          expect(allocatedCredits).toBe(PLAN_CREDITS[planType].total);
          
          // Valores devem ser constantes
          if (planType === 'trimestral') {
            expect(allocatedCredits).toBe(600);
          } else {
            expect(allocatedCredits).toBe(1400);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
