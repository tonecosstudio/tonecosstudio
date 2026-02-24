/**
 * Tests for NotificationService
 *
 * Requirements: 9.1-9.12
 * Design: .kiro/specs/manual-payment-system/design.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotificationService,
  DefaultEmailService,
  type EmailService,
  type EmailRecipient,
} from "./notification-service";
import type { PaymentDetails, PaymentMethod } from "@/types/manual-payment";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockPayment,
            error: null,
          })),
          maybeSingle: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        not: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: "user-123" } },
        error: null,
      })),
    },
  },
}));

// Mock data
const mockPaymentMethod: PaymentMethod = {
  id: "method-123",
  name: "PIX",
  type: "pix",
  instructions: "Envie o PIX para a chave abaixo",
  payment_link: null,
  pix_key: "123.456.789-00",
  account_details: null,
  is_active: true,
  is_default: true,
  display_order: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockPayment: PaymentDetails = {
  id: "payment-123",
  reference_number: "PAY-20240101-0001",
  user_id: "user-123",
  payment_method_id: "method-123",
  quote_id: null,
  subscription_id: "sub-123",
  amount: 100.5,
  currency: "BRL",
  payment_type: "recurring",
  status: "pending",
  rejection_reason: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  approved_at: null,
  approved_by: null,
  payment_method: mockPaymentMethod,
  files: [],
  audit_logs: [],
  customer_name: "João Silva",
  customer_email: "joao@example.com",
};

// Mock email service
const mockEmailService: EmailService = {
  sendEmail: vi.fn().mockResolvedValue(undefined),
};

describe("NotificationService", () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService(mockEmailService);
  });

  describe("sendPaymentCreated", () => {
    it("should send payment creation email to customer", async () => {
      await notificationService.sendPaymentCreated("payment-123");

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        [{ email: "joao@example.com", name: "João Silva" }],
        expect.objectContaining({
          subject: expect.stringContaining("Pagamento criado"),
        }),
        expect.any(Object)
      );
    });

    it("should throw error if customer email not found", async () => {
      // Mock payment without email
      const paymentWithoutEmail = { ...mockPayment, customer_email: undefined };
      vi.mocked(require("@/integrations/supabase/client").supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: paymentWithoutEmail,
              error: null,
            })),
          })),
        })),
      } as any);

      await expect(notificationService.sendPaymentCreated("payment-123")).rejects.toThrow(
        "Customer email not found"
      );
    });
  });

  describe("sendPaymentUnderReview", () => {
    it("should send payment under review email to admins", async () => {
      // Mock admin emails
      vi.mocked(require("@/integrations/supabase/client").supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({
              data: [{ email: "admin1@example.com" }, { email: "admin2@example.com" }],
              error: null,
            })),
          })),
        })),
      } as any);

      await notificationService.sendPaymentUnderReview("payment-123");

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        [{ email: "admin1@example.com" }, { email: "admin2@example.com" }],
        expect.objectContaining({
          subject: expect.stringContaining("Pagamento em análise"),
        }),
        expect.any(Object)
      );
    });

    it("should not throw if no admin emails found", async () => {
      // Mock empty admin emails
      vi.mocked(require("@/integrations/supabase/client").supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      } as any);

      await expect(
        notificationService.sendPaymentUnderReview("payment-123")
      ).resolves.not.toThrow();
    });
  });

  describe("sendPaymentApproved", () => {
    it("should send payment approval email to customer", async () => {
      const approvedPayment = {
        ...mockPayment,
        status: "approved",
        approved_at: "2024-01-02T00:00:00Z",
      };

      vi.mocked(require("@/integrations/supabase/client").supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: approvedPayment,
              error: null,
            })),
          })),
        })),
      } as any);

      await notificationService.sendPaymentApproved("payment-123");

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        [{ email: "joao@example.com", name: "João Silva" }],
        expect.objectContaining({
          subject: expect.stringContaining("Pagamento aprovado"),
        }),
        expect.any(Object)
      );
    });
  });

  describe("sendPaymentRejected", () => {
    it("should send payment rejection email with reason", async () => {
      const rejectionReason = "Comprovante ilegível";

      await notificationService.sendPaymentRejected("payment-123", rejectionReason);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        [{ email: "joao@example.com", name: "João Silva" }],
        expect.objectContaining({
          subject: expect.stringContaining("Pagamento rejeitado"),
        }),
        expect.objectContaining({
          rejectionReason,
        })
      );
    });
  });

  describe("sendInfoRequested", () => {
    it("should send info requested email with admin message", async () => {
      const adminMessage = "Precisamos ver o comprovante completo com data visível";

      await notificationService.sendInfoRequested("payment-123", adminMessage);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        [{ email: "joao@example.com", name: "João Silva" }],
        expect.objectContaining({
          subject: expect.stringContaining("Informações adicionais necessárias"),
        }),
        expect.objectContaining({
          adminMessage,
        })
      );
    });
  });

  describe("DefaultEmailService", () => {
    it("should log email instead of sending in development", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const emailService = new DefaultEmailService();

      const recipient: EmailRecipient = { email: "test@example.com" };
      const template = {
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      };

      await emailService.sendEmail([recipient], template);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Email would be sent:",
        expect.objectContaining({
          to: [recipient],
          subject: "Test",
        })
      );
    });
  });
});
