import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("local commercial preview authority", () => {
  it("starts the commercial shell without reusing configured remote Supabase credentials", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_SUPABASE_URL", "https://production-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "production-publishable-key");

    const environment = await import("@/config/supabase-environment");
    const authority = await import("@/config/tonecos-commercial-authority");

    expect(environment.LOCAL_SUPABASE_FALLBACK).toBe(true);
    expect(environment.SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(environment.SUPABASE_PUBLISHABLE_KEY).toBe(
      "local-unconfigured-publishable-key",
    );
    expect(environment.PREVIEW_READ_ONLY).toBe(true);
    expect(authority.assertTonecosCommercialEnabled).not.toThrow();
    expect(authority.assertTonecosQuotesEnabled).toThrow(
      "catalog_quotes_not_enabled",
    );
  });

  it("allows an explicitly configured local Supabase project to run commercial flows", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "local-publishable-key");

    const environment = await import("@/config/supabase-environment");
    const authority = await import("@/config/tonecos-commercial-authority");

    expect(environment.LOCAL_SUPABASE_FALLBACK).toBe(false);
    expect(environment.PREVIEW_READ_ONLY).toBe(false);
    expect(authority.assertTonecosCommercialEnabled).not.toThrow();
    expect(authority.assertTonecosQuotesEnabled).not.toThrow();
  });
});
