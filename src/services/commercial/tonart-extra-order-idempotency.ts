const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TonartCheckoutStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type StoredTonartCheckoutRequest = {
  id: string;
  storageKey: string;
  storage: TonartCheckoutStorage;
};

export function readStoredTonartCheckoutRequest(
  storageKey: string,
  storages: readonly TonartCheckoutStorage[],
): StoredTonartCheckoutRequest | null {
  for (const storage of storages) {
    try {
      const id = storage.getItem(storageKey);
      if (id && uuidPattern.test(id)) return { id, storageKey, storage };
      if (id) storage.removeItem(storageKey);
    } catch {
      // A later storage may still be available.
    }
  }
  return null;
}

export function createStoredTonartCheckoutRequest(
  storageKey: string,
  storages: readonly TonartCheckoutStorage[],
  createId: () => string,
): StoredTonartCheckoutRequest {
  const id = createId();
  if (!uuidPattern.test(id)) {
    throw new Error("tonart_extra_order_idempotency_unavailable");
  }
  for (const storage of storages) {
    try {
      storage.setItem(storageKey, id);
      if (storage.getItem(storageKey) === id) {
        return { id, storageKey, storage };
      }
      storage.removeItem(storageKey);
    } catch {
      // Try the next storage before failing closed.
    }
  }
  throw new Error("tonart_extra_order_idempotency_unavailable");
}

export function clearStoredTonartCheckoutRequest(
  request: StoredTonartCheckoutRequest,
  storages: readonly TonartCheckoutStorage[],
) {
  for (const storage of storages) {
    try {
      if (storage.getItem(request.storageKey) === request.id) {
        storage.removeItem(request.storageKey);
      }
    } catch {
      // A stale UUID still resolves to the original operation on the server.
    }
  }
}
