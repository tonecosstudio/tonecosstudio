import { describe, expect, it } from "vitest";
import { sanitizePostgrestSearchTerm } from "./postgrest-search";

describe("sanitizePostgrestSearchTerm", () => {
  it("removes PostgREST filter grammar characters", () => {
    expect(sanitizePostgrestSearchTerm("ana),id.not.is.null,(x")).toBe("ana id.not.is.null x");
  });

  it("removes wildcard characters so searches stay literal", () => {
    expect(sanitizePostgrestSearchTerm("%jo_o%")).toBe("jo o");
  });

  it("normalizes whitespace and rejects non-string values", () => {
    expect(sanitizePostgrestSearchTerm("  Maria   Silva  ")).toBe("Maria Silva");
    expect(sanitizePostgrestSearchTerm(null)).toBe("");
  });
});
