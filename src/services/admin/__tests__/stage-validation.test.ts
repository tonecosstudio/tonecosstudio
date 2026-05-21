/**
 * Unit Tests for Stage Validation Service
 *
 * Tests stage transition validation logic including:
 * - Sequential stage completion
 * - Stage skipping prevention
 * - Admin override permissions
 * - Transition logging
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateStageTransition,
  canUserOverride,
  getNextStage,
  getPreviousStage,
} from "../stage-validation";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("Stage Validation Service", () => {
  describe("validateStageTransition", () => {
    it("should allow completing the first stage", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "pending", is_blocked: false },
        { id: "stage-2", stage_order: 2, stage_name: "design", status: "pending", is_blocked: false },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(true);
      expect(result.canOverride).toBe(false);
      expect(result.requiresJustification).toBe(false);
    });

    it("should allow completing a stage when previous stage is completed", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "completed", is_blocked: false },
        { id: "stage-2", stage_order: 2, stage_name: "design", status: "pending", is_blocked: false },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-2");

      expect(result.isValid).toBe(true);
      expect(result.canOverride).toBe(false);
    });

    it("should prevent completing a stage when previous stage is not completed", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "pending", is_blocked: false },
        { id: "stage-2", stage_order: 2, stage_name: "design", status: "pending", is_blocked: false },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-2");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(true);
      expect(result.requiresJustification).toBe(true);
      expect(result.error).toContain("Cannot skip stages");
    });

    it("should prevent skipping stages", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "completed", is_blocked: false },
        { id: "stage-2", stage_order: 2, stage_name: "design", status: "pending", is_blocked: false },
        { id: "stage-3", stage_order: 3, stage_name: "production", status: "pending", is_blocked: false },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-3");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(true);
      expect(result.requiresJustification).toBe(true);
      expect(result.error).toContain("Cannot skip stages");
    });

    it("should prevent completing an already completed stage", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "completed", is_blocked: false },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(false);
      expect(result.error).toContain("already been completed");
    });

    it("should prevent completing a blocked stage", async () => {
      const mockStages = [
        { id: "stage-1", stage_order: 1, stage_name: "awaiting_choice", status: "pending", is_blocked: true },
      ];

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStages,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(false);
      expect(result.error).toContain("blocked");
    });
  });

  describe("canUserOverride", () => {
    it("should return true for admin users", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "admin" },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await canUserOverride("user-1");

      expect(result).toBe(true);
    });

    it("should return false for non-admin users", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await canUserOverride("user-2");

      expect(result).toBe(false);
    });
  });

  describe("Stage Navigation", () => {
    it("should get the next stage correctly", () => {
      expect(getNextStage("awaiting_choice")).toBe("design");
      expect(getNextStage("design")).toBe("production");
      expect(getNextStage("production")).toBe("quality_check");
      expect(getNextStage("quality_check")).toBe("packaging");
      expect(getNextStage("packaging")).toBe("shipped");
      expect(getNextStage("shipped")).toBe(null);
    });

    it("should get the previous stage correctly", () => {
      expect(getPreviousStage("awaiting_choice")).toBe(null);
      expect(getPreviousStage("design")).toBe("awaiting_choice");
      expect(getPreviousStage("production")).toBe("design");
      expect(getPreviousStage("quality_check")).toBe("production");
      expect(getPreviousStage("packaging")).toBe("quality_check");
      expect(getPreviousStage("shipped")).toBe("packaging");
    });
  });
});
