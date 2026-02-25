/**
 * Testes para funções utilitárias
 */

import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils - cn (className merger)", () => {
  it("deve mesclar classes simples", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toContain("text-red-500");
    expect(result).toContain("bg-blue-500");
  });

  it("deve resolver conflitos de classes Tailwind", () => {
    const result = cn("p-4", "p-8");
    // twMerge deve manter apenas a última classe conflitante
    expect(result).toBe("p-8");
  });

  it("deve lidar com classes condicionais", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toContain("base-class");
    expect(result).toContain("active-class");
  });

  it("deve ignorar valores falsy", () => {
    const result = cn("text-red-500", false, null, undefined, "bg-blue-500");
    expect(result).toContain("text-red-500");
    expect(result).toContain("bg-blue-500");
    expect(result).not.toContain("false");
    expect(result).not.toContain("null");
  });

  it("deve lidar com arrays de classes", () => {
    const result = cn(["text-red-500", "bg-blue-500"]);
    expect(result).toContain("text-red-500");
    expect(result).toContain("bg-blue-500");
  });

  it("deve lidar com objetos de classes", () => {
    const result = cn({
      "text-red-500": true,
      "bg-blue-500": false,
      "p-4": true,
    });
    expect(result).toContain("text-red-500");
    expect(result).not.toContain("bg-blue-500");
    expect(result).toContain("p-4");
  });

  it("deve retornar string vazia para entrada vazia", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("deve mesclar classes complexas com conflitos", () => {
    const result = cn("px-4 py-2 bg-blue-500", "px-8 text-white", { "bg-red-500": true });
    expect(result).toContain("px-8"); // Sobrescreve px-4
    expect(result).toContain("py-2");
    expect(result).toContain("text-white");
    expect(result).toContain("bg-red-500"); // Sobrescreve bg-blue-500
  });
});
