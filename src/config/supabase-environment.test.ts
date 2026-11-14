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
