import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
  address: AddressBR | null;
  delivery_address: DeliveryAddress | null;
  preferences_text: string | null;
  preference_tags: string[] | null;
  full_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  email_notifications?: boolean;
  order_updates?: boolean;
  marketing_emails?: boolean;
  profile_completion?: number;
  created_at?: string;
  updated_at?: string;
};

type ProfileUpsertInput = {
  id: string;
  delivery_address?: Json | null;
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
};

export async function getMyProfile(userId: string) {
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
  const { address: _address, delivery_address, ...profileInput } = input;
  const upsertInput: ProfileUpsertInput = {
    ...profileInput,
    delivery_address: delivery_address as Json | null | undefined,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(upsertInput, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as ProfileRow;
}

export async function analyzePreferencesWithAI(preferencesText: string) {
  const { data, error } = await supabase.functions.invoke("analyze-preferences", {
    body: { text: preferencesText },
  });
  if (error) throw error;
  return data as { tags: string[] };
}
