import { ArrowRight, Archive, Layers3, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import { PUBLIC_ROUTES } from "@/config/routes";

type CatalogSection = "historical" | "review";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]";

export function CatalogSectionNavigation({
  active,
}: {
  active: CatalogSection;
}) {
  return (
    <nav
      aria-label="Acervos do catálogo"
      className="relative z-10 mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 xl:px-8"
    >
      <Link
        to={PUBLIC_ROUTES.catalogHub}
        className={`inline-flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--gold-accent))] hover:underline ${FOCUS}`}
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" />
        Catálogo TONART
      </Link>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([
          { id: "historical", path: PUBLIC_ROUTES.catalogHistorical, label: "Catálogo original" },
          { id: "review", path: PUBLIC_ROUTES.catalogReview, label: "Telegram · em revisão" },
        ] as const).map((item) => (
          <Link
            key={item.id}
            to={item.path}
            aria-current={active === item.id ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center border px-4 py-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${FOCUS} ${
              active === item.id
                ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.12)] text-[hsl(var(--gold-accent))]"
                : "border-[hsl(var(--gold-accent)/0.18)] bg-[hsl(0,0%,7%)] text-[hsl(0,0%,75%)] hover:border-[hsl(var(--gold-accent)/0.6)] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function CatalogEntryPage() {
  return (
    <Page
      title="Catálogos — TONART Studio"
      description="Escolha entre o catálogo original de modelos e o acervo dos estúdios vindo do Telegram, em organização editorial."
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
            Dois caminhos para explorar o mesmo universo de esculturas digitais:
            o acervo original do site e os modelos dos estúdios recebidos pelo
            Telegram, ainda em organização editorial.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to={PUBLIC_ROUTES.catalogHistorical}
            className={`group flex min-h-[280px] flex-col justify-between border border-[hsl(var(--gold-accent)/0.26)] bg-[hsl(0,0%,7%)] p-6 transition-colors hover:border-[hsl(var(--gold-accent))] sm:p-8 ${FOCUS}`}
          >
            <div>
              <Archive aria-hidden="true" className="mb-8 h-8 w-8 text-[hsl(var(--gold-accent))]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                ARQUIVO ORIGINAL
              </span>
              <h2 className="mt-3 text-3xl font-bold uppercase text-white">
                Modelos do site
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[hsl(0,0%,70%)]">
                Explore o catálogo tradicional: busca, categorias, franquias,
                fotos e galerias dos modelos já presentes no acervo do site.
              </p>
            </div>
            <span className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))]">
              Explorar modelos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>

          <Link
            to={PUBLIC_ROUTES.catalogReview}
            className={`group flex min-h-[280px] flex-col justify-between border border-[hsl(var(--gold-accent)/0.26)] bg-[hsl(0,0%,7%)] p-6 transition-colors hover:border-[hsl(var(--gold-accent))] sm:p-8 ${FOCUS}`}
          >
            <div>
              <ScanSearch aria-hidden="true" className="mb-8 h-8 w-8 text-[hsl(var(--gold-accent))]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
                CURADORIA EM ANDAMENTO
              </span>
              <h2 className="mt-3 text-3xl font-bold uppercase text-white">
                Estúdios · Telegram
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[hsl(0,0%,70%)]">
                Conheça os modelos em revisão e organização. Identificações
                provisórias não representam aprovação editorial nem comercial.
              </p>
            </div>
            <span className="mt-7 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))]">
              Ver acervo em revisão <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
        <p className="mt-9 inline-flex items-center gap-2 text-xs leading-6 text-[hsl(0,0%,56%)]">
          <Layers3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[hsl(var(--gold-accent))]" />
          Os dois acervos utilizam os serviços canônicos de catálogo. A curadoria privada não é publicada aqui.
        </p>
      </section>
    </Page>
  );
}
