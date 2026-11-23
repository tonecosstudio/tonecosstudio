import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Copy, Images, X } from "lucide-react";

export type ModelGalleryFacet = {
  kind: "category" | "franchise" | "character";
  label: string;
};

export type ModelGalleryDetail = {
  id: string;
  name: string;
  studio: string;
  variant: string;
  provisional: boolean;
  images: Array<{ position: number; thumb: string; display: string }>;
};

type Props = {
  detail: ModelGalleryDetail | null;
  error: string;
  photoIndex: number;
  copyMessage: string;
  facets: ModelGalleryFacet[];
  imageUrl: (path: string | null | undefined) => string | undefined;
  onClose: () => void;
  onCopy: () => void;
  onFacet: (kind: ModelGalleryFacet["kind"]) => void;
  onStepPhoto: (direction: -1 | 1) => void;
  onSelectPhoto: (index: number) => void;
};

const control =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ffffff50] bg-[#111713]/90 text-white shadow-lg transition hover:bg-[#333a31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c78a] sm:h-12 sm:w-12";

export default function TelegramModelGallery({
  detail,
  error,
  photoIndex,
  copyMessage,
  facets,
  imageUrl,
  onClose,
  onCopy,
  onFacet,
  onStepPhoto,
  onSelectPhoto,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [failedMedia, setFailedMedia] = useState<string | null>(null);
  const selectedImage = detail?.images[photoIndex];
  const selectedSrc = imageUrl(selectedImage?.display);
  const total = detail?.images.length ?? 0;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (detail && total > 1 && event.key === "ArrowRight") {
        event.preventDefault();
        onStepPhoto(1);
      } else if (detail && total > 1 && event.key === "ArrowLeft") {
        event.preventDefault();
        onStepPhoto(-1);
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const buttons = Array.from(
        dialogRef.current.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ),
      );
      if (!buttons.length) return;
      if (
        event.shiftKey &&
        (document.activeElement === buttons[0] ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === buttons[buttons.length - 1]
      ) {
        event.preventDefault();
        buttons[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detail, onClose, onStepPhoto, total]);

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Galeria do modelo"
      aria-labelledby={detail ? "catalog-detail-title" : undefined}
      data-testid="catalog-gallery-overlay"
      data-gallery-ui-contract="tonart-model-gallery-v2"
      className="fixed inset-0 z-[9999] isolate flex flex-col overflow-hidden text-[#eee8df] outline-none"
      style={{ backgroundColor: "#0a0e0c" }}
    >
      <header className="z-20 shrink-0 border-b border-[#ffffff1c] bg-[#101612]">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d8ba90]">
              TONART · Acervo digital
            </span>
            <p className="mt-1 max-w-[48vw] truncate text-xs text-[#b7bfb6] sm:max-w-none sm:text-sm">
              {detail
                ? detail.name + " · " + detail.studio
                : "Visualização do modelo"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {detail && total > 1 && (
              <span className="hidden rounded-full border border-[#ffffff26] px-3 py-1.5 text-xs text-[#ddd3c5] sm:inline-flex">
                {photoIndex + 1} de {total}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar galeria"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#8c795e] bg-[#242821] px-3 text-sm font-medium text-[#f4dfc3] transition hover:bg-[#343a30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9ba7d] sm:px-4"
            >
              <X aria-hidden="true" className="h-5 w-5" />
              Fechar
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error && (
          <div
            role="alert"
            className="mx-auto max-w-3xl px-5 py-16 text-center"
          >
            <p className="text-lg text-[#f3b8ad]">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-11 rounded-lg border border-[#a68b67] px-5 text-sm text-[#f4dfc3]"
            >
              Voltar aos modelos
            </button>
          </div>
        )}
        {!error && !detail && (
          <div
            role="status"
            className="mx-auto flex min-h-[45vh] items-center justify-center px-6 text-[#c9baa8]"
          >
            Carregando galeria…
          </div>
        )}
        {detail && (
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-5 px-4 pb-10 pt-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(285px,340px)] lg:items-start lg:gap-7 lg:pt-7">
            <section
              aria-label={"Fotos do modelo " + detail.name}
              className="min-w-0"
            >
              <div
                className="relative flex h-[min(59dvh,710px)] min-h-[270px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#ffffff20] bg-[#171c18] sm:min-h-[380px] lg:h-[min(68dvh,760px)]"
                onTouchStart={(event) => {
                  touchStartX.current =
                    event.changedTouches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  const start = touchStartX.current;
                  touchStartX.current = null;
                  if (start === null || total < 2) return;
                  const end = event.changedTouches[0]?.clientX;
                  if (typeof end !== "number") return;
                  const distance = end - start;
                  if (Math.abs(distance) >= 55)
                    onStepPhoto(distance > 0 ? -1 : 1);
                }}
              >
                {selectedSrc && failedMedia !== selectedSrc ? (
                  <img
                    key={selectedSrc}
                    src={selectedSrc}
                    alt={
                      detail.name +
                      ", imagem " +
                      (photoIndex + 1) +
                      " de " +
                      total
                    }
                    onError={() => setFailedMedia(selectedSrc)}
                    className="h-full max-h-full w-full select-none object-contain"
                    draggable={false}
                  />
                ) : (
                  <p
                    role="status"
                    className="px-8 text-center text-sm text-[#b9b6ad]"
                  >
                    {total
                      ? "Não foi possível carregar esta imagem."
                      : "Imagens em preparação."}
                  </p>
                )}

                {total > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Anterior foto"
                      onClick={() => onStepPhoto(-1)}
                      className={
                        "absolute left-2 top-1/2 -translate-y-1/2 sm:left-4 " +
                        control
                      }
                    >
                      <ChevronLeft aria-hidden="true" className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      aria-label="Próxima foto"
                      onClick={() => onStepPhoto(1)}
                      className={
                        "absolute right-2 top-1/2 -translate-y-1/2 sm:right-4 " +
                        control
                      }
                    >
                      <ChevronRight aria-hidden="true" className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#b9bdb2]">
                <span
                  role="status"
                  aria-live="polite"
                  className="font-medium text-[#e0d4c1]"
                >
                  {total
                    ? "Foto " + (photoIndex + 1) + " / " + total
                    : "Sem fotografias disponíveis"}
                </span>
                {total > 1 && (
                  <span className="text-right">
                    Deslize ou use as setas do teclado para navegar
                  </span>
                )}
              </div>

              {total > 1 && (
                <div
                  role="group"
                  aria-label="Miniaturas da galeria"
                  className="mt-4 flex max-w-full gap-2 overflow-x-auto rounded-xl border border-[#ffffff16] bg-[#111612] p-2.5"
                >
                  {detail.images.map((item, index) => (
                    <button
                      type="button"
                      key={item.position + ":" + index}
                      onClick={() => onSelectPhoto(index)}
                      aria-label={"Mostrar imagem " + (index + 1)}
                      aria-pressed={index === photoIndex}
                      className={
                        "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border-2 bg-[#202620] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f1c68d] " +
                        (index === photoIndex
                          ? "border-[#efc68d] ring-1 ring-[#efc68d]"
                          : "border-[#ffffff23] hover:border-[#c4a47b]")
                      }
                    >
                      {imageUrl(item.thumb) ? (
                        <img
                          src={imageUrl(item.thumb)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#b9b6ad]">
                          {index + 1}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside className="min-w-0 rounded-xl border border-[#ffffff1f] bg-[#151b16] p-5 sm:p-6 lg:sticky lg:top-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d8ad7a]">
                {detail.studio}
              </p>
              <h2
                id="catalog-detail-title"
                className="mt-3 break-words font-serif text-[clamp(1.5rem,2.5vw,2.2rem)] leading-tight text-[#f5ebdc]"
              >
                {detail.name}
              </h2>
              {detail.variant && (
                <p className="mt-3 text-sm leading-6 text-[#c9c9bb]">
                  Versão: {detail.variant}
                </p>
              )}

              <div className="mt-5 border-t border-[#ffffff1d] pt-5">
                <p className="text-sm leading-6 text-[#c2c8be]">
                  {detail.provisional
                    ? "Identificação em curadoria. Os nomes e classificações ainda podem ser revisados."
                    : "Identificação do acervo."}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-[#aaafa5]">
                  <Images aria-hidden="true" className="h-4 w-4" />
                  {total} {total === 1 ? "imagem" : "imagens"} nesta galeria
                </p>
              </div>

              {facets.length > 0 && (
                <div
                  className="mt-5 flex flex-wrap gap-2"
                  aria-label="Classificação do modelo"
                >
                  {facets.map((facet) =>
                    detail.provisional && facet.kind === "franchise" ? (
                      <span
                        key={facet.kind + ":" + facet.label}
                        className="max-w-full rounded-full border border-dashed border-[#71634e] px-3 py-1.5 text-xs text-[#b6c1b4]"
                      >
                        {facet.label} · em revisão
                      </span>
                    ) : (
                      <button
                        key={facet.kind + ":" + facet.label}
                        type="button"
                        onClick={() => onFacet(facet.kind)}
                        className="max-w-full rounded-full border border-[#8a7352] px-3 py-1.5 text-xs text-[#eed3aa] transition hover:bg-[#31362b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f1c68d]"
                      >
                        {facet.label}
                      </button>
                    ),
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-[#ffffff1d] pt-5">
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#c4a477] bg-[#ddbd8e] px-4 py-2.5 text-sm font-semibold text-[#172019] transition hover:bg-[#f1d6ac] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f1c68d]"
                >
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  Copiar link deste modelo
                </button>
                {copyMessage && (
                  <p
                    role="status"
                    className="mt-3 text-center text-sm text-[#d9c69e]"
                  >
                    {copyMessage}
                  </p>
                )}
              </div>

              <p className="mt-6 text-xs leading-5 text-[#a7b0a5]">
                Render digital de escultura 3D. A exibição não implica
                disponibilidade comercial nem autorização de reprodução.
              </p>
              <p className="mt-3 text-xs text-[#838d82]">
                Pressione Esc para voltar ao catálogo.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
