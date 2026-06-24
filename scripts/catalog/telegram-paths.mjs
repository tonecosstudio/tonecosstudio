import os from "node:os";
import path from "node:path";

function downloadsPath(...segments) {
  return path.join(os.homedir(), "Downloads", ...segments);
}

export function defaultTelegramRoot() {
  return downloadsPath("telegram-2370335738-images");
}

export function defaultTelegramWebpOutput() {
  return downloadsPath("ordax-catalogo-webp-final");
}
