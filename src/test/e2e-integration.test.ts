import { describe, expect, it } from "vitest";

const integrationEnabled = process.env.VITEST_INTEGRATION === "true";
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("E2E integration readiness", () => {
  it("requires the canonical Supabase environment to be restored and reconciled", () => {
    expect.fail(
      "E2E_BLOCKED: Ordax-2026-1 is currently inactive and its commercial RLS/grants and remote Edge Function drift must be reconciled before live integration tests can be trusted.",
    );
  });
});
