/**
 * Unit tests for AdminPaymentService
 *
 * Tests bulk operations: bulkApprovePayments, exportPaymentsToCSV, bulkSendMessage
 * Requirements: 12.1-12.15
 */

import { describe, test, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listPendingPayments,
  bulkApprovePayments,
  exportPaymentsToCSV,
  bulkSendMessage,
} from "./admin-payment-service";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                or: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/services/payments/payment-service", () => ({
  approvePayment: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/services/support/message-service", () => ({
  messageService: {
    sendMessage: vi.fn(() => Promise.resolve()),
  },
}));

describe("AdminPaymentService", () => {
  const supabaseFromMock = supabase.from as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPendingPayments", () => {
    test("should enrich pending payments with batched profile, file, and unread message data", async () => {
      const mockPayments = [
        {
          id: "payment-1",
          user_id: "user-1",
          reference_number: "PAY-1",
          amount: 100,
          currency: "BRL",
          status: "pending",
          created_at: "2024-01-01T10:00:00Z",
          payment_method: { name: "PIX" },
        },
        {
          id: "payment-2",
          user_id: "user-2",
          reference_number: "PAY-2",
          amount: 200,
          currency: "BRL",
          status: "under_review",
          created_at: "2024-01-02T10:00:00Z",
          payment_method: { name: "Cartao" },
        },
      ];

      supabaseFromMock
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "user-1", full_name: "Ana Cliente", email: "ana@example.com" },
                { id: "user-2", full_name: "Bruno Cliente", email: "bruno@example.com" },
              ],
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { payment_id: "payment-1" },
                { payment_id: "payment-2" },
                { payment_id: "payment-2" },
              ],
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "conversation-1", payment_id: "payment-1" },
                { id: "conversation-2", payment_id: "payment-2" },
              ],
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { conversation_id: "conversation-2" },
                  { conversation_id: "conversation-2" },
                ],
                error: null,
              }),
            }),
          }),
        });

      const result = await listPendingPayments();

      expect(result).toEqual([
        expect.objectContaining({
          id: "payment-1",
          customer_name: "Ana Cliente",
          customer_email: "ana@example.com",
          file_count: 1,
          unread_messages: 0,
        }),
        expect.objectContaining({
          id: "payment-2",
          customer_name: "Bruno Cliente",
          customer_email: "bruno@example.com",
          file_count: 2,
          unread_messages: 2,
        }),
      ]);
      expect(supabaseFromMock).toHaveBeenCalledTimes(5);
    });
  });

  describe("bulkApprovePayments", () => {
    test("should approve only payments with status under_review", async () => {
      const paymentIds = ["payment-1", "payment-2", "payment-3"];
      const adminId = "admin-1";

      supabaseFromMock
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "under_review" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "pending" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "under_review" },
                error: null,
              }),
            }),
          }),
        });

      const result = await bulkApprovePayments(paymentIds, adminId);

      expect(result.success_count).toBe(2);
      expect(result.failure_count).toBe(1);
      expect(result.errors[0].payment_id).toBe("payment-2");
      expect(result.errors[0].error).toContain("must be 'under_review'");
    });

    test("should call progress callback when provided", async () => {
      const paymentIds = ["payment-1", "payment-2"];
      const adminId = "admin-1";
      const progressCallback = vi.fn();

      supabaseFromMock
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "under_review" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "under_review" },
                error: null,
              }),
            }),
          }),
        });

      const result = await bulkApprovePayments(paymentIds, adminId, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(result.success_count).toBe(2);
    });
  });

  describe("exportPaymentsToCSV", () => {
    test("should generate CSV with profile-backed customer fields", async () => {
      const paymentIds = ["payment-1", "payment-2"];
      const mockPayments = [
        {
          id: "payment-1",
          user_id: "user-1",
          reference_number: "PAY-20240101-0001",
          amount: 100.0,
          currency: "BRL",
          status: "approved",
          payment_type: "one_time",
          created_at: "2024-01-01T10:00:00Z",
          payment_method: { name: "PIX" },
        },
      ];

      supabaseFromMock
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: "user-1", full_name: "John Doe", email: "john@example.com" }],
              error: null,
            }),
          }),
        });

      const nativeBlob = globalThis.Blob;
      const blobConstructor = vi.fn((parts: BlobPart[], options?: BlobPropertyBag) => ({
        parts,
        options,
      }));
      vi.stubGlobal("Blob", blobConstructor);

      try {
        await exportPaymentsToCSV(paymentIds);
        const csvText = String(blobConstructor.mock.calls[0][0][0]);

        expect(csvText).toContain("Cliente");
        expect(csvText).toContain("Email");
        expect(csvText).toContain("Valor");
        expect(csvText).toContain("Status");
        expect(csvText).toContain('"PAY-20240101-0001"');
        expect(csvText).toContain('"John Doe"');
        expect(csvText).toContain('"john@example.com"');
      } finally {
        vi.stubGlobal("Blob", nativeBlob);
      }
    });
  });

  describe("bulkSendMessage", () => {
    test("should send message to all selected payment conversations", async () => {
      const paymentIds = ["payment-1", "payment-2"];
      const message = "Test message";
      const adminId = "admin-1";

      supabaseFromMock
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "conversation-1" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "conversation-2" },
                error: null,
              }),
            }),
          }),
        });

      const result = await bulkSendMessage(paymentIds, message, adminId);

      expect(result.success_count).toBe(2);
      expect(result.failure_count).toBe(0);
    });

    test("should call progress callback when provided", async () => {
      const paymentIds = ["payment-1"];
      const message = "Test message";
      const adminId = "admin-1";
      const progressCallback = vi.fn();

      supabaseFromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "conversation-1" },
              error: null,
            }),
          }),
        }),
      });

      const result = await bulkSendMessage(paymentIds, message, adminId, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(result.success_count).toBe(1);
    });
  });
});
