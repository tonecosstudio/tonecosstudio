import { describe, expect, it } from "vitest";
import { landingCopyForMode } from "./LandingPage";

describe("Tonecos landing copy is honest about public read-only MVP", () => {
  it("does not promise customer accounts, purchases or order tracking", () => {
    const copy = landingCopyForMode(true);
    expect(copy.ctaTitle).toBe("CONHEÇA O ACERVO");
    expect(copy.ctaDescription).toMatch(/contato com o estúdio por e-mail/);
    expect(copy.description).toMatch(/sem compras ou cadastro/);
    expect([copy.description, copy.ctaTitle, copy.ctaDescription].join(" "))
      .not.toMatch(/acompanhamento total|entre para o esquadrão|crie sua conta/i);
  });

  it("preserves the commercial copy for a future explicitly enabled phase", () => {
    const copy = landingCopyForMode(false);
    expect(copy.ctaTitle).toBe("READY PLAYER?");
    expect(copy.ctaDescription).toContain("acompanhamento total");
  });
});
