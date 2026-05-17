/**
 * CharacterSelectMK
 * Tela de seleção estilo Mortal Kombat:
 * - Personagem do mês renderizado por completo à esquerda
 * - Roster de silhuetas à direita (somente o atual revelado, demais como ???)
 * - Animação de troca / reveal cinematográfico
 *
 * Página puramente frontend, com mock data.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, Volume2, Menu, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

type RosterChar = {
  id: string;
  index: number;
  name: string;
  title: string;
  description: string;
  edition: string;
  releaseLabel: string;
  imageUrl: string;
  silhouetteUrl?: string;
  themeColor: string; // hex
  isLocked: boolean;
  isFinal?: boolean; // último card grande (ex.: The Watcher)
};

const ROSTER: RosterChar[] = [
  {
    id: "orax",
    index: 1,
    name: "ORAX",
    title: "O PORTADOR DO EQUILÍBRIO",
    description:
      "Entre a luz e a escuridão, existe um caminho que poucos podem ver. Orax caminha entre os mundos, mantendo o equilíbrio que sustenta a realidade.",
    edition: "01",
    releaseLabel: "MAIO / 2024",
    imageUrl: "/characters/placeholder-red.svg",
    themeColor: "#c0392b",
    isLocked: false,
  },
  {
    id: "c2",
    index: 2,
    name: "???",
    title: "EM BREVE",
    description: "Aguarde o próximo mês.",
    edition: "02",
    releaseLabel: "JUNHO / 2024",
    imageUrl: "/characters/placeholder-purple.svg",
    silhouetteUrl: "/characters/placeholder-purple.svg",
    themeColor: "#7b6a3a",
    isLocked: true,
  },
  {
    id: "c3",
    index: 3,
    name: "???",
    title: "EM BREVE",
    description: "Aguarde o próximo mês.",
    edition: "03",
    releaseLabel: "JULHO / 2024",
    imageUrl: "/characters/placeholder-gray.svg",
    silhouetteUrl: "/characters/placeholder-gray.svg",
    themeColor: "#7b6a3a",
    isLocked: true,
  },
  {
    id: "c4",
    index: 4,
    name: "???",
    title: "EM BREVE",
    description: "Aguarde o próximo mês.",
    edition: "04",
    releaseLabel: "AGOSTO / 2024",
    imageUrl: "/characters/placeholder-gold.svg",
    silhouetteUrl: "/characters/placeholder-gold.svg",
    themeColor: "#7b6a3a",
    isLocked: true,
  },
  {
    id: "c5",
    index: 5,
    name: "???",
    title: "EM BREVE",
    description: "Aguarde o próximo mês.",
    edition: "05",
    releaseLabel: "SETEMBRO / 2024",
    imageUrl: "/characters/placeholder-blue.svg",
    silhouetteUrl: "/characters/placeholder-blue.svg",
    themeColor: "#7b6a3a",
    isLocked: true,
  },
  {
    id: "c6",
    index: 6,
    name: "???",
    title: "EM BREVE",
    description: "Aguarde o próximo mês.",
    edition: "06",
    releaseLabel: "OUTUBRO / 2024",
    imageUrl: "/characters/placeholder-red.svg",
    silhouetteUrl: "/characters/placeholder-red.svg",
    themeColor: "#7b6a3a",
    isLocked: true,
  },
  {
    id: "watcher",
    index: 7,
    name: "THE WATCHER",
    title: "AGUARDE\nPRÓXIMO MÊS",
    description: "O observador silencioso. Revelação iminente.",
    edition: "07",
    releaseLabel: "NOVEMBRO / 2024",
    imageUrl: "/characters/placeholder-gray.svg",
    silhouetteUrl: "/characters/placeholder-gray.svg",
    themeColor: "#9c7b3a",
    isLocked: true,
    isFinal: true,
  },
];

export default function CharacterSelectMK() {
  const [selectedId, setSelectedId] = useState<string>(ROSTER[0].id);
  const selected = useMemo(
    () => ROSTER.find((c) => c.id === selectedId) ?? ROSTER[0],
    [selectedId]
  );

  const unlockedCount = ROSTER.filter((c) => !c.isLocked && !c.isFinal).length;
  const totalCount = ROSTER.filter((c) => !c.isFinal).length;

  return (
    <>
      <SEOHead
        title="Seleção de Personagens — Coleção Ordax"
        description="Escolha seu guardião. Experiência de seleção cinematográfica inspirada em jogos de luta clássicos."
      />

      <div
        className="relative min-h-screen w-full overflow-hidden text-zinc-200"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, #1a0a0a 0%, #0a0606 45%, #050303 100%)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
          }}
        />
        {/* Vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* TOP NAV */}
        <header className="relative z-20 flex items-center justify-between px-10 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full border"
              style={{
                borderColor: "#c9a84c",
                background:
                  "radial-gradient(circle at center, #c9a84c33 0%, transparent 70%)",
              }}
            />
            <span
              className="text-2xl font-light tracking-[0.3em]"
              style={{ color: "#e8d9a8", fontFamily: "'Cormorant Garamond', serif" }}
            >
              ORDAX
            </span>
          </Link>

          <nav className="hidden gap-10 text-xs tracking-[0.35em] md:flex">
            {["COLEÇÃO", "LORE", "MANIFESTO", "LOJA", "COMUNIDADE"].map((n, i) => (
              <a
                key={n}
                href="#"
                className={`transition-colors ${
                  i === 0
                    ? "text-amber-200"
                    : "text-zinc-500 hover:text-amber-200/80"
                }`}
              >
                {n}
                {i === 0 && (
                  <span className="ml-2 inline-block h-1 w-1 rounded-full bg-amber-400 align-middle" />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              className="rounded border border-zinc-700/60 p-2 text-zinc-400 hover:text-amber-300"
              aria-label="Som"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              className="rounded border border-zinc-700/60 p-2 text-zinc-400 hover:text-amber-300"
              aria-label="Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* MAIN GRID */}
        <main className="relative z-10 grid grid-cols-1 gap-8 px-10 pb-16 lg:grid-cols-[1.2fr_1fr]">
          {/* LEFT: HERO CHARACTER */}
          <section className="relative flex min-h-[78vh] flex-col">
            <div className="relative flex-1">
              {/* Arco/portal atrás do personagem */}
              <div
                aria-hidden
                className="absolute left-1/2 top-8 -translate-x-1/2"
                style={{
                  width: 360,
                  height: 360,
                  background:
                    "radial-gradient(circle at center, rgba(201,168,76,0.25) 0%, transparent 60%)",
                  filter: "blur(20px)",
                }}
              />
              <svg
                aria-hidden
                className="absolute left-1/2 top-4 -translate-x-1/2 opacity-70"
                width="280"
                height="320"
                viewBox="0 0 280 320"
                fill="none"
              >
                <path
                  d="M140 10 L140 60 M40 160 A100 100 0 0 1 240 160"
                  stroke="#c9a84c"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <circle cx="140" cy="160" r="90" stroke="#c9a84c" strokeWidth="0.6" opacity="0.4" />
              </svg>

              {/* HERO CHARACTER */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, scale: 0.92, y: 30, filter: "blur(20px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                  transition={{ duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] }}
                  className="absolute inset-0 flex items-end justify-center"
                >
                  <div className="relative h-full w-full">
                    {/* Energia ao redor */}
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 50% 70%, ${selected.themeColor}55 0%, transparent 55%)`,
                        filter: "blur(40px)",
                      }}
                    />
                    {/* Silhueta ou completo */}
                    <img
                      src={selected.imageUrl}
                      alt={selected.name}
                      className="absolute inset-0 mx-auto h-full w-auto max-w-full object-contain"
                      style={{
                        filter: selected.isLocked
                          ? "brightness(0) drop-shadow(0 0 20px rgba(0,0,0,0.8))"
                          : `drop-shadow(0 30px 60px ${selected.themeColor}aa)`,
                      }}
                    />
                    {/* Reflexo no chão */}
                    <div
                      aria-hidden
                      className="absolute bottom-0 left-1/2 h-32 w-2/3 -translate-x-1/2"
                      style={{
                        background: `radial-gradient(ellipse at center top, ${selected.themeColor}66 0%, transparent 70%)`,
                        filter: "blur(20px)",
                      }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* INFO PERSONAGEM */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`info-${selected.id}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="absolute left-0 top-1/4 max-w-md space-y-5"
              >
                <div
                  className="text-[10px] tracking-[0.4em]"
                  style={{ color: selected.themeColor }}
                >
                  PERSONAGEM DO MÊS
                </div>
                <h1
                  className="text-7xl font-light leading-none tracking-[0.08em]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "#e8d9a8",
                    textShadow: `0 0 30px ${selected.themeColor}40`,
                  }}
                >
                  {selected.name}
                </h1>
                <div className="text-xs tracking-[0.3em] text-zinc-400">
                  {selected.title.replace("\n", " · ")}
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                  {selected.description}
                </p>

                <button
                  disabled={selected.isLocked}
                  className="group mt-4 inline-flex items-center gap-3 border px-6 py-3 text-[11px] tracking-[0.3em] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: "#c9a84c80",
                    color: "#e8d9a8",
                  }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center border"
                    style={{ borderColor: "#c9a84c" }}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  VER LORE COMPLETO
                </button>

                <div className="pt-8">
                  <div className="text-[10px] tracking-[0.4em] text-zinc-500">
                    EDIÇÃO
                  </div>
                  <div
                    className="text-6xl font-light leading-none"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: selected.themeColor,
                    }}
                  >
                    {selected.edition}
                  </div>
                  <div className="mt-1 text-[10px] tracking-[0.4em] text-zinc-500">
                    {selected.releaseLabel}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Scroll indicator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <ChevronDown className="mx-auto h-4 w-4 animate-bounce text-zinc-600" />
              <div className="mt-1 text-[10px] tracking-[0.4em] text-zinc-600">
                SCROLL
              </div>
            </div>
          </section>

          {/* RIGHT: ROSTER */}
          <aside className="relative">
            <div className="mb-6 text-center">
              <h2
                className="text-2xl font-light tracking-[0.3em]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "#e8d9a8",
                }}
              >
                COLEÇÃO ORDAX
              </h2>
              <div className="mt-1 text-[10px] tracking-[0.4em] text-zinc-500">
                DESCUBRA TODOS OS GUARDIÕES
              </div>
            </div>

            {/* Grid 3x2 + final card */}
            <div className="grid grid-cols-3 gap-3">
              {ROSTER.filter((c) => !c.isFinal).map((c) => (
                <RosterCard
                  key={c.id}
                  char={c}
                  active={c.id === selected.id}
                  onClick={() => setSelectedId(c.id)}
                />
              ))}
            </div>

            {/* Final wide card */}
            {ROSTER.filter((c) => c.isFinal).map((c) => (
              <FinalCard
                key={c.id}
                char={c}
                active={c.id === selected.id}
                onClick={() => setSelectedId(c.id)}
              />
            ))}

            {/* Bottom: progress + CTA */}
            <div className="mt-6 flex items-end justify-between gap-6">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3 text-[10px] tracking-[0.4em] text-zinc-500">
                  DESBLOQUEADOS
                  <span className="text-amber-200">
                    {String(unlockedCount).padStart(2, "0")} / {String(totalCount).padStart(2, "0")}
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden bg-zinc-900">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #c0392b 0%, #e8d9a8 100%)",
                    }}
                  />
                </div>
              </div>

              <Link
                to="/colecoes"
                className="group inline-flex items-center gap-3 border px-5 py-3 text-[10px] tracking-[0.3em] transition-all hover:bg-amber-500/5"
                style={{ borderColor: "#c9a84c80", color: "#e8d9a8" }}
              >
                VER TODA COLEÇÃO
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}

/* ─── Roster card (silhueta) ─────────────────────────────────────────── */
function RosterCard({
  char,
  active,
  onClick,
}: {
  char: RosterChar;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      className="group relative aspect-[3/4] overflow-hidden border text-left transition-all"
      style={{
        borderColor: active ? char.themeColor : "rgba(201,168,76,0.2)",
        background:
          "linear-gradient(180deg, rgba(20,12,10,0.9) 0%, rgba(10,6,5,0.95) 100%)",
        boxShadow: active
          ? `0 0 0 1px ${char.themeColor}, 0 0 30px ${char.themeColor}66`
          : "none",
        clipPath:
          "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
      }}
    >
      {/* Numeração */}
      <div
        className="absolute left-2 top-2 z-10 text-xs tracking-widest"
        style={{
          color: active ? char.themeColor : "#5a4a3a",
          fontFamily: "'Cormorant Garamond', serif",
        }}
      >
        {String(char.index).padStart(2, "0")}
      </div>

      {/* Brackets do canto quando ativo */}
      {active && (
        <>
          <span
            className="absolute right-0 top-0 h-3 w-3 border-r border-t"
            style={{ borderColor: char.themeColor }}
          />
          <span
            className="absolute bottom-0 left-0 h-3 w-3 border-b border-l"
            style={{ borderColor: char.themeColor }}
          />
        </>
      )}

      {/* Imagem / silhueta */}
      <div className="absolute inset-0 flex items-end justify-center pb-8">
        <img
          src={char.silhouetteUrl ?? char.imageUrl}
          alt={char.name}
          className="h-[85%] w-auto object-contain transition-all duration-500 group-hover:scale-105"
          style={{
            filter: char.isLocked
              ? "brightness(0) opacity(0.55)"
              : active
              ? `drop-shadow(0 0 15px ${char.themeColor}cc)`
              : "brightness(0.9)",
          }}
        />
      </div>

      {/* Gradiente inferior */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Label */}
      <div className="absolute inset-x-0 bottom-2 text-center">
        <div
          className="text-[11px] tracking-[0.25em]"
          style={{ color: active ? "#e8d9a8" : "#8a7a5a" }}
        >
          {char.isLocked ? "???" : char.name}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[8px] tracking-[0.3em] text-zinc-600">
          {char.isLocked && <Lock className="h-2 w-2" />}
          {char.isLocked ? "EM BREVE" : "DISPONÍVEL"}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── Final wide card ────────────────────────────────────────────────── */
function FinalCard({
  char,
  active,
  onClick,
}: {
  char: RosterChar;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="relative mt-3 grid w-full grid-cols-[1fr_1.2fr] overflow-hidden border text-left"
      style={{
        borderColor: active ? char.themeColor : "rgba(201,168,76,0.2)",
        background:
          "linear-gradient(180deg, rgba(20,12,10,0.9) 0%, rgba(10,6,5,0.95) 100%)",
        boxShadow: active
          ? `0 0 0 1px ${char.themeColor}, 0 0 30px ${char.themeColor}66`
          : "none",
        height: 160,
        clipPath:
          "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
      }}
    >
      <div className="relative">
        <div
          className="absolute left-2 top-2 text-xs tracking-widest"
          style={{
            color: active ? char.themeColor : "#5a4a3a",
            fontFamily: "'Cormorant Garamond', serif",
          }}
        >
          {String(char.index).padStart(2, "0")}
        </div>
        <img
          src={char.silhouetteUrl ?? char.imageUrl}
          alt={char.name}
          className="h-full w-full object-contain"
          style={{ filter: "brightness(0) opacity(0.55)" }}
        />
      </div>
      <div className="flex flex-col items-center justify-center px-4 text-center">
        <div
          className="text-2xl font-light tracking-[0.2em]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "#e8d9a8",
          }}
        >
          {char.name}
        </div>
        <div className="mt-3 whitespace-pre-line text-[10px] tracking-[0.4em] text-zinc-500">
          {char.title}
        </div>
        <div
          className="mt-3 h-px w-12"
          style={{ background: "#c9a84c80" }}
        />
      </div>
    </motion.button>
  );
}
