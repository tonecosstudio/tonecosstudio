import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  cleanup,
  clearAllRateLimits,
  getRateLimiterStats,
  useRateLimit,
} from "./rate-limiter";

describe("rate-limiter", () => {
  afterEach(() => {
    clearAllRateLimits();
  });

  afterAll(() => {
    cleanup();
  });

  it("blocks a key after the configured request limit", () => {
    const config = { maxRequests: 2, windowMs: 60_000 };

    expect(checkRateLimit("user:1:upload", config).allowed).toBe(true);
    expect(checkRateLimit("user:1:upload", config).allowed).toBe(true);

    const blocked = checkRateLimit("user:1:upload", config);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keeps subject-specific hook limits isolated", () => {
    const config = { maxRequests: 1, windowMs: 60_000 };
    const firstUser = useRateLimit("profile-update", config, "user-a");
    const secondUser = useRateLimit("profile-update", config, "user-b");

    expect(firstUser.checkLimit().allowed).toBe(true);
    expect(firstUser.checkLimit().allowed).toBe(false);
    expect(secondUser.checkLimit().allowed).toBe(true);
  });

  it("reports active key stats from the store", () => {
    checkRateLimit("user:1:search", { maxRequests: 10, windowMs: 60_000 });
    checkRateLimit("user:2:search", { maxRequests: 10, windowMs: 60_000 });

    expect(getRateLimiterStats()).toEqual({
      totalKeys: 2,
      activeKeys: 2,
    });
  });
});
