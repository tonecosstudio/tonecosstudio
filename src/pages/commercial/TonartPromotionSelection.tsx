import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Trash2, RefreshCw } from "lucide-react";
import {
  listPromotionImages,
  removePromotionImage,
  type PromotionSnapshot,
} from "@/services/catalog/promotion-selection-service";
import { secondaryClass } from "./CommercialPage";

export default function TonartPromotionSelection() {
  const [data, setData] = useState<PromotionSnapshot | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    void listPromotionImages()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar a seleção.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const items = data?.items ?? [];
  const categories = [...new Set(items.map((item) => item.category))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  const visible = items.filter((item) => !filter || item.category === filter);
  const eligible = items.filter((item) => item.exportable).length;
  async function remove(sha: string) {
    setBusy(sha);
    setError("");
    try {
      await removePromotionImage(sha);
      setReload((n) => n + 1);
    } catch {
      setError("Não foi possível confirmar a remoção.");
    } finally {
      setBusy("");
    }
  }
  async function exportManifest() {
    setBusy("export");
    setError("");
    try {
      const current = await listPromotionImages();
      const manifest = {
        ...current,
        items: current.items.filter(
          (item) => item.exportable && item.mediaPath,
        ),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(manifest, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download =
        "tonart-blackfriday-" + current.generatedAt.slice(0, 10) + ".json";
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      setData(current);
    } catch {
      setError("Não foi possível exportar o manifesto atualizado.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section aria-label="Seleção Black Friday" className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Black Friday</h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            Imagens selecionadas no catálogo. A exportação gera referências para
            sincronização com o Drive; nenhuma imagem é copiada neste site.
          </p>
        </div>
        <Link to="/catalogo" className={secondaryClass}>
          Selecionar no catálogo
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Selecionadas", items.length],
          ["Liberadas para exportar", eligible],
          ["Retidas", items.length - eligible],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-white/15 p-4">
            <p className="text-xs text-white/60">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {data ? value : "—"}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filtrar categoria"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="min-h-11 rounded-sm border border-white/20 bg-black px-3 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          className={secondaryClass}
          disabled={loading || !!busy}
          onClick={() => setReload((n) => n + 1)}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
        <button
          className={secondaryClass}
          disabled={loading || !!busy || !eligible}
          onClick={() => void exportManifest()}
        >
          <Download size={16} /> Exportar seleção JSON
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-white/60">
          Carregando seleção…
        </p>
      )}
      {!loading && data && !visible.length && (
        <p className="rounded-sm border border-dashed border-white/20 p-8 text-center text-sm text-white/60">
          Nenhuma imagem nesta seleção.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <article
            key={item.sha256}
            className="overflow-hidden rounded-sm border border-white/15 bg-white/[0.025]"
          >
            {item.mediaPath ? (
              <img
                loading="lazy"
                src={"/catalogo-api" + item.mediaPath}
                alt={item.name}
                className="aspect-square w-full bg-black object-contain"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-black text-xs text-white/50">
                Mídia indisponível
              </div>
            )}
            <div className="space-y-2 p-3">
              <p className="text-xs text-white/60">{item.category}</p>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-xs text-white/60">{item.franchise}</p>
              <p
                className={
                  item.exportable
                    ? "text-xs text-emerald-300"
                    : "text-xs text-amber-200"
                }
              >
                {item.exportable ? "Liberada para exportação" : item.reason}
              </p>
              <button
                className={secondaryClass}
                disabled={!!busy || loading}
                onClick={() => void remove(item.sha256)}
                aria-label={"Remover " + item.name}
              >
                <Trash2 size={15} /> Remover
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs text-white/50">
        Remover daqui não exclui arquivos já existentes no Google Drive. A
        seleção não altera direitos, ofertas nem publicação do modelo.
      </p>
    </section>
  );
}
