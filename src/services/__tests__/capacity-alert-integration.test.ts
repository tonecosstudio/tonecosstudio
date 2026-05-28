import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  checkAndTriggerAlert,
  configureAlert,
  getAlertStatus,
  resetAlert,
} from "../capacity-alert-service";
import {
  getCapacityUsage,
  reserveCapacity,
} from "../capacity-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

type RpcResult<T = unknown> = Promise<{
  data: T | null;
  error: { message: string } | null;
}>;

type CycleState = {
  id: string;
  capacity: number;
  used_capacity: number;
  alert_threshold: number;
  alert_email: string | null;
  alert_sms: string | null;
  alert_triggered: boolean;
  alert_triggered_at: string | null;
};

const TEST_CYCLE_ID = "cycle-2026-03";
const TEST_ALERT_TRIGGERED_AT = "2026-03-10T12:00:00.000Z";

let cycle: CycleState;

function createCycleState(): CycleState {
  return {
    id: TEST_CYCLE_ID,
    capacity: 100,
    used_capacity: 0,
    alert_threshold: 80,
    alert_email: null,
    alert_sms: null,
    alert_triggered: false,
    alert_triggered_at: null,
  };
}

function getCurrentPercentage(): number {
  return cycle.capacity > 0
    ? Math.round((cycle.used_capacity / cycle.capacity) * 100)
    : 0;
}

function applyAlertPolicy(): void {
  if (cycle.alert_triggered) {
    return;
  }

  if (getCurrentPercentage() >= cycle.alert_threshold) {
    cycle.alert_triggered = true;
    cycle.alert_triggered_at = TEST_ALERT_TRIGGERED_AT;
  }
}

function success<T>(data: T): RpcResult<T> {
  return Promise.resolve({ data, error: null });
}

function failure(message: string): RpcResult {
  return Promise.resolve({ data: null, error: { message } });
}

function mockCycleQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => success({ ...cycle })),
  };
}

function handleRpc(name: string, args: Record<string, unknown> = {}): RpcResult {
  if (args.p_cycle_id && args.p_cycle_id !== TEST_CYCLE_ID) {
    return failure(`Unknown cycle: ${String(args.p_cycle_id)}`);
  }

  switch (name) {
    case "configure_capacity_alert":
      cycle.alert_threshold = Number(args.p_threshold);
      cycle.alert_email = args.p_email as string | null;
      cycle.alert_sms = args.p_sms as string | null;
      cycle.alert_triggered = false;
      cycle.alert_triggered_at = null;
      return success({
        threshold: cycle.alert_threshold,
        email: cycle.alert_email,
        sms: cycle.alert_sms,
      });

    case "reserve_capacity": {
      const quantity = Number(args.p_quantity);
      const nextUsedCapacity = cycle.used_capacity + quantity;

      if (nextUsedCapacity > cycle.capacity) {
        return failure("Capacity limit exceeded");
      }

      cycle.used_capacity = nextUsedCapacity;
      applyAlertPolicy();
      return success(true);
    }

    case "check_capacity_alert":
      applyAlertPolicy();
      return success(cycle.alert_triggered);

    case "reset_capacity_alert":
      cycle.alert_triggered = false;
      cycle.alert_triggered_at = null;
      return success(true);

    default:
      return failure(`Unexpected RPC call: ${name}`);
  }
}

describe("Capacity Alert Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cycle = createCycleState();
    (supabase.from as Mock).mockImplementation((table: string) => {
      if (table !== "cycles") {
        throw new Error(`Unexpected table query: ${table}`);
      }

      return mockCycleQuery();
    });
    (supabase.rpc as Mock).mockImplementation(handleRpc);
  });

  it("triggers the alert when reserved capacity reaches the configured threshold", async () => {
    await configureAlert(TEST_CYCLE_ID, {
      threshold: 80,
      email: "ops@ordax.com",
      sms: null,
    });

    expect(await getAlertStatus(TEST_CYCLE_ID)).toEqual({
      triggered: false,
      triggeredAt: null,
      currentPercentage: 0,
      threshold: 80,
    });

    await reserveCapacity(TEST_CYCLE_ID, 80, "subscription-1");

    expect(await getCapacityUsage(TEST_CYCLE_ID)).toEqual({
      max: 100,
      current: 80,
      available: 20,
      percentage: 80,
      reserved: 0,
    });

    const status = await getAlertStatus(TEST_CYCLE_ID);
    expect(status.triggered).toBe(true);
    expect(status.triggeredAt?.toISOString()).toBe(TEST_ALERT_TRIGGERED_AT);
    expect(status.currentPercentage).toBe(80);
  });

  it("keeps the alert inactive while capacity remains below threshold", async () => {
    await configureAlert(TEST_CYCLE_ID, {
      threshold: 80,
      email: "ops@ordax.com",
      sms: null,
    });

    await reserveCapacity(TEST_CYCLE_ID, 70, "subscription-1");

    const status = await getAlertStatus(TEST_CYCLE_ID);
    expect(status.triggered).toBe(false);
    expect(status.triggeredAt).toBeNull();
    expect(status.currentPercentage).toBe(70);
  });

  it("triggers the alert when capacity exceeds threshold", async () => {
    await configureAlert(TEST_CYCLE_ID, {
      threshold: 75,
      email: "ops@ordax.com",
      sms: null,
    });

    await reserveCapacity(TEST_CYCLE_ID, 85, "subscription-1");

    const status = await getAlertStatus(TEST_CYCLE_ID);
    expect(status.triggered).toBe(true);
    expect(status.currentPercentage).toBe(85);
    expect(status.threshold).toBe(75);
  });

  it("does not retrigger an alert that is already marked as triggered", async () => {
    await configureAlert(TEST_CYCLE_ID, {
      threshold: 80,
      email: "ops@ordax.com",
      sms: null,
    });

    await reserveCapacity(TEST_CYCLE_ID, 80, "subscription-1");
    const firstStatus = await getAlertStatus(TEST_CYCLE_ID);

    await reserveCapacity(TEST_CYCLE_ID, 10, "subscription-2");
    await checkAndTriggerAlert(TEST_CYCLE_ID);
    const secondStatus = await getAlertStatus(TEST_CYCLE_ID);

    expect(secondStatus.triggered).toBe(true);
    expect(secondStatus.triggeredAt?.toISOString()).toBe(firstStatus.triggeredAt?.toISOString());
    expect(secondStatus.currentPercentage).toBe(90);
  });

  it("clears triggered state without changing capacity usage when reset", async () => {
    await configureAlert(TEST_CYCLE_ID, {
      threshold: 80,
      email: "ops@ordax.com",
      sms: null,
    });

    await reserveCapacity(TEST_CYCLE_ID, 80, "subscription-1");
    await resetAlert(TEST_CYCLE_ID);

    const status = await getAlertStatus(TEST_CYCLE_ID);
    const usage = await getCapacityUsage(TEST_CYCLE_ID);

    expect(status.triggered).toBe(false);
    expect(status.triggeredAt).toBeNull();
    expect(status.currentPercentage).toBe(80);
    expect(usage.current).toBe(80);
  });

  it("rejects SMS alert configuration before calling the mutation RPC", async () => {
    await expect(
      configureAlert(TEST_CYCLE_ID, {
        threshold: 80,
        email: "ops@ordax.com",
        sms: "+5511999999999",
      })
    ).rejects.toThrow("SMS capacity alerts require a configured server-side SMS provider");

    expect(supabase.rpc).not.toHaveBeenCalledWith(
      "configure_capacity_alert",
      expect.anything()
    );
  });
});
