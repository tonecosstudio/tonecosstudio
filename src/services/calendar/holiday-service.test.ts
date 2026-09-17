import { beforeEach, describe, expect, it, vi } from "vitest";
import { HolidayService, type HolidayInput } from "./holiday-service";

const mutationMocks = vi.hoisted(() => ({
  addHolidayRpc: vi.fn(),
  deleteHolidayRpc: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("./holiday-mutations-service", () => ({
  addHolidayRpc: mutationMocks.addHolidayRpc,
  deleteHolidayRpc: mutationMocks.deleteHolidayRpc,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

const holidayRow = {
  id: "test-holiday-1",
  holiday_date: "2026-12-25",
  name: "Natal",
  description: "Christmas Day",
  type: "national",
  state_code: null,
  is_recurring: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function createHolidayQuery() {
  const order = vi.fn().mockResolvedValue({ data: [holidayRow], error: null });
  const lte = vi.fn(() => ({ order }));
  const gte = vi.fn(() => ({ lte }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: { id: holidayRow.id }, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ gte, eq }));

  return { select };
}

describe("HolidayService", () => {
  let service: HolidayService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HolidayService();
    supabaseMocks.from.mockReturnValue(createHolidayQuery());
    mutationMocks.addHolidayRpc.mockResolvedValue({
      ...holidayRow,
      id: "test-holiday-new",
    });
    mutationMocks.deleteHolidayRpc.mockResolvedValue(undefined);
  });

  it("fetches and normalizes holidays for a year", async () => {
    const holidays = await service.getHolidays(2026);

    expect(holidays).toHaveLength(1);
    expect(holidays[0]).toEqual(
      expect.objectContaining({
        id: "test-holiday-1",
        name: "Natal",
        type: "national",
        holiday_date: expect.any(Date),
      }),
    );
  });

  it("rejects an invalid year", async () => {
    await expect(service.getHolidays(1999)).rejects.toThrow("Year must be between 2000 and 2100");
    await expect(service.getHolidays(2101)).rejects.toThrow("Year must be between 2000 and 2100");
  });

  it("adds a holiday through the canonical mutation service", async () => {
    const holiday: HolidayInput = {
      holiday_date: new Date("2026-12-25T12:00:00-03:00"),
      name: "Natal",
      description: "Christmas Day",
      type: "national",
      state_code: null,
      is_recurring: true,
    };

    const result = await service.addHoliday(holiday);

    expect(mutationMocks.addHolidayRpc).toHaveBeenCalledWith({
      holiday_date: "2026-12-25",
      name: "Natal",
      description: "Christmas Day",
      type: "national",
      state_code: null,
      is_recurring: true,
    });
    expect(result).toEqual(
      expect.objectContaining({ id: "test-holiday-new", name: "Natal", type: "national" }),
    );
  });

  it("deletes a holiday through the canonical mutation service", async () => {
    await service.deleteHoliday("test-holiday-1");

    expect(mutationMocks.deleteHolidayRpc).toHaveBeenCalledWith("test-holiday-1");
  });

  it("rejects an invalid delete id", async () => {
    await expect(service.deleteHoliday("")).rejects.toThrow("Holiday id is required");
    await expect(service.deleteHoliday(null as never)).rejects.toThrow("Holiday id is required");
  });

  it("detects an existing holiday", async () => {
    await expect(service.isHoliday(new Date("2026-12-25T12:00:00-03:00"))).resolves.toBe(true);
  });

  it("rejects invalid dates when checking a holiday", async () => {
    await expect(service.isHoliday(null as never)).rejects.toThrow("Valid date is required");
    await expect(service.isHoliday(new Date("invalid"))).rejects.toThrow("Valid date is required");
  });

  it("returns holiday dates as Date objects", async () => {
    const dates = await service.getHolidayDates(2026);

    expect(dates).toHaveLength(1);
    expect(dates[0]).toBeInstanceOf(Date);
  });

  it("validates the holiday date type", async () => {
    await expect(
      service.addHoliday({
        holiday_date: "2026-12-25" as never,
        name: "Test",
        description: null,
        type: "national",
        state_code: null,
        is_recurring: true,
      }),
    ).rejects.toThrow("holiday_date is required and must be a Date object");
  });

  it("validates an invalid Date value", async () => {
    await expect(
      service.addHoliday({
        holiday_date: new Date("invalid"),
        name: "Test",
        description: null,
        type: "national",
        state_code: null,
        is_recurring: true,
      }),
    ).rejects.toThrow("holiday_date must be a valid date");
  });

  it("requires a non-empty name", async () => {
    await expect(
      service.addHoliday({
        holiday_date: new Date("2026-12-25T12:00:00-03:00"),
        name: "",
        description: null,
        type: "national",
        state_code: null,
        is_recurring: true,
      }),
    ).rejects.toThrow("name is required");
  });

  it("validates holiday type and state code rules", async () => {
    const base = {
      holiday_date: new Date("2026-12-25T12:00:00-03:00"),
      name: "Test",
      description: null,
      is_recurring: true,
    };

    await expect(
      service.addHoliday({ ...base, type: "invalid" as never, state_code: null }),
    ).rejects.toThrow('type must be either "national" or "state"');

    await expect(
      service.addHoliday({ ...base, type: "national", state_code: "BA" }),
    ).rejects.toThrow("state_code must be null for national holidays");

    await expect(
      service.addHoliday({ ...base, type: "state", state_code: null }),
    ).rejects.toThrow("state_code is required for state holidays");
  });

  it("requires is_recurring to be boolean", async () => {
    await expect(
      service.addHoliday({
        holiday_date: new Date("2026-12-25T12:00:00-03:00"),
        name: "Test",
        description: null,
        type: "national",
        state_code: null,
        is_recurring: "true" as never,
      }),
    ).rejects.toThrow("is_recurring must be a boolean");
  });
});
