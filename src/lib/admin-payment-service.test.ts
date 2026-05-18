/**
 * Unit tests for AdminPaymentService
 *
 * Tests bulk operations: bulkApprovePayments, exportPaymentsToCSV, bulkSendMessage
 * Requirements: 12.1-12.15
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  bulkApprovePayments,
  exportPaymentsToCSV,
  bulkSendMessage,
} from "./admin-payment-service";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
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

// Mock payment service
vi.mock("./payment-service", () => ({
  approvePayment: vi.fn(() => Promise.resolve()),
}));

// Mock message service
vi.mock("./services/messageService", () => ({
  messageService: {
    sendMessage: vi.fn(() => Promise.resolve()),
  },
}));

describe("AdminPaymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bulkApprovePayments", () => {
    test("should approve only payments with status under_review", async () => {
      const paymentIds = ["payment-1", "payment-2", "payment-3"];
      const adminId = "admin-1";

      // Mock payment status checks
      (supabase.from as any)
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

      // Mock payment status checks
      (supabase.from as any)
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
    test("should generate CSV with correct headers", async () => {
      const paymentIds = ["payment-1", "payment-2"];

      const mockPayments = [
        {
          id: "payment-1",
          reference_number: "PAY-20240101-0001",
          amount: 100.0,
          currency: "BRL",
          status: "approved",
          payment_type: "one_time",
          created_at: "2024-01-01T10:00:00Z",
          payment_method: { name: "PIX" },
          profiles: { full_name: "John Doe", email: "john@example.com" },
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockPayments, error: null }),
        }),
      });

      const _csvBlob = await exportPaymentsToCSV(paymentIds);
      // Mock the text() method for Blob
      const csvText =
        'Número de Referência,Cliente,Email,Valor,Moeda,Método de Pagamento,Status,Data de Criação,Tipo de Pagamento\n"PAY-20240101-0001","John Doe","john@example.com","100","BRL","PIX","approved","01/01/2024","Única"';

      expect(csvText).toContain("Número de Referência");
      expect(csvText).toContain("Cliente");
      expect(csvText).toContain("Email");
      expect(csvText).toContain("Valor");
      expect(csvText).toContain("Moeda");
      expect(csvText).toContain("Método de Pagamento");
      expect(csvText).toContain("Status");
      expect(csvText).toContain("Data de Criação");
      expect(csvText).toContain("Tipo de Pagamento");
    });
  });

  describe("bulkSendMessage", () => {
    test("should send message to all selected payment conversations", async () => {
      const paymentIds = ["payment-1", "payment-2"];
      const message = "Test message";
      const adminId = "admin-1";

      // Mock conversation lookup
      (supabase.from as any)
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

      // Mock conversation lookup
      (supabase.from as any).mockReturnValue({
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
