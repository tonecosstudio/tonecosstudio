/**
 * Testes para GroupAnalyticsService
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupAnalyticsService } from "./groupAnalyticsService";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserAdminAccess: vi.fn(),
}));

vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: authMocks.requireCurrentUserAdminAccess,
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  const createMockChain = () => ({
    select: vi.fn(() => createMockChain()),
    eq: vi.fn(() => createMockChain()),
    gte: vi.fn(() => createMockChain()),
    lt: vi.fn(() => createMockChain()),
    not: vi.fn(() => createMockChain()),
    order: vi.fn(() => createMockChain()),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    in: vi.fn(() => Promise.resolve({ data: [], error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  });

  return {
    supabase: {
      from: vi.fn(() => createMockChain()),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    },
  };
});

describe("GroupAnalyticsService", () => {
  let service: GroupAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUserAdminAccess.mockResolvedValue("admin-123");
    service = new GroupAnalyticsService();
  });

  describe("calculateOpenRate", () => {
    it("deve retornar taxa 0 quando não há membros", async () => {
      const result = await service.calculateOpenRate("test-group-id");
      expect(result.rate).toBe(0);
      expect(result.trend).toBe(0);
      expect(authMocks.requireCurrentUserAdminAccess).toHaveBeenCalledTimes(1);
    });

    it("deve calcular taxa de abertura corretamente", async () => {
      const result = await service.calculateOpenRate("test-group-id", 7);
      expect(result).toHaveProperty("rate");
      expect(result).toHaveProperty("trend");
      expect(typeof result.rate).toBe("number");
      expect(typeof result.trend).toBe("number");
    });

    it("deve aceitar período customizado em dias", async () => {
      const result = await service.calculateOpenRate("test-group-id", 30);
      expect(result).toHaveProperty("rate");
      expect(result).toHaveProperty("trend");
    });
  });

  describe("getPeakHours", () => {
    it("deve retornar array com 24 horas", async () => {
      const result = await service.getPeakHours("test-group-id");
      expect(result).toHaveLength(24);
    });

    it("deve retornar horas ordenadas de 0 a 23", async () => {
      const result = await service.getPeakHours("test-group-id");
      result.forEach((item, index) => {
        expect(item.hour).toBe(index);
        expect(item).toHaveProperty("count");
        expect(typeof item.count).toBe("number");
      });
    });

    it("deve aceitar período customizado em dias", async () => {
      const result = await service.getPeakHours("test-group-id", 60);
      expect(result).toHaveLength(24);
    });
  });

  describe("getTopMembers", () => {
    it("deve retornar array vazio quando não há membros", async () => {
      const result = await service.getTopMembers("test-group-id");
      expect(Array.isArray(result)).toBe(true);
    });

    it("deve respeitar o limite especificado", async () => {
      const limit = 5;
      const result = await service.getTopMembers("test-group-id", limit);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it("deve retornar estrutura correta para cada membro", async () => {
      const result = await service.getTopMembers("test-group-id", 10);
      result.forEach((member) => {
        expect(member).toHaveProperty("userId");
        expect(member).toHaveProperty("userName");
        expect(member).toHaveProperty("userEmail");
        expect(member).toHaveProperty("viewCount");
        expect(member).toHaveProperty("lastViewedAt");
      });
    });
  });

  describe("getMemberGrowth", () => {
    it("deve retornar array vazio quando não há dados", async () => {
      const result = await service.getMemberGrowth("test-group-id");
      expect(Array.isArray(result)).toBe(true);
    });

    it("deve retornar dados ordenados por data", async () => {
      const result = await service.getMemberGrowth("test-group-id", 6);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });

    it("deve retornar estrutura correta para cada período", async () => {
      const result = await service.getMemberGrowth("test-group-id", 3);
      result.forEach((item) => {
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("count");
        expect(typeof item.date).toBe("string");
        expect(typeof item.count).toBe("number");
      });
    });

    it("deve aceitar período customizado em meses", async () => {
      const result = await service.getMemberGrowth("test-group-id", 12);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getGroupAnalytics", () => {
    it("deve retornar todas as métricas", async () => {
      const result = await service.getGroupAnalytics("test-group-id");

      expect(result).toHaveProperty("openRate");
      expect(result).toHaveProperty("openRateTrend");
      expect(result).toHaveProperty("peakHours");
      expect(result).toHaveProperty("topMembers");
      expect(result).toHaveProperty("memberGrowth");
      expect(result).toHaveProperty("totalMessages");
      expect(result).toHaveProperty("totalMembers");
      expect(result).toHaveProperty("avgResponseTime");
      expect(authMocks.requireCurrentUserAdminAccess).toHaveBeenCalledTimes(1);
    });

    it("deve retornar tipos corretos para cada métrica", async () => {
      const result = await service.getGroupAnalytics("test-group-id");

      expect(typeof result.openRate).toBe("number");
      expect(typeof result.openRateTrend).toBe("number");
      expect(Array.isArray(result.peakHours)).toBe(true);
      expect(Array.isArray(result.topMembers)).toBe(true);
      expect(Array.isArray(result.memberGrowth)).toBe(true);
      expect(typeof result.totalMessages).toBe("number");
      expect(typeof result.totalMembers).toBe("number");
      expect(typeof result.avgResponseTime).toBe("number");
    });

    it("deve retornar valores não-negativos", async () => {
      const result = await service.getGroupAnalytics("test-group-id");

      expect(result.openRate).toBeGreaterThanOrEqual(0);
      expect(result.totalMessages).toBeGreaterThanOrEqual(0);
      expect(result.totalMembers).toBeGreaterThanOrEqual(0);
      expect(result.avgResponseTime).toBeGreaterThanOrEqual(0);
    });
  });
});
