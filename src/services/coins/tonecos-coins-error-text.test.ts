import { describe, expect, it } from "vitest";
import { isTonecosCoinsAuthError, tonecosCoinsErrorText } from "./tonecos-coins-error-text";

describe("Tonecos Coins user-facing errors", () => {
  it("translates known permissions and session failures without exposing backend text", () => {
    expect(tonecosCoinsErrorText(new Error("Admin access required"), "admin"))
      .toBe("Acesso administrativo não autorizado.");
    expect(tonecosCoinsErrorText(new Error("tonecos_login_required")))
      .toContain("Entre novamente");
    expect(isTonecosCoinsAuthError(new Error("tonecos_login_required"))).toBe(true);
    expect(isTonecosCoinsAuthError(new Error("offline"))).toBe(false);
  });

  it("uses a safe retry message for raw Supabase and network failures", () => {
    expect(tonecosCoinsErrorText({ message: "offline: postgres internal detail" }))
      .toContain("Verifique sua conexão");
    expect(tonecosCoinsErrorText({ message: "permission denied for relation tonecos_coin_entries" }))
      .toBe("Não foi possível carregar a carteira Coins. Tente novamente.");
    expect(tonecosCoinsErrorText(new Error("offline"), "admin"))
      .toContain("o mesmo crédito não será duplicado");
  });
});
