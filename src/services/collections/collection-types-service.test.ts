import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkCollectionTypeNameExists,
  getCollectionType,
  getNextCollectionTypeSortOrder,
  listCollectionTypes,
} from "./collection-types-service";

const mocks = vi.hoisted(() => ({ from: vi.fn(), logError: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/lib/logger", () => ({
  log: { error: mocks.logError },
}));

type Response = { data: unknown; error: { message: string } | null };

function queryReturning(response: Response) {
  const q = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    then: (
      resolve: (value: Response) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  [q.select, q.order, q.eq, q.neq, q.limit, q.single]
    .forEach((fn) => fn.mockReturnValue(q));
  mocks.from.mockReturnValue(q);
  return q;
}

const type = {
  id: "collection-type-1",
  name: "premium",
  display_name: "Premium",
  sort_order: 4,
  is_active: true,
};

describe("collection type authority — never infer success from database failure", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists only active collection types in the official order", async () => {
    const q = queryReturning({ data: [type], error: null });
    await expect(listCollectionTypes()).resolves.toEqual([type]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collection_types");
    expect(q.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(q.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("includes inactive types only when explicitly requested", async () => {
    const q = queryReturning({
      data: [{ ...type, is_active: false }], error: null,
    });
    await expect(listCollectionTypes(true)).resolves.toHaveLength(1);
    expect(q.eq).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized collection-type list instead of returning an empty catalog", async () => {
    queryReturning({ data: null, error: { message: "denied" } });
    await expect(listCollectionTypes()).rejects.toThrow(
      "Erro ao buscar tipos de colecao: denied",
    );
  });

  it("reads a collection type by its authoritative ID", async () => {
    const q = queryReturning({ data: type, error: null });
    await expect(getCollectionType("collection-type-1")).resolves.toEqual(type);
    expect(q.eq).toHaveBeenCalledWith("id", "collection-type-1");
    expect(q.single).toHaveBeenCalledOnce();
  });

  it("rejects a failed detail read", async () => {
    queryReturning({ data: null, error: { message: "not found" } });
    await expect(getCollectionType("missing")).rejects.toThrow(
      "Erro ao buscar tipo de colecao: not found",
    );
  });

  it("checks existing names in the actual collection types table", async () => {
    const q = queryReturning({ data: [{ id: "collection-type-1" }], error: null });
    await expect(checkCollectionTypeNameExists("premium")).resolves.toBe(true);
    expect(q.eq).toHaveBeenCalledWith("name", "premium");
    expect(q.neq).not.toHaveBeenCalled();
  });

  it("excludes the edited type from a duplicate-name check", async () => {
    const q = queryReturning({ data: [], error: null });
    await expect(checkCollectionTypeNameExists("premium", "collection-type-1"))
      .resolves.toBe(false);
    expect(q.neq).toHaveBeenCalledWith("id", "collection-type-1");
  });

  it("refuses to mark a name available if the name query fails", async () => {
    queryReturning({ data: null, error: { message: "permission denied" } });
    await expect(checkCollectionTypeNameExists("premium")).rejects.toThrow(
      "Erro ao verificar nome do tipo de colecao: permission denied",
    );
    expect(mocks.logError).toHaveBeenCalledOnce();
  });

  it("computes the next order from the highest official sort order", async () => {
    const q = queryReturning({
      data: [{ sort_order: 9 }], error: null,
    });
    await expect(getNextCollectionTypeSortOrder()).resolves.toBe(10);
    expect(q.order).toHaveBeenCalledWith("sort_order", { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it("starts at zero only if there are no existing types", async () => {
    queryReturning({ data: [], error: null });
    await expect(getNextCollectionTypeSortOrder()).resolves.toBe(0);
  });

  it("never treats a failed order query as an empty table", async () => {
    queryReturning({ data: null, error: { message: "read denied" } });
    await expect(getNextCollectionTypeSortOrder()).rejects.toThrow(
      "Erro ao buscar ordem do tipo de colecao: read denied",
    );
    expect(mocks.logError).toHaveBeenCalledOnce();
  });
});
