import { describe, expect, it } from "vitest";
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_STUDIO_LABEL } from "./brand";

describe("Tonecos public identity", () => {
  it("keeps one canonical consumer-facing name independent of the former OrdaX project", () => {
    expect(BRAND_NAME).toBe("Tonecos Studio");
    expect(BRAND_SHORT_NAME).toBe("Tonecos");
    expect(BRAND_STUDIO_LABEL).toBe("Studio");
    expect(BRAND_NAME).not.toMatch(/ordax/i);
  });
});
