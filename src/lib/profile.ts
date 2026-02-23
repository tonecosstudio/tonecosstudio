import { supabase } from "@/integrations/supabase/client";

export type AddressBR = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

export type ProfileRow = {
  id: string;
  address: AddressBR | null;
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

export async function getMyProfile(userId: string) {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as ProfileRow | null;
}

export async function upsertMyProfile(input: {
  id: string;
  address?: AddressBR | null;
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
  const { data, error } = await (supabase as any)
    .from("profiles")
    .upsert(input, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function analyzePreferencesWithAI(preferencesText: string) {
  const { data, error } = await supabase.functions.invoke("analyze-preferences", {
    body: { text: preferencesText },
  });
  if (error) throw error;
  return data as { tags: string[] };
}
