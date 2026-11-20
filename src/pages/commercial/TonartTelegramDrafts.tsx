import { useEffect, useState, type FormEvent } from "react";
import {
  editTelegramDraft,
  getTelegramDraft,
  getTelegramDraftImage,
  listTelegramDrafts,
  listTelegramDraftStudios,
  type TelegramDraft,
  type TelegramDraftEdit,
  type TelegramDraftList,
} from "@/services/catalog/tonart-telegram-drafts";
import { secondaryClass, actionClass } from "./CommercialPage";

const field =
  "min-h-11 w-full rounded-sm border border-white/25 bg-black/40 px-3 py-2 text-sm text-white focus:border-[hsl(var(--gold-accent))] outline-none";
const reviewStates: Array<{
  value: TelegramDraft["reviewStatus"];
  label: string;
}> = [
  { value: "pending", label: "Pendente de revisão" },
  { value: "reviewing", label: "Em revisão" },
  { value: "confirmed", label: "Identidade confirmada" },
  { value: "rejected", label: "Identidade rejeitada" },
];

export default function TonartTelegramDrafts() {
  const [studio, setStudio] = useState("");
  const [studios, setStudios] = useState<Array<{ studio: string; total: number }>>([]);
  const [page, setPage] = useState<TelegramDraftList | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<TelegramDraft | null>(null);
  const [form, setForm] = useState<TelegramDraftEdit | null>(null);
  const [previews, setPreviews] = useState<
    Array<{ messageId: number; url: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    listTelegramDraftStudios()
      .then((data) => { if (active) setStudios(data.studios); })
      .catch(() => { if (active) setStudios([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listTelegramDrafts(studio, offset)
      .then((data) => {
        if (active) setPage(data);
      })
      .catch(() => {
        if (active) {
          setPage(null);
          setError(
            "Não foi possível carregar rascunhos privados; o catálogo não foi alterado.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studio, offset]);

  useEffect(() => {
    let active = true;
    let urls: string[] = [];
    setPreviews([]);
    if (!selected) return;
    const photos = selected.images.slice(0, 12);
    Promise.all(
      photos.map(async (image) => {
        const url = await getTelegramDraftImage(image.thumbPath);
        urls.push(url);
        return { messageId: image.messageId, url };
      }),
    )
      .then((items) => {
        if (active) setPreviews(items);
      })
      .catch(() => {
        if (active)
          setError(
            "A mídia privada não está disponível; nenhuma chave R2 foi exposta.",
          );
      });
    return () => {
      active = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [selected?.id, selected?.revision, selected?.images.length]);

  async function inspect(id: string) {
    setError("");
    setSaved(false);
    try {
      const data = await getTelegramDraft(id);
      setSelected(data);
      setForm({
        revision: data.revision,
        name: data.name,
        studio: data.studio,
        character: data.character,
        variant: data.variant,
        reviewStatus: data.reviewStatus,
        imageOrder: data.images.map((x) => x.messageId),
      });
    } catch {
      setError("Falha ao abrir esta ficha; nada foi alterado.");
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    if (!form) return;
    const target = index + direction;
    if (target < 0 || target >= form.imageOrder.length) return;
    const order = [...form.imageOrder];
    [order[index], order[target]] = [order[target], order[index]];
    setForm({ ...form, imageOrder: order });
    setSaved(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected || !form || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await editTelegramDraft(selected.id, form);
      // Read again from the catalog authority: state must survive a new request.
      const persisted = await getTelegramDraft(updated.id);
      if (
        persisted.revision !== updated.revision ||
        persisted.name !== form.name.trim() ||
        persisted.groupKey !== selected.groupKey ||
        persisted.imageCount !== selected.imageCount ||
        persisted.images.some((x, i) => x.messageId !== form.imageOrder[i])
      ) {
        throw new Error("persisted_draft_mismatch");
      }
      setSelected(persisted);
      setForm({
        revision: persisted.revision,
        name: persisted.name,
        studio: persisted.studio,
        character: persisted.character,
        variant: persisted.variant,
        reviewStatus: persisted.reviewStatus,
        imageOrder: persisted.images.map((x) => x.messageId),
      });
      setSaved(true);
      const next = await listTelegramDrafts(studio, offset);
      setPage(next);
    } catch {
      setError(
        "A edição não foi confirmada. Reabra a ficha para verificar a revisão e tentar novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5" aria-label="Estúdios Telegram em rascunho">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-[hsl(var(--gold-accent))]">
          Coleção principal · preparação privada
        </p>
        <h3 className="mt-2 text-xl font-semibold">
          Estatuetas dos estúdios — Telegram
        </h3>
        <p className="mt-2 text-sm text-white/65">
          Uma ficha por escultura, com fotos WebP do R2 privado. Os nomes são
          provisórios. Alterar os dados não reenvia imagens nem cria novos
          produtos. Nenhum rascunho é público.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="w-56 space-y-2 text-sm text-white/75">
          <span className="block">Estúdio</span>
          <select
            value={studio}
            onChange={(e) => {
              setStudio(e.target.value);
              setOffset(0);
              setSelected(null);
              setForm(null);
            }}
            className={field}
          >
            <option value="">Todos os estúdios</option>
            {studios.map(({ studio: name, total }) => (
              <option key={name} value={name}>{name} ({total})</option>
            ))}
          </select>
        </label>
        <p className="text-sm text-white/60" role="status">
          {loading
            ? "Consultando catálogo privado..."
            : page
              ? page.total + " fichas privadas"
              : ""}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="border border-red-500/40 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {page && page.items.length === 0 && (
        <p className="border border-white/20 p-4 text-sm text-white/60">
          Nenhum rascunho importado para este filtro; os produtos antigos
          permanecem preservados.
        </p>
      )}
      {page && page.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-white/20 text-white/60">
              <tr>
                <th className="py-3">Estatueta</th>
                <th>Estúdio</th>
                <th>Imagens</th>
                <th>Revisão</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={item.id} className="border-b border-white/10">
                  <td className="py-3 pr-2">
                    <span className="block font-medium">{item.name}</span>
                    {item.provisionalName && (
                      <span className="block text-xs text-amber-200">
                        Nome provisório
                      </span>
                    )}
                  </td>
                  <td className="pr-3">{item.studio}</td>
                  <td className="pr-3 tabular-nums">{item.imageCount}</td>
                  <td className="pr-3">
                    {reviewStates.find((x) => x.value === item.reviewStatus)
                      ?.label ?? item.reviewStatus}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void inspect(item.id)}
                      className={secondaryClass}
                    >
                      Abrir e editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 pt-4">
            <button
              className={secondaryClass}
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 12))}
            >
              Anterior
            </button>
            <button
              className={secondaryClass}
              type="button"
              disabled={offset + page.limit >= page.total}
              onClick={() => setOffset(offset + 12)}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
      {selected && form && (
        <section
          aria-label="Editor de estatueta Telegram"
          className="border-t border-white/20 pt-6 space-y-5"
        >
          <div>
            <h4 className="text-lg font-semibold">
              Editar ficha · {selected.name}
            </h4>
            <p className="mt-1 text-xs text-white/60">
              Grupo Telegram: {selected.groupKey} · {selected.imageCount} fotos
              · Direitos: {selected.rightsStatus}
            </p>
            <p className="mt-1 text-xs text-white/60">
              ID comercial estável: {selected.id} · Revisão {selected.revision}
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label="Galeria privada WebP"
          >
            {form.imageOrder.map((messageId, index) => {
              const image = previews.find((x) => x.messageId === messageId);
              return (
                <div
                  key={messageId}
                  className="space-y-2 border border-white/15 p-2"
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt={"Fotografia Telegram " + messageId}
                      className="aspect-square w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="aspect-square w-full bg-white/5"
                      aria-label="Carregando foto"
                    />
                  )}
                  <p className="text-xs text-white/60">
                    {index === 0 ? "Capa da galeria" : "Imagem " + (index + 1)}{" "}
                    · #{messageId}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={secondaryClass}
                      disabled={index === 0}
                      onClick={() => movePhoto(index, -1)}
                      aria-label={"Mover foto " + messageId + " para antes"}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={secondaryClass}
                      disabled={index === form.imageOrder.length - 1}
                      onClick={() => movePhoto(index, 1)}
                      aria-label={"Mover foto " + messageId + " para depois"}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!previews.length && (
            <p className="text-xs text-white/50">
              Carregando miniaturas por acesso autorizado...
            </p>
          )}
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => void save(e)}
          >
            <label className="space-y-1 text-sm">
              Nome (provisório)
              <input
                className={field}
                maxLength={160}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              Estúdio
              <input
                className={field}
                maxLength={120}
                required
                value={form.studio}
                onChange={(e) => setForm({ ...form, studio: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              Personagem
              <input
                className={field}
                maxLength={160}
                value={form.character}
                onChange={(e) =>
                  setForm({ ...form, character: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              Variante
              <input
                className={field}
                maxLength={160}
                value={form.variant}
                onChange={(e) => setForm({ ...form, variant: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              Situação da revisão
              <select
                className={field}
                value={form.reviewStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reviewStatus: e.target
                      .value as TelegramDraft["reviewStatus"],
                  })
                }
              >
                {reviewStates.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-3">
              <button type="submit" className={actionClass} disabled={saving}>
                {saving ? "Salvando..." : "Salvar no catálogo"}
              </button>
              <button
                type="button"
                className={secondaryClass}
                onClick={() => {
                  setSelected(null);
                  setForm(null);
                  setSaved(false);
                }}
              >
                Fechar
              </button>
            </div>
          </form>
          {saved && (
            <p role="status" className="text-sm text-emerald-200">
              Edição persistida e reconfirmada no catálogo. Imagens e identidade
              preservadas.
            </p>
          )}
          <p className="text-xs text-white/55">
            Publicação indisponível até identidade e direitos comerciais
            aprovados. Os modelos antigos continuam visíveis no catálogo
            existente.
          </p>
        </section>
      )}
    </section>
  );
}
