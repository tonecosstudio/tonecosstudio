import { beforeEach, describe, expect, it, vi } from "vitest";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  addHolidayRpc,
  deleteHolidayRpc,
  updateHolidayRpc,
} from "./holiday-mutations-service";

vi.mock("@/services/admin/rpc/admin-rpc-gateway", () => ({
  callAdminRpc: vi.fn(),
}));

const callAdminRpcMock = vi.mocked(callAdminRpc);
const holidayId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function holidayRow(overrides: Record<string, unknown> = {}) {
  return {
    id: holidayId,
    holiday_date: "2026-09-07",
    name: "Independencia do Brasil",
    description: null,
    type: "national",
    state_code: null,
    is_recurring: true,
    ...overrides,
  };
}

describe("holiday-mutations-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds holiday creation to normalized requested fields", async () => {
    callAdminRpcMock.mockResolvedValue(holidayRow());

    await expect(
      addHolidayRpc({
        holiday_date: "2026-09-07",
        name: "  Independencia do Brasil  ",
        type: "national",
        is_recurring: true,
      }),
    ).resolves.toMatchObject({
      id: holidayId,
      holiday_date: "2026-09-07",
      name: "Independencia do Brasil",
      type: "national",
      state_code: null,
      is_recurring: true,
    });
  });

  it("normalizes state code for state holiday creation", async () => {
    callAdminRpcMock.mockResolvedValue(
      holidayRow({ type: "state", state_code: "BA", name: "Feriado estadual" }),
    );

    await expect(
      addHolidayRpc({
        holiday_date: "2026-09-07",
        name: "Feriado estadual",
        type: "state",
        state_code: "ba",
        is_recurring: true,
      }),
    ).resolves.toMatchObject({ type: "state", state_code: "BA" });
  });

  it.each([
    null,
    {},
    holidayRow({ id: "invalid" }),
    holidayRow({ holiday_date: "07/09/2026" }),
    holidayRow({ name: "Outro" }),
    holidayRow({ type: "state", state_code: null }),
    holidayRow({ type: "national", state_code: "BA" }),
  ])("rejects malformed or mismatched holiday creation data %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value as never);

    await expect(
      addHolidayRpc({
        holiday_date: "2026-09-07",
        name: "Independencia do Brasil",
        type: "national",
        is_recurring: true,
      }),
    ).rejects.toThrow();
  });

  it("binds holiday update to requested id and changed fields", async () => {
    callAdminRpcMock.mockResolvedValue(
      holidayRow({ name: "Independencia", is_recurring: false }),
    );

    await expect(
      updateHolidayRpc(holidayId, {
        name: "  Independencia  ",
        is_recurring: false,
      }),
    ).resolves.toMatchObject({
      id: holidayId,
      name: "Independencia",
      is_recurring: false,
    });
  });

  it.each([
    holidayRow({ id: otherId, name: "Independencia" }),
    holidayRow({ name: "Outro" }),
    holidayRow({ name: "Independencia", is_recurring: true }),
  ])("rejects holiday update data inconsistent with the request %#", async (value) => {
    callAdminRpcMock.mockResolvedValue(value);

    await expect(
      updateHolidayRpc(holidayId, {
        name: "Independencia",
        is_recurring: false,
      }),
    ).rejects.toThrow();
  });

  it("requires delete to return the deleted holiday row with matching id", async () => {
    callAdminRpcMock.mockResolvedValue(holidayRow());
    await expect(deleteHolidayRpc(holidayId)).resolves.toMatchObject({ id: holidayId });

    callAdminRpcMock.mockResolvedValue(holidayRow({ id: otherId }));
    await expect(deleteHolidayRpc(holidayId)).rejects.toThrow(
      "Holiday deletion returned an unexpected resource id",
    );
  });

  it("preserves the operation prefix when the gateway fails", async () => {
    callAdminRpcMock.mockRejectedValue(new Error("backend down"));

    await expect(
      updateHolidayRpc(holidayId, { name: "Independencia" }),
    ).rejects.toThrow("Failed to update holiday: backend down");
  });
});
