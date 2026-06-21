import { describe, it, expect, beforeEach, vi } from "vitest";
import { emailService } from "../email-service";
import { supabase } from "@/integrations/supabase/client";

vi.stubEnv("VITE_EMAIL_FROM", "test@ordax.com");
vi.stubEnv("VITE_EMAIL_FROM_NAME", "ORDAX Test");

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock("../notification-preferences-service", () => ({
  notificationPreferencesService: {
    shouldSendEmail: vi.fn(() => Promise.resolve(true)),
  },
}));

function firstInvokeBody() {
  return (supabase.functions.invoke as any).mock.calls[0]?.[1]?.body;
}

describe("Email Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });
    (emailService as any).config.maxRetries = 3;
    (emailService as any).config.retryDelay = 1;
  });

  it("sends tracking context to the send-email Edge Function", async () => {
    await emailService.sendEmail(
      "test@example.com",
      "Test Subject",
      "<p>Test content</p>",
      "welcome",
      "11111111-1111-4111-8111-111111111111",
      { subscription_id: "sub-123" },
    );

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "send-email",
      expect.objectContaining({
        body: expect.objectContaining({
          to: "test@example.com",
          subject: "Test Subject",
          html: "<p>Test content</p>",
          emailType: "welcome",
          userId: "11111111-1111-4111-8111-111111111111",
          metadata: { subscription_id: "sub-123" },
        }),
      }),
    );
  });

  it("does not call email delivery log RPCs from the browser", async () => {
    await emailService.sendEmail(
      "test@example.com",
      "Test",
      "<p>Test</p>",
      "welcome",
    );

    expect(supabase.rpc).not.toHaveBeenCalledWith(
      "create_email_delivery_log",
      expect.anything(),
    );
    expect(supabase.rpc).not.toHaveBeenCalledWith(
      "update_email_delivery_log",
      expect.anything(),
    );
  });

  it("includes email type in the Edge Function payload", async () => {
    await emailService.sendEmail(
      "test@example.com",
      "Test",
      "<p>Test</p>",
      "character_revelation",
    );

    expect(firstInvokeBody()).toEqual(
      expect.objectContaining({
        emailType: "character_revelation",
      }),
    );
  });

  it("includes metadata in the Edge Function payload", async () => {
    const metadata = {
      delivery_id: "del-123",
      tracking_code: "ABC123",
    };

    await emailService.sendEmail(
      "test@example.com",
      "Test",
      "<p>Test</p>",
      "shipping_notification",
      "11111111-1111-4111-8111-111111111111",
      metadata,
    );

    expect(firstInvokeBody()).toEqual(
      expect.objectContaining({
        metadata,
      }),
    );
  });

  it("tracks retry attempts through repeated Edge Function calls", async () => {
    (emailService as any).config.maxRetries = 1;
    (supabase.functions.invoke as any)
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce({ data: { success: true }, error: null });

    await emailService.sendEmail(
      "test@example.com",
      "Test",
      "<p>Test</p>",
      "welcome",
    );

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    expect(firstInvokeBody()).toEqual(
      expect.objectContaining({
        emailType: "welcome",
      }),
    );
  });

  it("does not fail email send because browser-side log RPC is unavailable", async () => {
    (supabase.rpc as any).mockRejectedValue(new Error("Database error"));

    await expect(
      emailService.sendEmail(
        "test@example.com",
        "Test",
        "<p>Test</p>",
        "welcome",
      ),
    ).resolves.toBeUndefined();

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "send-email",
      expect.objectContaining({
        body: expect.objectContaining({
          to: "test@example.com",
        }),
      }),
    );
  });
});
