import { describe, expect, it } from "vitest";
import { landingCopyForMode } from "./LandingPage";

describe("TONART landing copy is honest about public read-only catalog", () => {
  it("does not promise customer accounts, purchases or order tracking", () => {
    const copy = landingCopyForMode(true);
    expect(copy.ctaTitle).toBe("CONHEÇA O ACERVO");
    expect(copy.ctaDescription).toMatch(/fale diretamente com o estúdio/);
    expect(copy.description).toMatch(/referências digitais/);
    expect([copy.description, copy.ctaTitle, copy.ctaDescription].join(" "))
      .not.toMatch(/acompanhamento total|entre para o esquadrão|crie sua conta/i);
  });

  it("preserves the commercial copy for a future explicitly enabled phase", () => {
    const copy = landingCopyForMode(false);
    expect(copy.ctaTitle).toBe("READY PLAYER?");
    expect(copy.ctaDescription).toContain("acompanhamento total");
  });
});
