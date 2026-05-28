import { supabase } from "@/integrations/supabase/client";

interface RpcError {
  message: string;
}

type RpcResult<T> = Promise<{ data: T | null; error: RpcError | null }>;

interface HolidayRpcClient {
  rpc(
    name: "admin_add_holiday",
    args: {
      p_holiday_date: string;
      p_name: string;
      p_description?: string | null;
      p_type: string;
      p_state_code?: string | null;
      p_is_recurring: boolean;
    }
  ): RpcResult<unknown>;
  rpc(
    name: "admin_update_holiday",
    args: {
      p_holiday_id: string;
      p_holiday_date?: string | null;
      p_name?: string | null;
      p_description?: string | null;
      p_type?: string | null;
      p_state_code?: string | null;
      p_is_recurring?: boolean | null;
    }
  ): RpcResult<unknown>;
  rpc(name: "admin_delete_holiday", args: { p_holiday_id: string }): RpcResult<unknown>;
}

const holidayRpc = supabase as unknown as HolidayRpcClient;

function unwrapRpc<T>(prefix: string, data: unknown, error: RpcError | null): T {
  if (error) {
    throw new Error(`${prefix}: ${error.message}`);
  }

  return data as T;
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
  const { data, error } = await holidayRpc.rpc("admin_add_holiday", {
    p_holiday_date: holiday.holiday_date,
    p_name: holiday.name,
    p_description: holiday.description ?? null,
    p_type: holiday.type,
    p_state_code: holiday.state_code ?? null,
    p_is_recurring: holiday.is_recurring ?? false,
  });

  return unwrapRpc<THoliday>("Failed to add holiday", data, error);
}

export async function updateHolidayRpc<THoliday>(
  holidayId: string,
  holiday: Partial<HolidayMutationPayload>
): Promise<THoliday> {
  const { data, error } = await holidayRpc.rpc("admin_update_holiday", {
    p_holiday_id: holidayId,
    p_holiday_date: holiday.holiday_date ?? null,
    p_name: holiday.name ?? null,
    p_description: holiday.description ?? null,
    p_type: holiday.type ?? null,
    p_state_code: holiday.state_code ?? null,
    p_is_recurring: holiday.is_recurring ?? null,
  });

  return unwrapRpc<THoliday>("Failed to update holiday", data, error);
}

export async function deleteHolidayRpc<THoliday>(holidayId: string): Promise<THoliday> {
  const { data, error } = await holidayRpc.rpc("admin_delete_holiday", {
    p_holiday_id: holidayId,
  });

  return unwrapRpc<THoliday>("Failed to delete holiday", data, error);
}
