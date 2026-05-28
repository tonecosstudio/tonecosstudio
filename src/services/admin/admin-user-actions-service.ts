import { PUBLIC_ROUTES } from "@/config/routes";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeAdminUserEmail(email: string): string {
  const normalizedEmail = email.trim().replace(/[\r\n]/g, "").toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error("Email invalido para acao administrativa");
  }

  return normalizedEmail;
}

export function buildAdminPasswordResetRedirectUrl(origin: string): string {
  const parsedOrigin = new URL(origin);

  if (parsedOrigin.protocol !== "https:" && !isLocalhost(parsedOrigin.hostname)) {
    throw new Error("Origem invalida para reset de senha");
  }

  return new URL(PUBLIC_ROUTES.login, parsedOrigin.origin).toString();
}

export function buildAdminContactMailtoUrl(input: { email: string; userName: string }): string {
  const email = normalizeAdminUserEmail(input.email);
  const safeName = input.userName.trim().replace(/[\r\n]/g, " ") || "Usuario";
  const subject = encodeURIComponent(`Contato - ${safeName}`);

  return `mailto:${encodeURIComponent(email)}?subject=${subject}`;
}

export async function sendAdminPasswordResetEmail(input: {
  email: string;
  origin: string;
}): Promise<void> {
  const email = normalizeAdminUserEmail(input.email);
  const redirectTo = buildAdminPasswordResetRedirectUrl(input.origin);

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    throw error;
  }
}
