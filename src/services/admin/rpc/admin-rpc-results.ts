const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireAdminRpcUuid(value: unknown, operation: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${operation} returned an invalid resource id`);
  }

  return value;
}

export function requireAdminRpcMatchingId(
  value: unknown,
  expectedId: string,
  operation: string,
): string {
  const id = requireAdminRpcUuid(value, operation);
  if (id !== expectedId) {
    throw new Error(`${operation} returned an unexpected resource id`);
  }

  return id;
}

export function requireAdminRpcRecord(
  value: unknown,
  operation: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${operation} returned invalid data`);
  }

  return value as Record<string, unknown>;
}

export function requireAdminRpcRecordMatchingId(
  value: unknown,
  expectedId: string,
  operation: string,
): Record<string, unknown> {
  const record = requireAdminRpcRecord(value, operation);
  requireAdminRpcMatchingId(record.id, expectedId, operation);
  return record;
}

export function requireAdminRpcIntegerField(
  value: unknown,
  field: string,
  operation: string,
  expected?: number,
): number {
  const record = requireAdminRpcRecord(value, operation);
  const count = record[field];

  if (!Number.isInteger(count) || (count as number) < 0) {
    throw new Error(`${operation} returned an invalid ${field}`);
  }

  if (expected !== undefined && count !== expected) {
    throw new Error(`${operation} returned an unexpected ${field}`);
  }

  return count as number;
}
