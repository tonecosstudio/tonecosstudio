import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  checkAndTriggerAlert,
  configureAlert,
  getAlertConfig,
  getAlertStatus,
  resetAlert,
} from "../capacity-alert-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const MOCK_CYCLE_ID = "test-cycle-id";

type QueryError = {
  message: string;
};

function mockRpcResult<T>(
  data: T | null,
  error: QueryError | null = null,
): void {
  (supabase.rpc as Mock).mockResolvedValue({ data, error });
}

function mockCycleQuery<T>(data: T | null, error: QueryError | null = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });

  (supabase.from as Mock).mockReturnValue({ select });

  return { eq, select, single };
}

describe("Capacity Alert Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("configureAlert", () => {
    it("configures alert through the canonical RPC", async () => {
      mockRpcResult({
        threshold: 80,
        email: "admin@ordax.com",
        sms: null,
      });

      await configureAlert(MOCK_CYCLE_ID, {
        threshold: 80,
        email: "admin@ordax.com",
        sms: null,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("configure_capacity_alert", {
        p_cycle_id: MOCK_CYCLE_ID,
        p_threshold: 80,
        p_email: "admin@ordax.com",
        p_sms: null,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("rejects threshold below 1 before calling the RPC", async () => {
      await expect(
        configureAlert(MOCK_CYCLE_ID, {
          threshold: 0,
          email: null,
          sms: null,
        }),
      ).rejects.toThrow("Alert threshold must be between 1 and 100");

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rejects threshold above 100 before calling the RPC", async () => {
      await expect(
        configureAlert(MOCK_CYCLE_ID, {
          threshold: 101,
          email: null,
          sms: null,
        }),
      ).rejects.toThrow("Alert threshold must be between 1 and 100");

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rejects SMS configuration until a server-side SMS provider exists", async () => {
      await expect(
        configureAlert(MOCK_CYCLE_ID, {
          threshold: 75,
          email: "admin@ordax.com",
          sms: "+5571999999999",
        }),
      ).rejects.toThrow(
        "SMS capacity alerts require a configured server-side SMS provider",
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("accepts null email and sms values", async () => {
      mockRpcResult({
        threshold: 75,
        email: null,
        sms: null,
      });

      await configureAlert(MOCK_CYCLE_ID, {
        threshold: 75,
        email: null,
        sms: null,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("configure_capacity_alert", {
        p_cycle_id: MOCK_CYCLE_ID,
        p_threshold: 75,
        p_email: null,
        p_sms: null,
      });
    });
  });

  describe("getAlertConfig", () => {
    it("returns alert configuration from canonical alert columns", async () => {
      const query = mockCycleQuery({
        alert_threshold: 85,
        alert_email: "test@ordax.com",
        alert_sms: "+5571888888888",
      });

      const config = await getAlertConfig(MOCK_CYCLE_ID);

      expect(config).toEqual({
        threshold: 85,
        email: "test@ordax.com",
        sms: "+5571888888888",
      });
      expect(query.select).toHaveBeenCalledWith(
        "alert_threshold, alert_email, alert_sms",
      );
      expect(query.eq).toHaveBeenCalledWith("id", MOCK_CYCLE_ID);
    });

    it("returns default threshold when the cycle has no configured threshold", async () => {
      mockCycleQuery({
        alert_threshold: null,
        alert_email: null,
        alert_sms: null,
      });

      await expect(getAlertConfig(MOCK_CYCLE_ID)).resolves.toEqual({
        threshold: 80,
        email: null,
        sms: null,
      });
    });

    it("throws a scoped error when the cycle query fails", async () => {
      mockCycleQuery(null, { message: "Database error" });

      await expect(getAlertConfig(MOCK_CYCLE_ID)).rejects.toThrow(
        "Failed to get alert config: Database error",
      );
    });
  });

  describe("getAlertStatus", () => {
    it("calculates current percentage from canonical capacity columns", async () => {
      const query = mockCycleQuery({
        alert_triggered: false,
        alert_triggered_at: null,
        alert_threshold: 80,
        used_capacity: 75,
        capacity: 100,
      });

      const status = await getAlertStatus(MOCK_CYCLE_ID);

      expect(status).toEqual({
        triggered: false,
        triggeredAt: null,
        currentPercentage: 75,
        threshold: 80,
      });
      expect(query.select).toHaveBeenCalledWith(
        "alert_triggered, alert_triggered_at, alert_threshold, used_capacity, capacity",
      );
    });

    it("handles triggered alerts", async () => {
      const triggeredAt = new Date("2026-03-15T10:00:00.000Z");
      mockCycleQuery({
        alert_triggered: true,
        alert_triggered_at: triggeredAt.toISOString(),
        alert_threshold: 80,
        used_capacity: 85,
        capacity: 100,
      });

      const status = await getAlertStatus(MOCK_CYCLE_ID);

      expect(status.triggered).toBe(true);
      expect(status.triggeredAt).toEqual(triggeredAt);
      expect(status.currentPercentage).toBe(85);
    });

    it("rejects alert status when canonical capacity is missing", async () => {
      mockCycleQuery({
        alert_triggered: null,
        alert_triggered_at: null,
        alert_threshold: null,
        used_capacity: null,
        capacity: null,
      });

      await expect(getAlertStatus(MOCK_CYCLE_ID)).rejects.toThrow(
        `Cycle ${MOCK_CYCLE_ID} capacity is missing or invalid`,
      );
    });
  });

  describe("checkAndTriggerAlert", () => {
    it("returns true when the server-side alert policy triggers", async () => {
      mockRpcResult(true);

      const result = await checkAndTriggerAlert(MOCK_CYCLE_ID);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith("check_capacity_alert", {
        p_cycle_id: MOCK_CYCLE_ID,
      });
    });

    it("returns false when the server-side alert policy does not trigger", async () => {
      mockRpcResult(false);

      await expect(checkAndTriggerAlert(MOCK_CYCLE_ID)).resolves.toBe(false);
    });
  });

  describe("resetAlert", () => {
    it("resets alert through the canonical RPC", async () => {
      mockRpcResult(true);

      await resetAlert(MOCK_CYCLE_ID);

      expect(supabase.rpc).toHaveBeenCalledWith("reset_capacity_alert", {
        p_cycle_id: MOCK_CYCLE_ID,
      });
    });

    it("throws the RPC error when reset fails", async () => {
      mockRpcResult(null, { message: "Database error" });

      await expect(resetAlert(MOCK_CYCLE_ID)).rejects.toThrow("Database error");
    });
  });
});
