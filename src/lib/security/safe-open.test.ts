import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSafeMailtoHref,
  buildSafeWhatsAppHref,
  openSafeExternalUrl,
  openSafeInAppPath,
  openSafeMailtoUrl,
} from "./safe-open";

describe("safe open helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens sanitized external URLs with opener isolation", () => {
    const openedWindow = { opener: window } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(openedWindow);

    expect(openSafeExternalUrl("https://example.com/a b")).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/a%20b",
      "_blank",
      "noopener,noreferrer",
    );
    expect(openedWindow.opener).toBeNull();
  });

  it("rejects unsafe external protocols", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(() => openSafeExternalUrl("javascript:alert(1)")).toThrow();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("opens safe in-app paths", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    expect(openSafeInAppPath("/admin/users/abc?tab=address")).toBe(false);
    expect(openSpy).toHaveBeenCalledWith(
      "/admin/users/abc?tab=address",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("rejects protocol-relative in-app paths", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(() => openSafeInAppPath("//evil.example")).toThrow("Caminho interno inseguro");
    expect(window.open).not.toHaveBeenCalled();
  });

  it("opens safe mailto URLs through location.assign", () => {
    const assignSpy = vi.fn();

    openSafeMailtoUrl("mailto:admin%40example.com?subject=Contato", assignSpy);

    expect(assignSpy).toHaveBeenCalledWith("mailto:admin%40example.com?subject=Contato");
  });

  it("rejects non-mailto URLs for email actions", () => {
    const assignSpy = vi.fn();

    expect(() => openSafeMailtoUrl("https://example.com", assignSpy)).toThrow(
      "URL de email insegura",
    );
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("builds encoded mailto hrefs for trusted anchors", () => {
    expect(buildSafeMailtoHref("admin+alerts@example.com")).toBe(
      "mailto:admin%2Balerts%40example.com",
    );
  });

  it("rejects unsafe mailto anchor input", () => {
    expect(buildSafeMailtoHref("admin@example.com?subject=owned")).toBeNull();
    expect(buildSafeMailtoHref("admin@example.com\r\nbcc:evil@example.com")).toBeNull();
  });

  it("builds WhatsApp hrefs only from normalized phone digits", () => {
    expect(buildSafeWhatsAppHref("+55 (11) 99999-8888")).toBe("https://wa.me/5511999998888");
    expect(buildSafeWhatsAppHref("123")).toBeNull();
  });
});
