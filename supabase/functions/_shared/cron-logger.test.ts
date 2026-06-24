/**
 * Unit tests for cron-logger.ts
 *
 * Tests the cron job logging utility functions
 */

import { assertRejects } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  describe,
  it,
  beforeEach,
  afterEach,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";

// Mock environment variables
const originalEnv = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
};

describe("cron-logger", () => {
  beforeEach(() => {
    // Set up test environment variables
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  afterEach(() => {
    // Restore original environment variables
    if (originalEnv.SUPABASE_URL) {
      Deno.env.set("SUPABASE_URL", originalEnv.SUPABASE_URL);
    } else {
      Deno.env.delete("SUPABASE_URL");
    }

    if (originalEnv.SUPABASE_SERVICE_ROLE_KEY) {
      Deno.env.set(
        "SUPABASE_SERVICE_ROLE_KEY",
        originalEnv.SUPABASE_SERVICE_ROLE_KEY,
      );
    } else {
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  describe("logCronStart", () => {
    it("should require jobName parameter", async () => {
      const { logCronStart } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronStart(""),
        Error,
        "jobName is required",
      );
    });

    it("should require Supabase environment variables", async () => {
      Deno.env.delete("SUPABASE_URL");

      const { logCronStart } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronStart("test-job"),
        Error,
        "Supabase environment variables not configured",
      );
    });
  });

  describe("logCronSuccess", () => {
    it("should require logId parameter", async () => {
      const { logCronSuccess } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronSuccess(""),
        Error,
        "logId is required",
      );
    });

    it("should require Supabase environment variables", async () => {
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");

      const { logCronSuccess } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronSuccess("test-log-id"),
        Error,
        "Supabase environment variables not configured",
      );
    });
  });

  describe("logCronError", () => {
    it("should require logId parameter", async () => {
      const { logCronError } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronError("", new Error("test")),
        Error,
        "logId is required",
      );
    });

    it("should require error parameter", async () => {
      const { logCronError } = await import("./cron-logger.ts");

      await assertRejects(
        // @ts-expect-error - intentionally passing null to test validation
        async () => await logCronError("test-log-id", null),
        Error,
        "error is required",
      );
    });

    it("should require Supabase environment variables", async () => {
      Deno.env.delete("SUPABASE_URL");

      const { logCronError } = await import("./cron-logger.ts");

      await assertRejects(
        async () => await logCronError("test-log-id", new Error("test")),
        Error,
        "Supabase environment variables not configured",
      );
    });
  });
});
