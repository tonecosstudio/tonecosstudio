import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { upsertCurrentUserProfileRpc } from "@/services/customer/customer-account-mutations-service";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import type { AddressBR, DeliveryAddress, ProfileRow } from "@/lib/profile";

export async function getMyProfile(userId: string) {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as ProfileRow | null;
}

export async function upsertMyProfile(input: {
  id: string;
  address?: AddressBR | null;
  delivery_address?: DeliveryAddress | null;
  preferences_text?: string | null;
  preference_tags?: string[] | null;
  full_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  email_notifications?: boolean;
  order_updates?: boolean;
  marketing_emails?: boolean;
}) {
  await assertCurrentUserId(input.id);

  const { address: _address, delivery_address, ...profileInput } = input;
  const payload = Object.fromEntries(
    Object.entries({
      ...profileInput,
      delivery_address: delivery_address as Json | null | undefined,
    }).filter(([, value]) => value !== undefined),
  ) as Record<string, Json>;

  delete payload.id;

  const data = await upsertCurrentUserProfileRpc(payload);
  return data as unknown as ProfileRow;
}

export async function analyzePreferencesWithAI(preferencesText: string) {
  return callAuthenticatedEdgeFunction<{ tags: string[] }>(
    "analyze-preferences",
    { text: preferencesText },
    "Erro ao analisar preferencias",
  );
}
