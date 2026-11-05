/** Hard fail if a commercial preview accidentally points at the OrdaX identity project. */
export const TONECOS_SUPABASE_PROJECT_HOST = "icmtmaakjucmuzxnofkd.supabase.co";

export function assertTonecosCommercialEnabled(): void {
  if (import.meta.env.VITE_PREVIEW_READ_ONLY === "true" ||
      import.meta.env.VITE_CATALOG_QUOTES_ENABLED !== "true") {
    throw new Error("catalog_quotes_not_enabled");
  }
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL ?? "");
    if (url.protocol !== "https:" || url.hostname !== TONECOS_SUPABASE_PROJECT_HOST ||
        url.username || url.password || url.port || url.pathname !== "/" ||
        url.search || url.hash) {
      throw new Error("tonecos_supabase_project_mismatch");
    }
  } catch {
    throw new Error("tonecos_supabase_project_mismatch");
  }
}
