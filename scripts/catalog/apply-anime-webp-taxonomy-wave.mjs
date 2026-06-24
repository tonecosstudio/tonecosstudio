import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const REPORT_DIR = path.resolve(
  argValue("report-dir", path.join(OUTPUT, "manifests", "anime_taxonomy")),
);
const DRY_RUN = argFlag("dry-run");
const FRANCHISE_FILTER = normalizeSlug(argValue("franchise", ""));

const FRANCHISE_TITLES = new Map(
  [
    ["a-viagem-de-chihiro", "A Viagem de Chihiro"],
    ["afro-samurai", "Afro Samurai"],
    ["akame-ga-kill", "Akame ga Kill"],
    ["akira", "Akira"],
    ["astro-boy", "Astro Boy"],
    ["attack-on-titan", "Attack on Titan"],
    ["berserk", "Berserk"],
    ["black-butler", "Black Butler"],
    ["black-clover", "Black Clover"],
    ["black-lagoon", "Black Lagoon"],
    ["black-rock-shooter", "Black Rock Shooter"],
    ["bleach", "Bleach"],
    ["blood-c", "Blood-C"],
    ["cardcaptor-sakura", "Cardcaptor Sakura"],
    ["cavaleiros-do-zodiaco", "Cavaleiros do Zodiaco"],
    ["chainsaw-man", "Chainsaw Man"],
    ["code-geass", "Code Geass"],
    ["cowboy-bebop", "Cowboy Bebop"],
    ["crayon-shin-chan", "Crayon Shin-Chan"],
    ["cyberpunk-edgerunners", "Cyberpunk Edgerunners"],
    ["danmachi", "DanMachi"],
    ["dandadan", "DanDaDan"],
    ["darling-in-the-franxx", "Darling in the Franxx"],
    ["death-note", "Death Note"],
    ["demon-slayer", "Demon Slayer"],
    ["detective-conan", "Detective Conan"],
    ["devilman", "Devilman"],
    ["digimon", "Digimon"],
    ["doraemon", "Doraemon"],
    ["dororo", "Dororo"],
    ["dr-slump", "Dr. Slump"],
    ["dr-stone", "Dr. Stone"],
    ["dragon-ball", "Dragon Ball"],
    ["dragon-ball-super", "Dragon Ball Super"],
    ["dungeon-meshi", "Dungeon Meshi"],
    ["evangelion", "Evangelion"],
    ["fairy-tail", "Fairy Tail"],
    ["fate", "Fate"],
    ["fate-grand-order", "Fate Grand Order"],
    ["fate-stay-night", "Fate Stay Night"],
    ["fire-force", "Fire Force"],
    ["food-wars", "Food Wars"],
    ["frieren", "Frieren"],
    ["fullmetal-alchemist", "Fullmetal Alchemist"],
    ["gantz", "Gantz"],
    ["gatchaman", "Gatchaman"],
    ["ghost-in-the-shell", "Ghost in the Shell"],
    ["goblin-slayer", "Goblin Slayer"],
    ["gundam", "Gundam"],
    ["gurren-lagann", "Gurren Lagann"],
    ["gushing-over-magical-girls", "Gushing over Magical Girls"],
    ["hajime-no-ippo", "Hajime no Ippo"],
    ["haruhi-suzumiya", "Haruhi Suzumiya"],
    ["hell-paradise", "Hell's Paradise"],
    ["hells-paradise", "Hell's Paradise"],
    ["hellsing", "Hellsing"],
    ["high-school-dxd", "High School DxD"],
    ["highschool-of-the-dead", "Highschool of the Dead"],
    ["hunter-x-hunter", "Hunter x Hunter"],
    ["inuyasha", "Inuyasha"],
    ["jojos-bizarre-adventure", "JoJo's Bizarre Adventure"],
    ["jujutsu-kaisen", "Jujutsu Kaisen"],
    ["kaiju-no-8", "Kaiju No. 8"],
    ["kill-la-kill", "Kill la Kill"],
    ["komi-cant-communicate", "Komi Can't Communicate"],
    ["komi-san", "Komi Can't Communicate"],
    ["konosuba", "Konosuba"],
    ["machikado-mazoku", "Machikado Mazoku"],
    ["mashle", "Mashle"],
    ["mazinger", "Mazinger"],
    ["mazinger-z", "Mazinger Z"],
    ["meu-amigo-totoro", "Meu Amigo Totoro"],
    ["monogatari", "Monogatari"],
    ["monster-musume", "Monster Musume"],
    ["mushoku-tensei", "Mushoku Tensei"],
    ["my-dress-up-darling", "My Dress-Up Darling"],
    ["my-hero-academia", "My Hero Academia"],
    ["naruto", "Naruto"],
    ["no-game-no-life", "No Game No Life"],
    ["one-piece", "One Piece"],
    ["one-punch-man", "One Punch Man"],
    ["oshi-no-ko", "Oshi no Ko"],
    ["overlord", "Overlord"],
    ["panty-and-stocking", "Panty and Stocking"],
    ["prince-of-tennis", "Prince of Tennis"],
    ["princesa-mononoke", "Princesa Mononoke"],
    ["queens-blade", "Queen's Blade"],
    ["ranma-1-2", "Ranma 1/2"],
    ["re-creators", "Re:Creators"],
    ["re-zero", "Re:Zero"],
    ["rurouni-kenshin", "Rurouni Kenshin"],
    ["saga-of-tanya-the-evil", "Saga of Tanya the Evil"],
    ["sailor-moon", "Sailor Moon"],
    ["sand-land", "Sand Land"],
    ["seven-deadly-sins", "Seven Deadly Sins"],
    ["shaman-king", "Shaman King"],
    ["shangri-la-frontier", "Shangri-La Frontier"],
    ["slam-dunk", "Slam Dunk"],
    ["slime", "That Time I Got Reincarnated as a Slime"],
    ["solo-leveling", "Solo Leveling"],
    ["soul-eater", "Soul Eater"],
    ["spy-x-family", "Spy x Family"],
    ["super-campeoes", "Super Campeoes"],
    ["super-sonico", "Super Sonico"],
    ["sword-art-online", "Sword Art Online"],
    ["tenchi-muyo", "Tenchi Muyo"],
    ["that-time-i-got-reincarnated-as-a-slime", "That Time I Got Reincarnated as a Slime"],
    ["the-apothecary-diaries", "The Apothecary Diaries"],
    ["the-eminence-in-shadow", "The Eminence in Shadow"],
    ["tokyo-ghoul", "Tokyo Ghoul"],
    ["trigun", "Trigun"],
    ["trigun-vash", "Trigun"],
    ["ufo-robot-grendizer", "UFO Robot Grendizer"],
    ["violet-evergarden", "Violet Evergarden"],
    ["vocaloid", "Vocaloid"],
    ["welcome-to-demon-school-iruma-kun", "Welcome to Demon School! Iruma-kun"],
    ["yu-gi-oh", "Yu-Gi-Oh"],
    ["yu-yu-hakusho", "Yu Yu Hakusho"],
  ].map(([slug, title]) => [normalizeSlug(slug), title]),
);

const FRANCHISE_SLUG_ALIASES = new Map(
  [
    ["hells-paradise", "hell-paradise"],
    ["komi-san", "komi-cant-communicate"],
    ["slime", "that-time-i-got-reincarnated-as-a-slime"],
    ["trigun-vash", "trigun"],
  ].map(([alias, target]) => [normalizeSlug(alias), normalizeSlug(target)]),
);

const SUBJECT_ALIASES = new Map(
  [
    ["cavaleiros-do-zodiaco|pegasus-seiya", { slug: "seiya-de-pegasus", name: "Seiya de Pegasus", aliases: ["Pegasus Seiya"] }],
    ["dragon-ball|androide-8", { slug: "androide-8", name: "Androide 8", aliases: ["Android 8"] }],
    ["dragon-ball|androide-17", { slug: "androide-17", name: "Androide 17", aliases: ["Android 17"] }],
    ["dragon-ball|androide-18", { slug: "androide-18", name: "Androide 18", aliases: ["Android 18"] }],
    ["dragon-ball|androide-19", { slug: "androide-19", name: "Androide 19", aliases: ["Android 19"] }],
    ["dragon-ball|androide-21", { slug: "androide-21", name: "Androide 21", aliases: ["Android 21"] }],
    ["dragon-ball|android-8", { slug: "androide-8", name: "Androide 8", aliases: ["Android 8"] }],
    ["dragon-ball|android-17", { slug: "androide-17", name: "Androide 17", aliases: ["Android 17"] }],
    ["dragon-ball|android-18", { slug: "androide-18", name: "Androide 18", aliases: ["Android 18"] }],
    ["dragon-ball|android-19", { slug: "androide-19", name: "Androide 19", aliases: ["Android 19"] }],
    ["dragon-ball|freeza", { slug: "freeza", name: "Freeza", aliases: ["Frieza"] }],
    ["dragon-ball|frieza", { slug: "freeza", name: "Freeza", aliases: ["Frieza"] }],
    ["dragon-ball|goku-vs-freeza", { slug: "goku-vs-freeza", name: "Goku vs Freeza", aliases: ["Goku vs Frieza", "Goku versus Frieza", "Goku versus Frieza Battle"] }],
    ["dragon-ball|goku-vs-frieza", { slug: "goku-vs-freeza", name: "Goku vs Freeza", aliases: ["Goku vs Frieza", "Goku versus Frieza", "Goku versus Frieza Battle"] }],
    ["dragon-ball|majin-boo", { slug: "majin-boo", name: "Majin Boo", aliases: ["Majin Buu"] }],
    ["dragon-ball|majin-buu", { slug: "majin-boo", name: "Majin Boo", aliases: ["Majin Buu"] }],
    ["dragon-ball|son-goku", { slug: "goku", name: "Goku", aliases: ["Son Goku"] }],
    ["dragon-ball|future-trunks", { slug: "trunks", name: "Trunks", aliases: ["Future Trunks"] }],
    ["dragon-ball|vegetto-e-majin-boo", { slug: "vegetto-e-majin-boo", name: "Vegetto e Majin Boo", aliases: ["Vegeto e Majin Buu", "Vegito e Majin Buu", "Vegeto Majin Buu", "Vegeto Majin Buu Dragon Ball"] }],
    ["one-piece|monkey-d-luffy", { slug: "monkey-d-luffy", name: "Monkey D. Luffy", aliases: ["Luffy"] }],
    ["one-piece|luffy", { slug: "monkey-d-luffy", name: "Monkey D. Luffy", aliases: ["Luffy"] }],
    ["one-piece|roronoa-zoro", { slug: "roronoa-zoro", name: "Roronoa Zoro", aliases: ["Zoro"] }],
    ["one-piece|zoro-e-luffy", { slug: "zoro-e-luffy", name: "Zoro e Luffy", aliases: ["Zoro and Luffy", "Zoro and Luffy One Piece"] }],
    ["one-piece|zoro", { slug: "roronoa-zoro", name: "Roronoa Zoro", aliases: ["Zoro"] }],
    ["trigun|vash", { slug: "vash-the-stampede", name: "Vash the Stampede", aliases: ["Vash"] }],
    ["trigun-vash|vash", { slug: "vash-the-stampede", name: "Vash the Stampede", aliases: ["Vash"] }],
  ].map(([key, value]) => [key, value]),
);

const HARD_SKIP_FRANCHISES = new Set([
  "atomic-heart",
  "chrono-trigger",
  "march-titans-19",
  "pokemon",
]);

const GENERIC_SUBJECT_WORDS = new Set([
  "accessory",
  "acessorio",
  "acessorios",
  "armor",
  "armors",
  "base",
  "bases",
  "body",
  "bust",
  "busto",
  "bustos",
  "busts",
  "card",
  "cards",
  "character",
  "characters",
  "collection",
  "display",
  "diorama",
  "dioramas",
  "duo",
  "female",
  "figure",
  "figures",
  "figura",
  "figuras",
  "girl",
  "girls",
  "group",
  "grupo",
  "male",
  "model",
  "modelo",
  "misc",
  "object",
  "objects",
  "part",
  "parts",
  "peca",
  "pecas",
  "piece",
  "pieces",
  "prop",
  "props",
  "set",
  "sets",
  "statue",
  "statues",
  "vehicle",
  "vehicles",
  "warrior",
  "warriors",
  "woman",
  "women",
]);

const GENERIC_EXACT_SUBJECTS = new Set([
  "anime",
  "anime-figure",
  "anime-figures",
  "anime-girl",
  "anime-girls",
  "anime-warrior",
  "anime-warrior-figures",
  "busts",
  "collections",
  "dioramas",
  "figures",
  "geral",
  "general",
  "misc",
  "nao-identificado",
  "sets",
  "unknown",
]);

const NON_CATALOG_SUBJECTS = new Set([
  "devil-fruit",
]);

const PRODUCT_SUFFIXES = new Map([
  ["bust", "Busto"],
  ["busto", "Busto"],
  ["head", "Busto"],
]);

const SENSITIVE_WORDS = new Set([
  "adult",
  "bikini",
  "explicit",
  "lingerie",
  "naked",
  "nsfw",
  "nude",
  "pinup",
  "sensual",
  "sensitive",
  "sexy",
  "swimsuit",
]);

const VARIANT_NOISE_WORDS = new Set([
  "alternate",
  "alternativo",
  "back",
  "base",
  "close",
  "closeup",
  "costas",
  "detail",
  "detalhe",
  "detalhes",
  "figure",
  "figura",
  "front",
  "frente",
  "head",
  "option",
  "options",
  "opcao",
  "opcoes",
  "part",
  "parts",
  "peca",
  "pecas",
  "rear",
  "side",
  "statue",
  "turntable",
  "variant",
  "variante",
  "view",
]);

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

function normalizeSlug(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return normalizeComparable(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[a-z]$/.test(word)) return word.toUpperCase();
      if (/^\d+$/.test(word)) return word;
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const text = cleanName(value);
    const key = normalizeComparable(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function parseDisplayRelpath(record) {
  const relpath = String(record.display_relpath || "").replaceAll("\\", "/");
  const parts = relpath.split("/").filter(Boolean);
  if (parts.length < 5 || parts[0] !== "display" || parts[1] !== "anime") {
    return null;
  }

  const franchise = normalizeSlug(parts[2]);
  const folderParts = parts.slice(3, -1).map(normalizeSlug).filter(Boolean);
  const filename = parts.at(-1) || "";
  if (!franchise || folderParts.length === 0 || !filename) return null;

  const subject = folderParts.find((part) => part !== "nsfw") || folderParts[0];
  const tailFolders = folderParts.filter((part) => part !== subject);

  return {
    relpath,
    franchise,
    folderParts,
    subject,
    tailFolders,
    filename,
  };
}

function isAnimeWaveRecord(record) {
  return record.taxonomy_applied_action === "anime_webp_taxonomy_wave";
}

function canonicalFranchise(slug) {
  return FRANCHISE_SLUG_ALIASES.get(slug) || slug;
}

function productSuffix(subject) {
  const words = subject.split("-").filter(Boolean);
  const suffix = words.at(-1);
  if (!suffix || !PRODUCT_SUFFIXES.has(suffix)) return null;
  if (words.length <= 1) return null;
  return {
    productType: PRODUCT_SUFFIXES.get(suffix),
    subject: words.slice(0, -1).join("-"),
  };
}

function hasGenericSubject(subject) {
  if (GENERIC_EXACT_SUBJECTS.has(subject)) return true;
  const words = subject.split("-").filter(Boolean);
  if (words.some((word) => ["unknown", "identificado"].includes(word))) return true;
  if (NON_CATALOG_SUBJECTS.has(subject)) return true;
  if (subject.endsWith("-figures") || subject.endsWith("-dioramas")) return true;
  if (subject.includes("-collection")) return true;
  if (subject.includes("-and-figures")) return true;
  if (subject.includes("-figure-set")) return true;
  if (subject.includes("-parts")) return true;
  if (subject.includes("-pecas")) return true;

  const suffix = productSuffix(subject);
  const comparableSubject = suffix?.subject || subject;
  const comparableWords = comparableSubject.split("-").filter(Boolean);
  if (!comparableWords.length) return true;

  return comparableWords.some((word) => GENERIC_SUBJECT_WORDS.has(word));
}

function subjectIdentity(franchiseSlug, subject) {
  const canonical = canonicalFranchise(franchiseSlug);
  const suffix = productSuffix(subject);
  const rawSubject = suffix?.subject || subject;
  const key =
    SUBJECT_ALIASES.get(`${canonical}|${rawSubject}`) ||
    SUBJECT_ALIASES.get(`${franchiseSlug}|${rawSubject}`);

  if (key) {
    return {
      slug: key.slug,
      name: key.name,
      aliases: key.aliases || [],
      productType: suffix?.productType || null,
    };
  }

  return {
    slug: rawSubject,
    name: titleCase(rawSubject),
    aliases: [],
    productType: suffix?.productType || null,
  };
}

function inferredSubjectFromFilename(franchiseSlug, parsed) {
  const stem = filenameStem(parsed.filename, "");
  if (franchiseSlug === "gundam" && parsed.subject === "gundam-busts") {
    if (/\bgundam-head-bust\b/.test(stem)) {
      return { subject: "gundam", productType: "Busto" };
    }
  }

  if (franchiseSlug === "dragon-ball" && parsed.subject === "dragon-ball-busts") {
    const knownSubjects = [
      "piccolo",
      "goku",
      "vegeta",
      "freeza",
      "frieza",
      "majin-buu",
      "majin-boo",
      "gohan",
      "trunks",
    ];
    const subject = knownSubjects.find((candidate) => stem.startsWith(`${candidate}-`));
    if (subject) return { subject, productType: "Busto" };
  }

  if (franchiseSlug === "dragon-ball" && parsed.subject === "dragon-ball-misc") {
    if (/^vegeto-majin-buu-dragon-ball\b/.test(stem)) {
      return { subject: "vegetto-e-majin-boo", productType: null };
    }
  }

  if (franchiseSlug === "one-piece" && parsed.subject === "roronoa-zoro") {
    if (/^zoro-and-luffy-one-piece\b/.test(stem)) {
      return { subject: "zoro-e-luffy", productType: null };
    }
  }

  return null;
}

function resolvedSubject(franchiseSlug, parsed) {
  const inferred = inferredSubjectFromFilename(franchiseSlug, parsed);
  if (inferred) {
    return {
      subject: inferred.subject,
      productType: inferred.productType || null,
      inferred: true,
    };
  }

  return {
    subject: parsed.subject,
    productType: null,
    inferred: false,
  };
}

function filenameStem(filename, messageId) {
  let stem = normalizeSlug(filename.replace(/\.[a-z0-9]+$/i, ""));
  const id = normalizeSlug(messageId);
  if (id && stem.endsWith(`-${id}`)) stem = stem.slice(0, -id.length - 1);
  return stem;
}

function viewGroupStem(filename, messageId) {
  const stem = filenameStem(filename, messageId);
  const pair = stem.match(/^(.*-\d+)-\d+$/);
  if (pair) return pair[1];
  return stem;
}

function variantName({
  filename,
  messageId,
  subjectSlug,
  subjectName,
  aliases = [],
  productType,
  franchiseSlug,
  franchiseTitle,
}) {
  const stem = viewGroupStem(filename, messageId);
  const subjectAliases = unique([
    subjectSlug,
    normalizeSlug(subjectName),
    normalizeSlug(subjectName.replace(/\./g, "")),
    ...aliases,
    franchiseSlug,
    normalizeSlug(franchiseTitle),
    ...String(subjectName || "").split(/\s+/),
  ])
    .map(normalizeSlug)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  let remainder = stem;
  for (const alias of subjectAliases) {
    if (remainder === alias) remainder = "";
    else if (remainder.startsWith(`${alias}-`)) remainder = remainder.slice(alias.length + 1);
  }

  if (!remainder) return null;
  if (/^\d+$/.test(remainder)) return `Modelo ${remainder}`;
  if (productType && normalizeSlug(productType) === remainder) return productType;

  const cleaned = remainder
    .split("-")
    .filter((part) => part && !VARIANT_NOISE_WORDS.has(part))
    .join("-");
  if (!cleaned) return null;

  if (/^\d+$/.test(cleaned)) return `Modelo ${cleaned}`;
  return titleCase(cleaned);
}

function contentTags(record, parsed) {
  const text = normalizeComparable(
    [
      record.display_relpath,
      record.thumb_relpath,
      record.source_name,
      record.source_filename,
      record.original_catalog_relpath,
      parsed.filename,
      parsed.folderParts.join(" "),
      ...(Array.isArray(record.tags) ? record.tags : []),
    ].join(" "),
  );
  const words = new Set(text.split(/\s+/).filter(Boolean));
  return [...SENSITIVE_WORDS].some((word) => words.has(word))
    ? ["nsfw", "sensitive-blur"]
    : [];
}

function targetRelpath(kind, parsed, franchiseSlug, subjectSlug) {
  const folders = [kind, "anime", franchiseSlug, subjectSlug, ...parsed.tailFolders].filter(Boolean);
  return path.posix.join(...folders, parsed.filename);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveRelpath(oldRelpath, newRelpath) {
  const oldNormalized = String(oldRelpath || "").replaceAll("\\", "/");
  const newNormalized = String(newRelpath || "").replaceAll("\\", "/");
  if (oldNormalized === newNormalized) {
    return { changed: false, moved: false, reason: "same_path" };
  }

  const oldAbs = path.join(OUTPUT, oldNormalized);
  const newAbs = path.join(OUTPUT, newNormalized);
  const oldExists = await exists(oldAbs);
  const newExists = await exists(newAbs);

  if (!oldExists && newExists) {
    return {
      changed: true,
      moved: false,
      reason: "already_moved",
      oldRelpath: oldNormalized,
      newRelpath: newNormalized,
    };
  }

  if (!oldExists) {
    return {
      changed: true,
      moved: false,
      reason: "source_missing",
      oldRelpath: oldNormalized,
      newRelpath: newNormalized,
    };
  }

  if (newExists) {
    return {
      changed: true,
      moved: false,
      reason: "target_exists",
      oldRelpath: oldNormalized,
      newRelpath: newNormalized,
    };
  }

  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(newAbs), { recursive: true });
    await fs.rename(oldAbs, newAbs);
  }

  return {
    changed: true,
    moved: !DRY_RUN,
    reason: DRY_RUN ? "dry_run" : null,
    oldRelpath: oldNormalized,
    newRelpath: newNormalized,
  };
}

async function removeEmptyParents(startRelpath) {
  let current = path.dirname(path.join(OUTPUT, startRelpath));
  const floor = OUTPUT.toLowerCase();

  while (current.toLowerCase().startsWith(floor) && current.toLowerCase() !== floor) {
    try {
      await fs.rmdir(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}

function skipReason(record, parsed) {
  if (record.final_category !== "anime") return "not_anime";
  if (
    record.curation_status === "taxonomy_applied" &&
    !isAnimeWaveRecord(record)
  ) {
    return "already_taxonomy_applied";
  }
  if (!parsed) return "not_display_anime_path";
  const franchiseSlug = canonicalFranchise(parsed.franchise);
  const subject = resolvedSubject(franchiseSlug, parsed);
  if (FRANCHISE_FILTER && franchiseSlug !== FRANCHISE_FILTER) {
    return "outside_franchise_filter";
  }
  if (HARD_SKIP_FRANCHISES.has(parsed.franchise)) return "hard_skip_franchise";
  if (!FRANCHISE_TITLES.has(franchiseSlug)) {
    return "unknown_or_unapproved_franchise";
  }
  if (hasGenericSubject(subject.subject)) return "generic_or_non_catalog_subject";
  return null;
}

function patchRecord(record, parsed, displayRelpath, thumbRelpath) {
  const franchiseSlug = canonicalFranchise(parsed.franchise);
  const franchiseTitle = FRANCHISE_TITLES.get(franchiseSlug);
  const subjectInfo = resolvedSubject(franchiseSlug, parsed);
  const subject = subjectIdentity(franchiseSlug, subjectInfo.subject);
  const productTypeFromFilename = /\b(bust|busto)\b/i.test(parsed.filename)
    ? "Busto"
    : null;
  const productType =
    subject.productType || subjectInfo.productType || productTypeFromFilename;
  const publicName = productType ? `${productType} ${subject.name}` : subject.name;
  const variant = variantName({
    filename: parsed.filename,
    messageId: record.message_id,
    subjectSlug: subject.slug,
    subjectName: subject.name,
    aliases: subject.aliases,
    productType,
    franchiseSlug,
    franchiseTitle,
  });
  const sensitivityTags = contentTags(record, parsed);

  return {
    ...record,
    source_type: "anime",
    source_category: "anime",
    final_category: "anime",
    source_franchise: franchiseTitle,
    source_folder: subject.slug,
    display_relpath: displayRelpath,
    thumb_relpath: thumbRelpath,
    public_name_pt_br: publicName,
    original_name: cleanName(record.original_name || subject.name),
    aliases: unique([...subject.aliases, record.original_name].filter(Boolean)),
    variant_name: variant,
    variant_type: variant ? "variant" : "default",
    confidence: record.confidence || "path_confirmed",
    notes: [
      record.notes,
      subjectInfo.inferred
        ? "Anime liberado por inferencia conservadora do nome de arquivo dentro de pasta generica."
        : "Anime liberado por regra de alta confianca baseada em caminho final, pasta de personagem e nome de arquivo.",
    ]
      .filter(Boolean)
      .join(" "),
    curation_status: "taxonomy_applied",
    taxonomy_group: franchiseSlug,
    taxonomy_slug: subject.slug,
    source_title: franchiseTitle,
    tags: unique([
      "anime",
      franchiseTitle,
      subject.name,
      subject.slug,
      productType,
      ...sensitivityTags,
    ]),
    taxonomy_applied_action: "anime_webp_taxonomy_wave",
    taxonomy_applied_reason:
      "Leva automatica conservadora: franquia conhecida, pasta de personagem nao generica e arquivos WebP existentes.",
  };
}

function revertWaveRecord(record, reason) {
  return {
    ...record,
    public_name_pt_br: null,
    variant_name: null,
    variant_type: "default",
    curation_status: "needs_ptbr_name",
    taxonomy_group: null,
    taxonomy_slug: null,
    tags: [],
    taxonomy_applied_action: "anime_webp_taxonomy_wave_reverted",
    taxonomy_applied_reason: `Revertido da leva automatica de anime: ${reason}.`,
  };
}

function countBy(values, getKey) {
  const counts = new Map();
  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

async function main() {
  const raw = await fs.readFile(MANIFEST, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const records = lines.map((line) => JSON.parse(line));
  const updated = [];
  const patchedRecords = [];
  const skipped = [];
  const moves = [];
  const blockedMoves = [];
  const revertedRecords = [];

  for (const record of records) {
    const parsed = parseDisplayRelpath(record);
    const reason = skipReason(record, parsed);
    if (reason) {
      skipped.push({
        reason,
        message_id: record.message_id || null,
        display_relpath: record.display_relpath || null,
      });
      if (isAnimeWaveRecord(record)) {
        const reverted = revertWaveRecord(record, reason);
        revertedRecords.push(reverted);
        updated.push(reverted);
      } else {
        updated.push(record);
      }
      continue;
    }

    const franchiseSlug = canonicalFranchise(parsed.franchise);
    const subjectInfo = resolvedSubject(franchiseSlug, parsed);
    const subject = subjectIdentity(franchiseSlug, subjectInfo.subject);
    const displayRelpath = targetRelpath("display", parsed, franchiseSlug, subject.slug);
    const thumbRelpath = targetRelpath(
      "thumb",
      parsed,
      franchiseSlug,
      subject.slug,
    );
    const displayMove = await moveRelpath(record.display_relpath, displayRelpath);
    const thumbMove = await moveRelpath(record.thumb_relpath, thumbRelpath);
    moves.push({ message_id: record.message_id || null, display: displayMove, thumb: thumbMove });

    const failedMove = [displayMove, thumbMove].find((move) =>
      ["source_missing", "target_exists"].includes(move.reason),
    );
    if (failedMove) {
      blockedMoves.push({
        message_id: record.message_id || null,
        display_relpath: record.display_relpath || null,
        thumb_relpath: record.thumb_relpath || null,
        failed_move: failedMove,
      });
      updated.push(record);
      continue;
    }

    const patched = patchRecord(record, parsed, displayRelpath, thumbRelpath);
    patchedRecords.push(patched);
    updated.push(patched);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = {
    generated_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    output: OUTPUT,
    manifest: MANIFEST,
    report_dir: REPORT_DIR,
    records: records.length,
    patched_records: patchedRecords.length,
    reverted_records: revertedRecords.length,
    unique_patched_message_ids: new Set(
      patchedRecords.map((record) => String(record.message_id || record.display_relpath)),
    ).size,
    blocked_moves: blockedMoves.length,
    skipped: skipped.length,
    by_skip_reason: countBy(skipped, (item) => item.reason),
    by_franchise_patched: countBy(
      patchedRecords,
      (record) => record.taxonomy_group || "",
    ),
    moved_paths: moves.filter((item) => item.display.changed || item.thumb.changed).length,
    move_examples: moves
      .filter((item) => item.display.changed || item.thumb.changed)
      .slice(0, 20),
    blocked_move_examples: blockedMoves.slice(0, 20),
    patched_examples: patchedRecords.slice(0, 25).map((record) => ({
      message_id: record.message_id || null,
      name: record.public_name_pt_br,
      franchise: record.source_title,
      taxonomy_slug: record.taxonomy_slug,
      variant_name: record.variant_name,
      display_relpath: record.display_relpath,
      tags: record.tags,
    })),
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `anime_taxonomy_wave_${stamp}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!DRY_RUN && patchedRecords.length > 0) {
    const backup = `${MANIFEST}.before-anime-taxonomy-wave-${stamp}.bak`;
    await fs.copyFile(MANIFEST, backup);
    const tmp = `${MANIFEST}.tmp`;
    await fs.writeFile(
      tmp,
      `${updated.map((record) => JSON.stringify(record)).join("\n")}\n`,
      "utf8",
    );
    await fs.rename(tmp, MANIFEST);

    for (const item of moves) {
      for (const move of [item.display, item.thumb]) {
        if (move.changed && !move.reason && move.oldRelpath) {
          await removeEmptyParents(move.oldRelpath);
        }
      }
    }

    report.backup = backup;
  }

  console.log(JSON.stringify({ ...report, report: reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
