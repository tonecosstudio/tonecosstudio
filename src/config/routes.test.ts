import { describe, expect, it } from "vitest";

import {
  adminPaymentDetailsPath,
  adminUserDetailsPath,
  catalogModelDetailsPath,
  collectionCharacterDetailsPath,
  collectionDetailsPath,
  isSafeInAppPath,
  paymentDetailsPath,
  publicProfilePath,
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
    expect(catalogModelDetailsPath("model/1")).toBe("/catalogo/model%2F1");
    expect(subscribeCollectionPath("my collection")).toBe("/colecoes/my%20collection/assinar");
    expect(publicProfilePath("collector/user")).toBe("/collector/collector%2Fuser");
  });

  it("accepts only bounded internal action paths", () => {
    expect(isSafeInAppPath("/pagamentos?status=pending")).toBe(true);
    expect(isSafeInAppPath("//evil.example")).toBe(false);
    expect(isSafeInAppPath("https://evil.example")).toBe(false);
    expect(isSafeInAppPath("/ok\nLocation: https://evil.example")).toBe(false);
    expect(isSafeInAppPath(`/${"a".repeat(2048)}`)).toBe(false);
  });
});
