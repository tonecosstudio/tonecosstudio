import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  approvePayment,
  rejectPayment,
  requestPaymentInfo,
  updatePaymentStatus,
} from "./payment-service";
import { supabase } from "@/integrations/supabase/client";

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
        "Message is required when requesting more information"
      );

      await requestPaymentInfo("test-payment-id", "admin-id", " Please provide clearer image ");

      expect(requestManualPaymentInfoRpc).toHaveBeenCalledWith(
        "test-payment-id",
        "Please provide clearer image"
      );
    });
  });
});
