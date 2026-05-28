import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { assertCurrentUserId } from "@/services/auth/current-user";
import { upsertCurrentUserProfileRpc } from "@/services/customer-account-mutations-service";

export type AddressBR = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

export type DeliveryAddress = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
};

export type ProfileRow = {
  id: string;
  address?: AddressBR | null;
  delivery_address: DeliveryAddress | null;
  preferences_text: string | null;
  preference_tags: string[] | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  role?: string | null;
  email_notifications?: boolean;
  order_updates?: boolean;
  marketing_emails?: boolean;
  profile_completion?: number;
  collector_level?: number;
  collector_xp?: number;
  pieces_owned?: number;
  total_spent?: number;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

function textOrUndefined(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeAddressBR(
  deliveryAddress: DeliveryAddress | null | undefined,
  legacyAddress?: AddressBR | null,
): AddressBR | null {
  const normalized: AddressBR = {
    cep: textOrUndefined(legacyAddress?.cep ?? deliveryAddress?.zipCode),
    rua: textOrUndefined(legacyAddress?.rua ?? deliveryAddress?.street),
    numero: textOrUndefined(legacyAddress?.numero ?? deliveryAddress?.number),
    complemento: textOrUndefined(legacyAddress?.complemento ?? deliveryAddress?.complement),
    bairro: textOrUndefined(legacyAddress?.bairro ?? deliveryAddress?.neighborhood),
    cidade: textOrUndefined(legacyAddress?.cidade ?? deliveryAddress?.city),
    uf: textOrUndefined(legacyAddress?.uf ?? deliveryAddress?.state),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
}

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
    }).filter(([, value]) => value !== undefined)
  ) as Record<string, Json>;

  delete payload.id;

  const data = await upsertCurrentUserProfileRpc(payload);
  return data as unknown as ProfileRow;
}

export async function analyzePreferencesWithAI(preferencesText: string) {
  const { data, error } = await supabase.functions.invoke("analyze-preferences", {
    body: { text: preferencesText },
  });
  if (error) throw error;
  return data as { tags: string[] };
}
