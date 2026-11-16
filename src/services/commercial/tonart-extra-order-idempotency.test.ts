import { describe, expect, it } from "vitest";
import {
  clearStoredTonartCheckoutRequest,
  createStoredTonartCheckoutRequest,
  readStoredTonartCheckoutRequest,
  type TonartCheckoutStorage,
} from "./tonart-extra-order-idempotency";

const REQUEST = "33333333-3333-4333-8333-333333333333";

function memoryStorage(): TonartCheckoutStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("TONART extra order idempotency key", () => {
  it("persists only the operation UUID and recovers it for a retry", () => {
    const storage = memoryStorage();
    const key = "tonart-extra-order:v1:user:offer";
    const request = createStoredTonartCheckoutRequest(
      key,
      [storage],
      () => REQUEST,
    );

    expect(readStoredTonartCheckoutRequest(key, [storage])).toEqual(request);
  });

  it("clears only the key belonging to the confirmed operation", () => {
    const storage = memoryStorage();
    const key = "tonart-extra-order:v1:user:offer";
    const request = createStoredTonartCheckoutRequest(
      key,
      [storage],
      () => REQUEST,
    );

    clearStoredTonartCheckoutRequest(request, [storage]);

    expect(readStoredTonartCheckoutRequest(key, [storage])).toBeNull();
  });

  it("fails closed without storage or a valid UUID", () => {
    expect(() =>
      createStoredTonartCheckoutRequest("key", [], () => REQUEST),
    ).toThrow("tonart_extra_order_idempotency_unavailable");
    expect(() =>
      createStoredTonartCheckoutRequest(
        "key",
        [memoryStorage()],
        () => "invalid",
      ),
    ).toThrow("tonart_extra_order_idempotency_unavailable");
  });
});
