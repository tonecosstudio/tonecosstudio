import { describe, expect, it } from "vitest";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";

describe("commercial quote error copy", () => {
  it("translates customer validation and rate-limit errors", () => {
    expect(commercialQuoteErrorText(new Error("catalog_quote_contact_invalid")))
      .toBe("Confira os dados de contato da Minha Conta e as preferências deste orçamento.");
    expect(commercialQuoteErrorText(new Error("Wait before submitting another quote")))
      .toMatch(/Aguarde um minuto/);
  });

  it("does not expose unknown backend messages", () => {
    expect(commercialQuoteErrorText(new Error("postgres internal detail xyz")))
      .toBe("Não foi possível concluir a operação de orçamento. Tente novamente.");
    expect(
      commercialQuoteErrorText(
        new Error("postgres internal detail xyz"),
        "admin",
      ),
    ).toBe(
      "Não foi possível concluir a operação administrativa. Recarregue a página e tente novamente.",
    );
  });

  it("normalizes session, network and admin authorization failures", () => {
    expect(commercialQuoteErrorText(new Error("Failed to fetch")))
      .toMatch(/conectar ao serviço de orçamentos/);
    expect(commercialQuoteErrorText(new Error("JWT expired")))
      .toMatch(/sessão expirou/);
    expect(
      commercialQuoteErrorText(new Error("Admin access required"), "admin"),
    ).toBe("Acesso administrativo não autorizado.");
  });
});
