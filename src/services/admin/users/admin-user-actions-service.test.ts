import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
}));

import {
  buildAdminContactMailtoUrl,
  buildAdminPasswordResetRedirectUrl,
  normalizeAdminUserEmail,
  sendAdminPasswordResetEmail,
} from "./admin-user-actions-service";

describe("admin user actions service", () => {
  beforeEach(() => {
    mockResetPasswordForEmail.mockReset();
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("normalizes admin action emails and rejects header injection payloads", () => {
    expect(normalizeAdminUserEmail(" Admin@Example.COM ")).toBe("admin@example.com");
    expect(() => normalizeAdminUserEmail("admin@example.com\r\nbcc:evil@example.com")).toThrow(
      "Email invalido",
    );
  });

  it("builds the password reset redirect from the route SSOT", () => {
    expect(buildAdminPasswordResetRedirectUrl("https://ordax.example")).toBe(
      "https://ordax.example/login",
    );
  });

  it("builds a sanitized mailto URL for admin contact actions", () => {
    expect(
      buildAdminContactMailtoUrl({
        email: " Admin@Example.COM ",
        userName: "Alice\r\nBcc: evil@example.com",
      }),
    ).toBe("mailto:admin%40example.com?subject=Contato%20-%20Alice%20%20Bcc%3A%20evil%40example.com");
  });

  it("rejects insecure non-local origins for password reset redirects", () => {
    expect(() => buildAdminPasswordResetRedirectUrl("http://ordax.example")).toThrow(
      "Origem invalida",
    );
  });

  it("sends a real Supabase password reset email", async () => {
    await sendAdminPasswordResetEmail({
      email: " User@Example.COM ",
      origin: "https://ordax.example",
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://ordax.example/login",
    });
  });

  it("propagates Supabase password reset failures", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new Error("Supabase failure"),
    });

    await expect(
      sendAdminPasswordResetEmail({
        email: "user@example.com",
        origin: "https://ordax.example",
      }),
    ).rejects.toThrow("Supabase failure");
  });
});
