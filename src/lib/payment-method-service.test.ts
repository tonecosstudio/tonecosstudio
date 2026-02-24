/**
 * Unit tests for PaymentMethodService
 *
 * Tests cover:
 * - CRUD operations
 * - Validation logic
 * - Cache behavior
 * - Default payment method handling
 * - Active/inactive toggling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listActivePaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  togglePaymentMethodActive,
  clearPaymentMethodCache,
  listAllPaymentMethods,
} from "./payment-method-service";
import type { PaymentMethod, PaymentMethodInput } from "@/types/manual-payment";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

describe("PaymentMethodService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPaymentMethodCache();
  });

  describe("listActivePaymentMethods", () => {
    it("should return active payment methods sorted by display_order", async () => {
      const mockData: PaymentMethod[] = [
        {
          id: "1",
          name: "PIX",
          type: "pix",
          instructions: "Use PIX key",
          is_active: true,
          is_default: true,
          display_order: 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: "2",
          name: "PagSeguro",
          type: "pagseguro",
          instructions: "Pay via PagSeguro",
          is_active: true,
          is_default: false,
          display_order: 1,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      const result = await listActivePaymentMethods();

      expect(supabase.from).toHaveBeenCalledWith("admin_payment_methods");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("is_active", true);
      expect(mockOrder).toHaveBeenCalledWith("display_order", { ascending: true });
      expect(result).toEqual(mockData);
    });

    it("should use cached data within cache duration", async () => {
      const mockData: PaymentMethod[] = [
        {
          id: "1",
          name: "PIX",
          type: "pix",
          instructions: "Use PIX key",
          is_active: true,
          is_default: true,
          display_order: 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      // First call - should hit database
      await listActivePaymentMethods();
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await listActivePaymentMethods();
      expect(supabase.from).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("should throw error on database failure", async () => {
      const mockError = { message: "Database error" };
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      await expect(listActivePaymentMethods()).rejects.toThrow(
        "Failed to list active payment methods: Database error"
      );
    });
  });

  describe("getPaymentMethodById", () => {
    it("should return payment method by id", async () => {
      const mockData: PaymentMethod = {
        id: "1",
        name: "PIX",
        type: "pix",
        instructions: "Use PIX key",
        is_active: true,
        is_default: true,
        display_order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const result = await getPaymentMethodById("1");

      expect(supabase.from).toHaveBeenCalledWith("admin_payment_methods");
      expect(mockEq).toHaveBeenCalledWith("id", "1");
      expect(result).toEqual(mockData);
    });

    it("should return null if payment method not found", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      });

      const result = await getPaymentMethodById("999");

      expect(result).toBeNull();
    });
  });

  describe("createPaymentMethod", () => {
    it("should create payment method with valid data", async () => {
      const input: PaymentMethodInput = {
        name: "PIX Ordax",
        type: "pix",
        instructions: "Transfer to PIX key",
        pix_key: "12345678900",
        is_active: true,
        is_default: false,
      };

      const mockData: PaymentMethod = {
        id: "new-id",
        name: input.name,
        type: input.type,
        instructions: input.instructions,
        pix_key: input.pix_key || null,
        payment_link: input.payment_link || null,
        account_details: input.account_details || null,
        is_active: input.is_active,
        is_default: input.is_default || false,
        display_order: input.display_order || 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await createPaymentMethod(input);

      expect(supabase.from).toHaveBeenCalledWith("admin_payment_methods");
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("should throw error if name is missing", async () => {
      const input: PaymentMethodInput = {
        name: "",
        type: "pix",
        instructions: "Transfer to PIX key",
        is_active: true,
      };

      await expect(createPaymentMethod(input)).rejects.toThrow("Payment method name is required");
    });

    it("should throw error if type is missing", async () => {
      const input: any = {
        name: "PIX",
        instructions: "Transfer to PIX key",
        is_active: true,
      };

      await expect(createPaymentMethod(input)).rejects.toThrow("Payment method type is required");
    });

    it("should throw error if instructions are missing", async () => {
      const input: PaymentMethodInput = {
        name: "PIX",
        type: "pix",
        instructions: "",
        is_active: true,
      };

      await expect(createPaymentMethod(input)).rejects.toThrow("Payment instructions are required");
    });

    it("should accept optional fields", async () => {
      const input: PaymentMethodInput = {
        name: "PIX",
        type: "pix",
        instructions: "Transfer to PIX key",
        is_active: true,
        // Optional fields not provided
      };

      const mockData: PaymentMethod = {
        id: "new-id",
        name: "PIX",
        type: "pix",
        instructions: "Transfer to PIX key",
        is_active: true,
        is_default: false,
        display_order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await createPaymentMethod(input);

      expect(result).toBeDefined();
      expect(result.name).toBe("PIX");
    });
  });

  describe("updatePaymentMethod", () => {
    it("should update payment method with partial data", async () => {
      const mockData: PaymentMethod = {
        id: "1",
        name: "PIX Updated",
        type: "pix",
        instructions: "New instructions",
        is_active: true,
        is_default: false,
        display_order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const result = await updatePaymentMethod("1", {
        name: "PIX Updated",
        instructions: "New instructions",
      });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "1");
      expect(result).toEqual(mockData);
    });

    it("should throw error if name is empty", async () => {
      await expect(updatePaymentMethod("1", { name: "" })).rejects.toThrow(
        "Payment method name cannot be empty"
      );
    });

    it("should throw error if instructions are empty", async () => {
      await expect(updatePaymentMethod("1", { instructions: "" })).rejects.toThrow(
        "Payment instructions cannot be empty"
      );
    });
  });

  describe("setDefaultPaymentMethod", () => {
    it("should set payment method as default", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await setDefaultPaymentMethod("1");

      expect(supabase.from).toHaveBeenCalledWith("admin_payment_methods");
      expect(mockUpdate).toHaveBeenCalledWith({ is_default: true });
      expect(mockEq).toHaveBeenCalledWith("id", "1");
    });

    it("should throw error on database failure", async () => {
      const mockError = { message: "Database error" };
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: mockError });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await expect(setDefaultPaymentMethod("1")).rejects.toThrow(
        "Failed to set default payment method: Database error"
      );
    });
  });

  describe("togglePaymentMethodActive", () => {
    it("should toggle payment method to active", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await togglePaymentMethodActive("1", true);

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: true });
      expect(mockEq).toHaveBeenCalledWith("id", "1");
    });

    it("should toggle payment method to inactive", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await togglePaymentMethodActive("1", false);

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockEq).toHaveBeenCalledWith("id", "1");
    });
  });

  describe("listAllPaymentMethods", () => {
    it("should return all payment methods including inactive", async () => {
      const mockData: PaymentMethod[] = [
        {
          id: "1",
          name: "PIX",
          type: "pix",
          instructions: "Use PIX key",
          is_active: true,
          is_default: true,
          display_order: 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: "2",
          name: "Inactive Method",
          type: "other",
          instructions: "Not available",
          is_active: false,
          is_default: false,
          display_order: 2,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      });

      const result = await listAllPaymentMethods();

      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
    });
  });
});
