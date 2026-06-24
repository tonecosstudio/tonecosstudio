import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

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
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) throw error;
}

export async function signUpWithPasswordCredentials(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emailRedirectTo: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: params.email,
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
    if (error.message.includes("429") || error.message.includes("rate limit")) {
      throw new Error("Muitas tentativas. Aguarde alguns minutos.");
    }
    throw error;
  }
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
  const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: params.redirectTo,
  });

  if (error) {
    throw error;
  }
}
