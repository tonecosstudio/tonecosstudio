/** Hard fail if a commercial preview accidentally points at the OrdaX identity project. */
import {
  LOCAL_SUPABASE_FALLBACK,
  PREVIEW_READ_ONLY,
  SUPABASE_URL,
} from "@/config/supabase-environment";

export const TONECOS_SUPABASE_PROJECT_HOST = "icmtmaakjucmuzxnofkd.supabase.co";

export function assertTonecosCommercialEnabled(): void {
  if (import.meta.env.VITE_TONECOS_COMMERCIAL_MVP !== "true" ||
      (PREVIEW_READ_ONLY && !LOCAL_SUPABASE_FALLBACK) ||
      import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true") {
    throw new Error("tonecos_commercial_mvp_disabled");
  }
  if (LOCAL_SUPABASE_FALLBACK) return;
  try {
    const url = new URL(SUPABASE_URL);
    const isLocalBrowser =
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname.toLowerCase());
    const isLocalSupabase =
      (import.meta.env.DEV || isLocalBrowser) &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase());
    const validLocalUrl =
      isLocalSupabase && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
    const validCommercialUrl =
      url.protocol === "https:" &&
      url.hostname === TONECOS_SUPABASE_PROJECT_HOST &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash;
    if (!validLocalUrl && !validCommercialUrl) {
      throw new Error("tonecos_supabase_project_mismatch");
    }
  } catch {
    throw new Error("tonecos_supabase_project_mismatch");
  }
}

/** Quote intake is part of the authenticated commercial MVP. */
export function assertTonecosQuotesEnabled(): void {
  if (PREVIEW_READ_ONLY) {
    throw new Error("catalog_quotes_not_enabled");
  }
  assertTonecosCommercialEnabled();
}
