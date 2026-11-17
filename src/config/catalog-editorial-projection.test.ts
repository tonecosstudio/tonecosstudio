import { afterEach, describe, expect, it, vi } from "vitest";
import { isPublicEditorialProjectionEnabled } from "./catalog-editorial-projection";

describe("public editorial projection gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stays closed unless the deployed value explicitly names the supported version", () => {
    vi.stubEnv("VITE_TONECOS_PUBLIC_EDITORIAL_PROJECTION", "");
    expect(isPublicEditorialProjectionEnabled()).toBe(false);
    vi.stubEnv("VITE_TONECOS_PUBLIC_EDITORIAL_PROJECTION", "true");
    expect(isPublicEditorialProjectionEnabled()).toBe(false);
    vi.stubEnv("VITE_TONECOS_PUBLIC_EDITORIAL_PROJECTION", "v1");
    expect(isPublicEditorialProjectionEnabled()).toBe(true);
  });
});
