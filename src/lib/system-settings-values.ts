export function parseSystemSettingNumber(key: string, value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Invalid numeric system setting: ${key}`);
}

export function parseSystemSettingInteger(key: string, value: unknown): number {
  return Math.trunc(parseSystemSettingNumber(key, value));
}

export function parseSystemSettingString(key: string, value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  throw new Error(`Invalid scalar system setting: ${key}`);
}
