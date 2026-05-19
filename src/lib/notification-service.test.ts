import { beforeEach, describe, expect, it, vi } from "vitest";

import { supabase } from "@/integrations/supabase/client";
import { getNotificationService } from "./notification-service";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("notification-service", () => {
  const paymentContext = {
    id: "payment-123",
    user_id: "user-123",
    reference_number: "PAY-001",
  };
  const insertUserNotification = vi.fn().mockResolvedValue({ error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    insertUserNotification.mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "manual_payments") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: paymentContext, error: null }),
        } as never;
      }

      if (table === "user_notifications") {
        return {
          insert: insertUserNotification,
        } as never;
      }

      return {} as never;
    });

    vi.mocked(supabase.rpc).mockResolvedValue({ data: "notification-123", error: null } as never);
  });

  it("creates admin notification when payment enters review", async () => {
    await getNotificationService().sendPaymentUnderReview("payment-123");

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_admin_notification",
      expect.objectContaining({
        p_type: "payment_under_review",
        p_related_id: "payment-123",
        p_related_type: "payment",
      })
    );
  });

  it("creates user notification when payment is approved", async () => {
    await getNotificationService().sendPaymentApproved("payment-123");

    expect(insertUserNotification).toHaveBeenCalledWith({
      user_id: "user-123",
      type: "payment_approved",
      title: "Pagamento aprovado",
      message: "Seu pagamento PAY-001 foi aprovado.",
    });
  });
});
