import { beforeEach, describe, expect, it, vi } from "vitest";

import { listCatalogImportBatches } from "./catalog-curation-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

type QueryResult = {
  data: unknown[] | null;
  error: unknown;
};

function createBatchQuery(result: QueryResult) {
  const query = {
    limit: vi.fn(() => query),
    order: vi.fn(() => query),
    then: vi.fn(
      (
        resolve: (value: QueryResult) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    ),
  };

  return query;
}

describe("catalog curation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it("lists recent import batches from the audit table", async () => {
    const query = createBatchQuery({
      data: [
        {
          id: "batch-1",
          import_slug: "thundercats",
          status: "completed",
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue(query);

    const result = await listCatalogImportBatches();

    expect(result).toMatchObject({
      schemaReady: true,
      batches: [{ id: "batch-1", import_slug: "thundercats" }],
    });
    expect(mocks.from).toHaveBeenCalledWith("catalog_import_batches");
    expect(query.order).toHaveBeenCalledWith("started_at", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(8);
  });

  it("degrades cleanly when import batch migration is pending", async () => {
    mocks.select.mockReturnValue(
      createBatchQuery({
        data: null,
        error: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.catalog_import_batches' in the schema cache",
        },
      }),
    );

    await expect(listCatalogImportBatches()).resolves.toEqual({
      schemaReady: false,
      batches: [],
    });
  });
});
