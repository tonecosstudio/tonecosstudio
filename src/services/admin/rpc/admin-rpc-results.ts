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
