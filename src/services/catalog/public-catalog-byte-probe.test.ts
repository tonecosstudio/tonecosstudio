import { describe, expect, it, vi } from "vitest";
import { probeCanonicalCatalogMediaByte } from "./public-catalog-gateway";

const base = "https://tonartstudio.com.br/catalogo-api/";
const media = base + "media/mdl-ordinary/image/card.webp";

describe("canonical catalog single-byte media probe", () => {
  it("accepts only exact one-byte 206 through the existing first-party proxy", async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(new Uint8Array([0x52]), {
      status: 206,
      headers: {
        "Content-Range": "bytes 0-0/84222",
        "Content-Type": "image/webp",
      },
    }));
    await expect(probeCanonicalCatalogMediaByte(base, media, request as typeof fetch))
      .resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(media);
    expect(request.mock.calls[0][1]).toMatchObject({
      method: "GET",
      headers: { Range: "bytes=0-0" },
      credentials: "omit", redirect: "error",
    });
  });

  it("blocks external sites, query strings and unapproved path before any request", async () => {
    const request = vi.fn();
    for (const url of [
      "https://evil.example/catalogo-api/media/card.webp",
      base + "api/catalog",
      media + "?download=true",
      null,
    ]) {
      await expect(probeCanonicalCatalogMediaByte(base, url, request as typeof fetch))
        .rejects.toThrow();
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed when upstream ignores range or lies about the response", async () => {
    const response = (status: number, range: string | null, bytes: number) =>
      new Response(new Uint8Array(bytes), {
        status,
        headers: {
          "Content-Type": "image/webp",
          ...(range ? { "Content-Range": range } : {}),
        },
      });
    for (const bad of [
      response(200, null, 200),
      response(206, "bytes 0-1/84222", 2),
      response(206, "bytes 0-0/84222", 2),
    ]) {
      const request = vi.fn(async () => bad);
      await expect(probeCanonicalCatalogMediaByte(base, media, request as typeof fetch))
        .rejects.toThrow(/catalog_media_probe_invalid_/);
    }
  });

  it("rejects non-image payloads even when the server claims a one-byte range", async () => {
    const request = vi.fn(async () => new Response(new Uint8Array([0x3c]), {
      status: 206,
      headers: { "Content-Range": "bytes 0-0/12", "Content-Type": "text/html" },
    }));
    await expect(probeCanonicalCatalogMediaByte(base, media, request as typeof fetch))
      .rejects.toThrow("catalog_media_probe_invalid_response");
  });
});
