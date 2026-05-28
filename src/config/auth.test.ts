import { describe, expect, it } from "vitest";
import { AUTH_PASSWORD_POLICY, isPasswordPolicyCompliant } from "./auth";

describe("AUTH_PASSWORD_POLICY", () => {
  it("keeps the frontend minimum aligned with the Supabase minimum", () => {
    expect(AUTH_PASSWORD_POLICY.minimumLength).toBe(12);
  });

  it("requires length, upper, lower, number, and symbol", () => {
    expect(isPasswordPolicyCompliant("Aa1!aaaaaaa")).toBe(false);
    expect(isPasswordPolicyCompliant("aaaaaaaaaaaa")).toBe(false);
    expect(isPasswordPolicyCompliant("AAAAAAAAAAAA")).toBe(false);
    expect(isPasswordPolicyCompliant("Aaaaaaaaaaaa")).toBe(false);
    expect(isPasswordPolicyCompliant("Aaaaaaaa1111")).toBe(false);
    expect(isPasswordPolicyCompliant("Aaaaaaaa111!")).toBe(true);
  });
});
