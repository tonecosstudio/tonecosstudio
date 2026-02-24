import { describe, it, expect } from "vitest";
import {
  validateGroupName,
  validateMessage,
  validateGroupType,
  validateMembershipCriteria,
  validateAttachment,
} from "./groupValidations";

describe("groupValidations", () => {
  describe("validateGroupName", () => {
    it("accepts valid group names", () => {
      expect(validateGroupName("Grupo Teste")).toEqual({ valid: true });
      expect(validateGroupName("ABC")).toEqual({ valid: true });
      expect(validateGroupName("A".repeat(100))).toEqual({ valid: true });
    });

    it("rejects names that are too short", () => {
      const result = validateGroupName("AB");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("pelo menos 3 caracteres");
    });

    it("rejects names that are too long", () => {
      const result = validateGroupName("A".repeat(101));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("no máximo 100 caracteres");
    });

    it("rejects empty names", () => {
      const result = validateGroupName("");
      expect(result.valid).toBe(false);
    });

    it("rejects whitespace-only names", () => {
      const result = validateGroupName("   ");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateMessage", () => {
    it("accepts valid messages", () => {
      expect(validateMessage("Hello")).toEqual({ valid: true });
      expect(validateMessage("A".repeat(5000))).toEqual({ valid: true });
    });

    it("rejects empty messages", () => {
      const result = validateMessage("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("vazia");
    });

    it("rejects whitespace-only messages", () => {
      const result = validateMessage("   ");
      expect(result.valid).toBe(false);
    });

    it("rejects messages that are too long", () => {
      const result = validateMessage("A".repeat(5001));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5000 caracteres");
    });
  });

  describe("validateGroupType", () => {
    it("accepts valid group types", () => {
      expect(validateGroupType("manual")).toEqual({ valid: true });
      expect(validateGroupType("assinantes")).toEqual({ valid: true });
      expect(validateGroupType("colecao")).toEqual({ valid: true });
      expect(validateGroupType("lancamentos")).toEqual({ valid: true });
      expect(validateGroupType("pedidos")).toEqual({ valid: true });
    });

    it("rejects invalid group types", () => {
      const result = validateGroupType("invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("inválido");
    });
  });

  describe("validateMembershipCriteria", () => {
    it("accepts null criteria for manual groups", () => {
      const result = validateMembershipCriteria("manual", null);
      expect(result.valid).toBe(true);
    });

    it("rejects non-null criteria for manual groups", () => {
      const result = validateMembershipCriteria("manual", {
        type: "assinantes",
        subscriptionStatus: "active",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("não devem ter critérios");
    });

    it("rejects null criteria for automatic groups", () => {
      const result = validateMembershipCriteria("assinantes", null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("devem ter critérios");
    });

    it("accepts valid criteria for assinantes groups", () => {
      const result = validateMembershipCriteria("assinantes", {
        type: "assinantes",
        subscriptionStatus: "active",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects colecao groups without collectionId", () => {
      const result = validateMembershipCriteria("colecao", {
        type: "colecao",
        collectionId: "",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ID de coleção");
    });

    it("accepts colecao groups with collectionId", () => {
      const result = validateMembershipCriteria("colecao", {
        type: "colecao",
        collectionId: "collection-123",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("validateAttachment", () => {
    it("accepts valid image files", () => {
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB

      const result = validateAttachment(file);
      expect(result.valid).toBe(true);
    });

    it("accepts valid PDF files", () => {
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB

      const result = validateAttachment(file);
      expect(result.valid).toBe(true);
    });

    it("rejects files that are too large", () => {
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 }); // 11MB

      const result = validateAttachment(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("muito grande");
    });

    it("rejects invalid file types", () => {
      const file = new File(["content"], "test.exe", { type: "application/x-msdownload" });
      Object.defineProperty(file, "size", { value: 1024 }); // 1KB

      const result = validateAttachment(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("não permitido");
    });
  });
});
