import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNextRelease } from "./next-release-service";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

type QueryResult = { data: unknown; error: { message: string } | null };

function releaseQuery(response: QueryResult) {
  const query = {
    select: vi.fn(),
    not: vi.fn(),
    gte: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  [
    query.select, query.not, query.gte, query.eq, query.neq,
    query.order, query.limit,
  ].forEach((fn) => fn.mockReturnValue(query));
  mocks.from.mockReturnValue(query);
  return query;
}

const release = {
  collection_id: "collection-1",
  name: "Lion-O",
  image_url: "https://cdn.example.com/hero.webp",
  release_date: "2026-11-05",
  collections: {
    name: "ThunderCats",
    slug: "thundercats",
    is_active: true,
    status: "active",
  },
};

describe("next release — Bahia timezone and canonical filtering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T13:00:00Z"));
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters future active releases without including archived products", async () => {
    const query = releaseQuery({ data: release, error: null });
    const next = await getNextRelease();
    expect(next).toMatchObject({
      collection_id: "collection-1",
      collection_name: "ThunderCats",
      collection_slug: "thundercats",
      character_name: "Lion-O",
      character_image: "https://cdn.example.com/hero.webp",
      release_date: "2026-11-05",
      days_until_release: 3,
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collection_characters");
    expect(query.gte).toHaveBeenCalledWith("release_date", "2026-11-02");
    expect(query.eq).toHaveBeenCalledWith("collections.is_active", true);
    expect(query.eq).toHaveBeenCalledWith("collections.status", "active");
    expect(query.neq).toHaveBeenCalledWith("status", "archived");
    expect(query.order).toHaveBeenCalledWith("release_date", { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("does not invent a release if the database returns no result", async () => {
    releaseQuery({ data: null, error: null });
    await expect(getNextRelease()).resolves.toBeNull();
  });

  it("recognizes a launch today without producing negative day counts", async () => {
    releaseQuery({ data: { ...release, release_date: "2026-11-02" }, error: null });
    await expect(getNextRelease()).resolves.toMatchObject({
      days_until_release: 0,
    });
  });

  it.each([
    [{ ...release, release_date: null }, "release date"],
    [{ ...release, name: "" }, "character name"],
    [{ ...release, collections: { name: null, slug: "slug" } }, "collection name"],
  ])("rejects an incomplete official release instead of rendering it %#", async (row) => {
    releaseQuery({ data: row, error: null });
    await expect(getNextRelease()).rejects.toThrow(
      "Proximo lancamento retornou dados incompletos",
    );
  });

  it("propagates database errors for upcoming releases", async () => {
    releaseQuery({ data: null, error: { message: "permission denied" } });
    await expect(getNextRelease()).rejects.toThrow(
      "Erro ao buscar proximo lancamento: permission denied",
    );
  });
});
