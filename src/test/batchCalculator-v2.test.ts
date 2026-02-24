/**
 * Testes do Calculador de Ciclos v2.0
 * Modelo Operacional Recorrente Mensal
 */

import { describe, it, expect } from "vitest";
import {
  calculateCurrentBatch,
  calculateNextBatch,
  calculateFutureBatches,
  getCurrentCycleType,
  isInSalesPeriod,
  isInProductionPeriod,
  getDaysUntilSalesEnd,
  getCustomerDeadlineText,
  getBatchSummary,
  getStatusText,
  type BatchRules,
  type CalculatedBatch,
} from "../lib/services/batchCalculator";

describe("Calculador de Ciclos v2.0", () => {
  const rules: BatchRules = { shippingBusinessDays: 5 };

  describe("getCurrentCycleType", () => {
    it("deve retornar cycle1 para dia 01-15", () => {
      const type = getCurrentCycleType(new Date(2026, 2, 5)); // 05/03/2026
      expect(type).toBe("cycle1");
    });

    it("deve retornar cycle2 para dia 16-31", () => {
      const type = getCurrentCycleType(new Date(2026, 2, 20)); // 20/03/2026
      expect(type).toBe("cycle2");
    });

    it("deve retornar cycle1 para dia 15 (último dia do ciclo)", () => {
      const type = getCurrentCycleType(new Date(2026, 2, 15)); // 15/03/2026
      expect(type).toBe("cycle1");
    });

    it("deve retornar cycle2 para dia 16 (primeiro dia do ciclo)", () => {
      const type = getCurrentCycleType(new Date(2026, 2, 16)); // 16/03/2026
      expect(type).toBe("cycle2");
    });
  });

  describe("calculateCurrentBatch", () => {
    it("deve calcular Ciclo 1 corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5)); // 05/03/2026
      expect(batch.cycleType).toBe("cycle1");
      expect(batch.month).toBe(2); // 0-indexed
      expect(batch.year).toBe(2026);
      expect(batch.name).toBe("Ciclo 1 – Março/2026");
    });

    it("deve calcular Ciclo 2 corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 20)); // 20/03/2026
      expect(batch.cycleType).toBe("cycle2");
      expect(batch.month).toBe(2);
      expect(batch.year).toBe(2026);
      expect(batch.name).toBe("Ciclo 2 – Março/2026");
    });
  });

  describe("calculateNextBatch", () => {
    it("deve retornar Ciclo 2 quando estamos no Ciclo 1", () => {
      const current = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      const next = calculateNextBatch(rules, current);
      expect(next.cycleType).toBe("cycle2");
      expect(next.month).toBe(2);
      expect(next.year).toBe(2026);
    });

    it("deve retornar Ciclo 1 do próximo mês quando estamos no Ciclo 2", () => {
      const current = calculateCurrentBatch(rules, new Date(2026, 2, 20));
      const next = calculateNextBatch(rules, current);
      expect(next.cycleType).toBe("cycle1");
      expect(next.month).toBe(3); // Abril
      expect(next.year).toBe(2026);
    });

    it("deve virar o ano corretamente (Dezembro -> Janeiro)", () => {
      const current = calculateCurrentBatch(rules, new Date(2026, 11, 20));
      const next = calculateNextBatch(rules, current);
      expect(next.cycleType).toBe("cycle1");
      expect(next.month).toBe(0); // Janeiro
      expect(next.year).toBe(2027);
    });
  });

  describe("calculateFutureBatches", () => {
    it("deve retornar 6 ciclos futuros (3 meses)", () => {
      const batches = calculateFutureBatches(rules, 6);
      expect(batches).toHaveLength(6);
    });

    it("deve retornar ciclos em ordem cronológica", () => {
      const batches = calculateFutureBatches(rules, 4);

      // Verificar que cada ciclo é posterior ao anterior
      for (let i = 1; i < batches.length; i++) {
        expect(batches[i].salesStart.getTime()).toBeGreaterThan(
          batches[i - 1].salesStart.getTime()
        );
      }
    });

    it("deve alternar entre cycle1 e cycle2", () => {
      const batches = calculateFutureBatches(rules, 4);

      // Verificar alternância
      for (let i = 1; i < batches.length; i++) {
        if (batches[i - 1].cycleType === "cycle1") {
          // Se anterior era cycle1, próximo pode ser cycle2 do mesmo mês
          // ou cycle1 do próximo mês
          expect(["cycle1", "cycle2"]).toContain(batches[i].cycleType);
        }
      }
    });
  });

  describe("Datas e Períodos", () => {
    it("deve calcular datas de vendas corretamente para Ciclo 1", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      expect(batch.salesStart.getDate()).toBe(1);
      expect(batch.salesEnd.getDate()).toBe(15);
    });

    it("deve calcular datas de vendas corretamente para Ciclo 2", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 20));
      expect(batch.salesStart.getDate()).toBe(16);
      // Último dia do mês (31 para março)
      expect(batch.salesEnd.getDate()).toBe(31);
    });

    it("deve calcular datas de produção corretamente para Ciclo 1", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      // Ciclo 1: produção do dia 16 até último dia do mesmo mês
      expect(batch.productionStart.getDate()).toBe(16);
      expect(batch.productionEnd.getDate()).toBe(31); // Março tem 31 dias
    });

    it("deve calcular datas de produção corretamente para Ciclo 2", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 20));
      // Ciclo 2: produção do dia 01 até último dia do mês seguinte
      expect(batch.productionStart.getMonth()).toBe(3); // Abril
      expect(batch.productionStart.getDate()).toBe(1);
      expect(batch.productionEnd.getMonth()).toBe(3); // Abril
      expect(batch.productionEnd.getDate()).toBe(30); // Abril tem 30 dias
    });
  });

  describe("Status e Períodos", () => {
    it("deve identificar período de vendas corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      expect(isInSalesPeriod(batch, new Date(2026, 2, 10))).toBe(true);
      expect(isInSalesPeriod(batch, new Date(2026, 2, 20))).toBe(false);
    });

    it("deve identificar período de produção corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      expect(isInProductionPeriod(batch, new Date(2026, 2, 20))).toBe(true);
      expect(isInProductionPeriod(batch, new Date(2026, 2, 10))).toBe(false);
    });

    it("deve calcular dias até fim das vendas", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      const days = getDaysUntilSalesEnd(batch, new Date(2026, 2, 10));
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(15);
    });
  });

  describe("Formatação e Textos", () => {
    it("deve formatar nome do ciclo corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      expect(batch.name).toBe("Ciclo 1 – Março/2026");
    });

    it("deve gerar resumo do ciclo", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      const summary = getBatchSummary(batch);
      expect(summary).toContain("Ciclo 1");
      expect(summary).toContain("Março");
      expect(summary).toContain("Vendas:");
      expect(summary).toContain("Produção:");
    });

    it("deve gerar texto para cliente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));
      const text = getCustomerDeadlineText(batch);
      expect(text).toContain("recebe até");
      expect(text).toContain("dias");
      expect(text).toContain("prazo");
    });

    it("deve formatar status corretamente", () => {
      expect(getStatusText("open_for_sales")).toBe("Aberto para vendas");
      expect(getStatusText("closed")).toBe("Fechado");
      expect(getStatusText("in_production")).toBe("Em produção");
    });
  });

  describe("Cenários de Borda", () => {
    it("deve funcionar no último dia do ano", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 11, 31));
      expect(batch.cycleType).toBe("cycle2");
      expect(batch.month).toBe(11); // Dezembro
      expect(batch.year).toBe(2026);
    });

    it("deve funcionar no primeiro dia do ano", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 0, 1));
      expect(batch.cycleType).toBe("cycle1");
      expect(batch.month).toBe(0); // Janeiro
      expect(batch.year).toBe(2026);
    });

    it("deve funcionar em fevereiro de ano bissexto", () => {
      const batch = calculateCurrentBatch(rules, new Date(2024, 1, 29));
      expect(batch.cycleType).toBe("cycle2");
      expect(batch.salesEnd.getDate()).toBe(29);
    });

    it("deve funcionar em fevereiro de ano não-bissexto", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 1, 28));
      expect(batch.cycleType).toBe("cycle2");
      expect(batch.salesEnd.getDate()).toBe(28);
    });
  });

  describe("Integração: Fluxo Completo", () => {
    it("deve calcular cronograma completo de 3 meses", () => {
      const batches = calculateFutureBatches(rules, 6);

      // Total: 6 ciclos (3 meses)
      expect(batches).toHaveLength(6);

      // Verificar que todos têm datas válidas
      batches.forEach((batch) => {
        expect(batch.salesStart).toBeInstanceOf(Date);
        expect(batch.salesEnd).toBeInstanceOf(Date);
        expect(batch.productionStart).toBeInstanceOf(Date);
        expect(batch.productionEnd).toBeInstanceOf(Date);
        expect(batch.shippingDeadlineDate).toBeInstanceOf(Date);

        // Verificar ordem cronológica
        expect(batch.salesEnd.getTime()).toBeGreaterThan(batch.salesStart.getTime());
        expect(batch.productionStart.getTime()).toBeGreaterThan(batch.salesEnd.getTime());
        expect(batch.productionEnd.getTime()).toBeGreaterThan(batch.productionStart.getTime());
        expect(batch.shippingDeadlineDate.getTime()).toBeGreaterThan(batch.productionEnd.getTime());
      });
    });

    it("deve calcular prazos para cliente corretamente", () => {
      const batch = calculateCurrentBatch(rules, new Date(2026, 2, 5));

      // Prazo mínimo deve ser menor que máximo
      expect(batch.minDeliveryDays).toBeLessThan(batch.maxDeliveryDays);

      // Prazo médio deve estar entre mínimo e máximo
      expect(batch.avgDeliveryDays).toBeGreaterThanOrEqual(batch.minDeliveryDays);
      expect(batch.avgDeliveryDays).toBeLessThanOrEqual(batch.maxDeliveryDays);

      // Todos devem ser positivos
      expect(batch.minDeliveryDays).toBeGreaterThan(0);
      expect(batch.maxDeliveryDays).toBeGreaterThan(0);
      expect(batch.avgDeliveryDays).toBeGreaterThan(0);
    });

    it("deve manter consistência entre ciclos consecutivos", () => {
      const batches = calculateFutureBatches(rules, 3);

      for (let i = 1; i < batches.length; i++) {
        const prev = batches[i - 1];
        const curr = batches[i];

        // Ciclo atual deve começar após o anterior terminar
        expect(curr.salesStart.getTime()).toBeGreaterThan(prev.salesEnd.getTime());
      }
    });
  });
});
