export interface SupabaseEnvironmentInput {
  url?: string;
  publishableKey?: string;
  previewReadOnly?: boolean;
}

export interface ResolvedSupabaseEnvironment {
  url: string;
  publishableKey: string;
  previewReadOnly: boolean;
  localFallback: boolean;
}

export function resolveSupabaseEnvironment(
  input: SupabaseEnvironmentInput,
  hostname?: string,
): ResolvedSupabaseEnvironment {
  const configuredUrl = input.url?.trim() ?? "";
  const configuredPublishableKey = input.publishableKey?.trim() ?? "";
  const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname ?? "");
  const localFallback = isLocalHost && (!configuredUrl || !configuredPublishableKey);

  return {
    url: localFallback ? "http://127.0.0.1:54321" : configuredUrl,
    publishableKey: localFallback
      ? "local-unconfigured-publishable-key"
      : configuredPublishableKey,
    previewReadOnly: localFallback || input.previewReadOnly === true,
    localFallback,
  };
}

/**
 * Keep a local preview renderable without silently connecting it to a remote
 * project. The placeholder points only to the standard local Supabase port.
 */
const resolvedEnvironment = resolveSupabaseEnvironment(
  {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    previewReadOnly: import.meta.env.VITE_PREVIEW_READ_ONLY === "true",
  },
  typeof window === "undefined" ? undefined : window.location.hostname,
);

export const LOCAL_SUPABASE_FALLBACK = resolvedEnvironment.localFallback;
export const SUPABASE_URL = resolvedEnvironment.url;
export const SUPABASE_PUBLISHABLE_KEY = resolvedEnvironment.publishableKey;
export const PREVIEW_READ_ONLY = resolvedEnvironment.previewReadOnly;
