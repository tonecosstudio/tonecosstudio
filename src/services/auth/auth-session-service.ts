import { supabase } from "@/integrations/supabase/client";
import {
  checkRateLimit,
  RATE_LIMITS,
  resetRateLimit,
  type RateLimitConfig,
} from "@/lib/security/rate-limiter";
import type { Session } from "@supabase/supabase-js";

type AuthRateLimitedAction = "login" | "signup" | "password-reset";

function normalizeAuthSubject(email: string): string {
  return email.trim().toLowerCase();
}

function buildAuthRateLimitKey(action: AuthRateLimitedAction, email: string): string {
  return `auth:${action}:${normalizeAuthSubject(email)}`;
}

function assertAuthRateLimit(
  action: AuthRateLimitedAction,
  email: string,
  config: RateLimitConfig,
): string {
  const key = buildAuthRateLimitKey(action, email);
  const rateLimit = checkRateLimit(key, config);

  if (!rateLimit.allowed) {
    throw new Error(
      config.message ?? `Muitas tentativas. Tente novamente em ${rateLimit.retryAfter}s.`,
    );
  }

  return key;
}

function normalizeAuthError(error: { message?: string }): Error {
  const message = error.message ?? "Erro de autenticacao.";

  if (message.includes("429") || /rate limit/i.test(message)) {
    return new Error("Muitas tentativas. Aguarde alguns minutos.");
  }

  return error instanceof Error ? error : new Error(message);
}

export async function getCurrentAuthSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return data.session ?? null;
}

export function subscribeToAuthSessionChanges(
  onSessionChange: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithPasswordCredentials(params: {
  email: string;
  password: string;
}) {
  const rateLimitKey = assertAuthRateLimit("login", params.email, RATE_LIMITS.login);
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeAuthSubject(params.email),
    password: params.password,
  });

  if (error) throw normalizeAuthError(error);
  resetRateLimit(rateLimitKey);
}

export async function signUpWithPasswordCredentials(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emailRedirectTo: string;
}) {
  const rateLimitKey = assertAuthRateLimit("signup", params.email, RATE_LIMITS.register);
  const { error } = await supabase.auth.signUp({
    email: normalizeAuthSubject(params.email),
    password: params.password,
    options: {
      emailRedirectTo: params.emailRedirectTo,
      data: {
        full_name: params.fullName,
        ...(params.phone ? { phone: params.phone } : {}),
      },
    },
  });

  if (error) {
    throw normalizeAuthError(error);
  }

  resetRateLimit(rateLimitKey);
}

export async function signInWithGoogleOAuth(redirectTo: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) throw error;
}

export async function signOutCurrentSession() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function sendPasswordResetEmail(params: {
  email: string;
  redirectTo: string;
}): Promise<void> {
  const rateLimitKey = assertAuthRateLimit(
    "password-reset",
    params.email,
    RATE_LIMITS.passwordReset,
  );
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeAuthSubject(params.email), {
    redirectTo: params.redirectTo,
  });

  if (error) {
    throw normalizeAuthError(error);
  }

  resetRateLimit(rateLimitKey);
}
