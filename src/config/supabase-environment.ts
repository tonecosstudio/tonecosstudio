export interface SupabaseEnvironmentInput {
  url?: string;
  publishableKey?: string;
  previewReadOnly?: boolean;
  localDevelopment?: boolean;
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
  const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(
    hostname?.toLowerCase() ?? "",
  );
  const isLocalRuntime = isLocalHost || input.localDevelopment === true;
  const isLoopbackUrl = (() => {
    try {
      const parsed = new URL(configuredUrl);
      return ["localhost", "127.0.0.1", "[::1]"].includes(
        parsed.hostname.toLowerCase(),
      );
    } catch {
      return false;
    }
  })();
  // A developer's local preview must never reuse the remote URL/key from
  // .env.local. An explicitly configured loopback project remains usable.
  const localFallback =
    isLocalRuntime &&
    (!configuredUrl || !configuredPublishableKey || !isLoopbackUrl);

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
    localDevelopment: import.meta.env.DEV,
  },
  typeof window === "undefined" ? undefined : window.location.hostname,
);

export const LOCAL_SUPABASE_FALLBACK = resolvedEnvironment.localFallback;
export const SUPABASE_URL = resolvedEnvironment.url;
export const SUPABASE_PUBLISHABLE_KEY = resolvedEnvironment.publishableKey;
export const PREVIEW_READ_ONLY = resolvedEnvironment.previewReadOnly;

/** Resolve against the current browser origin, including local dev hostnames. */
export function isPreviewReadOnly(): boolean {
  return resolveSupabaseEnvironment(
    {
      url: import.meta.env.VITE_SUPABASE_URL,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      previewReadOnly: import.meta.env.VITE_PREVIEW_READ_ONLY === "true",
      localDevelopment: import.meta.env.DEV,
    },
    typeof window === "undefined" ? undefined : window.location.hostname,
  ).previewReadOnly;
}
