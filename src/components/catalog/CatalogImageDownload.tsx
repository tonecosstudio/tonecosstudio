import { useState } from "react";
import { Download } from "lucide-react";

/** Temporary public UI switch. Never changes API/media authorization. */
export function catalogImageDownloadEnabled(): boolean {
  return import.meta.env.VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED !== "false";
}

const extensions: Record<string, string> = {
  "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png",
  "image/avif": "avif", "image/gif": "gif",
};

export function catalogDownloadFilename(name: string, id: string, mime: string): string {
  const safe = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return [safe(name) || "modelo", safe(id) || "imagem"].join("-") + "." + extensions[mime];
}

export function catalogDownloadUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password || url.search || url.hash) return null;
    if (!url.pathname.startsWith("/catalogo-api/media/") &&
      !/^\/catalogo-api\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(thumb|display)$/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function CatalogImageDownload({ src, name, id, className = "" }: {
  src: string | null | undefined; name: string; id: string; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const url = catalogDownloadUrl(src);
  if (!catalogImageDownloadEnabled() || !url) return null;

  async function download() {
    if (busy || !url) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(url, { cache: "no-store", redirect: "error", credentials: "omit" });
      const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!response.ok || !Object.prototype.hasOwnProperty.call(extensions, mime)) throw new Error("invalid_media");
      const blob = await response.blob();
      if (!blob.size) throw new Error("empty_media");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = catalogDownloadFilename(name, id, mime);
      document.body.appendChild(link);
      try { link.click(); } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button type="button" disabled={busy}
        aria-label={"Baixar imagem de " + name}
        onClick={() => { void download(); }}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[hsl(var(--gold-accent)/0.4)] bg-black/70 px-2 py-1.5 text-xs font-medium text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 disabled:opacity-50">
        <Download size={16} aria-hidden="true" />
        {busy ? "Baixando…" : "Baixar imagem"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-300">Não foi possível baixar. Tente novamente.</p>}
    </div>
  );
}
