import { describe, expect, it } from "vitest";

import { resolveCycleCapacity } from "./cycle-capacity";

describe("resolveCycleCapacity", () => {
  it("resolves canonical cycle capacity fields", () => {
    expect(
      resolveCycleCapacity({
        capacity: 100,
        used_capacity: 32,
      }),
    ).toEqual({
      capacity: 100,
      usedCapacity: 32,
      available: 68,
      percentage: 32,
    });
  });

  it("uses legacy capacity aliases without introducing local defaults", () => {
    expect(
      resolveCycleCapacity({
        capacity_max: "80",
        capacity_current: "20",
      }),
    ).toEqual({
      capacity: 80,
      usedCapacity: 20,
      available: 60,
      percentage: 25,
    });
  });

  it("defaults missing used capacity to zero only when total capacity exists", () => {
    expect(resolveCycleCapacity({ capacity: 50 })).toEqual({
      capacity: 50,
      usedCapacity: 0,
      available: 50,
      percentage: 0,
    });
  });

  it("rejects missing total capacity instead of applying a magic fallback", () => {
    expect(() => resolveCycleCapacity({}, "Cycle abc")).toThrow(
      "Cycle abc capacity is missing or invalid",
    );
  });

  it("rejects invalid total capacity values", () => {
    expect(() => resolveCycleCapacity({ capacity: 0 }, "Cycle abc")).toThrow(
      "Cycle abc capacity is missing or invalid",
    );
    expect(() =>
      resolveCycleCapacity({ capacity: "not-a-number" }, "Cycle abc"),
    ).toThrow("Cycle abc capacity is missing or invalid");
  });

  it("rejects invalid used capacity values", () => {
    expect(() =>
      resolveCycleCapacity(
        {
          capacity: 100,
          used_capacity: -1,
        },
        "Cycle abc",
      ),
    ).toThrow("Cycle abc used capacity is invalid");
  });
});
