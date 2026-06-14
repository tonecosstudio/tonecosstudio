import { describe, expect, it } from "vitest";

import {
  adminPaymentDetailsPath,
  catalogCharacterPath,
  catalogUniverseCharacterPath,
  catalogUniverseFranchisePath,
  catalogUniverseThemePath,
  adminUserDetailsPath,
  catalogModelDetailsPath,
  collectionCharacterDetailsPath,
  collectionDetailsPath,
  isSafeInAppPath,
  paymentDetailsPath,
  publicProfilePath,
  resolveCatalogModelIdFromParam,
  subscribeCollectionPath,
} from "./routes";

describe("route helpers", () => {
  it("builds encoded app paths from route templates", () => {
    expect(paymentDetailsPath("pay 1")).toBe("/pagamentos/pay%201");
    expect(adminPaymentDetailsPath("pay/1")).toBe("/admin/pagamentos/pay%2F1?tab=payments");
    expect(adminUserDetailsPath("user/1")).toBe("/admin/users/user%2F1");
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
    expect(publicProfilePath("collector/user")).toBe("/collector/collector%2Fuser");
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

  it("accepts only bounded internal action paths", () => {
    expect(isSafeInAppPath("/pagamentos?status=pending")).toBe(true);
    expect(isSafeInAppPath("//evil.example")).toBe(false);
    expect(isSafeInAppPath("https://evil.example")).toBe(false);
    expect(isSafeInAppPath("/ok\nLocation: https://evil.example")).toBe(false);
    expect(isSafeInAppPath(`/${"a".repeat(2048)}`)).toBe(false);
  });
});
