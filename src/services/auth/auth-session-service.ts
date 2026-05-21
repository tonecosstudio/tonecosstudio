import { supabase } from "@/integrations/supabase/client";

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
