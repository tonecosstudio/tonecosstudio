import { ArrowRight, Archive, Layers3, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import { PUBLIC_CATALOG_LABELS, PUBLIC_ROUTES } from "@/config/routes";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]";

export default function CatalogEntryPage() {
  return (
    <Page
      title="Catálogos — TONART Studio"
      description="Explore o catálogo TONART e descubra os modelos do acervo em organização."
      keywords={["tonart", "catálogo", "modelos", "estúdios", "curadoria"]}
    >
      <section className="relative mx-auto min-h-[70vh] max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-11 max-w-3xl">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--gold-accent))]">
            ACERVO TONART · ESCOLHA SEU UNIVERSO
          </p>
          <h1
            className="text-5xl font-bold uppercase leading-[0.95] tracking-[0.025em] text-white sm:text-7xl"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            CATÁLOGOS
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[hsl(0,0%,70%)] sm:text-base">
            Explore o catálogo, o acervo em organização e as referências que
            ainda aguardam identificação.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Link
            to={PUBLIC_ROUTES.catalogHistorical}
            className={`group flex min-h-[280px] flex-col justify-between border border-[hsl(var(--gold-accent)/0.26)] bg-[hsl(0,0%,7%)] p-6 transition-colors hover:border-[hsl(var(--gold-accent))] sm:p-8 ${FOCUS}`}
          >
            <div>
              <Archive
                aria-hidden="true"
                className="mb-8 h-8 w-8 text-[hsl(var(--gold-accent))]"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                ACERVO TONART
              </span>
              <h2 className="mt-3 text-3xl font-bold uppercase text-white">
                {PUBLIC_CATALOG_LABELS.historical}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[hsl(0,0%,70%)]">
                Explore os modelos, categorias, franquias, fotos e galerias do
                nosso acervo.
              </p>
            </div>
            <span className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))]">
              Explorar modelos{" "}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>

          <Link
            to={PUBLIC_ROUTES.catalogReview}
            className={`group flex min-h-[280px] flex-col justify-between border border-[hsl(var(--gold-accent)/0.26)] bg-[hsl(0,0%,7%)] p-6 transition-colors hover:border-[hsl(var(--gold-accent))] sm:p-8 ${FOCUS}`}
          >
            <div>
              <ScanSearch
                aria-hidden="true"
                className="mb-8 h-8 w-8 text-[hsl(var(--gold-accent))]"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                CURADORIA EM ANDAMENTO
              </span>
              <h2 className="mt-3 text-3xl font-bold uppercase text-white">
                {PUBLIC_CATALOG_LABELS.review}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[hsl(0,0%,70%)]">
                Estamos ampliando e organizando nosso catálogo. Alguns modelos
                podem apresentar nomes ou classificações provisórias.
              </p>
            </div>
            <span className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))]">
              Explorar acervo em organização{" "}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
          <Link
            to={PUBLIC_ROUTES.catalogUnidentified}
            className={`group flex min-h-[280px] flex-col justify-between border border-[hsl(var(--gold-accent)/0.26)] bg-[hsl(0,0%,7%)] p-6 transition-colors hover:border-[hsl(var(--gold-accent))] sm:p-8 ${FOCUS}`}
          >
            <div>
              <ScanSearch
                aria-hidden="true"
                className="mb-8 h-8 w-8 text-[hsl(var(--gold-accent))]"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                IDENTIFICAÇÃO PENDENTE
              </span>
              <h2 className="mt-3 text-3xl font-bold uppercase text-white">
                A identificar
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[hsl(0,0%,70%)]">
                Modelos ainda sem nome. Conforme forem identificados, passam
                para o acervo em revisão.
              </p>
            </div>
            <span className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))]">
              Ver modelos sem nome{" "}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
        <p className="mt-9 inline-flex items-center gap-2 text-xs leading-6 text-[hsl(0,0%,56%)]">
          <Layers3
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[hsl(var(--gold-accent))]"
          />
          Explore as três áreas do mesmo acervo de esculturas digitais.
        </p>
      </section>
    </Page>
  );
}
