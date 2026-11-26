import { useContext, useState } from "react";
import { Download, Plus, Check } from "lucide-react";
import {
  PromotionSelectionContext,
  type PromotionSelectionAccess,
  type PromotionSource,
} from "./PromotionSelectionContext";

/** Temporary public UI switch. Never changes API/media authorization. */
export function catalogImageDownloadEnabled(): boolean {
  return import.meta.env.VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED !== "false";
}

const extensions: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
  "image/gif": "gif",
};

export function catalogDownloadFilename(
  name: string,
  id: string,
  mime: string,
): string {
  const safe = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  return (
    [safe(name) || "modelo", safe(id) || "imagem"].join("-") +
    "." +
    extensions[mime]
  );
}

export function catalogDownloadUrl(
  src: string | null | undefined,
): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    if (
      !url.pathname.startsWith("/catalogo-api/media/") &&
      !/^\/catalogo-api\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(thumb|display)$/.test(
        url.pathname,
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

function AddToPromotion({
  access,
  source,
}: {
  access: PromotionSelectionAccess;
  source: PromotionSource;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  async function save() {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      await access.save(source);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void save()}
        disabled={status === "saving" || status === "saved"}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-white/20 px-3 py-2 text-xs font-medium text-white/85 hover:border-[hsl(var(--gold-accent))] disabled:opacity-60"
      >
        {status === "saved" ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Plus size={16} aria-hidden="true" />
        )}
        {status === "saving"
          ? "Adicionando…"
          : status === "saved"
            ? "Adicionada à Black Friday"
            : "Adicionar à Black Friday"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          Não foi possível confirmar a seleção. Tente novamente.
        </p>
      )}
    </div>
  );
}

export function CatalogImageDownload({
  src,
  name,
  id,
  className = "",
  modelSlug,
}: {
  src: string | null | undefined;
  name: string;
  id: string;
  className?: string;
  modelSlug?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const access = useContext(PromotionSelectionContext);
  const url = catalogDownloadUrl(src);
  if (!catalogImageDownloadEnabled() || !url) return null;

  async function download() {
    if (busy || !url) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
      });
      const mime = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (
        !response.ok ||
        !Object.prototype.hasOwnProperty.call(extensions, mime)
      ) {
        throw new Error("invalid_media");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("empty_media");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = catalogDownloadFilename(name, id, mime);
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
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
      <button
        type="button"
        disabled={busy}
        aria-label={"Baixar imagem de " + name}
        onClick={() => {
          void download();
        }}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[hsl(var(--gold-accent)/0.4)] bg-black/70 px-2 py-1.5 text-xs font-medium text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
      >
        <Download size={16} aria-hidden="true" />
        {busy ? "Baixando…" : "Baixar imagem"}
      </button>
      {access &&
        (modelSlug ||
          new URL(url).pathname.startsWith(
            "/catalogo-api/api/telegram-studios/",
          )) && (
          <AddToPromotion
            key={url + (modelSlug ?? "")}
            access={access}
            source={{
              path: new URL(url).pathname.slice("/catalogo-api".length),
              modelSlug,
            }}
          />
        )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          Não foi possível baixar. Tente novamente.
        </p>
      )}
    </div>
  );
}
