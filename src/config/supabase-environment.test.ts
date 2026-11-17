import { describe, expect, it } from "vitest";
import { resolveSupabaseEnvironment } from "@/config/supabase-environment";

describe("resolveSupabaseEnvironment", () => {
  it("uses a loopback, read-only client when local Supabase settings are missing", () => {
    expect(resolveSupabaseEnvironment({}, "localhost")).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-unconfigured-publishable-key",
      previewReadOnly: true,
      localFallback: true,
    });
  });

  it("never keeps a partial remote URL or key in the local fallback", () => {
    expect(resolveSupabaseEnvironment({
      url: "https://production-project.supabase.co",
      publishableKey: "",
      previewReadOnly: false,
    }, "127.0.0.1")).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-unconfigured-publishable-key",
      previewReadOnly: true,
      localFallback: true,
    });
  });

  it("never connects a local preview to a fully configured remote project", () => {
    expect(resolveSupabaseEnvironment({
      url: "https://production-project.supabase.co",
      publishableKey: "production-publishable-key",
      previewReadOnly: false,
    }, "localhost")).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-unconfigured-publishable-key",
      previewReadOnly: true,
      localFallback: true,
    });
  });

  it("keeps an explicitly configured local Supabase instance writable", () => {
    expect(resolveSupabaseEnvironment({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-publishable-key",
      previewReadOnly: false,
      localDevelopment: true,
    }, "192.168.1.10")).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-publishable-key",
      previewReadOnly: false,
      localFallback: false,
    });
  });

  it("forces remote settings to loopback on a local development host", () => {
    expect(resolveSupabaseEnvironment({
      url: "https://production-project.supabase.co",
      publishableKey: "production-publishable-key",
      localDevelopment: true,
    }, "192.168.1.10")).toMatchObject({
      url: "http://127.0.0.1:54321",
      previewReadOnly: true,
      localFallback: true,
    });
  });

  it("preserves complete settings and the requested read-only mode", () => {
    expect(resolveSupabaseEnvironment({
      url: "https://project.supabase.co",
      publishableKey: "public-key",
      previewReadOnly: true,
    }, "studio.example.com")).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "public-key",
      previewReadOnly: true,
      localFallback: false,
    });
  });

  it("does not hide missing configuration on a non-local host", () => {
    expect(resolveSupabaseEnvironment({}, "studio.example.com")).toEqual({
      url: "",
      publishableKey: "",
      previewReadOnly: false,
      localFallback: false,
    });
  });
});
