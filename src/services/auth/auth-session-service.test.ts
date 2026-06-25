import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllRateLimits, RATE_LIMITS } from "@/lib/security/rate-limiter";

const { authMock } = vi.hoisted(() => ({
  authMock: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: authMock,
  },
}));

import {
  sendPasswordResetEmail,
  signInWithPasswordCredentials,
  signUpWithPasswordCredentials,
} from "./auth-session-service";

describe("auth-session-service rate limits", () => {
  afterEach(() => {
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  it("blocks repeated password sign-in attempts before calling Supabase again", async () => {
    authMock.signInWithPassword.mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });

    for (let attempt = 0; attempt < RATE_LIMITS.login.maxRequests; attempt++) {
      await expect(
        signInWithPasswordCredentials({
          email: "USER@Example.com ",
          password: "wrong-password",
        }),
      ).rejects.toThrow("Invalid login credentials");
    }

    await expect(
      signInWithPasswordCredentials({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow(RATE_LIMITS.login.message);

    expect(authMock.signInWithPassword).toHaveBeenCalledTimes(RATE_LIMITS.login.maxRequests);
    expect(authMock.signInWithPassword).toHaveBeenNthCalledWith(1, {
      email: "user@example.com",
      password: "wrong-password",
    });
  });

  it("blocks repeated signup attempts before calling Supabase again", async () => {
    authMock.signUp.mockResolvedValue({
      error: new Error("User already registered"),
    });

    for (let attempt = 0; attempt < RATE_LIMITS.register.maxRequests; attempt++) {
      await expect(
        signUpWithPasswordCredentials({
          email: "new@example.com",
          password: "Aaaaaaaa111!",
          fullName: "New User",
          emailRedirectTo: "https://ordax.example",
        }),
      ).rejects.toThrow("User already registered");
    }

    await expect(
      signUpWithPasswordCredentials({
        email: "new@example.com",
        password: "Aaaaaaaa111!",
        fullName: "New User",
        emailRedirectTo: "https://ordax.example",
      }),
    ).rejects.toThrow(RATE_LIMITS.register.message);

    expect(authMock.signUp).toHaveBeenCalledTimes(RATE_LIMITS.register.maxRequests);
  });

  it("rate limits password reset requests by normalized email", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({
      error: new Error("Email rate limit exceeded"),
    });

    for (let attempt = 0; attempt < RATE_LIMITS.passwordReset.maxRequests; attempt++) {
      await expect(
        sendPasswordResetEmail({
          email: " Reset@Example.com ",
          redirectTo: "https://ordax.example/reset",
        }),
      ).rejects.toThrow("Muitas tentativas. Aguarde alguns minutos.");
    }

    await expect(
      sendPasswordResetEmail({
        email: "reset@example.com",
        redirectTo: "https://ordax.example/reset",
      }),
    ).rejects.toThrow(RATE_LIMITS.passwordReset.message);

    expect(authMock.resetPasswordForEmail).toHaveBeenCalledTimes(
      RATE_LIMITS.passwordReset.maxRequests,
    );
    expect(authMock.resetPasswordForEmail).toHaveBeenNthCalledWith(
      1,
      "reset@example.com",
      { redirectTo: "https://ordax.example/reset" },
    );
  });
});
