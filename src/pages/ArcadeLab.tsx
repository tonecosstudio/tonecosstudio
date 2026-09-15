import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  Crosshair,
  Gamepad2,
  Layers3,
  Monitor,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PUBLIC_ROUTES, catalogCharacterPath } from "@/config/routes";
import { useLandingCatalogModels } from "@/hooks/catalog/useLandingCatalogModels";
import {
  ARCADE_UNIVERSES,
  DEMO_FIGHTERS,
  type ArcadeFighter,
} from "./arcade-lab/arcade-data";
import "@/styles/arcade-lab.css";

function FighterArt({
  fighter,
  className = "",
}: {
  fighter: ArcadeFighter;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (fighter.sprite !== undefined) {
    return (
      <div
        role="img"
        aria-label={`Estudo ilustrativo de ${fighter.name}`}
        className={`al-fighter-art ${className}`}
        style={{
          backgroundPosition: `${(fighter.sprite % 3) * 50}% ${Math.floor(fighter.sprite / 3) * 100}%`,
        }}
      />
    );
  }
  return fighter.image && !failed ? (
    <img
      className={`al-real-art ${className}`}
      src={fighter.image}
      alt={fighter.name}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`al-no-art ${className}`}
      role="img"
      aria-label="Imagem indisponível"
    >
      <Crosshair size={48} />
      <span>Imagem indisponível</span>
    </div>
  );
}

function CharacterSelect({
  fighters,
  illustrative,
}: {
  fighters: ArcadeFighter[];
  illustrative: boolean;
}) {
  const [universe, setUniverse] = useState("all");
  const [selectedId, setSelectedId] = useState(fighters[0]?.id ?? "");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rosterRef = useRef<HTMLDivElement>(null);
  const visible = fighters.filter(
    (fighter) => universe === "all" || fighter.universe === universe,
  );
  const selected =
    visible.find((fighter) => fighter.id === selectedId) ?? visible[0];
  const currentUniverse = ARCADE_UNIVERSES.find(
    (entry) => entry.id === selected?.universe,
  );

  function changeUniverse(id: string) {
    setUniverse(id);
    setSelectedId(
      fighters.find((fighter) => id === "all" || fighter.universe === id)?.id ??
        "",
    );
  }

  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const keys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const columns = rosterRef.current
      ? getComputedStyle(rosterRef.current).gridTemplateColumns.split(" ")
          .length
      : 3;
    const offset =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -columns
            : columns;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? visible.length - 1
          : (index + offset + visible.length) % visible.length;
    setSelectedId(visible[next].id);
    const buttons =
      rosterRef.current?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[next]?.focus();
  }

  return (
    <>
      <section
        className="al-select"
        id="al-select"
        aria-labelledby="al-select-title"
      >
        <div className="al-section-top">
          <span>
            <span className="al-p1">P1</span> CHARACTER SELECT
          </span>
          <span>
            {illustrative ? "MODO DEMONSTRAÇÃO" : "CATÁLOGO PUBLICADO"}{" "}
            <span className="al-indicator" />
          </span>
        </div>
        <div className="al-select-heading">
          <div>
            <p className="al-eyebrow">A PRÓXIMA FASE DA SUA COLEÇÃO</p>
            <h1 id="al-select-title">
              Escolha seu <br />
              <span>personagem.</span>
            </h1>
            <p>Do fliperama para a sua estante.</p>
          </div>
          <div className="al-select-stamp" aria-hidden="true">
            <Crosshair />
            <span>
              SELECT
              <br />
              YOUR
              <br />
              <b>LEGEND</b>
            </span>
          </div>
        </div>
        <div
          className="al-arena"
          data-universe={currentUniverse?.id ?? "combat"}
        >
          <div className="al-roster-panel">
            {illustrative ? (
              <div
                className="al-filters"
                role="group"
                aria-label="Filtrar universo"
              >
                <button
                  type="button"
                  aria-pressed={universe === "all"}
                  onClick={() => changeUniverse("all")}
                >
                  Todos <span>06</span>
                </button>
                {ARCADE_UNIVERSES.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    aria-pressed={universe === entry.id}
                    onClick={() => changeUniverse(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="al-eyebrow">
                PERSONAGENS RECENTES / SELECIONE UMA PEÇA
              </p>
            )}
            <div
              ref={rosterRef}
              className="al-roster"
              role="group"
              aria-label="Selecionar personagem"
            >
              {visible.map((fighter, index) => (
                <button
                  type="button"
                  key={fighter.id}
                  aria-label={`Selecionar ${fighter.name}`}
                  aria-pressed={fighter.id === selected?.id}
                  className="al-portrait"
                  onClick={() => setSelectedId(fighter.id)}
                  onKeyDown={(event) => moveSelection(event, index)}
                >
                  <FighterArt key={fighter.id} fighter={fighter} />
                  <span className="al-portrait-number" aria-hidden="true">
                    {String(fighters.indexOf(fighter) + 1).padStart(2, "0")}
                  </span>
                  {fighter.id === selected?.id && (
                    <span className="al-player-tag" aria-hidden="true">
                      P1
                    </span>
                  )}
                  <span className="al-portrait-name">
                    {fighter.name}
                    <ChevronRight size={14} aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
            <div className="al-controls">
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> SELECIONAR
              </span>
              <span>
                <Gamepad2 size={15} /> CLIQUE OU TOQUE
              </span>
            </div>
            <div className="al-roster-note">
              <span className="al-tiny-cross">+</span>
              <p>
                {illustrative
                  ? "Personagens ilustrativos. Explore a direção visual e encontre seu favorito."
                  : "Seleção conectada ao acervo. Abra o personagem para consultar os modelos."}
              </p>
            </div>
          </div>
          {selected ? (
            <div className="al-selected" aria-label="Personagem em destaque">
              <div className="al-selected-top">
                <span>
                  <Crosshair size={13} /> EM DESTAQUE
                </span>
                <span>
                  ORDAX /{" "}
                  {String(fighters.indexOf(selected) + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="al-selected-image" key={selected.id}>
                <FighterArt fighter={selected} />
                <div className="al-scanlines" aria-hidden="true" />
                <span className="al-side-label" aria-hidden="true">
                  FROM PIXELS TO PRESENCE
                </span>
              </div>
              <div className="al-selected-info">
                <div aria-live="polite" aria-atomic="true">
                  <p className="al-eyebrow">
                    {illustrative ? currentUniverse?.name : selected.universe}
                  </p>
                  <h2>{selected.name}</h2>
                  <p>{selected.subtitle}</p>
                </div>
                {selected.href ? (
                  <Link
                    className="al-button al-button--gold"
                    to={selected.href}
                  >
                    Ver modelos <ArrowRight size={18} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="al-button al-button--gold"
                    onClick={() => setDetailsOpen(true)}
                  >
                    Explorar personagem <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="al-state" role="status">
              Nenhum personagem neste universo.
            </p>
          )}
        </div>
        <div className="al-machine-bottom">
          <span>ORDAX ORIGINAL EXPERIENCE</span>
          <span>
            ESCOLHA. COLECIONE. RECOMECE.{" "}
            <span className="al-tiny-cross">+</span>
          </span>
        </div>
      </section>

      {illustrative && (
        <section
          className="al-universes"
          aria-labelledby="al-universes-title"
          id="al-universes"
        >
          <div className="al-section-heading">
            <div>
              <p className="al-eyebrow">01 / MUDE DE CENÁRIO</p>
              <h2 id="al-universes-title">
                Um universo.
                <br className="al-mobile-break" /> Outra seleção.
              </h2>
            </div>
            <span>
              ESCOLHA SUA COLEÇÃO <ArrowDown size={16} />
            </span>
          </div>
          <div className="al-universe-grid">
            {ARCADE_UNIVERSES.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className="al-universe-card"
                aria-pressed={universe === entry.id}
                onClick={() => {
                  changeUniverse(entry.id);
                  document
                    .getElementById("al-select")
                    ?.scrollIntoView({ behavior: "instant", block: "start" });
                  requestAnimationFrame(() => {
                    rosterRef.current
                      ?.querySelector<HTMLButtonElement>("button")
                      ?.focus({ preventScroll: true });
                  });
                }}
              >
                <div
                  className="al-stage"
                  style={{ backgroundPosition: `center ${entry.stage * 50}%` }}
                />
                <div className="al-universe-shade" />
                <span className="al-universe-index">
                  STAGE / 0{entry.stage + 1}
                </span>
                <div className="al-universe-info">
                  <span>{entry.subtitle}</span>
                  <h3>{entry.name}</h3>
                  <p>
                    {universe === entry.id
                      ? "COLEÇÃO SELECIONADA"
                      : "SELECIONAR COLEÇÃO"}
                    {universe === entry.id ? (
                      <Check size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <p className="al-caption">
            Coleções conceituais criadas para esta demonstração.
          </p>
        </section>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="al-detail-dialog">
          <DialogHeader>
            <DialogTitle>{selected?.name} / estudo de personagem</DialogTitle>
            <DialogDescription>
              Arte ilustrativa do Arcade Lab. Esta peça não está anunciada para
              compra.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="al-detail-body">
              <FighterArt key={selected.id} fighter={selected} />
              <div>
                <p className="al-eyebrow">{currentUniverse?.name}</p>
                <h3>{selected.subtitle}</h3>
                <p>{selected.description}</p>
                <Link
                  to={PUBLIC_ROUTES.catalog}
                  className="al-button al-button--gold"
                >
                  Explorar catálogo real <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PublishedRoster() {
  const query = useLandingCatalogModels(12);
  if (query.isPending)
    return (
      <div className="al-state" role="status">
        <Crosshair className="al-loading" size={32} />
        <h2>Preparando a seleção…</h2>
        <p>Consultando os personagens publicados.</p>
      </div>
    );
  if (query.isError)
    return (
      <div className="al-state" role="alert">
        <Crosshair size={32} />
        <h2>O acervo não respondeu.</h2>
        <p>Não foi possível carregar o catálogo agora.</p>
        <button
          type="button"
          className="al-button"
          onClick={() => void query.refetch()}
        >
          <RotateCcw size={16} /> Tentar novamente
        </button>
      </div>
    );
  if (!query.data?.length)
    return (
      <div className="al-state" role="status">
        <Layers3 size={32} />
        <h2>Uma nova seleção está a caminho.</h2>
        <p>Nenhum personagem publicado foi encontrado.</p>
        <Link className="al-button" to={PUBLIC_ROUTES.catalog}>
          Abrir catálogo <ArrowRight size={16} />
        </Link>
      </div>
    );
  return (
    <CharacterSelect
      illustrative={false}
      fighters={query.data.map((row) => ({
        id: row.id,
        name: row.character_name,
        universe: row.source_title ?? "Acervo ORDAX",
        subtitle: `${row.model_count} ${row.model_count === 1 ? "modelo" : "modelos"} no catálogo`,
        description: "",
        image: row.thumbnailUrl ?? row.imageUrl,
        href: catalogCharacterPath(row.character_name, row.source_title),
      }))}
    />
  );
}

export default function ArcadeLab() {
  const [mode, setMode] = useState<"demo" | "catalog">("demo");
  const [effects, setEffects] = useState(true);
  const [coinsOpen, setCoinsOpen] = useState(false);
  return (
    <div
      className="arcade-lab"
      data-effects={effects ? "on" : "off"}
      style={{ colorScheme: "dark" } as CSSProperties}
    >
      <SEOHead
        title="Arcade Lab — Escolha seu personagem"
        description="Uma experiência visual ORDAX inspirada nas telas de seleção dos fliperamas. Explore personagens e universos no Arcade Lab."
        noindex
      />
      <a className="al-skip" href="#al-main">
        Pular para o conteúdo
      </a>
      <header className="al-header">
        <Link
          to={PUBLIC_ROUTES.home}
          className="al-logo"
          aria-label="ORDAX — página inicial"
        >
          ORDA<span>X</span>
          <small>TONECOS STUDIOS</small>
        </Link>
        <nav aria-label="Navegação principal">
          <Link to={PUBLIC_ROUTES.catalog}>Catálogo</Link>
          <a href="#al-experience">Coleções</a>
          <a href="#al-coins">Coins</a>
        </nav>
        <Link to={PUBLIC_ROUTES.login} className="al-login">
          Entrar <ArrowRight size={15} />
        </Link>
      </header>
      <main id="al-main" className="al-main">
        <div className="al-marquee">
          <span>
            <Gamepad2 size={16} /> PLAYER ONE <b>READY?</b>
          </span>
          <span>FIGURAS REAIS. GRANDES UNIVERSOS.</span>
          <button
            type="button"
            onClick={() => setEffects((value) => !value)}
            aria-pressed={effects}
            aria-label="Efeitos visuais"
          >
            <Monitor size={14} /> EFEITOS {effects ? "ON" : "OFF"}
          </button>
        </div>
        <div className="al-lab-bar" id="al-experience">
          <span>
            <Sparkles size={13} /> ARCADE LAB{" "}
            <span className="al-lab-description">/ CONCEITO INTERATIVO</span>
          </span>
          <div role="group" aria-label="Fonte dos personagens">
            <button
              type="button"
              aria-pressed={mode === "demo"}
              onClick={() => setMode("demo")}
            >
              Demonstração
            </button>
            <button
              type="button"
              aria-pressed={mode === "catalog"}
              onClick={() => setMode("catalog")}
            >
              Catálogo real <ArrowRight size={12} />
            </button>
          </div>
        </div>
        {mode === "demo" ? (
          <CharacterSelect key="demo" fighters={DEMO_FIGHTERS} illustrative />
        ) : (
          <PublishedRoster />
        )}
        <section
          className="al-coins"
          id="al-coins"
          aria-labelledby="al-coins-title"
        >
          <div className="al-coin-art" aria-hidden="true">
            <div className="al-coin al-coin--back">X</div>
            <div className="al-coin al-coin--front">
              X<small>ORDAX</small>
            </div>
            <span>
              INSERT COIN
              <br />
              TO COLLECT
            </span>
          </div>
          <div className="al-coins-copy">
            <p className="al-eyebrow">02 / CONTINUE SUA JORNADA</p>
            <h2 id="al-coins-title">
              Seus coins.
              <br />
              <span>Sua próxima escolha.</span>
            </h2>
            <p>
              A ficha ganha um novo significado. Conheça os créditos de
              assinatura e o caminho até sua próxima peça.
            </p>
            <button
              type="button"
              className="al-button al-button--gold"
              onClick={() => setCoinsOpen(true)}
            >
              <Coins size={17} /> Como funcionam os coins{" "}
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="al-coin-side" aria-hidden="true">
            CREDIT SYSTEM / ORDAX
          </div>
        </section>
        <section className="al-journey" aria-labelledby="al-journey-title">
          <h2 id="al-journey-title" className="sr-only">
            Da seleção à sua estante
          </h2>
          <div>
            <span>01</span>
            <div>
              <h3>Encontre sua peça</h3>
              <p>Explore personagens e modelos.</p>
            </div>
            <Crosshair size={21} />
          </div>
          <div>
            <span>02</span>
            <div>
              <h3>Acompanhe a produção</h3>
              <p>Cada etapa, mais perto de você.</p>
            </div>
            <Layers3 size={21} />
          </div>
          <div>
            <span>03</span>
            <div>
              <h3>Dê um lugar à sua história</h3>
              <p>Do imaginário para a sua estante.</p>
            </div>
            <Gamepad2 size={21} />
          </div>
        </section>
        <div className="al-endline">
          <span>CONTINUE?</span>
          <Link to={PUBLIC_ROUTES.catalog}>
            SIM. EXPLORAR CATÁLOGO <ArrowRight size={16} />
          </Link>
        </div>
      </main>
      <footer className="al-footer">
        <div>
          <strong>ORDAX</strong>
          <span>UMA PLATAFORMA TONECOS STUDIOS.</span>
        </div>
        <p>Arcade Lab · Artes e coleções demonstrativas.</p>
        <Link to={PUBLIC_ROUTES.home}>
          <ArrowLeft size={14} /> Voltar à home
        </Link>
      </footer>
      <Dialog open={coinsOpen} onOpenChange={setCoinsOpen}>
        <DialogContent className="al-detail-dialog al-coins-dialog">
          <DialogHeader>
            <DialogTitle>Uma ficha para a sua próxima escolha.</DialogTitle>
            <DialogDescription>
              Coins são os créditos do sistema de assinaturas ORDAX.
            </DialogDescription>
          </DialogHeader>
          <ol>
            <li>
              <b>Conheça sua assinatura.</b>
              <p>A quantidade de créditos segue as condições do plano.</p>
            </li>
            <li>
              <b>Explore as peças elegíveis.</b>
              <p>
                O custo de cada personagem é informado pelo catálogo e pelas
                regras da sua assinatura.
              </p>
            </li>
            <li>
              <b>Confira antes de escolher.</b>
              <p>
                Saldo, disponibilidade e condições precisam ser confirmados na
                sua conta.
              </p>
            </li>
          </ol>
          <p className="al-caption">
            Esta demonstração não oferece planos, saldo ou resgates.
          </p>
          <Link className="al-button al-button--gold" to={PUBLIC_ROUTES.login}>
            Acessar minha conta <ArrowRight size={16} />
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
