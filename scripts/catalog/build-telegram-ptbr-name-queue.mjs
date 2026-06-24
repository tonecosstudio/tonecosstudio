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

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const QUEUE = path.resolve(
  argValue(
    "queue",
    process.env.ORDAX_PTBR_NAME_QUEUE ||
      path.join(OUTPUT, "manifests", "revisao_nomes_ptbr.csv"),
  ),
);

const COLUMNS = [
  "status_curadoria",
  "nome_publico_pt_br",
  "sugestao_nome_pt_br",
  "nome_original",
  "franquia_publica_pt_br",
  "sugestao_franquia_pt_br",
  "categoria_final",
  "tags_publicas",
  "tags_internas",
  "aliases",
  "source_name",
  "message_id",
  "display_relpath",
  "thumb_relpath",
  "original_catalog_relpath",
  "source_franchise",
  "source_folder",
  "source_filename",
  "confidence",
  "notes",
];

const PTBR_ALIASES = new Map(
  Object.entries({
    abomination: "Abominavel",
    abra: "Abra",
    "alice in wonderland": "Alice no Pa\u00eds das Maravilhas",
    antman: "Homem-Formiga",
    "ant man": "Homem-Formiga",
    apocalypse: "Apocalipse",
    aquaman: "Aquaman",
    archangel: "Arcanjo",
    beast: "Fera",
    "black panther": "Pantera Negra",
    "black widow": "Vi\u00fava Negra",
    "black cat": "Gata Negra",
    blanka: "Blanka",
    borderlands: "Borderlands",
    cable: "Cable",
    carnage: "Carnificina",
    "captain america": "Capit\u00e3o Am\u00e9rica",
    catwoman: "Mulher-Gato",
    "cheshire cat": "Gato de Cheshire",
    cyclops: "Ciclope",
    dazzler: "Dazzler",
    "dead pool": "Deadpool",
    deadpool: "Deadpool",
    "doctor doom": "Doutor Destino",
    "doctor manhattan": "Doutor Manhattan",
    "doctor strange": "Doutor Estranho",
    disney: "Disney",
    "dragon ball": "Dragon Ball",
    daredevil: "Demolidor",
    electro: "Electro",
    "emma frost": "Emma Frost",
    falcon: "Falcao",
    galactus: "Galactus",
    "ghost rider": "Motoqueiro Fantasma",
    goku: "Goku",
    "green goblin": "Duende Verde",
    "ghost face": "Ghostface",
    ghostface: "Ghostface",
    "green arrow": "Arqueiro Verde",
    hawkeye: "Gaviao Arqueiro",
    "harley quinn": "Harley Quinn",
    hashirama: "Hashirama",
    hulk: "Hulk",
    iceman: "Homem de Gelo",
    "iron man": "Homem de Ferro",
    "iron fist": "Punho de Ferro",
    itachi: "Itachi",
    ivysaur: "Ivysaur",
    "jane foster thor": "Jane Foster Thor",
    "jean grey": "Jean Grey",
    joker: "Coringa",
    juggernaut: "Fanatico",
    kingpin: "Rei do Crime",
    kakashi: "Kakashi",
    link: "Link",
    loki: "Loki",
    magneto: "Magneto",
    marvel: "Marvel",
    "mary jane watson": "Mary Jane Watson",
    "moon knight": "Cavaleiro da Lua",
    miku: "Miku",
    "ms marvel": "Ms. Marvel",
    mystique: "Mistica",
    "nick fury": "Nick Fury",
    nightcrawler: "Noturno",
    phoenix: "Fenix",
    pokemon: "Pokemon",
    prowler: "Gatuno",
    "psycho mask": "M\u00e1scara Psycho",
    psylocke: "Psylocke",
    punisher: "Justiceiro",
    "rachel summers": "Rachel Summers",
    "red hood": "Capuz Vermelho",
    rhino: "Rino",
    rogue: "Vampira",
    "saiyan armor": "Armadura Saiyajin",
    sabretooth: "Dentes de Sabre",
    "scarlet witch": "Feiticeira Escarlate",
    "scarlet spider": "Aranha Escarlate",
    sentry: "Sentinela",
    "silver surfer": "Surfista Prateado",
    "spider man": "Homem-Aranha",
    "spider woman": "Mulher-Aranha",
    "spider gwen": "Spider-Gwen",
    spiderman: "Homem-Aranha",
    "star wars": "Star Wars",
    storm: "Tempestade",
    starlight: "Starlight",
    "street fighter": "Street Fighter",
    superman: "Superman",
    thanos: "Thanos",
    "the thing": "Coisa",
    "the flash": "Flash",
    "the penguin": "Pinguim",
    thor: "Thor",
    tsunade: "Tsunade",
    "tinker bell": "Sininho",
    venom: "Venom",
    vegeta: "Vegeta",
    wolverine: "Wolverine",
    "wonder woman": "Mulher-Maravilha",
    "x men": "X-Men",
    "x-men": "X-Men",
  }),
);

const BROAD_FRANCHISE_ALIASES = new Set([
  "dc",
  "disney",
  "dragon ball",
  "marvel",
  "pokemon",
  "star wars",
  "street fighter",
  "x men",
  "x-men",
]);

const CONTEXTUAL_CHARACTER_ALIASES = new Set([
  "beast",
  "black queen",
  "cable",
  "carnage",
  "electro",
  "falcon",
  "ghost rider",
  "hawkeye",
  "iceman",
  "juggernaut",
  "kingpin",
  "mantis",
  "phoenix",
  "prowler",
  "rhino",
  "rogue",
  "sentry",
  "spiral",
  "storm",
  "the thing",
]);

const PUBLIC_CATEGORY_MARKERS = new Map(
  Object.entries({
    marvel: "marvel",
    "marvel comics": "marvel",
    "x men": "marvel",
    "x-men": "marvel",
    avengers: "marvel",
    vingadores: "marvel",
    "spider man": "marvel",
    spiderman: "marvel",
    "homem aranha": "marvel",
    pokemon: "games",
    venom: "marvel",
    carnage: "marvel",
    carnificina: "marvel",
    deadpool: "marvel",
    "dead pool": "marvel",
    thor: "marvel",
    hulk: "marvel",
    "iron man": "marvel",
    "homem de ferro": "marvel",
    "captain america": "marvel",
    "capitao america": "marvel",
    "capita america": "marvel",
    "black panther": "marvel",
    "pantera negra": "marvel",
    "ghost rider": "marvel",
    "motoqueiro fantasma": "marvel",
    daredevil: "marvel",
    demolidor: "marvel",
    "moon knight": "marvel",
    "cavaleiro da lua": "marvel",
    dc: "dc",
    "dc comics": "dc",
    batman: "dc",
    joker: "dc",
    coringa: "dc",
    catwoman: "dc",
    "mulher gato": "dc",
    "harley quinn": "dc",
    superman: "dc",
    supergirl: "dc",
    "wonder woman": "dc",
    "mulher maravilha": "dc",
    aquaman: "dc",
    flash: "dc",
    "the flash": "dc",
    esportes: "esportes",
    futebol: "esportes",
  }),
);

const SOURCE_CATEGORY_PUBLIC_TARGETS = new Map(
  Object.entries({
    brands: "props",
    fantasy: "tabletop",
    historicos: "tabletop",
    holiday: "props",
    internet: "props",
    literature: "series",
    pokemon: "games",
    tematicos: "props",
    "web-series": "series",
  }),
);

const MARVEL_SUBFRANCHISE_MARKERS = new Map(
  Object.entries({
    "jean grey": "X-Men",
    wolverine: "X-Men",
    cyclops: "X-Men",
    ciclope: "X-Men",
    storm: "X-Men",
    tempestade: "X-Men",
    magneto: "X-Men",
    mystique: "X-Men",
    mistica: "X-Men",
    rogue: "X-Men",
    vampira: "X-Men",
    psylocke: "X-Men",
    beast: "X-Men",
    fera: "X-Men",
    iceman: "X-Men",
    "homem de gelo": "X-Men",
    nightcrawler: "X-Men",
    noturno: "X-Men",
    apocalypse: "X-Men",
    apocalipse: "X-Men",
    archangel: "X-Men",
    arcanjo: "X-Men",
    phoenix: "X-Men",
    fenix: "X-Men",
    "rachel summers": "X-Men",
    "omega red": "X-Men",
    sabretooth: "X-Men",
    "dentes de sabre": "X-Men",
    "x men": "X-Men",
    "x-men": "X-Men",
    "spider man": "Homem-Aranha",
    spiderman: "Homem-Aranha",
    "homem aranha": "Homem-Aranha",
    "spider gwen": "Homem-Aranha",
    "spider woman": "Homem-Aranha",
    "mulher aranha": "Homem-Aranha",
    "scarlet spider": "Homem-Aranha",
    "aranha escarlate": "Homem-Aranha",
    venom: "Homem-Aranha",
    carnage: "Homem-Aranha",
    carnificina: "Homem-Aranha",
    "black cat": "Homem-Aranha",
    "gata negra": "Homem-Aranha",
    "mary jane": "Homem-Aranha",
    "miles morales": "Homem-Aranha",
    prowler: "Homem-Aranha",
    gatuno: "Homem-Aranha",
    rhino: "Homem-Aranha",
    rino: "Homem-Aranha",
    shocker: "Homem-Aranha",
    electro: "Homem-Aranha",
    scorpion: "Homem-Aranha",
    "doctor octopus": "Homem-Aranha",
    "doutor octopus": "Homem-Aranha",
    "green goblin": "Homem-Aranha",
    "duende verde": "Homem-Aranha",
    hulk: "Hulk",
    hulkbuster: "Homem de Ferro",
    abomination: "Hulk",
    abominavel: "Hulk",
    "joe fixit": "Hulk",
    "she hulk": "Hulk",
    "iron man": "Homem de Ferro",
    "homem de ferro": "Homem de Ferro",
    "war machine": "Homem de Ferro",
    "rescue armor": "Homem de Ferro",
    thor: "Thor",
    loki: "Thor",
    "jane foster thor": "Thor",
    "captain america": "Capitao America",
    "capitao america": "Capitao America",
    "black widow": "Vingadores",
    "black panther": "Pantera Negra",
    "pantera negra": "Pantera Negra",
    "viuva negra": "Vingadores",
    hawkeye: "Vingadores",
    "gaviao arqueiro": "Vingadores",
    "scarlet witch": "Vingadores",
    "feiticeira escarlate": "Vingadores",
    thanos: "Vingadores",
    sentry: "Vingadores",
    sentinela: "Vingadores",
    "doctor strange": "Doutor Estranho",
    "doutor estranho": "Doutor Estranho",
    "moon knight": "Cavaleiro da Lua",
    "cavaleiro da lua": "Cavaleiro da Lua",
    daredevil: "Demolidor",
    demolidor: "Demolidor",
    elektra: "Demolidor",
    kingpin: "Demolidor",
    "rei do crime": "Demolidor",
    punisher: "Justiceiro",
    justiceiro: "Justiceiro",
    deadpool: "Deadpool",
    "dead pool": "Deadpool",
    "doctor doom": "Quarteto Fantastico",
    "doutor destino": "Quarteto Fantastico",
    "iron doom": "Homem de Ferro",
    "the thing": "Quarteto Fantastico",
    coisa: "Quarteto Fantastico",
    galactus: "Quarteto Fantastico",
    "silver surfer": "Quarteto Fantastico",
    "surfista prateado": "Quarteto Fantastico",
    "fantastic four": "Quarteto Fantastico",
    "quarteto fantastico": "Quarteto Fantastico",
    groot: "Guardioes da Galaxia",
    "star lord": "Guardioes da Galaxia",
    "rocket raccoon": "Guardioes da Galaxia",
    "guardians of the galaxy": "Guardioes da Galaxia",
    "guardioes da galaxia": "Guardioes da Galaxia",
    mantis: "Guardioes da Galaxia",
    "fanatico": "X-Men",
    "falcao": "Vingadores",
    "nick fury": "Vingadores",
    "morbius": "Homem-Aranha",
    "spider punk": "Homem-Aranha",
    "luna snow": "Marvel Rivals",
    "darkhawk": "Darkhawk",
    "symbiote accessories": "Homem-Aranha",
    "ultron helmet": "Vingadores",
    "armor helmet base": "Homem de Ferro",
    "hero helmet set": "Marvel",
    "gold red helmet": "Homem de Ferro",
    "stormbreaker": "Thor",
    "peggy carter": "Capitao America",
    "iron fist": "Punho de Ferro",
    "punho de ferro": "Punho de Ferro",
    dazzler: "X-Men",
    "hellverine": "X-Men",
    "white spider hero": "Homem-Aranha",
    "cloak and dagger": "Cloak And Dagger",
    "valkyrie": "Thor",
    "yondu udonta": "Guardioes da Galaxia",
    "ghost rider": "Motoqueiro Fantasma",
    "motoqueiro fantasma": "Motoqueiro Fantasma",
    gorr: "Thor",
    "iron spider": "Homem-Aranha",
    "black queen": "X-Men",
    cable: "X-Men",
    spiral: "X-Men",
    "emma frost": "X-Men",
    blade: "Blade",
    "ms marvel": "Ms. Marvel",
    "captain marvel": "Capita Marvel",
    "capita marvel": "Capita Marvel",
    "capitao marvel": "Capitao Marvel",
  }),
);

const DC_SUBFRANCHISE_MARKERS = new Map(
  Object.entries({
    batman: "Batman",
    "bruce wayne": "Batman",
    joker: "Batman",
    coringa: "Batman",
    catwoman: "Batman",
    "mulher gato": "Batman",
    "harley quinn": "Batman",
    batgirl: "Batman",
    batwoman: "Batman",
    "red hood": "Batman",
    "capuz vermelho": "Batman",
    nightwing: "Batman",
    robin: "Batman",
    bane: "Batman",
    scarecrow: "Batman",
    "poison ivy": "Batman",
    "alfred pennyworth": "Batman",
    penguin: "Batman",
    "the penguin": "Batman",
    riddler: "Batman",
    "talia al ghul": "Batman",
    "killer croc": "Batman",
    "ventriloquist e scarface": "Batman",
    "ventriloquist": "Batman",
    scarface: "Batman",
    superman: "Superman",
    supergirl: "Superman",
    "power girl": "Superman",
    "lex luthor": "Superman",
    "lois lane": "Superman",
    krypto: "Superman",
    "wonder woman": "Mulher-Maravilha",
    "mulher maravilha": "Mulher-Maravilha",
    cheetah: "Mulher-Maravilha",
    nubia: "Mulher-Maravilha",
    aquaman: "Aquaman",
    "king shark": "Aquaman",
    flash: "Flash",
    "the flash": "Flash",
    "green lantern": "Lanterna Verde",
    "lanterna verde": "Lanterna Verde",
    "jessica cruz": "Lanterna Verde",
    "green arrow": "Arqueiro Verde",
    "white canary": "Arqueiro Verde",
    "black canary": "Arqueiro Verde",
    raven: "Jovens Titas",
    starfire: "Jovens Titas",
    "deathstroke": "Jovens Titas",
    "static": "Static Shock",
    "martian manhunter": "Liga da Justica",
    "booster gold": "Liga da Justica",
    hawkman: "Liga da Justica",
    hawkgirl: "Liga da Justica",
    darkseid: "Liga da Justica",
    zatanna: "Liga da Justica",
    lobo: "Lobo",
    "john constantine": "Constantine",
    "doctor manhattan": "Watchmen",
    "doutor manhattan": "Watchmen",
    "marionette": "Watchmen",
  }),
);

const CATEGORY_PTBR = new Map(
  Object.entries({
    acessorios: "acess\u00f3rios",
    animacao: "anima\u00e7\u00e3o",
    anime: "anime",
    brinquedos: "brinquedos",
    decoracao: "decora\u00e7\u00e3o",
    desenhos: "desenhos",
    dc: "DC",
    dinosaurios: "dinossauros",
    esportes: "esportes",
    "figuras-militares": "figuras militares",
    filmes: "filmes",
    games: "games",
    horror: "horror",
    marvel: "Marvel",
    musica: "m\u00fasica",
    original: "modelos originais",
    props: "props",
    quadrinhos: "quadrinhos",
    "sci-fi": "sci-fi",
    series: "series",
    "star-wars": "Star Wars",
    tabletop: "tabletop",
    tv: "tv",
    veiculos: "ve\u00edculos",
    vtubers: "vtubers",
  }),
);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

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

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceCategoryKey(row) {
  return normalizeComparable(row.final_category).replace(/\s+/g, "-");
}

function isCrossoverSource(row) {
  return ["crossover", "crossovers"].includes(sourceCategoryKey(row));
}

function titleCase(value) {
  return cleanName(value)
    .toLowerCase()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

const DESCRIPTIVE_NAME_PTBR = new Map(
  Object.entries({
    "alien creatures": "Criaturas Alienigenas",
    "anime warrior figures": "Guerreiros de Anime",
    "archer squad": "Esquadrao de Arqueiros",
    "articulated figure body": "Corpo Articulado de Figura",
    "armored beast units": "Unidades de Feras Blindadas",
    "august squad": "Esquadrao August",
    "barbarian horned units": "Unidades Barbaras com Chifres",
    "blue cloak units": "Unidades de Capa Azul",
    "bunny pop figure": "Figura Bunny Pop",
    "bushipack squad": "Esquadrao Bushipack",
    "campaign creature sets": "Conjuntos de Criaturas de Campanha",
    "chicken figure": "Galinha",
    "creature diorama": "Diorama de Criatura",
    "creature encounter sets": "Conjuntos de Encontro com Criaturas",
    "creature parts": "Partes de Criatura",
    "dark witch figure": "Figura de Bruxa Sombria",
    "dark woman figure": "Figura Feminina Sombria",
    "diglett group": "Grupo Diglett",
    "divine figure": "Figura Divina",
    "dragon ball busts and figures": "Bustos e Figuras Dragon Ball",
    "dragon creature": "Criatura Dragao",
    "droid figure": "Droide",
    "eva unit": "Unidade Eva",
    "fantasy creatures": "Criaturas de Fantasia",
    "fantasy sets": "Conjuntos de Fantasia",
    "fantasy squads": "Esquadroes de Fantasia",
    "fantasy squads and terrain": "Esquadroes de Fantasia e Terreno",
    "female figure": "Figura Feminina",
    "figure moon parts": "Partes de Figura Lunar",
    "finn jake figure": "Finn e Jake",
    "ghost figures": "Figuras Fantasma",
    "ghost group": "Grupo de Fantasmas",
    "green terrain pieces": "Pecas de Terreno Verde",
    group: "Grupo",
    "halloween creature": "Criatura de Halloween",
    "halloween town characters": "Personagens de Halloween Town",
    "heavy cyber unit batch 220": "Unidade Cyber Pesada Lote 220",
    "heavy sci fi troopers": "Tropas Sci-Fi Pesadas",
    "hero helmet set": "Conjunto de Capacetes de Herois",
    "horror creatures and terrain": "Criaturas de Terror e Terreno",
    "house bharethe units": "Unidades House Bharethe",
    "ice monster group": "Grupo de Monstros de Gelo",
    "ice terrain set": "Conjunto de Terreno de Gelo",
    "jungle terrain miniatures": "Miniaturas de Terreno de Selva",
    "large beast creature": "Criatura Fera Grande",
    "large brute and creature squads": "Esquadroes de Brutos e Criaturas Grandes",
    "large brute creatures": "Criaturas Brutas Grandes",
    "lion griffin creature set": "Conjunto de Leao e Grifo",
    "mario luigi group": "Grupo Mario e Luigi",
    "medieval village terrain": "Terreno de Vila Medieval",
    "miniature group": "Grupo de Miniaturas",
    "monster creature": "Criatura Monstro",
    "monster miniature group": "Grupo de Miniaturas de Monstro",
    "monster squads and terrain": "Esquadroes de Monstros e Terreno",
    "monthly miniature props": "Acessorios Mensais de Miniaturas",
    "orange chainsaw creature": "Criatura Laranja com Motosserra",
    "orc group": "Grupo de Orcs",
    "orc spear group": "Grupo de Orcs com Lancas",
    "orc squad": "Esquadrao Orc",
    "pale mutant creatures": "Criaturas Mutantes Palidas",
    "parasect group": "Grupo Parasect",
    "pink pokemon group": "Grupo Pokemon Rosa",
    "plague beast units": "Unidades de Feras da Praga",
    "pokemon creature pack": "Pacote de Criaturas Pokemon",
    "ritual figure": "Figura Ritual",
    "robed figures": "Figuras com Manto",
    "rorschach figure": "Rorschach",
    "sci fi soldiers": "Soldados Sci-Fi",
    "sci fi squad": "Esquadrao Sci-Fi",
    "stationforge mech units": "Unidades Mech Stationforge",
    "stitch figure": "Stitch",
    "terrain props": "Acessorios de Terreno",
    "terrain squads and creature encounters": "Esquadroes de Terreno e Encontros de Criaturas",
    "tmnt group": "Grupo TMNT",
    "transition figures": "Figuras de Transicao",
    "treecko figures": "Treecko",
    "undead creatures": "Criaturas Mortas-Vivas",
    "wall e figure": "Wall-E",
    "warhammer heavy unit": "Unidade Pesada Warhammer",
    "warrior group": "Grupo de Guerreiros",
    "warrior squad": "Esquadrao de Guerreiros",
    "winged biker squad": "Esquadrao de Motoqueiros Alados",
    "winged fantasy squads": "Esquadroes Alados de Fantasia",
    "winterwardens creature": "Criatura Winterwardens",
  }),
);

const DESCRIPTIVE_WORD_PTBR = new Map(
  Object.entries({
    alien: "alienigena",
    aliens: "alienigenas",
    archer: "arqueiro",
    archers: "arqueiros",
    armored: "blindado",
    beast: "fera",
    beasts: "feras",
    blue: "azul",
    brute: "bruto",
    brutes: "brutos",
    campaign: "campanha",
    creature: "criatura",
    creatures: "criaturas",
    dark: "sombrio",
    diorama: "diorama",
    dragon: "dragao",
    droid: "droide",
    encounter: "encontro",
    encounters: "encontros",
    fantasy: "fantasia",
    female: "feminina",
    figure: "figura",
    figures: "figuras",
    ghost: "fantasma",
    ghosts: "fantasmas",
    green: "verde",
    group: "grupo",
    heavy: "pesado",
    horror: "terror",
    ice: "gelo",
    jungle: "selva",
    large: "grande",
    mech: "mech",
    medieval: "medieval",
    miniature: "miniatura",
    miniatures: "miniaturas",
    monster: "monstro",
    monsters: "monstros",
    mutant: "mutante",
    mutants: "mutantes",
    orc: "orc",
    orcs: "orcs",
    pack: "pacote",
    pale: "palido",
    parts: "partes",
    props: "acessorios",
    robed: "com manto",
    set: "conjunto",
    sets: "conjuntos",
    soldiers: "soldados",
    squad: "esquadrao",
    squads: "esquadroes",
    terrain: "terreno",
    unit: "unidade",
    units: "unidades",
    village: "vila",
    warrior: "guerreiro",
    warriors: "guerreiros",
    witch: "bruxa",
  }),
);

function translateDescriptiveModifier(value) {
  return String(value || "")
    .split(/\s+/)
    .filter((word) => word && word !== "and" && word !== "of" && word !== "the")
    .map((word) => DESCRIPTIVE_WORD_PTBR.get(word) || word)
    .join(" ");
}

function translateDescriptiveSuffix(comparable) {
  const rules = [
    ["figures", "Figuras"],
    ["figure", "Figura"],
    ["groups", "Grupos"],
    ["group", "Grupo"],
    ["squads", "Esquadroes"],
    ["squad", "Esquadrao"],
    ["units", "Unidades"],
    ["unit", "Unidade"],
    ["creatures", "Criaturas"],
    ["creature", "Criatura"],
    ["terrain", "Terreno"],
    ["props", "Acessorios"],
    ["parts", "Partes"],
    ["sets", "Conjuntos"],
    ["set", "Conjunto"],
    ["pack", "Pacote"],
    ["miniatures", "Miniaturas"],
    ["miniature", "Miniatura"],
    ["diorama", "Diorama"],
  ];

  for (const [suffix, label] of rules) {
    if (comparable === suffix) return label;
    if (!comparable.endsWith(` ${suffix}`)) continue;

    const modifier = comparable.slice(0, -suffix.length).trim();
    if (!modifier) return label;

    return `${label} ${titleCase(translateDescriptiveModifier(modifier))}`;
  }

  return "";
}

function translateDescriptiveTitle(value, options = {}) {
  const { exactOnly = false } = options;
  const comparable = normalizeComparable(value);
  const exact = DESCRIPTIVE_NAME_PTBR.get(comparable);
  if (exact) return exact;
  if (exactOnly) return "";
  if (!/\b(groups?|units?|figures?|terrain|creatures?|squads?|props|parts|sets?|miniatures?|diorama|pack)\b/i.test(value)) {
    return "";
  }

  const suffixTranslation = translateDescriptiveSuffix(comparable);
  if (suffixTranslation) return suffixTranslation;

  return titleCase(translateDescriptiveModifier(comparable));
}

function publicTitle(row, value) {
  const cleaned = cleanName(value);
  const category = suggestedCategory(row);
  const exactTranslated = translateDescriptiveTitle(cleaned, { exactOnly: true });
  if (exactTranslated) return exactTranslated;

  if (["anime", "games", "marvel", "dc"].includes(category)) {
    const withoutFigure = cleaned.replace(/\s+figures?$/i, "").trim();
    if (withoutFigure && withoutFigure !== cleaned) return titleCase(withoutFigure);
  }

  const translated = translateDescriptiveTitle(cleaned);
  if (translated) return translated;

  return titleCase(cleaned);
}

function cleanSourceFilenameName(row) {
  let cleaned = cleanName(row.source_filename);
  const messageId = String(row.message_id || "").trim();
  if (messageId) {
    cleaned = cleaned.replace(new RegExp(`\\b${messageId}\\b$`), "").trim();
  }
  return cleaned.replace(/\b\d{4,}\b$/g, "").trim();
}

function isPokemonGenericFolder(row) {
  const sourceCategory = sourceCategoryKey(row);
  const franchise = normalizeComparable(row.source_franchise);
  const sourceText = normalizeComparable(
    [row.source_folder, row.original_name, row.original_catalog_relpath].filter(Boolean).join(" "),
  );
  return (
    sourceCategory === "games" &&
    franchise === "pokemon" &&
    matchesNeedle(sourceText, "pokemon figure groups")
  );
}

function isGenericSportsFolder(row) {
  const category = suggestedCategory(row);
  return category === "esportes" && normalizeComparable(row.source_franchise) === "esportes";
}

function isPuppetswarHeavyCyberBatch220(row) {
  const text = normalizeComparable(
    [row.source_franchise, row.source_filename, row.original_catalog_relpath]
      .filter(Boolean)
      .join(" "),
  );
  return matchesNeedle(text, "puppetswar") && matchesNeedle(text, "heavy cyber unit batch220");
}

function lookupMarker(map, values) {
  const comparable = normalizeComparable(values.filter(Boolean).join(" "));
  if (!comparable) return "";

  const entries = [...map.entries()].sort(([left], [right]) => right.length - left.length);
  for (const [needle, replacement] of entries) {
    if (matchesNeedle(comparable, needle)) return replacement;
  }

  return "";
}

function matchesNeedle(comparable, needle) {
  const normalizedNeedle = normalizeComparable(needle);
  if (!normalizedNeedle) return false;
  if (comparable === normalizedNeedle) return true;
  return ` ${comparable} `.includes(` ${normalizedNeedle} `);
}

function findAlias(value, options = {}) {
  const { includeBroad = true, includeContextual = true } = options;
  const comparable = normalizeComparable(value);
  if (!comparable) return "";

  const entries = [...PTBR_ALIASES.entries()].sort(
    ([left], [right]) => right.length - left.length,
  );

  for (const [needle, replacement] of entries) {
    if (!includeBroad && BROAD_FRANCHISE_ALIASES.has(needle)) continue;
    if (!includeContextual && CONTEXTUAL_CHARACTER_ALIASES.has(needle)) continue;
    if (matchesNeedle(comparable, needle)) return replacement;
  }

  return "";
}

function suggestedName(row) {
  if (isCrossoverSource(row)) {
    const crossoverName = cleanName(row.original_name || row.source_folder || row.source_filename);
    if (crossoverName) return titleCase(crossoverName);
  }

  const category = suggestedCategory(row);
  const includeContextual = category === "marvel" || category === "dc";
  const specificCandidates = [
    row.original_name,
    row.source_folder,
    row.source_filename,
    row.original_catalog_relpath,
  ];

  for (const candidate of specificCandidates) {
    const alias = findAlias(candidate, { includeBroad: false, includeContextual });
    if (alias) return alias;
  }

  if (isPokemonGenericFolder(row)) {
    const filenameName = cleanSourceFilenameName(row);
    if (filenameName) return publicTitle(row, filenameName);
  }

  if (isGenericSportsFolder(row)) {
    const filenameName = cleanSourceFilenameName(row);
    if (filenameName) return publicTitle(row, filenameName);
  }

  if (isPuppetswarHeavyCyberBatch220(row)) {
    return "Unidade Cyber Pesada Lote 220";
  }

  const specificFallback = cleanName(row.original_name || row.source_folder || row.source_filename);
  if (specificFallback) return publicTitle(row, specificFallback);

  const franchiseAlias = findAlias(row.source_franchise);
  if (franchiseAlias) return franchiseAlias;

  return publicTitle(row, row.original_name || row.source_folder || row.source_filename);
}

function suggestedCategory(row, suggestedFranchise = "") {
  const sourceCategory = sourceCategoryKey(row);

  if (isCrossoverSource(row)) return "revisar";
  if (sourceCategory === "revisar") return "revisar";

  if (
    sourceCategory === "internet" &&
    ["hololive", "vtubers"].includes(normalizeComparable(row.source_franchise))
  ) {
    return "vtubers";
  }

  const marker = lookupMarker(PUBLIC_CATEGORY_MARKERS, [
    row.source_franchise,
    row.original_catalog_relpath,
    suggestedFranchise,
  ]);
  if (marker) return marker;

  return SOURCE_CATEGORY_PUBLIC_TARGETS.get(sourceCategory) || sourceCategory || row.final_category || "";
}

function suggestedFranchise(row, suggestedPublicName = suggestedName(row)) {
  const category = suggestedCategory(row);
  const sourceCategory = sourceCategoryKey(row);

  if (isCrossoverSource(row)) {
    return titleCase(row.source_franchise || suggestedPublicName || "Crossover");
  }

  if (sourceCategory === "revisar") {
    return titleCase(row.source_franchise || suggestedPublicName || "Revisar");
  }

  if (sourceCategory === "pokemon" || normalizeComparable(row.source_franchise) === "pokemon") {
    return "Pokemon";
  }

  if (category === "esportes" && normalizeComparable(row.source_franchise) === "esportes") {
    return titleCase(row.source_folder || suggestedPublicName || "Futebol");
  }

  if (category === "marvel") {
    return (
      lookupMarker(MARVEL_SUBFRANCHISE_MARKERS, [
        suggestedPublicName,
        row.source_folder,
        row.original_name,
        row.source_filename,
        row.original_catalog_relpath,
      ]) || "Marvel"
    );
  }

  if (category === "dc") {
    return (
      lookupMarker(DC_SUBFRANCHISE_MARKERS, [
        suggestedPublicName,
        row.source_folder,
        row.original_name,
        row.source_filename,
        row.original_catalog_relpath,
      ]) || "DC"
    );
  }

  const alias = findAlias(row.source_franchise);
  return alias || titleCase(row.source_franchise);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

async function readExistingQueue() {
  if (!(await exists(QUEUE))) return new Map();

  const raw = await fs.readFile(QUEUE, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();

  const headers = parseCsvLine(lines[0]);
  const rows = new Map();

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const key = row.display_relpath || row.source_name;
    if (key) rows.set(key, row);
  }

  return rows;
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function suggestedTags(row, category, franchise, name) {
  const categoryLabel = CATEGORY_PTBR.get(category) || category || "";
  return [...new Set([categoryLabel, franchise, name].filter(Boolean))].join("; ");
}

function internalTags(row) {
  return [
    row.final_category,
    row.source_franchise,
    row.source_folder,
    row.original_name,
    "telegram",
    "webp-final",
  ]
    .map(normalizeComparable)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join("; ");
}

function aliases(row) {
  const name = suggestedName(row);
  return [
    name,
    row.original_name,
    row.source_folder,
    row.source_franchise,
  ]
    .map(cleanName)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join("; ");
}

function buildQueueRow(row, existing) {
  const name = suggestedName(row);
  const franchise = suggestedFranchise(row, name);
  const category = suggestedCategory(row, franchise);
  const status =
    existing.status_curadoria ||
    row.curation_status ||
    "needs_ptbr_name";

  return {
    status_curadoria: status,
    nome_publico_pt_br: existing.nome_publico_pt_br || row.public_name_pt_br || "",
    sugestao_nome_pt_br: name,
    nome_original: existing.nome_original || row.original_name || "",
    franquia_publica_pt_br: existing.franquia_publica_pt_br || "",
    sugestao_franquia_pt_br: franchise,
    categoria_final: category,
    tags_publicas: suggestedTags(row, category, franchise, name),
    tags_internas: existing.tags_internas || internalTags(row),
    aliases: aliases(row),
    source_name: row.source_name || "",
    message_id: String(row.message_id || ""),
    display_relpath: row.display_relpath || "",
    thumb_relpath: row.thumb_relpath || "",
    original_catalog_relpath: row.original_catalog_relpath || "",
    source_franchise: row.source_franchise || "",
    source_folder: row.source_folder || "",
    source_filename: row.source_filename || "",
    confidence: row.confidence || "",
    notes: row.notes || "",
  };
}

async function main() {
  const rows = await readJsonl(MANIFEST);
  const existing = await readExistingQueue();
  const queueRows = rows.map((row) =>
    buildQueueRow(row, existing.get(row.display_relpath) || existing.get(row.source_name) || {}),
  );

  await fs.mkdir(path.dirname(QUEUE), { recursive: true });
  const csv = [
    COLUMNS.join(","),
    ...queueRows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");

  await fs.writeFile(QUEUE, `${csv}\n`, "utf8");

  const summary = {
    manifest: MANIFEST,
    queue: QUEUE,
    rows: queueRows.length,
    existing_preserved: [...existing.values()].filter((row) => row.nome_publico_pt_br).length,
    with_suggestion: queueRows.filter((row) => row.sugestao_nome_pt_br).length,
    needs_ptbr_name: queueRows.filter((row) => !row.nome_publico_pt_br).length,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
