import { isSafeInAppPath } from "@/config/routes";
import { sanitizeURL } from "@/lib/security/input-sanitizer";

function openNoOpener(target: string): boolean {
  const openedWindow = window.open(target, "_blank", "noopener,noreferrer");

  if (openedWindow) {
    openedWindow.opener = null;
  }

  return openedWindow !== null;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function hasSafeEmailShape(value: string): boolean {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

export function buildSafeMailtoHref(email: string): string | null {
  const normalizedEmail = email.trim();

  if (
    !normalizedEmail ||
    normalizedEmail.length > 320 ||
    hasControlCharacter(normalizedEmail) ||
    !hasSafeEmailShape(normalizedEmail)
  ) {
    return null;
  }

  const parsedUrl = new URL(`mailto:${encodeURIComponent(normalizedEmail)}`);

  return parsedUrl.protocol === "mailto:" ? parsedUrl.toString() : null;
}

export function buildSafeWhatsAppHref(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }

  return `https://wa.me/${digitsOnly}`;
}

export function openSafeExternalUrl(
  url: string,
  allowedProtocols: string[] = ["http", "https"],
): boolean {
  return openNoOpener(sanitizeURL(url, allowedProtocols));
}

export function openSafeInAppPath(path: string): boolean {
  if (!isSafeInAppPath(path)) {
    throw new Error("Caminho interno inseguro");
  }

  return openNoOpener(path);
}

export function openSafeMailtoUrl(
  mailtoUrl: string,
  assignLocation: (url: string) => void = window.location.assign.bind(window.location),
): void {
  if (mailtoUrl.length > 2048 || hasControlCharacter(mailtoUrl)) {
    throw new Error("URL de email insegura");
  }

  const parsedUrl = new URL(mailtoUrl);

  if (parsedUrl.protocol !== "mailto:") {
    throw new Error("URL de email insegura");
  }

  assignLocation(parsedUrl.toString());
}
