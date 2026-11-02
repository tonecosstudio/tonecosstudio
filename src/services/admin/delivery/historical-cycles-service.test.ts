import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHistoricalCycles } from "./historical-cycles-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  resolveCycleCapacity: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/lib/cycle-capacity", () => ({
  resolveCycleCapacity: mocks.resolveCycleCapacity,
}));

type ReadResult = { data: unknown; error: { message: string } | null };

function queryReturning(response: ReadResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    then: (
      resolve: (value: ReadResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [query.select, query.eq, query.or].forEach((fn) => fn.mockReturnValue(query));
  mocks.from.mockReturnValue(query);
  return query;
}

const filters = {
  selectedYear: "all" as const,
  selectedStatus: "all",
  currentYear: 2026,
  currentMonth: 11,
};

const cycle = {
  id: "cycle-1",
  cycle_number: 1,
  month: 10,
  year: 2026,
  open_start: "2026-10-01",
  open_end: "2026-10-10",
  production_start: "2026-10-11",
  production_end: "2026-10-20",
  shipping_date: "2026-10-25",
  status: "completed",
  status_changed_at: "2026-10-25",
  capacity: 20,
  used_capacity: 4,
  created_at: "2026-09-01",
};

describe("historical cycles — only past, validated production cycles", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.resolveCycleCapacity.mockReturnValue({ capacity: 20, usedCapacity: 4 });
  });

  it("restricts results to cycles before the current Bahia calendar month", async () => {
    const query = queryReturning({ data: [cycle], error: null });
    const result = await fetchHistoricalCycles(filters);
    expect(result).toMatchObject([{
      id: "cycle-1",
      cycle_number: 1,
      capacity: 20,
      used_capacity: 4,
      capacity_max: 20,
      capacity_current: 4,
      status: "completed",
    }]);
    expect(query.or).toHaveBeenCalledExactlyOnceWith(
      "year.lt.2026,and(year.eq.2026,month.lt.11)",
    );
    expect(mocks.resolveCycleCapacity).toHaveBeenCalledWith(
      cycle, "Historical cycle",
    );
  });

  it("applies both explicit year and status conditions to the source query", async () => {
    const query = queryReturning({ data: [cycle], error: null });
    await fetchHistoricalCycles({
      ...filters, selectedYear: 2026, selectedStatus: "completed",
    });
    expect(query.eq).toHaveBeenCalledWith("year", 2026);
    expect(query.eq).toHaveBeenCalledWith("status", "completed");
  });

  it("never submits unknown cycle statuses to the database", async () => {
    const query = queryReturning({ data: [], error: null });
    await expect(fetchHistoricalCycles({
      ...filters, selectedStatus: "unapproved",
    })).rejects.toThrow("Status de ciclo invalido");
    expect(query.or).not.toHaveBeenCalled();
  });

  it.each([
    "open", "active", "sales", "production", "shipping",
    "completed", "cancelled",
  ])("accepts a canonical cycle status %s", async (selectedStatus) => {
    const query = queryReturning({ data: [], error: null });
    await fetchHistoricalCycles({ ...filters, selectedStatus });
    expect(query.eq).toHaveBeenCalledWith("status", selectedStatus);
  });

  it("returns an empty history when no previous cycles exist", async () => {
    queryReturning({ data: null, error: null });
    await expect(fetchHistoricalCycles(filters)).resolves.toEqual([]);
  });

  it("propagates database failures instead of displaying a fake cycle", async () => {
    queryReturning({ data: null, error: { message: "denied" } });
    await expect(fetchHistoricalCycles(filters)).rejects.toMatchObject({
      message: "denied",
    });
  });

  it.each([0, 3, null])("rejects invalid official cycle numbers %#", async (cycle_number) => {
    queryReturning({ data: [{ ...cycle, cycle_number }], error: null });
    await expect(fetchHistoricalCycles(filters)).rejects.toThrow(
      "has invalid cycle_number",
    );
  });

  it("rejects cycles missing their official status", async () => {
    queryReturning({ data: [{ ...cycle, status: null }], error: null });
    await expect(fetchHistoricalCycles(filters)).rejects.toThrow(
      "has no status",
    );
  });

  it("propagates invalid capacity rather than inventing available slots", async () => {
    queryReturning({ data: [cycle], error: null });
    mocks.resolveCycleCapacity.mockImplementationOnce(() => {
      throw new Error("capacity invalid");
    });
    await expect(fetchHistoricalCycles(filters)).rejects.toThrow("capacity invalid");
  });
});
