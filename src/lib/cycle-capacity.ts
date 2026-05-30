export interface CycleCapacityColumns {
  capacity?: unknown;
  used_capacity?: unknown;
  capacity_max?: unknown;
  capacity_current?: unknown;
  capacity_limit?: unknown;
  reserved_capacity?: unknown;
}

export interface ResolvedCycleCapacity {
  capacity: number;
  usedCapacity: number;
  available: number;
  percentage: number;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return null;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstFiniteNumber(values: unknown[]): number | null {
  for (const value of values) {
    const parsed = toFiniteNumber(value);
    if (parsed !== null) return parsed;
  }

  return null;
}

export function resolveCycleCapacity(
  row: CycleCapacityColumns,
  label = "Cycle",
): ResolvedCycleCapacity {
  const capacity = firstFiniteNumber([
    row.capacity,
    row.capacity_max,
    row.capacity_limit,
  ]);

  if (capacity === null || capacity < 1) {
    throw new Error(`${label} capacity is missing or invalid`);
  }

  const usedCapacity =
    firstFiniteNumber([
      row.used_capacity,
      row.capacity_current,
      row.reserved_capacity,
    ]) ?? 0;

  if (usedCapacity < 0) {
    throw new Error(`${label} used capacity is invalid`);
  }

  return {
    capacity,
    usedCapacity,
    available: Math.max(0, capacity - usedCapacity),
    percentage: Math.round((usedCapacity / capacity) * 100),
  };
}
