import { describe, expect, it, vi } from "vitest";
import { createPreviewReadOnlyFetch } from "./preview-readonly-transport";

const origin = "https://tonecos-project.supabase.co";
const base = origin + "/rest/v1/catalog_models?select=id%2Cname&limit=24";

describe("anonymous preview Supabase transport", () => {
  it("permits bounded, public REST reads", async () => {
    const network = vi.fn(async () => Response.json([{ id: "1" }]));
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    const response = await preview(base, { method: "GET" });
    expect(response.status).toBe(200);
    expect(network).toHaveBeenCalledExactlyOnceWith(base, {
      method: "GET",
      redirect: "error",
    });
  });

  it("permits HEAD on public objects only", async () => {
    const network = vi.fn(async () => new Response(null, { status: 200 }));
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    expect((await preview(origin + "/storage/v1/object/public/catalog/cover.webp", {
      method: "HEAD",
    })).status).toBe(200);
    expect(network).toHaveBeenCalledOnce();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "blocks %s before a request leaves the browser",
    async (method) => {
      const network = vi.fn();
      const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
      const response = await preview(base, { method });
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ code: "preview_read_only" });
      expect(network).not.toHaveBeenCalled();
    },
  );

  it.each([
    origin + "/rest/v1/rpc/create_order",
    origin + "/auth/v1/signup",
    origin + "/functions/v1/create-order",
    origin + "/storage/v1/object/upload/orders/receipt.png",
    "https://other.supabase.co/rest/v1/catalog_models?select=id",
    "https://attacker.example/rest/v1/catalog_models?select=id",
    "/rest/v1/catalog_models?select=id",
    origin + "/rest/v1/",
  ])("blocks non-public or external reads: %s", async (url) => {
    const network = vi.fn();
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    expect((await preview(url, { method: "GET" })).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it("blocks HTTP method override headers", async () => {
    const network = vi.fn();
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    expect((await preview(base, {
      method: "GET",
      headers: { "X-HTTP-Method-Override": "DELETE" },
    })).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it("enforces the Request method when RequestInit does not override it", async () => {
    const network = vi.fn();
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    expect((await preview(new Request(base, { method: "POST" }))).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it("fails closed for invalid URLs", async () => {
    const network = vi.fn();
    const preview = createPreviewReadOnlyFetch(origin, network as typeof fetch);
    expect((await preview("not-a-url")).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });
});
