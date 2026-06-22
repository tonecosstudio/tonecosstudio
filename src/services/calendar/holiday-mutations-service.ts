import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";

async function callHolidayAdminRpc<T>(
  functionName: string,
  args: Record<string, unknown>,
  prefix: string,
): Promise<T> {
  try {
    return await callAdminRpc<T>(functionName, args);
  } catch (error) {
    throw new Error(
      `${prefix}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export interface HolidayMutationPayload {
  holiday_date: string;
  name: string;
  description?: string | null;
  type: "national" | "state";
  state_code?: string | null;
  is_recurring?: boolean;
}

export async function addHolidayRpc<THoliday>(
  holiday: HolidayMutationPayload
): Promise<THoliday> {
  return callHolidayAdminRpc<THoliday>(
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
}

export async function updateHolidayRpc<THoliday>(
  holidayId: string,
  holiday: Partial<HolidayMutationPayload>
): Promise<THoliday> {
  return callHolidayAdminRpc<THoliday>(
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
}

export async function deleteHolidayRpc<THoliday>(holidayId: string): Promise<THoliday> {
  return callHolidayAdminRpc<THoliday>(
    "admin_delete_holiday",
    {
      p_holiday_id: holidayId,
    },
    "Failed to delete holiday",
  );
}
