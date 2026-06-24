import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  approvePayment,
  createPayment,
  rejectPayment,
  requestPaymentInfo,
  updatePaymentStatus,
} from "./payment-service";
import { supabase } from "@/integrations/supabase/client";
import type { ManualPaymentInput } from "@/types/manual-payment";

const approveManualPaymentWithNotification = vi.fn();
const rejectManualPaymentWithNotification = vi.fn();
const requestManualPaymentInfoRpc = vi.fn();
const updateManualPaymentStatus = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "test-user-id" } },
          error: null,
        })
      ),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/services/admin/orders/admin-order-status-service", () => ({
  approveManualPaymentWithNotification,
  rejectManualPaymentWithNotification,
  requestManualPaymentInfoRpc,
  updateManualPaymentStatus,
}));

describe("PaymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockImplementation((functionName: string) =>
      Promise.resolve({
        data:
          functionName === "create_manual_payment_for_current_user"
            ? {
                id: "test-payment-id",
                reference_number: "PAY-20260216-1234",
                user_id: "test-user-id",
                payment_method_id: "test-method-id",
                amount: 100,
                currency: "BRL",
                payment_type: "one_time",
                status: "pending",
                quote_id: "test-quote-id",
                subscription_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : "ok",
        error: null,
      })
    );
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { id: "test-payment-id", status: "pending" },
              error: null,
            })
          ),
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "test-payment-id", status: "pending" },
              error: null,
            })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    } as any);
  });

  describe("createPayment", () => {
    it("should create a payment with valid data", async () => {
      const input: ManualPaymentInput = {
        payment_method_id: "test-method-id",
        quote_id: "test-quote-id",
        amount: 100,
        currency: "BRL",
        payment_type: "one_time",
      };

      const payment = await createPayment(input);

      expect(payment.reference_number).toBe("PAY-20260216-1234");
      expect(payment.status).toBe("pending");
      expect(supabase.rpc).toHaveBeenCalledWith(
        "create_manual_payment_for_current_user",
        expect.objectContaining({
          p_payment_method_id: "test-method-id",
          p_quote_id: "test-quote-id",
          p_amount: 100,
        })
      );
    });

    it("should reject invalid create payment input", async () => {
      await expect(
        createPayment({
          payment_method_id: "",
          quote_id: "test-quote-id",
          amount: 100,
          payment_type: "one_time",
        })
      ).rejects.toThrow("Payment method is required");

      await expect(
        createPayment({
          payment_method_id: "test-method-id",
          quote_id: "test-quote-id",
          amount: 0,
          payment_type: "one_time",
        })
      ).rejects.toThrow("Payment amount must be greater than zero");
    });
  });

  describe("updatePaymentStatus", () => {
    it("should allow transition from pending to under_review", async () => {
      await expect(updatePaymentStatus("test-payment-id", "under_review")).resolves.toBeUndefined();
    });

    it("should reject final-state transitions", async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { status: "approved" },
                error: null,
              })
            ),
          })),
        })),
      } as any);

      await expect(updatePaymentStatus("test-payment-id", "pending")).rejects.toThrow(
        "não é permitida"
      );
    });
  });

  describe("admin payment transitions", () => {
    it("should delegate approval to the admin notification boundary", async () => {
      await approvePayment("test-payment-id", "admin-id");

      expect(approveManualPaymentWithNotification).toHaveBeenCalledWith("test-payment-id");
    });

    it("should require and delegate rejection reason", async () => {
      await expect(rejectPayment("test-payment-id", "admin-id", "")).rejects.toThrow(
        "Rejection reason is required"
      );

      await rejectPayment("test-payment-id", "admin-id", " Invalid proof ");

      expect(rejectManualPaymentWithNotification).toHaveBeenCalledWith(
        "test-payment-id",
        "Invalid proof"
      );
    });

    it("should require and delegate info request message", async () => {
      await expect(requestPaymentInfo("test-payment-id", "admin-id", "")).rejects.toThrow(
        "Message is required"
      );

      await requestPaymentInfo("test-payment-id", "admin-id", " Please provide clearer image ");

      expect(requestManualPaymentInfoRpc).toHaveBeenCalledWith(
        "test-payment-id",
        "Please provide clearer image"
      );
    });
  });
});
