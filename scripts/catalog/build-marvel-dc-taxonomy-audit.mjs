import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue("manifest", path.join(OUTPUT, "manifests", "manifest_final.jsonl")),
);
const OUT_DIR = path.resolve(
  argValue(
    "out-dir",
    path.join(OUTPUT, "manifests", "curadoria_visual", "marvel_dc_taxonomia"),
  ),
);
const ITEMS_PER_SHEET = Number.parseInt(argValue("items-per-sheet", "30"), 10);

const COLUMNS = [
  "indice_visual",
  "status_decisao",
  "acao_sugerida",
  "categoria_atual",
  "pasta_nivel_2_atual",
  "pasta_personagem_atual",
  "display_relpath_atual",
  "categoria_aprovada",
  "grupo_organizacao_aprovado",
  "personagem_slug_aprovado",
  "nome_aprovado_pt_br",
  "source_title_sugerido",
  "source_type_sugerido",
  "display_relpath_proposto",
  "tags_sugeridas",
  "confianca_taxonomia",
  "motivo",
  "observacoes",
];

const CARD = {
  width: 330,
  height: 360,
  image: 168,
  padding: 14,
};
const COLUMNS_PER_SHEET = 5;
const ROWS_PER_SHEET = Math.ceil(ITEMS_PER_SHEET / COLUMNS_PER_SHEET);
const SHEET = {
  width: CARD.width * COLUMNS_PER_SHEET,
  height: CARD.height * ROWS_PER_SHEET,
};

const DC_SOURCE_TITLE = new Map(
  Object.entries({
    aquaman: "Aquaman",
    "arqueiro-verde": "Arqueiro Verde",
    batman: "Batman",
    constantine: "Constantine",
    flash: "Flash",
    "jovens-titas": "Jovens Titas",
    "lanterna-verde": "Lanterna Verde",
    "liga-da-justica": "Liga da Justica",
    lobo: "DC",
    "mulher-maravilha": "Mulher-Maravilha",
    "static-shock": "Static Shock",
    superman: "Superman",
    watchmen: "Watchmen",
  }),
);

const MARVEL_SOURCE_TITLE = new Map(
  Object.entries({
    blade: "Blade",
    "capita-marvel": "Marvel",
    "capitao-america": "Capitao America",
    "cavaleiro-da-lua": "Cavaleiro da Lua",
    "cloak-and-dagger": "Cloak and Dagger",
    darkhawk: "Marvel",
    deadpool: "Deadpool",
    demolidor: "Demolidor",
    "doutor-estranho": "Doutor Estranho",
    "guardioes-da-galaxia": "Guardioes da Galaxia",
    "homem-aranha": "Homem-Aranha",
    "homem-de-ferro": "Homem de Ferro",
    hulk: "Hulk",
    justiceiro: "Justiceiro",
    marvel: "Marvel",
    "marvel-rivals": "Marvel Rivals",
    "motoqueiro-fantasma": "Motoqueiro Fantasma",
    "ms-marvel": "Marvel",
    "pantera-negra": "Pantera Negra",
    "punho-de-ferro": "Punho de Ferro",
    "quarteto-fantastico": "Quarteto Fantastico",
    thor: "Thor",
    vingadores: "Vingadores",
    "x-men": "X-Men",
  }),
);

const CHARACTER_RULES = new Map(
  Object.entries({
    // DC heroes.
    aquaman: ["herois", "aquaman", "Aquaman"],
    "arqueiro-verde": ["herois", "arqueiro-verde", "Arqueiro Verde"],
    batgirl: ["herois", "batgirl", "Batgirl"],
    batman: ["herois", "batman", "Batman"],
    "batman-chibi": ["herois", "batman", "Batman"],
    "batman-diorama": ["herois", "batman", "Batman"],
    "batman-figure": ["herois", "batman", "Batman"],
    "batman-statue": ["herois", "batman", "Batman"],
    batwoman: ["herois", "batwoman", "Batwoman"],
    "black-canary": ["herois", "canario-negro", "Canario Negro"],
    "booster-gold": ["herois", "booster-gold", "Booster Gold"],
    flash: ["herois", "flash", "Flash"],
    "green-lantern": ["herois", "lanterna-verde", "Lanterna Verde"],
    hawkgirl: ["herois", "mulher-gaviao", "Mulher Gaviao"],
    hawkman: ["herois", "gaviao-negro", "Gaviao Negro"],
    "jessica-cruz": ["herois", "jessica-cruz", "Jessica Cruz"],
    krypto: ["herois", "krypto", "Krypto"],
    "martian-manhunter": ["herois", "cacador-de-marte", "Cacador de Marte"],
    "mulher-maravilha": ["herois", "mulher-maravilha", "Mulher-Maravilha"],
    nightwing: ["herois", "asa-noturna", "Asa Noturna"],
    nubia: ["herois", "nubia", "Nubia"],
    "power-girl": ["herois", "power-girl", "Power Girl"],
    raven: ["herois", "ravena", "Ravena"],
    robin: ["herois", "robin", "Robin"],
    starfire: ["herois", "estelar", "Estelar"],
    static: ["herois", "static", "Static"],
    supergirl: ["herois", "supergirl", "Supergirl"],
    "supergirl-e-krypto": ["herois", "supergirl-e-krypto", "Supergirl e Krypto"],
    "supergirl-figure": ["herois", "supergirl", "Supergirl"],
    superman: ["herois", "superman", "Superman"],
    "white-canary": ["herois", "canario-branco", "Canario Branco"],
    zatanna: ["herois", "zatanna", "Zatanna"],

    // DC villains and anti-heroes.
    bane: ["viloes", "bane", "Bane"],
    cheetah: ["viloes", "cheetah", "Cheetah"],
    coringa: ["viloes", "coringa", "Coringa"],
    darkseid: ["viloes", "darkseid", "Darkseid"],
    "king-shark": ["viloes", "tubarao-rei", "Tubarao-Rei"],
    "lex-luthor": ["viloes", "lex-luthor", "Lex Luthor"],
    "mr-freeze": ["viloes", "senhor-frio", "Senhor Frio"],
    penguin: ["viloes", "pinguim", "Pinguim"],
    pinguim: ["viloes", "pinguim", "Pinguim"],
    "poison-ivy": ["viloes", "hera-venenosa", "Hera Venenosa"],
    riddler: ["viloes", "charada", "Charada"],
    scarecrow: ["viloes", "espantalho", "Espantalho"],
    scarface: ["viloes", "scarface", "Scarface"],
    "solomon-grundy": ["viloes", "solomon-grundy", "Solomon Grundy"],
    "talia-al-ghul": ["viloes", "talia-al-ghul", "Talia al Ghul"],
    "ventriloquist-e-scarface": [
      "viloes",
      "ventriloquo-e-scarface",
      "Ventriloquo e Scarface",
    ],
    "capuz-vermelho": ["anti-herois", "capuz-vermelho", "Capuz Vermelho"],
    deathstroke: ["anti-herois", "exterminador", "Exterminador"],
    "doutor-manhattan": ["anti-herois", "doutor-manhattan", "Doutor Manhattan"],
    "harley-quinn": ["anti-herois", "harley-quinn", "Harley Quinn"],
    "john-constantine": ["anti-herois", "john-constantine", "John Constantine"],
    lobo: ["anti-herois", "lobo", "Lobo"],
    "mulher-gato": ["anti-herois", "mulher-gato", "Mulher-Gato"],

    // DC support and sets.
    "alfred-pennyworth": ["coadjuvantes", "alfred-pennyworth", "Alfred Pennyworth"],
    "lois-lane": ["coadjuvantes", "lois-lane", "Lois Lane"],
    marionette: ["coadjuvantes", "marionette", "Marionette"],
    "batman-robin-e-batgirl": ["sets", "batman-robin-e-batgirl", "Batman, Robin e Batgirl"],
    dioramas: ["sets", "dioramas", "Dioramas"],

    // Marvel heroes.
    blade: ["herois", "blade", "Blade"],
    "captain-marvel": ["herois", "capita-marvel", "Capita Marvel"],
    "capitao-america": ["herois", "capitao-america", "Capitao America"],
    "cavaleiro-da-lua": ["herois", "cavaleiro-da-lua", "Cavaleiro da Lua"],
    "cloak-and-dagger": ["herois", "cloak-and-dagger", "Cloak and Dagger"],
    darkhawk: ["herois", "darkhawk", "Darkhawk"],
    demolidor: ["herois", "demolidor", "Demolidor"],
    "doutor-estranho": ["herois", "doutor-estranho", "Doutor Estranho"],
    falcao: ["herois", "falcao", "Falcao"],
    "feiticeira-escarlate": ["herois", "feiticeira-escarlate", "Feiticeira Escarlate"],
    "gaviao-arqueiro": ["herois", "gaviao-arqueiro", "Gaviao Arqueiro"],
    groot: ["herois", "groot", "Groot"],
    "homem-aranha": ["herois", "homem-aranha", "Homem-Aranha"],
    "homem-de-ferro": ["herois", "homem-de-ferro", "Homem de Ferro"],
    "homem-de-gelo": ["herois", "homem-de-gelo", "Homem de Gelo"],
    "iron-spider": ["herois", "iron-spider", "Iron Spider"],
    "jane-foster-thor": ["herois", "jane-foster-thor", "Jane Foster Thor"],
    "jean-grey": ["herois", "jean-grey", "Jean Grey"],
    "luna-snow": ["herois", "luna-snow", "Luna Snow"],
    mantis: ["herois", "mantis", "Mantis"],
    "miles-morales": ["herois", "miles-morales", "Miles Morales"],
    "ms-marvel": ["herois", "ms-marvel", "Ms. Marvel"],
    "mulher-aranha": ["herois", "mulher-aranha", "Mulher-Aranha"],
    "pantera-negra": ["herois", "pantera-negra", "Pantera Negra"],
    "peggy-carter": ["herois", "peggy-carter", "Peggy Carter"],
    psylocke: ["herois", "psylocke", "Psylocke"],
    "punho-de-ferro": ["herois", "punho-de-ferro", "Punho de Ferro"],
    "rachel-summers": ["herois", "rachel-summers", "Rachel Summers"],
    "rescue-armor": ["herois", "rescue", "Rescue"],
    "rocket-raccoon": ["herois", "rocket-raccoon", "Rocket Raccoon"],
    "spider-gwen": ["herois", "spider-gwen", "Spider-Gwen"],
    "spider-punk": ["herois", "spider-punk", "Spider-Punk"],
    "star-lord": ["herois", "senhor-das-estrelas", "Senhor das Estrelas"],
    "surfista-prateado": ["herois", "surfista-prateado", "Surfista Prateado"],
    tempestade: ["herois", "tempestade", "Tempestade"],
    thor: ["herois", "thor", "Thor"],
    valkyrie: ["herois", "valquiria", "Valquiria"],
    vampira: ["herois", "vampira", "Vampira"],
    "viuva-negra": ["herois", "viuva-negra", "Viuva Negra"],
    "white-spider-hero": ["herois", "homem-aranha", "Homem-Aranha"],
    wolverine: ["herois", "wolverine", "Wolverine"],

    // Marvel villains and anti-heroes.
    abominavel: ["viloes", "abominavel", "Abominavel"],
    apocalipse: ["viloes", "apocalipse", "Apocalipse"],
    "black-queen": ["viloes", "rainha-negra", "Rainha Negra"],
    carnificina: ["viloes", "carnificina", "Carnificina"],
    "doctor-octopus": ["viloes", "doutor-octopus", "Doutor Octopus"],
    "doutor-destino": ["viloes", "doutor-destino", "Doutor Destino"],
    "duende-verde": ["viloes", "duende-verde", "Duende Verde"],
    electro: ["viloes", "electro", "Electro"],
    fanatico: ["viloes", "fanatico", "Fanatico"],
    galactus: ["viloes", "galactus", "Galactus"],
    gorr: ["viloes", "gorr", "Gorr"],
    "rei-do-crime": ["viloes", "rei-do-crime", "Rei do Crime"],
    rino: ["viloes", "rino", "Rino"],
    shocker: ["viloes", "shocker", "Shocker"],
    thanos: ["viloes", "thanos", "Thanos"],
    venom: ["viloes", "venom", "Venom"],
    deadpool: ["anti-herois", "deadpool", "Deadpool"],
    elektra: ["anti-herois", "elektra", "Elektra"],
    "gata-negra": ["anti-herois", "gata-negra", "Gata Negra"],
    gatuno: ["anti-herois", "gatuno", "Gatuno"],
    hellverine: ["anti-herois", "hellverine", "Hellverine"],
    hulk: ["anti-herois", "hulk", "Hulk"],
    "joe-fixit": ["anti-herois", "joe-fixit", "Joe Fixit"],
    justiceiro: ["anti-herois", "justiceiro", "Justiceiro"],
    loki: ["anti-herois", "loki", "Loki"],
    magneto: ["anti-herois", "magneto", "Magneto"],
    mistica: ["anti-herois", "mistica", "Mistica"],
    "motoqueiro-fantasma": ["anti-herois", "motoqueiro-fantasma", "Motoqueiro Fantasma"],
    "omega-red": ["viloes", "omega-red", "Omega Red"],
    "dentes-de-sabre": ["viloes", "dentes-de-sabre", "Dentes-de-Sabre"],
    morbius: ["anti-herois", "morbius", "Morbius"],

    // Marvel support, teams, objects and sets.
    "aranha-escarlate": ["herois", "aranha-escarlate", "Aranha Escarlate"],
    arcanjo: ["herois", "arcanjo", "Arcanjo"],
    cable: ["herois", "cable", "Cable"],
    ciclope: ["herois", "ciclope", "Ciclope"],
    coisa: ["herois", "coisa", "Coisa"],
    dazzler: ["herois", "dazzler", "Dazzler"],
    "emma-frost": ["herois", "emma-frost", "Emma Frost"],
    fenix: ["herois", "fenix", "Fenix"],
    fera: ["herois", "fera", "Fera"],
    "gambit-figure": ["herois", "gambit", "Gambit"],
    "mary-jane-watson": ["coadjuvantes", "mary-jane-watson", "Mary Jane Watson"],
    "nick-fury": ["coadjuvantes", "nick-fury", "Nick Fury"],
    noturno: ["herois", "noturno", "Noturno"],
    sentinela: ["herois", "sentinela", "Sentinela"],
    spiral: ["viloes", "spiral", "Spiral"],
    "yondu-udonta": ["anti-herois", "yondu-udonta", "Yondu Udonta"],
    "armor-helmet-base": ["objetos", "capacete-homem-de-ferro", "Capacete Homem de Ferro"],
    "gold-red-helmet": ["objetos", "capacete-homem-de-ferro", "Capacete Homem de Ferro"],
    "hero-helmet-set": ["sets", "capacetes-marvel", "Capacetes Marvel"],
    hulkbuster: ["objetos", "hulkbuster", "Hulkbuster"],
    "iron-doom": ["objetos", "iron-doom", "Iron Doom"],
    sets: ["sets", "sets-marvel", "Sets Marvel"],
    stormbreaker: ["objetos", "stormbreaker", "Stormbreaker"],
    "symbiote-accessories": ["objetos", "acessorios-simbionte", "Acessorios Simbionte"],
    "ultron-helmet": ["objetos", "capacete-ultron", "Capacete Ultron"],
    "x-men": ["equipes", "x-men", "X-Men"],
  }),
);

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugPart(value, fallback = "item") {
  const slug = normalizeComparable(value).replace(/\s+/g, "-");
  return (slug || fallback).slice(0, 90).replace(/-+$/g, "") || fallback;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseRelpath(relpath) {
  const parts = String(relpath || "").split(/[\\/]+/).filter(Boolean);
  return {
    root: parts[0] || "",
    category: parts[1] || "",
    level2: parts[2] || "",
    subject: parts[3] || "",
    filename: parts.at(-1) || "",
  };
}

function sourceTitle(category, level2) {
  if (category === "dc") return DC_SOURCE_TITLE.get(level2) || "DC";
  if (category === "marvel") return MARVEL_SOURCE_TITLE.get(level2) || "Marvel";
  return "";
}

function sourceTypeFor(category) {
  if (category === "dc" || category === "marvel") return "comic";
  return "other";
}

function classify(row) {
  const current = parseRelpath(row.display_relpath);

  if (
    current.category === "dc" &&
    current.level2 === "superman" &&
    current.subject === "lex-luthor"
  ) {
    return {
      category: "marvel",
      group: "viloes",
      subject: "duende-macabro",
      name: "Duende Macabro",
      sourceTitle: "Homem-Aranha",
      sourceType: "comic",
      confidence: "alta",
      action: "corrigir_categoria",
      status: "proposta_automatica",
      reason: "Erro visual confirmado na auditoria DC Superman: item estava como Lex Luthor, mas e Duende Macabro.",
      tags: ["marvel", "viloes", "homem-aranha", "duende macabro"],
    };
  }

  const rule = CHARACTER_RULES.get(current.subject);
  if (!rule) {
    const fallbackName = current.subject.replace(/-/g, " ");
    return {
      category: current.category,
      group: "revisar",
      subject: slugPart(current.subject, "revisar"),
      name: fallbackName,
      sourceTitle: sourceTitle(current.category, current.level2),
      sourceType: sourceTypeFor(current.category),
      confidence: "baixa",
      action: "revisar_visual",
      status: "needs_decision",
      reason: "Sem regra de taxonomia para a pasta atual.",
      tags: [current.category, "revisar", fallbackName],
    };
  }

  const [group, subject, name] = rule;
  const currentIsAlreadyTaxonomic =
    current.level2 === group && current.subject === subject && current.category === current.category;

  return {
    category: current.category,
    group,
    subject,
    name,
    sourceTitle: sourceTitle(current.category, current.level2),
    sourceType: sourceTypeFor(current.category),
    confidence: "media",
    action: currentIsAlreadyTaxonomic ? "aprovar_taxonomia" : "reorganizar_taxonomia",
    status: "proposta_automatica",
    reason: "Regra automatica por personagem/pasta atual; validar visualmente antes de aplicar.",
    tags: [current.category, group, name, sourceTitle(current.category, current.level2)].filter(Boolean),
  };
}

function proposedRelpath(row, classification) {
  const current = parseRelpath(row.display_relpath);
  return path
    .join(
      "display",
      classification.category,
      classification.group,
      classification.subject,
      current.filename,
    )
    .replaceAll("\\", "/");
}

function proposedThumbRelpath(displayRelpath) {
  return displayRelpath.replace(/^display\//, "thumb/");
}

function truncate(value, size) {
  const text = String(value || "");
  if (text.length <= size) return text;
  return `${text.slice(0, Math.max(0, size - 1))}...`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function textBlock(lines, options = {}) {
  const {
    width = CARD.width,
    height = CARD.height,
    x = 0,
    y = 0,
    fontSize = 18,
    fill = "#111827",
    weight = 500,
    lineHeight = Math.round(fontSize * 1.32),
  } = options;

  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${y + index * lineHeight}">${xmlEscape(line)}</tspan>`,
    )
    .join("");

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${tspans}</text>
    </svg>
  `);
}

function cardColor(row) {
  if (row.acao_sugerida === "corrigir_categoria") return "#dc2626";
  if (row.grupo_organizacao_aprovado === "revisar") return "#f97316";
  if (row.acao_sugerida === "reorganizar_taxonomia") return "#2563eb";
  return "#16a34a";
}

async function makeCard(row) {
  const composites = [];
  const background = sharp({
    create: {
      width: CARD.width,
      height: CARD.height,
      channels: 4,
      background: "#f8fafc",
    },
  });

  composites.push({
    input: Buffer.from(`
      <svg width="${CARD.width}" height="${CARD.height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${CARD.width}" height="${CARD.height}" rx="0" fill="#f8fafc"/>
        <rect x="0" y="0" width="${CARD.width}" height="9" fill="${cardColor(row)}"/>
        <rect x="0.5" y="0.5" width="${CARD.width - 1}" height="${CARD.height - 1}" fill="none" stroke="#cbd5e1"/>
      </svg>
    `),
    left: 0,
    top: 0,
  });

  const imagePath = path.join(
    OUTPUT,
    ...String(row.display_relpath_atual).split(/[\\/]+/).filter(Boolean),
  );
  if (await exists(imagePath)) {
    composites.push({
      input: await sharp(imagePath)
        .resize({
          width: CARD.image,
          height: CARD.image,
          fit: "contain",
          background: "#ffffff",
        })
        .extend({
          top: 4,
          bottom: 4,
          left: 4,
          right: 4,
          background: "#ffffff",
        })
        .png()
        .toBuffer(),
      left: Math.round((CARD.width - CARD.image) / 2),
      top: 50,
    });
  }

  composites.push({
    input: textBlock([`${row.indice_visual}. ${row.pasta_nivel_2_atual}/${row.pasta_personagem_atual}`], {
      width: CARD.width,
      height: 36,
      x: CARD.padding,
      y: 24,
      fontSize: 18,
      weight: 700,
    }),
    left: 0,
    top: 0,
  });

  const lines = [
    ...wrapText(`-> ${row.categoria_aprovada}/${row.grupo_organizacao_aprovado}/${row.personagem_slug_aprovado}`, 36, 2),
    ...wrapText(`${row.nome_aprovado_pt_br} | ${row.source_title_sugerido}`, 36, 2),
    ...wrapText(truncate(row.display_relpath_atual.split("/").at(-1), 44), 44, 1),
    truncate(row.acao_sugerida, 36),
  ];

  composites.push({
    input: textBlock(lines, {
      width: CARD.width,
      height: 130,
      x: CARD.padding,
      y: 18,
      fontSize: 15,
      fill: "#0f172a",
      weight: 500,
    }),
    left: 0,
    top: 225,
  });

  return background.composite(composites).png().toBuffer();
}

async function makeSheets(rows) {
  const sheets = [];

  for (let start = 0; start < rows.length; start += ITEMS_PER_SHEET) {
    const chunk = rows.slice(start, start + ITEMS_PER_SHEET);
    const composites = [];

    for (let index = 0; index < chunk.length; index += 1) {
      const row = chunk[index];
      const col = index % COLUMNS_PER_SHEET;
      const sheetRow = Math.floor(index / COLUMNS_PER_SHEET);
      composites.push({
        input: await makeCard(row),
        left: col * CARD.width,
        top: sheetRow * CARD.height,
      });
    }

    const sheetNumber = String(Math.floor(start / ITEMS_PER_SHEET) + 1).padStart(3, "0");
    const sheetPath = path.join(OUT_DIR, `marvel_dc_taxonomia_${sheetNumber}.jpg`);
    if (await exists(sheetPath)) {
      sheets.push({
        sheet: sheetNumber,
        path: sheetPath,
        first_index: chunk[0]?.indice_visual || null,
        last_index: chunk.at(-1)?.indice_visual || null,
        items: chunk.length,
        reused: true,
      });
      continue;
    }

    await sharp({
      create: {
        width: SHEET.width,
        height: SHEET.height,
        channels: 3,
        background: "#e5e7eb",
      },
    })
      .composite(composites)
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(sheetPath);

    sheets.push({
      sheet: sheetNumber,
      path: sheetPath,
      first_index: chunk[0]?.indice_visual || null,
      last_index: chunk.at(-1)?.indice_visual || null,
      items: chunk.length,
    });
  }

  return sheets;
}

function toDecisionRow(record, visualIndex) {
  const current = parseRelpath(record.display_relpath);
  const classification = classify(record);
  const proposedDisplay = proposedRelpath(record, classification);
  return {
    indice_visual: String(visualIndex).padStart(4, "0"),
    status_decisao: classification.status,
    acao_sugerida: classification.action,
    categoria_atual: current.category,
    pasta_nivel_2_atual: current.level2,
    pasta_personagem_atual: current.subject,
    display_relpath_atual: record.display_relpath,
    categoria_aprovada: classification.category,
    grupo_organizacao_aprovado: classification.group,
    personagem_slug_aprovado: classification.subject,
    nome_aprovado_pt_br: classification.name,
    source_title_sugerido: classification.sourceTitle,
    source_type_sugerido: classification.sourceType,
    display_relpath_proposto: proposedDisplay,
    thumb_relpath_proposto: proposedThumbRelpath(proposedDisplay),
    tags_sugeridas: classification.tags.join("; "),
    confianca_taxonomia: classification.confidence,
    motivo: classification.reason,
    observacoes: "",
  };
}

function groupCount(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const records = (await readJsonl(MANIFEST))
    .filter((record) => {
      const current = parseRelpath(record.display_relpath);
      return current.category === "dc" || current.category === "marvel";
    })
    .sort((a, b) => a.display_relpath.localeCompare(b.display_relpath));

  const rows = records.map((record, index) => toDecisionRow(record, index + 1));
  const decisionsPath = path.join(OUT_DIR, "decisoes_marvel_dc_taxonomia.csv");
  const folderSummaryPath = path.join(OUT_DIR, "resumo_pastas_marvel_dc_taxonomia.csv");
  const visualIndexPath = path.join(OUT_DIR, "indice_visual_marvel_dc_taxonomia.json");
  const summaryPath = path.join(OUT_DIR, "resumo_marvel_dc_taxonomia.json");

  const decisionsCsv = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await fs.writeFile(decisionsPath, `${decisionsCsv}\n`, "utf8");

  const folderCounts = groupCount(
    rows,
    (row) =>
      `${row.categoria_atual}/${row.pasta_nivel_2_atual}/${row.pasta_personagem_atual}\0${row.categoria_aprovada}/${row.grupo_organizacao_aprovado}/${row.personagem_slug_aprovado}\0${row.nome_aprovado_pt_br}\0${row.acao_sugerida}`,
  );
  const folderSummaryRows = Object.entries(folderCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [current, proposed, name, action] = key.split("\0");
      return { quantidade: count, pasta_atual: current, destino_proposto: proposed, nome_pt_br: name, acao: action };
    });
  const folderColumns = ["quantidade", "pasta_atual", "destino_proposto", "nome_pt_br", "acao"];
  await fs.writeFile(
    folderSummaryPath,
    [
      folderColumns.join(","),
      ...folderSummaryRows.map((row) => folderColumns.map((column) => csvEscape(row[column])).join(",")),
    ].join("\n") + "\n",
    "utf8",
  );

  const sheets = await makeSheets(rows);
  await fs.writeFile(
    visualIndexPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        output: OUTPUT,
        manifest: MANIFEST,
        decisions: decisionsPath,
        folder_summary: folderSummaryPath,
        total_items: rows.length,
        items_per_sheet: ITEMS_PER_SHEET,
        sheets,
      },
      null,
      2,
    ),
    "utf8",
  );

  const summary = {
    generated_at: new Date().toISOString(),
    total_items: rows.length,
    decisions: decisionsPath,
    folder_summary: folderSummaryPath,
    visual_index: visualIndexPath,
    sheets: sheets.length,
    by_current_category: groupCount(rows, (row) => row.categoria_atual),
    by_action: groupCount(rows, (row) => row.acao_sugerida),
    by_proposed_group: groupCount(
      rows,
      (row) => `${row.categoria_aprovada}/${row.grupo_organizacao_aprovado}`,
    ),
  };

  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
