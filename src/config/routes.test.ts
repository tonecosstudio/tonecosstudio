import { describe, expect, it } from "vitest";

import {
  adminCyclesPath,
  adminPaymentDetailsPath,
  adminSupportConversationPath,
  adminUserDetailsSectionPath,
  catalogCharacterPath,
  catalogUniverseCharacterPath,
  catalogUniverseFranchisePath,
  catalogUniverseThemePath,
  adminUserDetailsPath,
  catalogModelDetailsPath,
  collectionCharacterDetailsPath,
  collectionDetailsPath,
  isSafeInAppPath,
  loginReturnToPath,
  paymentDetailsPath,
  profileSectionPath,
  resolveTonecosCustomerReturnPath,
  tonecosLoginReturnPath,
  resolveCatalogModelIdFromParam,
  resolveProfileRouteSectionId,
  resolveProfileSectionId,
  subscribeCollectionPath,
} from "./routes";

describe("route helpers", () => {
  it("builds encoded app paths from route templates", () => {
    expect(paymentDetailsPath("pay 1")).toBe("/perfil/pagamentos/pay%201");
    expect(adminPaymentDetailsPath("pay/1")).toBe("/admin/pagamentos/pay%2F1");
    expect(adminSupportConversationPath("conversation/1")).toBe(
      "/admin/comunicacao/conversas/conversation%2F1"
    );
    expect(adminCyclesPath({ month: 5, year: 2026 })).toBe(
      "/admin/creditos/ciclos?month=5&year=2026"
    );
    expect(adminUserDetailsPath("user/1")).toBe("/admin/users/user%2F1");
    expect(adminUserDetailsSectionPath("user/1", "address")).toBe(
      "/admin/users/user%2F1/address"
    );
    expect(collectionDetailsPath("my collection")).toBe("/colecoes/my%20collection");
    expect(collectionCharacterDetailsPath("my collection", "char/1")).toBe(
      "/colecoes/my%20collection/char%2F1"
    );
    expect(catalogModelDetailsPath("model/1")).toBe("/modelos/model%2F1");
    expect(
      catalogModelDetailsPath(
        "43e97b32-c0af-4b88-a49d-1d454f077b46",
        "Androide 18"
      )
    ).toBe(
      "/modelos/androide-18-43e97b32-c0af-4b88-a49d-1d454f077b46"
    );
    expect(catalogCharacterPath("Freeza", "Dragon Ball")).toBe(
      "/universo/personagem/freeza-dragon-ball"
    );
    expect(catalogUniverseThemePath("anime")).toBe("/universo/anime");
    expect(catalogUniverseFranchisePath("anime", "dragon-ball")).toBe(
      "/universo/anime/dragon-ball"
    );
    expect(catalogUniverseCharacterPath("anime", "dragon-ball", "freeza")).toBe(
      "/universo/anime/dragon-ball/freeza"
    );
    expect(subscribeCollectionPath("my collection")).toBe("/colecoes/my%20collection/assinar");
    expect(loginReturnToPath("/perfil/pagamentos?status=pending")).toBe(
      "/login?next=%2Fperfil%2Fpagamentos%3Fstatus%3Dpending"
    );
    expect(loginReturnToPath("https://evil.example")).toBe("/login?next=%2F");
    expect(loginReturnToPath("//evil.example")).toBe("/login?next=%2F");
  });

  it("extracts model ids from friendly universe detail params", () => {
    expect(
      resolveCatalogModelIdFromParam(
        "androide-18-43e97b32-c0af-4b88-a49d-1d454f077b46"
      )
    ).toBe("43e97b32-c0af-4b88-a49d-1d454f077b46");
    expect(
      resolveCatalogModelIdFromParam("43e97b32-c0af-4b88-a49d-1d454f077b46")
    ).toBe("43e97b32-c0af-4b88-a49d-1d454f077b46");
  });

  it("keeps profile section routing canonical in Portuguese", () => {
    expect(profileSectionPath("info")).toBe("/perfil/conta");
    expect(profileSectionPath("payment")).toBe("/perfil/pagamentos");
    expect(profileSectionPath("support")).toBe("/perfil/suporte");
    expect(resolveProfileSectionId("pagamentos")).toBe("payment");
    expect(resolveProfileSectionId("suporte")).toBe("support");
    expect(resolveProfileRouteSectionId("pagamentos")).toBe("payment");
    expect(resolveProfileRouteSectionId("payment")).toBeNull();
    expect(resolveProfileSectionId("payments")).toBeNull();
    expect(resolveProfileSectionId("orders")).toBeNull();
  });

  it("returns customers to the exact recovered account section after login", () => {
    expect(resolveTonecosCustomerReturnPath("/perfil/dados-pessoais")).toBe(
      "/perfil/dados-pessoais",
    );
    expect(resolveTonecosCustomerReturnPath("/perfil/endereco")).toBe(
      "/perfil/endereco",
    );
    expect(tonecosLoginReturnPath("/perfil/pedidos")).toBe(
      "/login?next=%2Fperfil%2Fpedidos",
    );
    expect(resolveTonecosCustomerReturnPath("/admin")).toBe("/perfil");
    expect(resolveTonecosCustomerReturnPath("//evil.example")).toBe("/perfil");
    expect(resolveTonecosCustomerReturnPath("/perfil/../../admin")).toBe(
      "/perfil",
    );
    expect(resolveTonecosCustomerReturnPath("/perfil/endereco?redirect=/admin")).toBe(
      "/perfil",
    );
  });

  it("preserves only an exact quote link through customer authentication", () => {
    const quotePath = "/meus-orcamentos?quote=22222222-2222-4222-8222-222222222222";
    expect(resolveTonecosCustomerReturnPath(quotePath)).toBe(quotePath);
    expect(tonecosLoginReturnPath(quotePath)).toBe(
      "/login?next=" + encodeURIComponent(quotePath),
    );
    for (const invalid of [
      "/meus-orcamentos?quote=../../../admin",
      quotePath + "&next=/admin",
      quotePath + "#trick",
      "/meus-orcamentos?quote=",
      "/meus-orcamentos?quote=22222222",
    ]) {
      expect(resolveTonecosCustomerReturnPath(invalid)).toBe("/perfil");
    }
  });

  it("accepts only bounded internal action paths", () => {
    expect(isSafeInAppPath("/perfil/pagamentos?status=pending")).toBe(true);
    expect(isSafeInAppPath("//evil.example")).toBe(false);
    expect(isSafeInAppPath("https://evil.example")).toBe(false);
    expect(isSafeInAppPath("/ok\nLocation: https://evil.example")).toBe(false);
    expect(isSafeInAppPath(`/${"a".repeat(2048)}`)).toBe(false);
  });
});
