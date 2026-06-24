import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import {
  normalizeAddressBR,
  type AddressBR,
  type ProfileRow,
} from "@/lib/profile";

export interface CustomerProfileData {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  username?: string;
  display_name?: string;
  collector_level?: number;
  pieces_owned?: number;
  total_spent?: number;
}

function textOrUndefined(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatStreetAddress(address: AddressBR | null | undefined): string | undefined {
  if (!address) return undefined;

  const street = textOrUndefined(address.rua);
  const number = textOrUndefined(address.numero);
  const complement = textOrUndefined(address.complemento);
  const neighborhood = textOrUndefined(address.bairro);

  const line = [street, number].filter(Boolean).join(", ");
  const suffix = [complement, neighborhood].filter(Boolean).join(" - ");
  const formatted = [line, suffix].filter(Boolean).join(" - ");

  return formatted || undefined;
}

function normalizeCustomerProfile(row: ProfileRow): CustomerProfileData {
  const normalizedAddress = normalizeAddressBR(row.delivery_address, row.address);

  return {
    id: row.id,
    email: textOrUndefined(row.email),
    full_name: textOrUndefined(row.full_name),
    phone: textOrUndefined(row.phone ?? row.whatsapp),
    cpf: textOrUndefined(row.cpf),
    address: formatStreetAddress(normalizedAddress),
    city: textOrUndefined(normalizedAddress?.cidade),
    state: textOrUndefined(normalizedAddress?.uf),
    zip_code: textOrUndefined(normalizedAddress?.cep),
    created_at: row.created_at ?? "",
    username: textOrUndefined(row.username),
    display_name: textOrUndefined(row.display_name),
    collector_level: row.collector_level ?? undefined,
    pieces_owned: row.pieces_owned ?? undefined,
    total_spent: row.total_spent ?? undefined,
  };
}

export async function fetchCustomerProfile(userId: string): Promise<CustomerProfileData | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    log.error("Erro ao buscar perfil do cliente", { error, userId });
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeCustomerProfile(data as unknown as ProfileRow);
}
