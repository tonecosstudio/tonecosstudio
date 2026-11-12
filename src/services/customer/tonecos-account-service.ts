import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { isPasswordPolicyCompliant } from "@/config/auth";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  sendPasswordResetEmail, signInWithPasswordCredentials, signOutCurrentSession,
  signUpWithPasswordCredentials,
} from "@/services/auth/auth-session-service";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
type AccountProfile = TonecosMvpDatabase["public"]["Tables"]["profiles"]["Row"];

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

/** The only identity provider for Tonecos is Supabase Auth in the Tonecos project. */
export async function registerTonecosAccount(input: {
  email: string; password: string; fullName: string;
}): Promise<{ userId: string | null; emailConfirmationRequired: boolean }> {
  assertTonecosCommercialEnabled();
  const credentials = validateRegistrationCredentials(input.email, input.password);
  const fullName = cleanText(input.fullName, 160, true)!;
  return signUpWithPasswordCredentials({
    ...credentials, fullName,
    emailRedirectTo: originRedirect(TONECOS_COMMERCIAL_ROUTES.login),
  });
}

export async function signInTonecosAccount(email: string, password: string): Promise<string> {
  assertTonecosCommercialEnabled();
  return signInWithPasswordCredentials(validateSignInCredentials(email, password));
}

export async function signOutTonecosAccount(): Promise<void> {
  assertTonecosCommercialEnabled();
  await signOutCurrentSession();
}

export async function getTonecosCurrentUser(): Promise<{ id: string; email: string | null } | null> {
  assertTonecosCommercialEnabled();
  const { data, error } = await tonecos.auth.getUser();
  if (error) throw error;
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
    .select("id,email,full_name,phone,created_at,updated_at")
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
    .select("id,email,full_name,phone,created_at,updated_at").single();
  if (error) throw error;
  return data;
}

/** Delegates rate-limiting to the existing canonical Supabase Auth service. */
export async function requestTonecosPasswordReset(email: string): Promise<void> {
  assertTonecosCommercialEnabled();
  const normalized = validateEmail(email);
  await sendPasswordResetEmail({
    email: normalized,
    redirectTo: originRedirect(TONECOS_COMMERCIAL_ROUTES.recovery + "?action=update"),
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
