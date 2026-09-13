import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

export interface HolidayMutationPayload {
  holiday_date: string;
  name: string;
  description?: string | null;
  type: "national" | "state";
  state_code?: string | null;
  is_recurring?: boolean;
}

type HolidayMutationRow = {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  type: "national" | "state";
  state_code: string | null;
  is_recurring: boolean;
};

function normalizedOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireHolidayRow(
  value: unknown,
  operation: string,
  expectedId?: string,
): HolidayMutationRow {
  const record = expectedId
    ? requireAdminRpcRecordMatchingId(value, expectedId, operation)
    : requireAdminRpcRecord(value, operation);

  const id = expectedId ?? requireAdminRpcUuid(record.id, operation);

  if (
    typeof record.holiday_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.holiday_date) ||
    typeof record.name !== "string" ||
    !record.name.trim() ||
    (record.description !== null && typeof record.description !== "string") ||
    (record.type !== "national" && record.type !== "state") ||
    (record.state_code !== null &&
      (typeof record.state_code !== "string" || !/^[A-Z]{2}$/.test(record.state_code))) ||
    typeof record.is_recurring !== "boolean"
  ) {
    throw new Error(`${operation} returned invalid holiday data`);
  }

  if (
    (record.type === "national" && record.state_code !== null) ||
    (record.type === "state" && record.state_code === null)
  ) {
    throw new Error(`${operation} returned inconsistent holiday data`);
  }

  return {
    id,
    holiday_date: record.holiday_date,
    name: record.name,
    description: (record.description as string | null) ?? null,
    type: record.type,
    state_code: (record.state_code as string | null) ?? null,
    is_recurring: record.is_recurring,
  };
}

function assertHolidayMatchesPayload(
  row: HolidayMutationRow,
  holiday: Partial<HolidayMutationPayload>,
  operation: string,
  mode: "create" | "update",
): void {
  if (holiday.holiday_date !== undefined && row.holiday_date !== holiday.holiday_date) {
    throw new Error(`${operation} returned an unexpected holiday_date`);
  }

  if (holiday.name !== undefined && row.name !== holiday.name.trim()) {
    throw new Error(`${operation} returned an unexpected name`);
  }

  if (
    holiday.description !== undefined &&
    row.description !== normalizedOptionalText(holiday.description)
  ) {
    throw new Error(`${operation} returned an unexpected description`);
  }

  if (holiday.type !== undefined && row.type !== holiday.type) {
    throw new Error(`${operation} returned an unexpected type`);
  }

  if (
    holiday.is_recurring !== undefined &&
    row.is_recurring !== holiday.is_recurring
  ) {
    throw new Error(`${operation} returned an unexpected recurring flag`);
  }

  const expectedType = holiday.type ?? (mode === "create" ? "national" : undefined);
  if (expectedType === "national") {
    if (row.state_code !== null) {
      throw new Error(`${operation} returned an unexpected state_code`);
    }
  } else if (holiday.state_code !== undefined) {
    const expectedState = normalizedOptionalText(holiday.state_code)?.toUpperCase() ?? null;
    if (row.state_code !== expectedState) {
      throw new Error(`${operation} returned an unexpected state_code`);
    }
  }
}

async function callHolidayAdminRpc(
  functionName: string,
  args: Record<string, unknown>,
  prefix: string,
): Promise<unknown> {
  try {
    return await callAdminRpc<unknown>(functionName, args);
  } catch (error) {
    throw new Error(
      `${prefix}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function addHolidayRpc<THoliday>(
  holiday: HolidayMutationPayload
): Promise<THoliday> {
  const value = await callHolidayAdminRpc(
    "admin_add_holiday",
    {
      p_holiday_date: holiday.holiday_date,
      p_name: holiday.name,
      p_description: holiday.description ?? null,
      p_type: holiday.type,
      p_state_code: holiday.state_code ?? null,
      p_is_recurring: holiday.is_recurring ?? false,
    },
    "Failed to add holiday",
  );
  const row = requireHolidayRow(value, "Holiday creation");

  assertHolidayMatchesPayload(
    row,
    { ...holiday, is_recurring: holiday.is_recurring ?? false },
    "Holiday creation",
    "create",
  );
  return row as unknown as THoliday;
}

export async function updateHolidayRpc<THoliday>(
  holidayId: string,
  holiday: Partial<HolidayMutationPayload>
): Promise<THoliday> {
  const value = await callHolidayAdminRpc(
    "admin_update_holiday",
    {
      p_holiday_id: holidayId,
      p_holiday_date: holiday.holiday_date ?? null,
      p_name: holiday.name ?? null,
      p_description: holiday.description ?? null,
      p_type: holiday.type ?? null,
      p_state_code: holiday.state_code ?? null,
      p_is_recurring: holiday.is_recurring ?? null,
    },
    "Failed to update holiday",
  );
  const row = requireHolidayRow(value, "Holiday update", holidayId);

  assertHolidayMatchesPayload(row, holiday, "Holiday update", "update");
  return row as unknown as THoliday;
}

export async function deleteHolidayRpc<THoliday>(holidayId: string): Promise<THoliday> {
  const value = await callHolidayAdminRpc(
    "admin_delete_holiday",
    {
      p_holiday_id: holidayId,
    },
    "Failed to delete holiday",
  );

  return requireHolidayRow(value, "Holiday deletion", holidayId) as unknown as THoliday;
}
