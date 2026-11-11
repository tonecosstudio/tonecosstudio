import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Header = { key: string; value: string };
type VercelConfig = { headers: Array<{ source: string; headers: Header[] }> };

const config = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8")
) as VercelConfig;

function getHeader(key: string): string | undefined {
  const headers = config.headers.flatMap((entry) => entry.headers);
  return headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("security headers", () => {
  it("declares the required browser hardening headers", () => {
    expect(getHeader("Strict-Transport-Security")).toContain("includeSubDomains");
    expect(getHeader("X-Content-Type-Options")).toBe("nosniff");
    expect(getHeader("X-Frame-Options")).toBe("DENY");
    expect(getHeader("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(getHeader("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(getHeader("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(getHeader("Origin-Agent-Cluster")).toBe("?1");
    expect(getHeader("X-Permitted-Cross-Domain-Policies")).toBe("none");
  });

  it("keeps CSP restrictive while allowing required providers", () => {
    const csp = getHeader("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("https://fonts.gstatic.com");
    expect(csp).not.toContain("https://js.stripe.com");
    expect(csp).not.toContain("https://*.supabase.co");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
