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
    resend: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: authMock,
  },
}));

import {
  resendSignupConfirmation,
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

  it("returns a verified session identity rather than trusting an incomplete sign-in", async () => {
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-1" }, session: { access_token: "ok" } }, error: null,
    });
    await expect(signInWithPasswordCredentials({
      email: " USER@EXAMPLE.COM ", password: "ExistingPass1",
    })).resolves.toBe("user-1");
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-1" }, session: null }, error: null,
    });
    await expect(signInWithPasswordCredentials({
      email: "user@example.com", password: "ExistingPass1",
    })).rejects.toThrow("tonecos_login_incomplete");
  });

  it("keeps email-confirmation pending separate from an authenticated session", async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: "pending-user" }, session: null },
      error: null,
    });

    await expect(
      signUpWithPasswordCredentials({
        email: " NEW@Example.com ",
        password: "Aaaaaaaa111!",
        fullName: "Cliente Tonecos",
        emailRedirectTo: "https://tonecos.example/login",
      }),
    ).resolves.toEqual({ userId: "pending-user", emailConfirmationRequired: true });

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "Aaaaaaaa111!",
      options: {
        emailRedirectTo: "https://tonecos.example/login",
        data: { full_name: "Cliente Tonecos" },
      },
    });
  });

  it("recognizes a session returned by signup without another sign-in", async () => {
    authMock.signUp.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "test" },
      },
      error: null,
    });

    await expect(
      signUpWithPasswordCredentials({
        email: "cliente@example.com",
        password: "Aaaaaaaa111!",
        fullName: "Cliente Tonecos",
        emailRedirectTo: "https://tonecos.example/login",
      }),
    ).resolves.toEqual({ userId: "user-1", emailConfirmationRequired: false });
    expect(authMock.signUp).toHaveBeenCalledTimes(1);
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

  it("resends signup confirmation through Supabase Auth with the canonical redirect", async () => {
    authMock.resend.mockResolvedValue({ data: {}, error: null });

    await expect(
      resendSignupConfirmation({
        email: " Pending@Example.com ",
        emailRedirectTo: "https://tonartstudio.com.br/login",
      }),
    ).resolves.toBeUndefined();

    expect(authMock.resend).toHaveBeenCalledExactlyOnceWith({
      type: "signup",
      email: "pending@example.com",
      options: {
        emailRedirectTo: "https://tonartstudio.com.br/login",
      },
    });
  });

  it("limits repeated successful confirmation email sends", async () => {
    authMock.resend.mockResolvedValue({ data: {}, error: null });

    for (let attempt = 0; attempt < RATE_LIMITS.passwordReset.maxRequests; attempt++) {
      await resendSignupConfirmation({
        email: "pending@example.com",
        emailRedirectTo: "https://tonartstudio.com.br/login",
      });
    }
    await expect(
      resendSignupConfirmation({
        email: " PENDING@EXAMPLE.COM ",
        emailRedirectTo: "https://tonartstudio.com.br/login",
      }),
    ).rejects.toThrow(RATE_LIMITS.passwordReset.message);
    expect(authMock.resend).toHaveBeenCalledTimes(
      RATE_LIMITS.passwordReset.maxRequests,
    );
  });

  it("limits repeated successful recovery emails instead of resetting the counter", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });

    for (let attempt = 0; attempt < RATE_LIMITS.passwordReset.maxRequests; attempt++) {
      await sendPasswordResetEmail({
        email: "recover@example.com",
        redirectTo: "https://tonartstudio.com.br/recuperar-senha",
      });
    }
    await expect(
      sendPasswordResetEmail({
        email: "RECOVER@example.com ",
        redirectTo: "https://tonartstudio.com.br/recuperar-senha",
      }),
    ).rejects.toThrow(RATE_LIMITS.passwordReset.message);
    expect(authMock.resetPasswordForEmail).toHaveBeenCalledTimes(
      RATE_LIMITS.passwordReset.maxRequests,
    );
  });

  it("limits repeated successful registrations without blocking authenticated login", async () => {
    authMock.signUp.mockResolvedValue({
      data: { user: { id: "pending-user" }, session: null },
      error: null,
    });
    const registration = {
      email: "newuser@example.com",
      password: "Aaaaaaaa111!",
      fullName: "Cliente TONART",
      emailRedirectTo: "https://tonartstudio.com.br/login",
    };
    for (let attempt = 0; attempt < RATE_LIMITS.register.maxRequests; attempt++) {
      await signUpWithPasswordCredentials(registration);
    }
    await expect(
      signUpWithPasswordCredentials({
        ...registration,
        email: "NEWUSER@example.com",
      }),
    ).rejects.toThrow(RATE_LIMITS.register.message);
    expect(authMock.signUp).toHaveBeenCalledTimes(
      RATE_LIMITS.register.maxRequests,
    );
  });

  it("normalizes resend rate-limit failures without creating another mail authority", async () => {
    authMock.resend.mockResolvedValue({
      data: null,
      error: new Error("Email rate limit exceeded"),
    });

    await expect(
      resendSignupConfirmation({
        email: "pending@example.com",
        emailRedirectTo: "https://tonartstudio.com.br/login",
      }),
    ).rejects.toThrow("Muitas tentativas. Aguarde alguns minutos.");
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
