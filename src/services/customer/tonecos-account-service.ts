import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { isPasswordPolicyCompliant } from "@/config/auth";
import {
  resolveTonecosCustomerReturnPath,
  tonecosLoginReturnPath,
  tonecosRecoveryPath,
} from "@/config/routes";
import {
  resendSignupConfirmation,
  sendPasswordResetEmail,
  signInWithPasswordCredentials,
  signOutCurrentSession,
  signUpWithPasswordCredentials,
} from "@/services/auth/auth-session-service";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
type AccountProfile = TonecosMvpDatabase["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = TonecosMvpDatabase["public"]["Tables"]["profiles"]["Update"];
const PROFILE_SELECT = "id,email,full_name,phone,whatsapp,cpf,birth_date,delivery_address,preferred_contact_channel,quote_updates,production_updates,marketing_emails,created_at,updated_at" as const;

export type TonecosDeliveryAddress = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: "BR";
};
export type TonecosContactPreferences = {
  preferredContactChannel: "email" | "whatsapp" | "phone" | null;
  quoteUpdates: boolean;
  productionUpdates: boolean;
  marketingEmails: boolean;
};

const BRAZIL_STATES = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);


function cleanText(input: unknown, limit: number, required = false): string | null {
  if (typeof input !== "string") throw new Error("tonecos_account_input_invalid");
  const value = input.trim();
  if (value.length > limit || (required && !value)) throw new Error("tonecos_account_input_invalid");
  return value || null;
}

function validateEmail(email: string): string {
  const cleaned = cleanText(email, 320, true)!;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    throw new Error("tonecos_account_credentials_invalid");
  }
  return cleaned.toLowerCase();
}

/** Strict policy for NEW passwords, never retroactive to an existing sign-in. */
function validateRegistrationCredentials(email: string, password: string) {
  const normalizedEmail = validateEmail(email);
  if (typeof password !== "string" || !isPasswordPolicyCompliant(password) || password.length > 1024) {
    throw new Error("tonecos_account_credentials_invalid");
  }
  return { email: normalizedEmail, password };
}

function validateSignInCredentials(email: string, password: string) {
  const normalizedEmail = validateEmail(email);
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    throw new Error("tonecos_account_credentials_invalid");
  }
  return { email: normalizedEmail, password };
}

function originRedirect(path: string): string {
  if (typeof window === "undefined" || !window.location.origin ||
      (window.location.protocol !== "https:" &&
       !(import.meta.env.DEV && window.location.hostname === "localhost"))) {
    throw new Error("tonecos_auth_redirect_unavailable");
  }
  return new URL(path, window.location.origin).toString();
}

function confirmationRedirect(returnTo?: string): string {
  return originRedirect(tonecosLoginReturnPath(returnTo));
}

/** The only identity provider for Tonecos is Supabase Auth in the Tonecos project. */
export async function registerTonecosAccount(input: {
  email: string;
  password: string;
  fullName: string;
  returnTo?: string;
}): Promise<{ userId: string | null; emailConfirmationRequired: boolean }> {
  assertTonecosCommercialEnabled();
  const credentials = validateRegistrationCredentials(input.email, input.password);
  const fullName = cleanText(input.fullName, 160, true)!;
  return signUpWithPasswordCredentials({
    ...credentials, fullName,
    emailRedirectTo: confirmationRedirect(input.returnTo),
  });
}

export async function resendTonecosSignupConfirmation(
  email: string,
  returnTo?: string,
): Promise<void> {
  assertTonecosCommercialEnabled();
  const normalized = validateEmail(email);
  await resendSignupConfirmation({
    email: normalized,
    emailRedirectTo: confirmationRedirect(returnTo),
  });
}

export async function signInTonecosAccount(email: string, password: string): Promise<string> {
  assertTonecosCommercialEnabled();
  return signInWithPasswordCredentials(validateSignInCredentials(email, password));
}

/** Changes an authenticated account password only after re-verifying the current password.
 * A successful change signs the account out so the new credential must be used immediately.
 */
export async function changeTonecosPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  assertTonecosCommercialEnabled();
  if (
    typeof input.currentPassword !== "string" ||
    input.currentPassword.length === 0 ||
    input.currentPassword.length > 1024
  ) {
    throw new Error("tonecos_current_password_invalid");
  }
  if (
    typeof input.newPassword !== "string" ||
    input.newPassword.length > 1024 ||
    !isPasswordPolicyCompliant(input.newPassword) ||
    input.newPassword === input.currentPassword
  ) {
    throw new Error("tonecos_new_password_invalid");
  }

  const current = await getTonecosCurrentUser();
  if (!current?.email) throw new Error("tonecos_login_required");

  const verifiedUserId = await signInWithPasswordCredentials({
    email: current.email,
    password: input.currentPassword,
  });
  if (verifiedUserId !== current.id) {
    throw new Error("tonecos_account_session_mismatch");
  }

  const { data, error } = await tonecos.auth.updateUser({
    password: input.newPassword,
  });
  if (error) throw error;
  if (!data.user || data.user.id !== current.id) {
    throw new Error("tonecos_password_update_incomplete");
  }
  await signOutCurrentSession();
}

export async function signOutTonecosAccount(): Promise<void> {
  assertTonecosCommercialEnabled();
  await signOutCurrentSession();
}

export async function getTonecosCurrentUser(): Promise<{ id: string; email: string | null } | null> {
  assertTonecosCommercialEnabled();
  // A signed-out visitor has no session; that is not an authentication failure.
  // This is only a local preflight: an existing session must still be verified by getUser().
  const { data: stored, error: sessionError } = await tonecos.auth.getSession();
  if (sessionError) {
    if (sessionError.name === "AuthSessionMissingError") return null;
    throw sessionError;
  }
  if (!stored.session) return null;
  const { data, error } = await tonecos.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throw error;
  }
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

async function currentAccountId(): Promise<string> {
  const { data, error } = await tonecos.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("tonecos_login_required");
  return data.user.id;
}

export async function getMyTonecosProfile(): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  const id = await currentAccountId();
  const { data, error } = await tonecos.from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function updateMyTonecosProfile(input: {
  fullName: string; phone: string;
}): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  const full_name = cleanText(input.fullName, 160, true)!;
  const phone = cleanText(input.phone, 40);
  if (phone && !/^[0-9+(). -]{8,40}$/.test(phone)) {
    throw new Error("tonecos_account_phone_invalid");
  }
  const id = await currentAccountId();
  const { data, error } = await tonecos.from("profiles")
    .update({ full_name, phone })
    .eq("id", id)
    .select(PROFILE_SELECT).single();
  if (error) throw error;
  return data;
}

/**
 * Updates only already-granted customer columns of public.profiles.
 * Never uses the legacy monorepo profile services or a second customer table.
 */
async function updateMyComplementaryProfile(changes: ProfileUpdate): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  const id = await currentAccountId();
  const { data, error } = await tonecos.from("profiles")
    .update(changes)
    .eq("id", id)
    .select(PROFILE_SELECT).single();
  if (error) throw error;
  return data;
}

export async function updateMyTonecosWhatsapp(raw: string): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  return updateMyComplementaryProfile({ whatsapp: normalizeWhatsapp(raw) });
}

export async function updateMyTonecosPersonalData(input: {
  whatsapp: string;
  cpf: string;
  birthDate: string;
}): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  if (!input || typeof input !== "object") {
    throw new Error("tonecos_account_personal_data_invalid");
  }
  const changes: ProfileUpdate = {
    whatsapp: normalizeWhatsapp(input.whatsapp),
    cpf: normalizeCpf(input.cpf),
    birth_date: normalizeBirthDate(input.birthDate),
  };
  return updateMyComplementaryProfile(changes);
}

function normalizeWhatsapp(raw: string): string | null {
  if (typeof raw !== "string" || (raw && !/^[+\d\s().-]*$/.test(raw))) {
    throw new Error("tonecos_account_whatsapp_invalid");
  }
  const whatsapp = raw.replace(/\D/g, "") || null;
  if (whatsapp && !/^(55)?[1-9][0-9]{9,10}$/.test(whatsapp)) {
    throw new Error("tonecos_account_whatsapp_invalid");
  }
  return whatsapp;
}

function normalizeCpf(raw: string): string | null {
  if (typeof raw !== "string" || (raw && !/^[\d.\-\s]*$/.test(raw))) {
    throw new Error("tonecos_account_cpf_invalid");
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    throw new Error("tonecos_account_cpf_invalid");
  }

  const checkDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  if (checkDigit(9) !== Number(digits[9]) || checkDigit(10) !== Number(digits[10])) {
    throw new Error("tonecos_account_cpf_invalid");
  }
  return digits;
}

function normalizeBirthDate(raw: string): string | null {
  if (typeof raw !== "string") throw new Error("tonecos_account_birth_date_invalid");
  const birthDate = raw.trim();
  if (!birthDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error("tonecos_account_birth_date_invalid");
  }

  const parsed = new Date(`${birthDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== birthDate
  ) {
    throw new Error("tonecos_account_birth_date_invalid");
  }

  const today = new Date();
  const latestAllowed = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (birthDate > latestAllowed) {
    throw new Error("tonecos_account_birth_date_invalid");
  }
  return birthDate;
}

export async function updateMyTonecosDeliveryAddress(
  input: TonecosDeliveryAddress | null,
): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  if (input === null) return updateMyComplementaryProfile({ delivery_address: null });
  const keys = Object.keys(input ?? {});
  if (keys.some((key) => ![
    "street", "number", "complement", "neighborhood", "city", "state", "zipCode", "country",
  ].includes(key))) throw new Error("tonecos_account_address_invalid");
  const text = (value: unknown, max: number, optional = false) => {
    if (typeof value !== "string") throw new Error("tonecos_account_address_invalid");
    const cleaned = value.trim();
    if ((!optional && !cleaned) || cleaned.length > max) {
      throw new Error("tonecos_account_address_invalid");
    }
    return cleaned;
  };
  const street = text(input.street, 160);
  const number = text(input.number, 20);
  const neighborhood = text(input.neighborhood, 100);
  const city = text(input.city, 100);
  const state = text(input.state, 2);
  const postalInput = text(input.zipCode, 9);
  if (!/^\d{5}-?\d{3}$/.test(postalInput)) {
    throw new Error("tonecos_account_address_invalid");
  }
  const zipCode = postalInput.replace("-", "");
  if (!BRAZIL_STATES.has(state) || input.country !== "BR") {
    throw new Error("tonecos_account_address_invalid");
  }
  const complement = input.complement === undefined
    ? undefined : text(input.complement, 160, true);
  const delivery_address: TonecosDeliveryAddress = {
    street, number, neighborhood, city, state, zipCode, country: "BR",
    ...(complement ? { complement } : {}),
  };
  return updateMyComplementaryProfile({ delivery_address });
}

export async function updateMyTonecosContactPreferences(
  input: TonecosContactPreferences,
): Promise<AccountProfile> {
  assertTonecosCommercialEnabled();
  if (!input || !(
    input.preferredContactChannel === null ||
    ["email", "whatsapp", "phone"].includes(input.preferredContactChannel)
  ) || typeof input.quoteUpdates !== "boolean" ||
      typeof input.productionUpdates !== "boolean" ||
      typeof input.marketingEmails !== "boolean") {
    throw new Error("tonecos_account_preferences_invalid");
  }
  return updateMyComplementaryProfile({
    preferred_contact_channel: input.preferredContactChannel,
    quote_updates: input.quoteUpdates,
    production_updates: input.productionUpdates,
    marketing_emails: input.marketingEmails,
  });
}

/** Delegates rate-limiting to the existing canonical Supabase Auth service. */
export async function requestTonecosPasswordReset(
  email: string,
  returnTo?: string,
): Promise<void> {
  assertTonecosCommercialEnabled();
  const normalized = validateEmail(email);
  const safeReturn = resolveTonecosCustomerReturnPath(returnTo);
  await sendPasswordResetEmail({
    email: normalized,
    redirectTo: originRedirect(tonecosRecoveryPath(safeReturn, true)),
  });
}

/** Validate the one-time recovery token directly with Supabase Auth.
 * Unlike the PKCE callback code, this works across browsers/devices without a stored verifier.
 */
export async function verifyTonecosPasswordRecoveryToken(tokenHash: string): Promise<void> {
  assertTonecosCommercialEnabled();
  if (typeof tokenHash !== "string" || !/^[A-Za-z0-9_-]{32,512}$/.test(tokenHash)) {
    throw new Error("tonecos_recovery_link_invalid");
  }
  const { data, error } = await tonecos.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });
  if (error || !data?.user || !data.session) {
    throw new Error("tonecos_recovery_link_invalid");
  }
}

/** Recovered sessions are verified by Supabase Auth, never by browser query params. */
export async function completeTonecosPasswordRecovery(password: string): Promise<void> {
  assertTonecosCommercialEnabled();
  if (typeof password !== "string" || password.length > 1024 ||
      !isPasswordPolicyCompliant(password)) {
    throw new Error("tonecos_recovery_password_invalid");
  }
  const { data, error } = await tonecos.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("tonecos_recovery_session_required");
  const result = await tonecos.auth.updateUser({ password });
  if (result.error) throw result.error;
  await signOutCurrentSession();
}
