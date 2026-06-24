/**
 * Unit Tests for Stage Validation Service
 *
 * Tests stage transition validation logic including:
 * - Sequential stage completion
 * - Stage skipping prevention
 * - Admin override permissions
 * - Transition logging
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateStageTransition,
  canUserOverride,
  getNextStage,
  getPreviousStage,
} from "../production/stage-validation";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe("Stage Validation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateStageTransition", () => {
    it("should allow completing the first stage", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "pending",
          is_blocked: false,
        },
        {
          id: "stage-2",
          stage_order: 2,
          stage_name: "design",
          status: "pending",
          is_blocked: false,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(true);
      expect(result.canOverride).toBe(false);
      expect(result.requiresJustification).toBe(false);
    });

    it("should allow completing a stage when previous stage is completed", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "completed",
          is_blocked: false,
        },
        {
          id: "stage-2",
          stage_order: 2,
          stage_name: "design",
          status: "pending",
          is_blocked: false,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-2");

      expect(result.isValid).toBe(true);
      expect(result.canOverride).toBe(false);
    });

    it("should prevent completing a stage when previous stage is not completed", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "pending",
          is_blocked: false,
        },
        {
          id: "stage-2",
          stage_order: 2,
          stage_name: "design",
          status: "pending",
          is_blocked: false,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-2");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(true);
      expect(result.requiresJustification).toBe(true);
      expect(result.error).toContain("Cannot skip stages");
    });

    it("should prevent skipping stages", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "completed",
          is_blocked: false,
        },
        {
          id: "stage-2",
          stage_order: 2,
          stage_name: "design",
          status: "pending",
          is_blocked: false,
        },
        {
          id: "stage-3",
          stage_order: 3,
          stage_name: "production",
          status: "pending",
          is_blocked: false,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-3");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(true);
      expect(result.requiresJustification).toBe(true);
      expect(result.error).toContain("Cannot skip stages");
    });

    it("should prevent completing an already completed stage", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "completed",
          is_blocked: false,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(false);
      expect(result.error).toContain("already been completed");
    });

    it("should prevent completing a blocked stage", async () => {
      const mockStages = [
        {
          id: "stage-1",
          stage_order: 1,
          stage_name: "awaiting_choice",
          status: "pending",
          is_blocked: true,
        },
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
      } as never);

      const result = await validateStageTransition("queue-1", "stage-1");

      expect(result.isValid).toBe(false);
      expect(result.canOverride).toBe(false);
      expect(result.error).toContain("blocked");
    });
  });

  describe("canUserOverride", () => {
    it("should return true for admin users", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as never);

      const result = await canUserOverride("user-1");

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("has_role", {
        _user_id: "user-1",
        _role: "admin",
      });
    });

    it("should return false for non-admin users", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-2" } },
        error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      } as never);

      const result = await canUserOverride("user-2");

      expect(result).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledWith("has_role", {
        _user_id: "user-2",
        _role: "admin",
      });
    });

    it("should reject override checks for a different user id", async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      } as never);

      const result = await canUserOverride("user-2");

      expect(result).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalledWith("has_role", {
        _user_id: "user-2",
        _role: "admin",
      });
    });
  });

  describe("Stage Navigation", () => {
    it("should get the next stage correctly", () => {
      expect(getNextStage("awaiting_payment")).toBe("payment_confirmed");
      expect(getNextStage("payment_confirmed")).toBe("awaiting_choice");
      expect(getNextStage("awaiting_choice")).toBe("model_preparation");
      expect(getNextStage("model_preparation")).toBe("printing");
      expect(getNextStage("printing")).toBe("post_processing");
      expect(getNextStage("post_processing")).toBe("painting");
      expect(getNextStage("painting")).toBe("quality_check");
      expect(getNextStage("quality_check")).toBe("packaging");
      expect(getNextStage("packaging")).toBe("ready_to_ship");
      expect(getNextStage("ready_to_ship")).toBe("shipped");
      expect(getNextStage("shipped")).toBe("delivered");
      expect(getNextStage("delivered")).toBe(null);
    });

    it("should get the previous stage correctly", () => {
      expect(getPreviousStage("awaiting_payment")).toBe(null);
      expect(getPreviousStage("payment_confirmed")).toBe("awaiting_payment");
      expect(getPreviousStage("awaiting_choice")).toBe("payment_confirmed");
      expect(getPreviousStage("model_preparation")).toBe("awaiting_choice");
      expect(getPreviousStage("printing")).toBe("model_preparation");
      expect(getPreviousStage("post_processing")).toBe("printing");
      expect(getPreviousStage("painting")).toBe("post_processing");
      expect(getPreviousStage("quality_check")).toBe("painting");
      expect(getPreviousStage("packaging")).toBe("quality_check");
      expect(getPreviousStage("ready_to_ship")).toBe("packaging");
      expect(getPreviousStage("shipped")).toBe("ready_to_ship");
      expect(getPreviousStage("delivered")).toBe("shipped");
    });
  });
});
