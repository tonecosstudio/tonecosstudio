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

const OVERRIDES = [
  {
    message_id: "185814",
    public_name_pt_br: "Busto Capitao America",
    original_name: "captain america bust",
    aliases: [],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Capitao America",
    source_folder: "capitao-america",
    taxonomy_group: "herois",
    taxonomy_slug: "capitao-america",
    source_title: "Capitao America",
    display_relpath:
      "display/marvel/herois/capitao-america/busto-capitao-america-185814.webp",
    thumb_relpath:
      "thumb/marvel/herois/capitao-america/busto-capitao-america-185814.webp",
    notes:
      "Confirmado visualmente como busto do Capitao America; nome e tag precisam refletir busto.",
    tags: ["marvel", "Capitao America", "Busto", "Herois"],
  },
  {
    message_id: "186477",
    public_name_pt_br: "Homem-Aranha",
    original_name: "iron spider",
    aliases: ["Iron Spider", "Homem Aranha"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "homem-aranha",
    taxonomy_group: "herois",
    taxonomy_slug: "homem-aranha",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/herois/homem-aranha/iron-spider-turntable-1-186477.webp",
    thumb_relpath:
      "thumb/marvel/herois/homem-aranha/iron-spider-turntable-1-186477.webp",
    notes:
      "Confirmado visualmente como Homem-Aranha/Iron Spider; manter em Marvel/herois.",
    tags: ["marvel", "Homem-Aranha", "Iron Spider", "Herois"],
  },
  {
    message_id: "186247",
    public_name_pt_br: "Kozuki Oden",
    original_name: "kozuki oden",
    aliases: ["Kouzuki Oden", "Oden"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "One Piece",
    source_folder: "kozuki-oden",
    taxonomy_group: "one-piece",
    taxonomy_slug: "kozuki-oden",
    source_title: "One Piece",
    display_relpath:
      "display/anime/one-piece/kozuki-oden/kozuki-oden-lucas-perez-1-186247.webp",
    thumb_relpath:
      "thumb/anime/one-piece/kozuki-oden/kozuki-oden-lucas-perez-1-186247.webp",
    notes:
      "Confirmado visualmente como Kozuki Oden, samurai de One Piece; nao e Homem-Aranha.",
    tags: ["anime", "One Piece", "Kozuki Oden"],
  },
  {
    message_id: "168384",
    public_name_pt_br: "Joker",
    original_name: "persona 5 joker",
    aliases: ["Ren Amamiya"],
    final_category: "games",
    source_type: "game",
    source_category: "games",
    source_franchise: "Persona 5",
    source_folder: "joker",
    taxonomy_group: "persona-5",
    taxonomy_slug: "joker",
    source_title: "Persona 5",
    display_relpath:
      "display/games/persona-5/joker/persona-5-joker-tanuki-1-168384.webp",
    thumb_relpath:
      "thumb/games/persona-5/joker/persona-5-joker-tanuki-1-168384.webp",
    notes:
      "Confirmado visualmente e pelo nome do arquivo como Joker de Persona 5; nao e Coringa/DC.",
    tags: ["games", "Persona 5", "Joker", "Ren Amamiya"],
  },
  {
    message_id: "186436",
    public_name_pt_br: "Blonde Blazer",
    original_name: "blonde blazer",
    aliases: [],
    final_category: "games",
    source_type: "game",
    source_category: "games",
    source_franchise: "Dispatch",
    source_folder: "blonde-blazer",
    taxonomy_group: "dispatch",
    taxonomy_slug: "blonde-blazer",
    source_title: "Dispatch",
    display_relpath:
      "display/games/dispatch/blonde-blazer/blonde-blazer-1-3-186436.webp",
    thumb_relpath:
      "thumb/games/dispatch/blonde-blazer/blonde-blazer-1-3-186436.webp",
    notes:
      "Confirmado visualmente pelo usuario como Blonde Blazer, de Dispatch; nao e Harley Quinn.",
    tags: ["games", "Dispatch", "Blonde Blazer"],
  },
  {
    message_id: "188320",
    public_name_pt_br: "Valquiria",
    original_name: "valkyrie",
    aliases: ["Valkyrie"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Thor",
    source_folder: "valquiria",
    taxonomy_group: "herois",
    taxonomy_slug: "valquiria",
    source_title: "Thor",
    display_relpath:
      "display/marvel/herois/valquiria/valkyrie-winged-armor-1-188320.webp",
    thumb_relpath:
      "thumb/marvel/herois/valquiria/valkyrie-winged-armor-1-188320.webp",
    notes:
      "Confirmado visualmente como Valquiria/Valkyrie; manter em Marvel/Thor. Traje revelador: exibir no fluxo NSFW/blur.",
    tags: ["marvel", "Thor", "Valquiria", "Herois", "nsfw"],
  },
  {
    message_id: "160818",
    public_name_pt_br: "Harley Quinn",
    original_name: "harley quinn",
    aliases: ["Arlequina"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "arlequina",
    taxonomy_group: "anti-herois",
    taxonomy_slug: "harley-quinn",
    source_title: "Batman",
    display_relpath:
      "display/dc/anti-herois/arlequina/harley-quinn-swimsuit-turntable-1-160818.webp",
    thumb_relpath:
      "thumb/dc/anti-herois/arlequina/harley-quinn-swimsuit-turntable-1-160818.webp",
    notes:
      "Confirmado visualmente como Harley Quinn; manter em DC/Batman. Turntable com pose/traje adulto: exibir no fluxo NSFW/blur.",
    tags: ["dc", "Batman", "Harley Quinn", "Arlequina", "Anti-herois", "nsfw"],
  },
  {
    message_id: "105865",
    public_name_pt_br: "Thor",
    original_name: "thor",
    aliases: [],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Thor",
    source_folder: "thor",
    taxonomy_group: "herois",
    taxonomy_slug: "thor",
    source_title: "Thor",
    display_relpath:
      "display/marvel/herois/thor/thor-hammer-base-1-105865.webp",
    thumb_relpath: "thumb/marvel/herois/thor/thor-hammer-base-1-105865.webp",
    notes:
      "Confirmado visualmente como Thor; a base da propria escultura esta marcada como THOR.",
    tags: ["marvel", "Thor", "Herois"],
  },
  {
    message_id: "182213",
    public_name_pt_br: "Lady Loki",
    original_name: "lady loki",
    aliases: ["Loki"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Thor",
    source_folder: "loki",
    taxonomy_group: "anti-herois",
    taxonomy_slug: "loki",
    source_title: "Thor",
    display_relpath:
      "display/marvel/anti-herois/loki/lady-loki-gatsu-1-182213.webp",
    thumb_relpath:
      "thumb/marvel/anti-herois/loki/lady-loki-gatsu-1-182213.webp",
    notes:
      "Confirmado visualmente como Lady Loki em vista frontal; usar como capa preferencial do grupo.",
    tags: ["marvel", "Thor", "Loki", "Lady Loki", "Anti-herois"],
  },
    {
      message_id: "107632",
      public_name_pt_br: "Busto Jiren",
      original_name: "jiren bust",
      aliases: ["Jiren"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball Super",
    source_folder: "jiren",
    taxonomy_group: "dragon-ball-super",
    taxonomy_slug: "jiren",
    source_title: "Dragon Ball Super",
    display_relpath:
      "display/anime/dragon-ball-super/jiren/busto-jiren-lucas-perez-1-107632.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball-super/jiren/busto-jiren-lucas-perez-1-107632.webp",
    notes:
      "Confirmado visualmente como Jiren de Dragon Ball; nao e Busto Thanos.",
    tags: ["anime", "Dragon Ball Super", "Jiren", "Busto"],
  },
  {
    message_id: "103242",
    public_name_pt_br: "Busto Speed Demon",
    original_name: "speed demon bust",
    aliases: ["Speed Demon"],
    final_category: "outros",
    source_type: "comic",
    source_category: "outros",
    source_franchise: "Amalgam Comics",
    source_folder: "speed-demon",
    taxonomy_group: "crossover",
    taxonomy_slug: "speed-demon",
    source_title: "Amalgam Comics",
    display_relpath:
      "display/outros/crossover/amalgam-comics/speed-demon/busto-speed-demon-103242.webp",
    thumb_relpath:
      "thumb/outros/crossover/amalgam-comics/speed-demon/busto-speed-demon-103242.webp",
    notes:
      "Confirmado visualmente como busto Speed Demon; referencia externa aponta como personagem Amalgam Comics, crossover DC/Marvel, nao simplesmente vilao do Flash.",
    tags: ["dc", "marvel", "Amalgam", "Speed Demon", "Busto"],
  },
  {
    message_id: "97911",
    public_name_pt_br: "Pecas Goku",
    original_name: "goku figure parts card",
    aliases: ["Goku"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "pecas",
    taxonomy_slug: "pecas-goku",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/pecas/dragon-ball/pecas-goku-card-97911.webp",
    thumb_relpath:
      "thumb/fora-catalogo/pecas/dragon-ball/pecas-goku-card-97911.webp",
    notes:
      "Confirmado visualmente como cartao de pecas/partes, sem figura principal como produto; oculto do catalogo publico.",
    tags: ["fora catalogo", "Dragon Ball", "Goku", "Pecas"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Item visualmente e card/pecas de montagem, nao figura/estatueta/personagem para capa do catalogo.",
  },
  {
    message_id: "103100",
    public_name_pt_br: "Crono",
    original_name: "crono chibi",
    aliases: ["Chrono"],
    final_category: "games",
    source_type: "game",
    source_category: "games",
    source_franchise: "Chrono Trigger",
    source_folder: "crono",
    taxonomy_group: "chrono-trigger",
    taxonomy_slug: "crono",
    source_title: "Chrono Trigger",
    display_relpath:
      "display/games/chrono-trigger/crono/crono-chibi-messias-103100.webp",
    thumb_relpath:
      "thumb/games/chrono-trigger/crono/crono-chibi-messias-103100.webp",
    notes:
      "Confirmado visualmente como Crono de Chrono Trigger: cabelo vermelho, bandana, tunica azul e espada; nao e Goku SSJ4.",
    tags: ["games", "Chrono Trigger", "Crono"],
  },
  {
    message_id: "178531",
    public_name_pt_br: "Yuga Aoyama",
    original_name: "yuga aoyama bluespray",
    aliases: ["Yuga Aoyama"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "My Hero Academia",
    source_folder: "yuga-aoyama",
    taxonomy_group: "my-hero-academia",
    taxonomy_slug: "yuga-aoyama",
    source_title: "My Hero Academia",
    display_relpath:
      "display/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-178531.webp",
    thumb_relpath:
      "thumb/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-178531.webp",
    notes:
      "Confirmado visualmente como Yuga Aoyama de My Hero Academia: logo da base e traje do personagem; nao e Great Saiyaman/Dragon Ball.",
    tags: ["anime", "My Hero Academia", "Yuga Aoyama"],
  },
  {
    message_id: "178532",
    public_name_pt_br: "Yuga Aoyama",
    original_name: "yuga aoyama bluespray",
    aliases: ["Yuga Aoyama"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "My Hero Academia",
    source_folder: "yuga-aoyama",
    taxonomy_group: "my-hero-academia",
    taxonomy_slug: "yuga-aoyama",
    source_title: "My Hero Academia",
    variant_name: "Bluespray 2",
    variant_type: "variant",
    display_relpath:
      "display/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-2-178532.webp",
    thumb_relpath:
      "thumb/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-2-178532.webp",
    notes:
      "Confirmado visualmente como variacao do conjunto Yuga Aoyama/Bluespray; nao e Great Saiyaman/Dragon Ball.",
    tags: ["anime", "My Hero Academia", "Yuga Aoyama"],
  },
  {
    message_id: "178533",
    public_name_pt_br: "Yuga Aoyama",
    original_name: "yuga aoyama bluespray",
    aliases: ["Yuga Aoyama"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "My Hero Academia",
    source_folder: "yuga-aoyama",
    taxonomy_group: "my-hero-academia",
    taxonomy_slug: "yuga-aoyama",
    source_title: "My Hero Academia",
    variant_name: "Bluespray 3",
    variant_type: "variant",
    display_relpath:
      "display/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-3-178533.webp",
    thumb_relpath:
      "thumb/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-3-178533.webp",
    notes:
      "Confirmado visualmente como variacao do conjunto Yuga Aoyama/Bluespray; nao e Great Saiyaman/Dragon Ball.",
    tags: ["anime", "My Hero Academia", "Yuga Aoyama"],
  },
  {
    message_id: "178534",
    public_name_pt_br: "Yuga Aoyama",
    original_name: "yuga aoyama bluespray",
    aliases: ["Yuga Aoyama"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "My Hero Academia",
    source_folder: "yuga-aoyama",
    taxonomy_group: "my-hero-academia",
    taxonomy_slug: "yuga-aoyama",
    source_title: "My Hero Academia",
    variant_name: "Bluespray 4",
    variant_type: "variant",
    display_relpath:
      "display/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-4-178534.webp",
    thumb_relpath:
      "thumb/anime/my-hero-academia/yuga-aoyama/yuga-aoyama-bluespray-4-178534.webp",
    notes:
      "Confirmado visualmente como variacao do conjunto Yuga Aoyama/Bluespray; nao e Great Saiyaman/Dragon Ball.",
    tags: ["anime", "My Hero Academia", "Yuga Aoyama"],
  },
  {
    message_id: "101933",
    public_name_pt_br: "Bojack",
    original_name: "bojack",
    aliases: ["Bojack"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "bojack",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "bojack",
    source_title: "Dragon Ball",
    display_relpath: "display/anime/dragon-ball/bojack/bojack-figure-101933.webp",
    thumb_relpath: "thumb/anime/dragon-ball/bojack/bojack-figure-101933.webp",
    notes:
      "Confirmado visualmente como Bojack de Dragon Ball Z: pele esverdeada, cabelo laranja e traje roxo; nao e Janemba.",
    tags: ["anime", "Dragon Ball", "Bojack"],
  },
  {
    message_id: "99569",
    public_name_pt_br: "Pecas Cell",
    original_name: "cell parts",
    aliases: ["Cell"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "pecas",
    taxonomy_slug: "pecas-cell",
    source_title: "Dragon Ball",
    display_relpath: "display/fora-catalogo/pecas/dragon-ball/pecas-cell-99569.webp",
    thumb_relpath: "thumb/fora-catalogo/pecas/dragon-ball/pecas-cell-99569.webp",
    notes:
      "Confirmado visualmente como cartao de pecas do Cell, sem figura montada; nao e Kuririn e fica fora do catalogo publico.",
    tags: ["fora catalogo", "Dragon Ball", "Cell", "Pecas"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Item visualmente e card/pecas de montagem, nao figura/estatueta/personagem para capa do catalogo.",
  },
  {
    message_id: "116920",
    public_name_pt_br: "Pecas Cabeca Majin Boo",
    original_name: "majin buu head parts",
    aliases: ["Majin Buu", "Majin Boo"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "pecas",
    taxonomy_slug: "pecas-majin-boo",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/pecas/dragon-ball/pecas-cabeca-majin-boo-116920.webp",
    thumb_relpath:
      "thumb/fora-catalogo/pecas/dragon-ball/pecas-cabeca-majin-boo-116920.webp",
    notes:
      "Confirmado visualmente como pecas/cabeca de Majin Boo, nao figura montada; oculto do catalogo publico.",
    tags: ["fora catalogo", "Dragon Ball", "Majin Boo", "Pecas"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Item visualmente e card/pecas de montagem, nao figura/estatueta/personagem para capa do catalogo.",
  },
  {
    message_id: "116926",
    public_name_pt_br: "Tori-Bot",
    original_name: "tori bot pencil stand",
    aliases: ["Robotoriyama", "Akira Toriyama"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "tori-bot",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "tori-bot",
    source_title: "Dragon Ball",
    variant_name: "Porta lapis",
    variant_type: "variant",
    display_relpath:
      "display/anime/dragon-ball/tori-bot/tori-bot-porta-lapis-116926.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/tori-bot/tori-bot-porta-lapis-116926.webp",
    notes:
      "Confirmado visualmente como Tori-Bot/Robotoriyama, avatar de Akira Toriyama; nao e Kuririn.",
    tags: ["anime", "Dragon Ball", "Tori-Bot", "Robotoriyama"],
  },
  {
    message_id: "99541",
    public_name_pt_br: "Yamato",
    original_name: "yamato with momonosuke",
    aliases: ["Momonosuke"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "One Piece",
    source_folder: "yamato",
    taxonomy_group: "one-piece",
    taxonomy_slug: "yamato",
    source_title: "One Piece",
    display_relpath:
      "display/anime/one-piece/yamato/yamato-com-momonosuke-99541.webp",
    thumb_relpath:
      "thumb/anime/one-piece/yamato/yamato-com-momonosuke-99541.webp",
    notes:
      "Confirmado visualmente como Yamato com Momonosuke em forma de dragao, de One Piece; nao e Majin Boo/Dragon Ball.",
    tags: ["anime", "One Piece", "Yamato", "Momonosuke"],
  },
  {
    message_id: "154736",
    public_name_pt_br: "Piccolo",
    original_name: "piccolo chibi aura",
    aliases: ["Piccolo"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "piccolo",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "piccolo",
    source_title: "Dragon Ball",
    variant_name: "Chibi com aura",
    variant_type: "variant",
    display_relpath:
      "display/anime/dragon-ball/piccolo/piccolo-chibi-aura-154736.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/piccolo/piccolo-chibi-aura-154736.webp",
    notes:
      "Confirmado visualmente como Namekuseijin/Piccolo estilizado com aura; nao e Majin Boo.",
    tags: ["anime", "Dragon Ball", "Piccolo"],
  },
  {
    message_id: "139429",
    public_name_pt_br: "Zarbon",
    original_name: "zarbon",
    aliases: ["Zarbon"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "zarbon",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "zarbon",
    source_title: "Dragon Ball",
    display_relpath: "display/anime/dragon-ball/zarbon/zarbon-139429.webp",
    thumb_relpath: "thumb/anime/dragon-ball/zarbon/zarbon-139429.webp",
    notes:
      "Confirmado visualmente como Zarbon: cabelo verde, pele azul-esverdeada, armadura e capa; nao e Piccolo.",
    tags: ["anime", "Dragon Ball", "Zarbon"],
  },
  {
    message_id: "109168",
    public_name_pt_br: "Gohan",
    original_name: "gohan with shenlong",
    aliases: ["Son Gohan", "Shenlong", "Shenron"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "son-gohan",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "son-gohan",
    source_title: "Dragon Ball",
    variant_name: "Com Shenlong",
    variant_type: "variant",
    display_relpath:
      "display/anime/dragon-ball/son-gohan/gohan-com-shenlong-109168.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/son-gohan/gohan-com-shenlong-109168.webp",
    notes:
      "Confirmado visualmente como Gohan em traje roxo com Shenlong; nao e Piccolo.",
    tags: ["anime", "Dragon Ball", "Gohan", "Shenlong"],
  },
  {
    message_id: "76448",
    public_name_pt_br: "Conjunto Bulma, Goku e Shenlong",
    original_name: "bulma goku shenlong set",
    aliases: ["Bulma", "Goku", "Shenlong", "Shenron"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "conjunto-bulma-goku-shenlong",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "conjunto-bulma-goku-shenlong",
    source_title: "Dragon Ball",
    variant_name: "Conjunto",
    variant_type: "variant",
    display_relpath:
      "display/anime/dragon-ball/conjunto-bulma-goku-shenlong/conjunto-bulma-goku-shenlong-76448.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/conjunto-bulma-goku-shenlong/conjunto-bulma-goku-shenlong-76448.webp",
    notes:
      "Confirmado visualmente como conjunto com Bulma, Goku e Shenlong; nao deve ficar nomeado somente como Shenlong.",
    tags: ["anime", "Dragon Ball", "Bulma", "Goku", "Shenlong", "Conjunto"],
  },
  {
    message_id: "104057",
    public_name_pt_br: "Card Trunks Chibi",
    original_name: "trunks chibi promo card",
    aliases: ["Trunks"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "cards",
    taxonomy_slug: "card-trunks-chibi",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/cards/dragon-ball/card-trunks-chibi-104057.webp",
    thumb_relpath:
      "thumb/fora-catalogo/cards/dragon-ball/card-trunks-chibi-104057.webp",
    notes:
      "Confirmado visualmente como arte promocional/card com texto 'Ready to download now', nao imagem limpa de produto para galeria publica.",
    tags: ["fora catalogo", "Dragon Ball", "Trunks", "Card"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Imagem promocional/card de divulgacao, nao render limpa de figura/estatueta para o catalogo publico.",
  },
  {
    message_id: "112174",
    public_name_pt_br: "Caixa de escala Yajirobe",
    original_name: "yajirobe scale box",
    aliases: ["Yajirobe"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "tecnico",
    taxonomy_slug: "caixa-escala-yajirobe",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/tecnico/dragon-ball/caixa-escala-yajirobe-112174.webp",
    thumb_relpath:
      "thumb/fora-catalogo/tecnico/dragon-ball/caixa-escala-yajirobe-112174.webp",
    notes:
      "Confirmado visualmente como captura tecnica de caixa de escala/medidas, nao imagem de catalogo publico.",
    tags: ["fora catalogo", "Dragon Ball", "Yajirobe", "Tecnico"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Imagem tecnica com caixa de escala e medidas, inadequada como produto no catalogo publico.",
  },
  {
    message_id: "181464",
    public_name_pt_br: "Busto Roronoa Zoro",
    original_name: "roronoa zoro bust",
    aliases: ["Zoro"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "One Piece",
    source_folder: "roronoa-zoro",
    taxonomy_group: "one-piece",
    taxonomy_slug: "roronoa-zoro",
    source_title: "One Piece",
    display_relpath:
      "display/anime/one-piece/roronoa-zoro/busto-roronoa-zoro-181464.webp",
    thumb_relpath:
      "thumb/anime/one-piece/roronoa-zoro/busto-roronoa-zoro-181464.webp",
    notes:
      "Confirmado visualmente como busto de Roronoa Zoro: cabelo verde, cicatriz no olho e traje de One Piece; nao e Zarbon/Dragon Ball.",
    tags: ["anime", "One Piece", "Roronoa Zoro", "Busto"],
  },
  {
    message_id: "172598",
    public_name_pt_br: "Monkey D. Luffy",
    original_name: "monkey d luffy gear 5",
    aliases: ["Luffy", "Gear 5"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "One Piece",
    source_folder: "monkey-d-luffy",
    taxonomy_group: "one-piece",
    taxonomy_slug: "monkey-d-luffy",
    source_title: "One Piece",
    variant_name: "Gear 5",
    variant_type: "variant",
    display_relpath:
      "display/anime/one-piece/monkey-d-luffy/luffy-gear-5-lucas-perez-172598.webp",
    thumb_relpath:
      "thumb/anime/one-piece/monkey-d-luffy/luffy-gear-5-lucas-perez-172598.webp",
    notes:
      "Confirmado visualmente como Monkey D. Luffy Gear 5, com chapeu de palha e aura branca; nao e Majin Boo/Dragon Ball.",
    tags: ["anime", "One Piece", "Monkey D. Luffy", "Luffy", "Gear 5"],
  },
  {
    message_id: "74449",
    public_name_pt_br: "Cranio Majin Vegeta",
    original_name: "majin vegeta skull bust",
    aliases: ["Majin Vegeta"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "objetos",
    taxonomy_slug: "cranio-majin-vegeta",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/objetos/dragon-ball/cranio-majin-vegeta-74449.webp",
    thumb_relpath:
      "thumb/fora-catalogo/objetos/dragon-ball/cranio-majin-vegeta-74449.webp",
    notes:
      "Confirmado visualmente como cranio decorativo inspirado em Majin Vegeta, nao figura/estatueta/personagem montado.",
    tags: ["fora catalogo", "Dragon Ball", "Majin Vegeta", "Objeto"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Item visualmente e objeto decorativo, nao figura/estatueta/personagem para capa do catalogo.",
  },
  {
    message_id: "116215",
    public_name_pt_br: "Card Mr Satan",
    original_name: "mr satan figure card",
    aliases: ["Mr Satan"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "cards",
    taxonomy_slug: "card-mr-satan",
    source_title: "Dragon Ball",
    display_relpath: "display/fora-catalogo/cards/dragon-ball/card-mr-satan-116215.webp",
    thumb_relpath: "thumb/fora-catalogo/cards/dragon-ball/card-mr-satan-116215.webp",
    notes:
      "Confirmado visualmente como card/poster de apresentacao de Mr Satan, nao imagem principal de figura.",
    tags: ["fora catalogo", "Dragon Ball", "Mr Satan", "Card"],
    curation_status: "excluded_non_catalog_asset",
    taxonomy_applied_reason:
      "Item visualmente e card/poster, nao figura/estatueta/personagem para capa do catalogo.",
  },
  {
    message_id: "105348",
    public_name_pt_br: "Capitao Yellow",
    original_name: "captain yellow",
    aliases: ["Captain Yellow"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "capitao-yellow",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "capitao-yellow",
    source_title: "Dragon Ball",
    display_relpath:
      "display/anime/dragon-ball/capitao-yellow/capitao-yellow-105348.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/capitao-yellow/capitao-yellow-105348.webp",
    notes:
      "Confirmado visualmente como Capitao Yellow/Red Ribbon: personagem tigre com jaqueta verde e goggles; nao e Grandpa Gohan.",
    tags: ["anime", "Dragon Ball", "Capitao Yellow", "Red Ribbon"],
  },
  {
    message_id: "120115",
    public_name_pt_br: "Dick Vigarista e Muttley",
    original_name: "dastardly and muttley flying machines",
    aliases: ["Dastardly and Muttley", "Dick Dastardly", "Muttley"],
    final_category: "desenhos-animacao",
    source_type: "desenhos-animacao",
    source_category: "desenhos-animacao",
    source_franchise: "Hanna-Barbera",
    source_folder: "dick-vigarista-e-muttley",
    taxonomy_group: "dick-vigarista-e-muttley",
    taxonomy_slug: "dick-vigarista-e-muttley",
    source_title: "Dick Vigarista e Muttley",
    display_relpath:
      "display/desenhos-animacao/hanna-barbera/dick-vigarista-e-muttley/dick-vigarista-e-muttley-flying-machines-120115.webp",
    thumb_relpath:
      "thumb/desenhos-animacao/hanna-barbera/dick-vigarista-e-muttley/dick-vigarista-e-muttley-flying-machines-120115.webp",
    notes:
      "Confirmado visualmente como Hanna-Barbera/Dick Vigarista e Muttley; nao e Dragon Ball nem anime.",
    tags: [
      "desenhos-animacao",
      "Hanna-Barbera",
      "Dick Vigarista",
      "Muttley",
      "Conjunto",
    ],
  },
  {
    message_id: "124351",
    public_name_pt_br: "Decoracao Shenlong",
    original_name: "shenron dragon ball ring decor",
    aliases: ["Shenlong", "Shenron"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Dragon Ball",
    source_folder: "dragon-ball",
    taxonomy_group: "objetos",
    taxonomy_slug: "decoracao-shenlong",
    source_title: "Dragon Ball",
    display_relpath:
      "display/fora-catalogo/objetos/dragon-ball/decoracao-shenlong-124351.webp",
    thumb_relpath:
      "thumb/fora-catalogo/objetos/dragon-ball/decoracao-shenlong-124351.webp",
    notes:
      "Confirmado visualmente como decoracao/objeto de Shenlong; nao e figura, estatua, busto ou personagem para o catalogo publico.",
    tags: ["fora catalogo", "Dragon Ball", "Shenlong", "Decoracao"],
  },
  {
    message_id: "116222",
    public_name_pt_br: "Uryu Ishida",
    original_name: "uryu ishida",
    aliases: ["Ishida Uryu"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Bleach",
    source_folder: "uryu-ishida",
    taxonomy_group: "bleach",
    taxonomy_slug: "uryu-ishida",
    source_title: "Bleach",
    display_relpath:
      "display/anime/bleach/uryu-ishida/uryu-ishida-quincy-branco-116222.webp",
    thumb_relpath:
      "thumb/anime/bleach/uryu-ishida/uryu-ishida-quincy-branco-116222.webp",
    notes:
      "Confirmado visualmente como Uryu Ishida de Bleach; nao e Freeza/Dragon Ball.",
    tags: ["anime", "Bleach", "Uryu Ishida"],
  },
  {
    message_id: "116922",
    public_name_pt_br: "Mascara Freeza",
    original_name: "frieza mask",
    aliases: ["Freeza", "Frieza"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "freeza",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "freeza",
    source_title: "Dragon Ball",
    display_relpath:
      "display/anime/dragon-ball/freeza/mascara-freeza-116922.webp",
    thumb_relpath: "thumb/anime/dragon-ball/freeza/mascara-freeza-116922.webp",
    notes:
      "Confirmado visualmente como mascara/cabeca do Freeza; nome e tag devem indicar Mascara.",
    tags: ["anime", "Dragon Ball", "Freeza", "Mascara"],
  },
  {
    message_id: "117192",
    public_name_pt_br: "Scorpion",
    original_name: "scorpion mortal kombat",
    aliases: [],
    final_category: "games",
    source_type: "game",
    source_category: "games",
    source_franchise: "Mortal Kombat",
    source_folder: "scorpion",
    taxonomy_group: "mortal-kombat",
    taxonomy_slug: "scorpion",
    source_title: "Mortal Kombat",
    display_relpath:
      "display/games/mortal-kombat/scorpion/scorpion-statue-117192.webp",
    thumb_relpath:
      "thumb/games/mortal-kombat/scorpion/scorpion-statue-117192.webp",
    notes:
      "Confirmado visualmente como Scorpion de Mortal Kombat; nao e Goku/Dragon Ball.",
    tags: ["games", "Mortal Kombat", "Scorpion"],
  },
  {
    message_id: "110793",
    public_name_pt_br: "Gohan",
    original_name: "son gohan",
    aliases: ["Son Gohan"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "gohan",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "gohan",
    source_title: "Dragon Ball",
    display_relpath:
      "display/anime/dragon-ball/gohan/gohan-dragon-ball-base-110793.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/gohan/gohan-dragon-ball-base-110793.webp",
    notes:
      "Confirmado visualmente pela propria imagem como Son Gohan; nao e Goku.",
    tags: ["anime", "Dragon Ball", "Gohan", "Son Gohan"],
  },
  {
    message_id: "102841",
    public_name_pt_br: "Barco Viking",
    original_name: "viking longship",
    aliases: ["Viking Longship"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Viking",
    source_folder: "barco-viking",
    taxonomy_group: "objetos",
    taxonomy_slug: "barco-viking",
    source_title: "Viking",
    display_relpath:
      "display/fora-catalogo/objetos/viking/barco-viking-102841.webp",
    thumb_relpath: "thumb/fora-catalogo/objetos/viking/barco-viking-102841.webp",
    notes:
      "Confirmado visualmente como blueprint/modelo de Viking Longship; nao e Dragon Ball nem figura/personagem do catalogo publico.",
    tags: ["fora catalogo", "Viking", "Barco Viking", "Objeto"],
  },
  {
    message_id: "105430",
    public_name_pt_br: "Rei Galactico",
    original_name: "galactic king",
    aliases: ["Galactic King"],
    final_category: "anime",
    source_type: "anime",
    source_category: "anime",
    source_franchise: "Dragon Ball",
    source_folder: "rei-galactico",
    taxonomy_group: "dragon-ball",
    taxonomy_slug: "rei-galactico",
    source_title: "Dragon Ball",
    display_relpath:
      "display/anime/dragon-ball/rei-galactico/rei-galactico-105430.webp",
    thumb_relpath:
      "thumb/anime/dragon-ball/rei-galactico/rei-galactico-105430.webp",
    notes:
      "Identificado visualmente como Rei Galactico/Galactic King, personagem de Dragon Ball; nao e Goku Black.",
    tags: ["anime", "Dragon Ball", "Rei Galactico", "Galactic King"],
  },
  {
    message_id: "106067",
    public_name_pt_br: "Busto Dracula",
    original_name: "dracula bust",
    aliases: ["Dracula"],
    final_category: "filmes-series",
    source_type: "movie",
    source_category: "filmes-series",
    source_franchise: "Dracula",
    source_folder: "dracula",
    taxonomy_group: "terror",
    taxonomy_slug: "dracula",
    source_title: "Dracula",
    display_relpath:
      "display/filmes-series/terror/dracula/busto-dracula-wicked-1-106067.webp",
    thumb_relpath:
      "thumb/filmes-series/terror/dracula/busto-dracula-wicked-1-106067.webp",
    notes: "Confirmado visualmente como busto do Dracula; nao e Fera/X-Men.",
    tags: ["filmes-series", "Terror", "Dracula", "Busto"],
  },
  {
    message_id: "185449",
    public_name_pt_br: "Busto Magneto",
    original_name: "magneto bust",
    aliases: ["Magneto"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "X Men",
    source_folder: "magneto",
    taxonomy_group: "viloes",
    taxonomy_slug: "magneto",
    source_title: "X Men",
    display_relpath:
      "display/marvel/viloes/magneto/magneto-bust-tanuki-1-185449.webp",
    thumb_relpath:
      "thumb/marvel/viloes/magneto/magneto-bust-tanuki-1-185449.webp",
    notes:
      "Confirmado visualmente como busto do Magneto; nao e Homem de Ferro; manter em Marvel/viloes, nao em objetos.",
    tags: ["marvel", "X Men", "Magneto", "Busto", "Viloes"],
  },
  {
    message_id: "185407",
    public_name_pt_br: "Lady Loki",
    original_name: "lady loki",
    aliases: ["Loki"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Thor",
    source_folder: "loki",
    taxonomy_group: "anti-herois",
    taxonomy_slug: "loki",
    source_title: "Thor",
    display_relpath:
      "display/marvel/anti-herois/loki/lady-loki-ox3d-back-view-1-185407.webp",
    thumb_relpath:
      "thumb/marvel/anti-herois/loki/lady-loki-ox3d-back-view-1-185407.webp",
    notes: "Texto da propria imagem indica Lady Loki; nao e Groot.",
    tags: ["marvel", "Thor", "Loki", "Lady Loki", "Anti-herois"],
  },
  {
    message_id: "107815",
    public_name_pt_br: "Poster Morbius",
    original_name: "morbius poster",
    aliases: ["Morbius"],
    final_category: "fora catalogo",
    source_type: "non_catalog",
    source_category: "fora catalogo",
    source_franchise: "Morbius",
    source_folder: "morbius",
    taxonomy_group: "posteres",
    taxonomy_slug: "poster-morbius",
    source_title: "Morbius",
    display_relpath:
      "display/fora-catalogo/posteres/morbius/poster-morbius-card-preto-branco-107815.webp",
    thumb_relpath:
      "thumb/fora-catalogo/posteres/morbius/poster-morbius-card-preto-branco-107815.webp",
    notes:
      "Confirmado visualmente como poster/card promocional do Morbius; nao e figura, busto, estatua ou personagem 3D para o catalogo do site.",
    tags: ["fora catalogo", "Morbius", "Poster", "Card"],
  },
  {
    message_id: "104816",
    public_name_pt_br: "Busto Mulher-Aranha",
    original_name: "spider woman bust",
    aliases: ["Mulher-Aranha", "Spider-Woman"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "mulher-aranha",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-aranha",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-close-104816.webp",
    thumb_relpath:
      "thumb/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-close-104816.webp",
    notes:
      "Confirmado visualmente como busto da Mulher-Aranha; nome e tag precisam refletir busto.",
    tags: ["marvel", "Homem-Aranha", "Mulher-Aranha", "Busto", "Herois"],
  },
  {
    message_id: "104817",
    public_name_pt_br: "Busto Mulher-Aranha",
    original_name: "spider woman bust",
    aliases: ["Mulher-Aranha", "Spider-Woman"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "mulher-aranha",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-aranha",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-variant-104817.webp",
    thumb_relpath:
      "thumb/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-variant-104817.webp",
    notes:
      "Confirmado visualmente como busto da Mulher-Aranha; nome e tag precisam refletir busto.",
    tags: ["marvel", "Homem-Aranha", "Mulher-Aranha", "Busto", "Herois"],
  },
  {
    message_id: "104818",
    public_name_pt_br: "Busto Mulher-Aranha",
    original_name: "spider woman bust",
    aliases: ["Mulher-Aranha", "Spider-Woman"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "mulher-aranha",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-aranha",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-costas-104818.webp",
    thumb_relpath:
      "thumb/marvel/herois/mulher-aranha/busto-mulher-aranha-wicked-costas-104818.webp",
    notes:
      "Confirmado visualmente como busto da Mulher-Aranha; nome e tag precisam refletir busto.",
    tags: ["marvel", "Homem-Aranha", "Mulher-Aranha", "Busto", "Herois"],
  },
  {
    message_id: "105037",
    public_name_pt_br: "Busto Wolverine Azul",
    original_name: "wolverine bust",
    aliases: ["Wolverine"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "X Men",
    source_folder: "wolverine",
    taxonomy_group: "herois",
    taxonomy_slug: "wolverine",
    source_title: "X Men",
    display_relpath:
      "display/marvel/herois/wolverine/busto-wolverine-azul-amarelo-105037.webp",
    thumb_relpath:
      "thumb/marvel/herois/wolverine/busto-wolverine-azul-amarelo-105037.webp",
    notes:
      "Confirmado visualmente como busto do Wolverine; nome e tag precisam refletir busto.",
    tags: [
      "marvel",
      "X Men",
      "Wolverine",
      "Busto",
      "Herois",
      "Busto Wolverine Azul",
    ],
  },
  {
    message_id: "108529",
    public_name_pt_br: "Busto Wolverine Amarelo",
    original_name: "wolverine bust",
    aliases: ["Wolverine"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "X Men",
    source_folder: "wolverine",
    taxonomy_group: "herois",
    taxonomy_slug: "wolverine",
    source_title: "X Men",
    display_relpath:
      "display/marvel/herois/wolverine/busto-wolverine-amarelo-108529.webp",
    thumb_relpath:
      "thumb/marvel/herois/wolverine/busto-wolverine-amarelo-108529.webp",
    notes:
      "Confirmado visualmente como outro busto do Wolverine; tirar de objetos e manter em Marvel/herois.",
    tags: [
      "marvel",
      "X Men",
      "Wolverine",
      "Busto",
      "Herois",
      "Busto Wolverine Amarelo",
    ],
  },
  {
    message_id: "105774",
    public_name_pt_br: "Busto Batman",
    original_name: "batman bust",
    aliases: ["Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath: "display/dc/herois/batman/busto-batman-zzz-105774.webp",
    thumb_relpath: "thumb/dc/herois/batman/busto-batman-zzz-105774.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: ["dc", "Batman", "Busto", "Herois"],
  },
  {
    message_id: "107019",
    public_name_pt_br: "Busto Venom",
    original_name: "venom bust",
    aliases: ["Venom"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "venom",
    taxonomy_group: "viloes",
    taxonomy_slug: "venom",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/viloes/viloes-homem-aranha/venom/busto-venom-preto-dentes-107019.webp",
    thumb_relpath:
      "thumb/marvel/viloes/viloes-homem-aranha/venom/busto-venom-preto-dentes-107019.webp",
    notes:
      "Confirmado visualmente como busto/cabeca do Venom; nome e tag precisam refletir busto.",
    tags: ["marvel", "Homem-Aranha", "Venom", "Busto", "Viloes"],
  },
  {
    message_id: "107167",
    public_name_pt_br: "Busto Mulher-Hulk",
    original_name: "she hulk bust",
    aliases: ["Mulher-Hulk", "She-Hulk"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Hulk",
    source_folder: "mulher-hulk",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-hulk",
    source_title: "Hulk",
    display_relpath:
      "display/marvel/herois/mulher-hulk/busto-mulher-hulk-pose-flex-107167.webp",
    thumb_relpath:
      "thumb/marvel/herois/mulher-hulk/busto-mulher-hulk-pose-flex-107167.webp",
    notes:
      "Confirmado visualmente como busto da Mulher-Hulk; nao catalogar apenas como Hulk.",
    tags: ["marvel", "Hulk", "Mulher-Hulk", "She-Hulk", "Busto", "Herois"],
  },
  {
    message_id: "107168",
    public_name_pt_br: "Busto Mulher-Hulk",
    original_name: "she hulk bust",
    aliases: ["Mulher-Hulk", "She-Hulk"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Hulk",
    source_folder: "mulher-hulk",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-hulk",
    source_title: "Hulk",
    display_relpath:
      "display/marvel/herois/mulher-hulk/busto-mulher-hulk-variante-107168.webp",
    thumb_relpath:
      "thumb/marvel/herois/mulher-hulk/busto-mulher-hulk-variante-107168.webp",
    notes:
      "Confirmado visualmente como busto da Mulher-Hulk; nao catalogar apenas como Hulk.",
    tags: ["marvel", "Hulk", "Mulher-Hulk", "She-Hulk", "Busto", "Herois"],
  },
  {
    message_id: "107368",
    public_name_pt_br: "Busto Duende Verde",
    original_name: "green goblin bust",
    aliases: ["Duende Verde", "Green Goblin"],
    final_category: "marvel",
    source_type: "comic",
    source_category: "marvel",
    source_franchise: "Homem-Aranha",
    source_folder: "duende-verde",
    taxonomy_group: "viloes",
    taxonomy_slug: "duende-verde",
    source_title: "Homem-Aranha",
    display_relpath:
      "display/marvel/viloes/viloes-homem-aranha/duende-verde/busto-duende-verde-capa-roxa-107368.webp",
    thumb_relpath:
      "thumb/marvel/viloes/viloes-homem-aranha/duende-verde/busto-duende-verde-capa-roxa-107368.webp",
    notes:
      "Confirmado visualmente como busto do Duende Verde; nome e tag precisam refletir busto.",
    tags: [
      "marvel",
      "Homem-Aranha",
      "Duende Verde",
      "Green Goblin",
      "Busto",
      "Viloes",
    ],
  },
  {
    message_id: "107629",
    public_name_pt_br: "Busto Batman Frank Miller",
    original_name: "batman bust",
    aliases: ["Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-frank-miller-style-107629.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-frank-miller-style-107629.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: ["dc", "Batman", "Frank Miller", "Busto", "Herois"],
  },
  {
    message_id: "108357",
    public_name_pt_br: "Busto Batman Cowl",
    original_name: "batman cowl bust",
    aliases: ["Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-cowl-opcoes-108357.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-cowl-opcoes-108357.webp",
    notes:
      "Confirmado visualmente como busto/cowl do Batman; nome e tag precisam refletir busto.",
    tags: ["dc", "Batman", "Cowl", "Busto", "Herois"],
  },
  {
    message_id: "108490",
    public_name_pt_br: "Busto Batman The Batman",
    original_name: "the batman bust",
    aliases: ["Batman", "The Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-the-batman-torso-close-108490.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-the-batman-torso-close-108490.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: [
      "dc",
      "Batman",
      "The Batman",
      "Busto",
      "Herois",
      "Busto Batman The Batman",
    ],
  },
  {
    message_id: "108498",
    public_name_pt_br: "Busto Batman The Batman",
    original_name: "the batman bust",
    aliases: ["Batman", "The Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-the-batman-tan-frente-108498.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-the-batman-tan-frente-108498.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: [
      "dc",
      "Batman",
      "The Batman",
      "Busto",
      "Herois",
      "Busto Batman The Batman",
    ],
  },
  {
    message_id: "108503",
    public_name_pt_br: "Busto Batman The Batman",
    original_name: "the batman bust",
    aliases: ["Batman", "The Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-the-batman-frente-108503.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-the-batman-frente-108503.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: [
      "dc",
      "Batman",
      "The Batman",
      "Busto",
      "Herois",
      "Busto Batman The Batman",
    ],
  },
  {
    message_id: "108504",
    public_name_pt_br: "Busto Batman The Batman",
    original_name: "the batman bust",
    aliases: ["Batman", "The Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-the-batman-capa-108504.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-the-batman-capa-108504.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: [
      "dc",
      "Batman",
      "The Batman",
      "Busto",
      "Herois",
      "Busto Batman The Batman",
    ],
  },
  {
    message_id: "108505",
    public_name_pt_br: "Busto Batman The Batman",
    original_name: "the batman bust",
    aliases: ["Batman", "The Batman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Batman",
    source_folder: "batman",
    taxonomy_group: "herois",
    taxonomy_slug: "batman",
    source_title: "Batman",
    display_relpath:
      "display/dc/herois/batman/busto-batman-the-batman-variante-108505.webp",
    thumb_relpath:
      "thumb/dc/herois/batman/busto-batman-the-batman-variante-108505.webp",
    notes:
      "Confirmado visualmente como busto do Batman; nome e tag precisam refletir busto.",
    tags: [
      "dc",
      "Batman",
      "The Batman",
      "Busto",
      "Herois",
      "Busto Batman The Batman",
    ],
  },
  {
    message_id: "109538",
    public_name_pt_br: "Busto Mulher Maravilha",
    original_name: "wonder woman bust",
    aliases: ["Mulher Maravilha", "Wonder Woman"],
    final_category: "dc",
    source_type: "comic",
    source_category: "dc",
    source_franchise: "Mulher Maravilha",
    source_folder: "mulher-maravilha",
    taxonomy_group: "herois",
    taxonomy_slug: "mulher-maravilha",
    source_title: "Mulher Maravilha",
    display_relpath:
      "display/dc/herois/mulher-maravilha/busto-mulher-maravilha-colorida-retrato-109538.webp",
    thumb_relpath:
      "thumb/dc/herois/mulher-maravilha/busto-mulher-maravilha-colorida-retrato-109538.webp",
    notes:
      "Confirmado visualmente como busto da Mulher Maravilha; nome e tag precisam refletir busto.",
    tags: ["dc", "Mulher Maravilha", "Wonder Woman", "Busto", "Herois"],
  },
];

function visualReviewOverride({
  ids,
  name,
  originalName,
  aliases = [],
  category,
  source,
  sourceType = "comic",
  group,
  slug,
  variantName = null,
  tags = [],
  notes,
  curationStatus = "taxonomy_applied",
  taxonomyAppliedReason,
}) {
  return ids.map((id) => ({
    message_id: String(id),
    public_name_pt_br: name,
    original_name: originalName || name,
    aliases,
    final_category: category,
    source_type: sourceType,
    source_category: category,
    source_franchise: source,
    source_folder: slug,
    taxonomy_group: group,
    taxonomy_slug: slug,
    source_title: source,
    variant_name: variantName,
    variant_type: variantName ? "variant" : "default",
    notes:
      notes ||
      "Confirmado visualmente na fila needs_visual_taxonomy_review atual; liberar para mock/importacao.",
    tags: [category, source, name, group, ...tags].filter(Boolean),
    curation_status: curationStatus,
    taxonomy_applied_reason:
      taxonomyAppliedReason ||
      "Correcao manual confirmada visualmente na fila atual; liberar somente item claramente identificado.",
  }));
}

OVERRIDES.push(
  ...[
    {
      ids: ["105832", "116565"],
      name: "Validar visualmente",
      originalName: "kid goku figure",
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "revisar",
      slug: "revisar-dragon-ball",
      tags: ["Revisar"],
      notes:
        "Bloqueado apos revisao visual: os itens nao estao seguros como Goku Crianca e nao devem permanecer no mock ate identificacao correta.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Bloqueado manualmente: identificacao visual incerta; nao publicar nem manter no mock como Goku Crianca.",
    },
    {
      ids: ["148420"],
      name: "Luna Snow",
      category: "marvel",
      source: "Marvel Rivals",
      sourceType: "game",
      group: "herois",
      slug: "luna-snow",
    },
    {
      ids: ["144746"],
      name: "Power Girl",
      category: "dc",
      source: "Superman",
      group: "herois",
      slug: "power-girl",
    },
    {
      ids: ["163766"],
      name: "Rescue",
      aliases: ["Resgate"],
      category: "marvel",
      source: "Homem de Ferro",
      group: "herois",
      slug: "rescue",
    },
    {
      ids: ["160548"],
      name: "Shocker",
      aliases: ["Herman Schultz"],
      category: "marvel",
      source: "Homem Aranha",
      group: "viloes",
      slug: "shocker",
      tags: ["Viloes Homem Aranha"],
    },
    {
      ids: ["104722"],
      name: "Gaviao Arqueiro",
      aliases: ["Hawkeye", "Clint Barton"],
      category: "marvel",
      source: "Vingadores",
      group: "herois",
      slug: "gaviao-arqueiro",
    },
    {
      ids: ["104734", "104736", "104737", "104738", "104739"],
      name: "Spider Gwen",
      aliases: ["Gwen Stacy", "Ghost-Spider"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "spider-gwen",
      variantName: "Diorama com teia",
    },
    {
      ids: ["104780", "104781", "104782", "104783"],
      name: "Angela",
      originalName: "angela",
      aliases: ["Angela"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "angela",
      variantName: "Diorama",
      notes:
        "Corrigido na auditoria visual com apoio de referencia externa: a figura feminina loira com capa verde, espada e escudo e Angela; nao Star-Lord.",
    },
    {
      ids: ["104807", "104808", "104809", "104810", "104811"],
      name: "Senhor das Estrelas",
      aliases: ["Star-Lord", "Peter Quill"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "senhor-das-estrelas",
      variantName: "LA Figures",
    },
    {
      ids: ["105075"],
      name: "Deadpool",
      category: "marvel",
      source: "Deadpool",
      group: "anti-herois",
      slug: "deadpool",
      variantName: "Armadura",
    },
    {
      ids: ["105480"],
      name: "Homem de Ferro",
      aliases: ["Iron Man"],
      category: "marvel",
      source: "Homem de Ferro",
      group: "herois",
      slug: "homem-de-ferro",
      variantName: "Armadura vermelha",
    },
    {
      ids: ["105666", "105667", "105668", "105669"],
      name: "Ciclope",
      aliases: ["Cyclops", "Scott Summers"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "ciclope",
      variantName: "Jim Lee",
    },
    {
      ids: ["106402"],
      name: "Lanterna Verde",
      aliases: ["Green Lantern"],
      category: "dc",
      source: "Lanterna Verde",
      group: "herois",
      slug: "lanterna-verde",
    },
    {
      ids: ["106913"],
      name: "Noturno",
      aliases: ["Nightcrawler", "Kurt Wagner"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "noturno",
    },
    {
      ids: ["106935"],
      name: "Maestro",
      aliases: ["Hulk"],
      category: "marvel",
      source: "Hulk",
      group: "viloes",
      slug: "maestro",
    },
    {
      ids: ["107041"],
      name: "Homem Aranha 2099",
      aliases: ["Spider-Man 2099", "Miguel O'Hara"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "homem-aranha-2099",
      variantName: "Frente e costas",
    },
    {
      ids: ["107358"],
      name: "Pantera Negra",
      aliases: ["Black Panther"],
      category: "marvel",
      source: "Pantera Negra",
      group: "herois",
      slug: "pantera-negra",
      variantName: "Base pedra",
    },
    {
      ids: ["107360"],
      name: "Hulk",
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "hulk",
      variantName: "Base pedra",
    },
    {
      ids: ["107363"],
      name: "Wolverine",
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "wolverine",
      variantName: "Base azul e amarelo",
    },
    {
      ids: ["107462"],
      name: "Coringa",
      aliases: ["Joker"],
      category: "dc",
      source: "Batman",
      group: "viloes",
      slug: "coringa",
      variantName: "TNT",
      tags: ["Viloes Batman"],
      notes:
        "Identidade correta como Coringa, mas a imagem e thumbnail de video/promocional. Manter bloqueado ate aparecer render limpo para capa.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Bloqueado por qualidade de capa: thumbnail de video/promocional, nao pronto para catalogo publico.",
    },
    {
      ids: ["107479"],
      name: "Venom",
      category: "marvel",
      source: "Homem Aranha",
      group: "viloes",
      slug: "venom",
      variantName: "Corpo inteiro",
      tags: ["Viloes Homem Aranha"],
    },
    {
      ids: ["107481"],
      name: "Coisa",
      aliases: ["The Thing"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "herois",
      slug: "coisa",
    },
    {
      ids: ["107754", "107755", "107756", "107757"],
      name: "Cacador de Marte",
      aliases: ["Martian Manhunter", "J'onn J'onzz"],
      category: "dc",
      source: "Liga da Justica",
      group: "herois",
      slug: "cacador-de-marte",
      variantName: "Capa azul",
    },
    {
      ids: ["107976"],
      name: "Superman",
      category: "dc",
      source: "Superman",
      group: "herois",
      slug: "superman",
      variantName: "Base agua",
    },
    {
      ids: ["108055"],
      name: "Duende Verde",
      aliases: ["Green Goblin"],
      category: "marvel",
      source: "Homem Aranha",
      group: "viloes",
      slug: "duende-verde",
      variantName: "Corpo inteiro",
      tags: ["Viloes Homem Aranha"],
    },
    {
      ids: ["108098"],
      name: "Busto Capuz Vermelho",
      aliases: ["Red Hood", "Jason Todd"],
      category: "dc",
      source: "Batman",
      group: "anti-herois",
      slug: "capuz-vermelho",
      tags: ["Busto"],
      notes:
        "Bloqueado na auditoria visual de DC: a imagem parece um busto com mascara/olhos de Homem-Aranha, nao Capuz Vermelho/Jason Todd. Nao liberar sem confirmacao externa.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Bloqueado por identificacao visual incerta: item estava como Capuz Vermelho/DC, mas a imagem nao corresponde com seguranca ao personagem.",
    },
    {
      ids: ["108106"],
      name: "Flash",
      category: "dc",
      source: "Flash",
      group: "herois",
      slug: "flash",
    },
    {
      ids: ["108401"],
      name: "Patriota de Ferro",
      originalName: "iron patriot mark 2",
      aliases: ["Iron Patriot"],
      category: "marvel",
      source: "Homem de Ferro",
      group: "herois",
      slug: "patriota-de-ferro",
      variantName: "Mark 2",
      display:
        "display/marvel/herois/patriota-de-ferro/patriota-de-ferro-mark-2-108401.webp",
      thumb:
        "thumb/marvel/herois/patriota-de-ferro/patriota-de-ferro-mark-2-108401.webp",
      tags: ["Iron Patriot", "Homem de Ferro"],
      notes:
        "Corrigido na auditoria visual: a propria imagem identifica o modelo como Iron Patriot Mark 2; a pasta original Captain America estava incorreta.",
    },
    {
      ids: ["108653"],
      name: "Thanos",
      category: "marvel",
      source: "Vingadores",
      group: "viloes",
      slug: "thanos",
      variantName: "Armadura roxa",
      tags: ["Viloes Vingadores"],
    },
    {
      ids: ["108884"],
      name: "Viuva Negra",
      aliases: ["Black Widow", "Natasha Romanoff"],
      category: "marvel",
      source: "Vingadores",
      group: "herois",
      slug: "viuva-negra",
      variantName: "Dupla tatica",
    },
    {
      ids: ["108983"],
      name: "Bane",
      category: "dc",
      source: "Batman",
      group: "viloes",
      slug: "bane",
      tags: ["Viloes Batman"],
    },
    {
      ids: ["109158"],
      name: "Venom",
      category: "marvel",
      source: "Homem Aranha",
      group: "viloes",
      slug: "venom",
      variantName: "Chibi",
      tags: ["Viloes Homem Aranha"],
    },
    {
      ids: ["109310"],
      name: "Capita Marvel",
      aliases: ["Captain Marvel", "Carol Danvers"],
      category: "marvel",
      source: "Capita Marvel",
      group: "herois",
      slug: "capita-marvel",
    },
    {
      ids: ["109336"],
      name: "Mulher-Hulk Vermelha",
      originalName: "red she hulk statue",
      aliases: ["Red She-Hulk", "Betty Ross"],
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "mulher-hulk-vermelha",
      tags: ["Red She-Hulk", "Betty Ross"],
      notes:
        "Corrigido apos revisao visual e confirmacao por referencia externa como Red She-Hulk; a pasta original Spider-Man 2099 estava incorreta.",
    },
    {
      ids: ["109532", "109533", "109534", "109535", "109536"],
      name: "Mulher Maravilha",
      aliases: ["Wonder Woman", "Diana Prince"],
      category: "dc",
      source: "Mulher Maravilha",
      group: "herois",
      slug: "mulher-maravilha",
      variantName: "Espada e escudo",
    },
    {
      ids: ["109541"],
      name: "Pecas Mulher Maravilha",
      originalName: "wonder woman parts",
      aliases: ["Wonder Woman"],
      category: "dc",
      source: "Mulher Maravilha",
      group: "objetos",
      slug: "pecas-mulher-maravilha",
      display:
        "display/dc/objetos/pecas-mulher-maravilha/pecas-mulher-maravilha-base-109541.webp",
      thumb:
        "thumb/dc/objetos/pecas-mulher-maravilha/pecas-mulher-maravilha-base-109541.webp",
      tags: ["Pecas", "Wonder Woman"],
      notes:
        "Revisao visual: prancha de pecas/partes da Mulher Maravilha, nao figura final para card publico.",
    },
    {
      ids: ["108161", "108162", "108163", "108164"],
      name: "Tempestade",
      aliases: ["Storm", "Ororo Munroe"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "tempestade",
      variantName: "Uniforme verde e amarelo",
    },
  ].flatMap(visualReviewOverride),
);

function directReviewOverride({
  id,
  name,
  originalName,
  aliases = [],
  category,
  source,
  sourceType = "comic",
  group,
  slug,
  variantName = null,
  tags = [],
  display,
  thumb,
  notes,
  curationStatus,
  taxonomyAppliedReason,
}) {
  return {
    ...visualReviewOverride({
      ids: [id],
      name,
      originalName,
      aliases,
      category,
      source,
      sourceType,
      group,
      slug,
      variantName,
      tags,
      notes,
      curationStatus,
      taxonomyAppliedReason,
    })[0],
    display_relpath: display,
    thumb_relpath: thumb,
  };
}

OVERRIDES.push(
  ...[
    {
      id: "109336",
      name: "Mulher-Hulk Vermelha",
      originalName: "red she hulk statue",
      aliases: ["Red She-Hulk", "Betty Ross"],
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "mulher-hulk-vermelha",
      display:
        "display/marvel/herois/mulher-hulk-vermelha/mulher-hulk-vermelha-red-she-hulk-109336.webp",
      thumb:
        "thumb/marvel/herois/mulher-hulk-vermelha/mulher-hulk-vermelha-red-she-hulk-109336.webp",
      notes:
        "Corrigido apos revisao visual e confirmacao por referencia externa como Red She-Hulk; a pasta original Spider-Man 2099 estava incorreta.",
      tags: ["Red She-Hulk", "Betty Ross"],
    },
    {
      id: "104780",
      name: "Angela",
      originalName: "angela",
      aliases: ["Angela"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "angela",
      variantName: "Diorama",
      display: "display/marvel/herois/angela/angela-diorama-104780.webp",
      thumb: "thumb/marvel/herois/angela/angela-diorama-104780.webp",
      notes:
        "Corrigido na auditoria visual com apoio de referencia externa: a figura feminina loira com capa verde, espada e escudo e Angela; nao Star-Lord.",
    },
    {
      id: "104781",
      name: "Angela",
      originalName: "angela",
      aliases: ["Angela"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "angela",
      variantName: "Diorama",
      display: "display/marvel/herois/angela/angela-diorama-104781.webp",
      thumb: "thumb/marvel/herois/angela/angela-diorama-104781.webp",
      notes:
        "Corrigido na auditoria visual com apoio de referencia externa: a figura feminina loira com capa verde, espada e escudo e Angela; nao Star-Lord.",
    },
    {
      id: "104782",
      name: "Angela",
      originalName: "angela",
      aliases: ["Angela"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "angela",
      variantName: "Diorama",
      display: "display/marvel/herois/angela/angela-diorama-104782.webp",
      thumb: "thumb/marvel/herois/angela/angela-diorama-104782.webp",
      notes:
        "Corrigido na auditoria visual com apoio de referencia externa: a figura feminina loira com capa verde, espada e escudo e Angela; nao Star-Lord.",
    },
    {
      id: "104783",
      name: "Angela",
      originalName: "angela",
      aliases: ["Angela"],
      category: "marvel",
      source: "Guardioes da Galaxia",
      group: "herois",
      slug: "angela",
      variantName: "Diorama",
      display: "display/marvel/herois/angela/angela-diorama-104783.webp",
      thumb: "thumb/marvel/herois/angela/angela-diorama-104783.webp",
      notes:
        "Corrigido na auditoria visual com apoio de referencia externa: a figura feminina loira com capa verde, espada e escudo e Angela; nao Star-Lord.",
    },
    {
      id: "108401",
      name: "Patriota de Ferro",
      originalName: "iron patriot mark 2",
      aliases: ["Iron Patriot"],
      category: "marvel",
      source: "Homem de Ferro",
      group: "herois",
      slug: "patriota-de-ferro",
      variantName: "Mark 2",
      display:
        "display/marvel/herois/patriota-de-ferro/patriota-de-ferro-mark-2-108401.webp",
      thumb:
        "thumb/marvel/herois/patriota-de-ferro/patriota-de-ferro-mark-2-108401.webp",
      tags: ["Iron Patriot", "Homem de Ferro"],
      notes:
        "Corrigido na auditoria visual: a propria imagem identifica o modelo como Iron Patriot Mark 2; a pasta original Captain America estava incorreta.",
    },
    {
      id: "109541",
      name: "Pecas Mulher Maravilha",
      originalName: "wonder woman parts",
      aliases: ["Wonder Woman"],
      category: "dc",
      source: "Mulher Maravilha",
      group: "objetos",
      slug: "pecas-mulher-maravilha",
      display:
        "display/dc/objetos/pecas-mulher-maravilha/pecas-mulher-maravilha-base-109541.webp",
      thumb:
        "thumb/dc/objetos/pecas-mulher-maravilha/pecas-mulher-maravilha-base-109541.webp",
      tags: ["Pecas", "Wonder Woman"],
      notes:
        "Revisao visual: prancha de pecas/partes da Mulher Maravilha, nao figura final para card publico.",
    },
    {
      id: "108130",
      name: "Spider-Punk",
      originalName: "spider-punk",
      aliases: ["Hobie Brown"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "spider-punk",
      variantName: "Figura e busto",
      display:
        "display/marvel/herois/spider-punk/spider-punk-figura-busto-108130.webp",
      thumb:
        "thumb/marvel/herois/spider-punk/spider-punk-figura-busto-108130.webp",
      tags: ["Spider-Punk", "Hobie Brown"],
      notes:
        "Corrigido na auditoria visual: traje com jaqueta, spikes e guitarra corresponde ao Spider-Punk/Hobie Brown, nao a um conjunto generico.",
    },
    {
      id: "108716",
      name: "Spider-Punk",
      originalName: "spider-punk",
      aliases: ["Hobie Brown"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "spider-punk",
      variantName: "Duplicado",
      display:
        "display/fora-catalogo/duplicados/marvel/spider-punk/spider-punk-duplicado-108716.webp",
      thumb:
        "thumb/fora-catalogo/duplicados/marvel/spider-punk/spider-punk-duplicado-108716.webp",
      tags: ["Spider-Punk", "Hobie Brown", "Duplicado"],
      notes:
        "Bloqueado na auditoria visual: display e thumb sao duplicados exatos do item 108130; manter fora do catalogo publico.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Duplicado exato do item 108130 detectado por hash de display/thumb; nao importar como card separado.",
    },
    {
      id: "104309",
      name: "Mulher Aranha",
      originalName: "spider woman",
      aliases: ["Spider-Woman", "Jessica Drew"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "mulher-aranha",
      variantName: "Base com semaforo",
      display:
        "display/marvel/herois/mulher-aranha/mulher-aranha-base-semaforo-104309.webp",
      thumb:
        "thumb/marvel/herois/mulher-aranha/mulher-aranha-base-semaforo-104309.webp",
      notes:
        "Terceira passada visual: arte identifica Spider-Woman/Mulher-Aranha; nao manter como Homem-Aranha generico.",
    },
    {
      id: "105010",
      name: "Elektra",
      originalName: "elektra",
      aliases: ["Elektra Natchios"],
      category: "marvel",
      source: "Demolidor",
      group: "anti-herois",
      slug: "elektra",
      variantName: "Traje vermelho",
      display:
        "display/marvel/anti-herois/elektra/elektra-traje-vermelho-sais-105010.webp",
      thumb:
        "thumb/marvel/anti-herois/elektra/elektra-traje-vermelho-sais-105010.webp",
      notes:
        "Terceira passada visual: personagem feminina vermelha com sais e Elektra, nao Fera/X-Men.",
    },
    {
      id: "105021",
      name: "Ulrich",
      originalName: "ulrich",
      aliases: ["Ulrich"],
      category: "outros",
      source: "Fantasia",
      sourceType: "other",
      group: "fantasia",
      slug: "ulrich",
      variantName: "The Walking Abyss",
      display:
        "display/outros/fantasia/ulrich-the-walking-abyss/ulrich-the-walking-abyss-realsteone-105021.webp",
      thumb:
        "thumb/outros/fantasia/ulrich-the-walking-abyss/ulrich-the-walking-abyss-realsteone-105021.webp",
      notes:
        "Terceira passada visual: imagem mostra Ulrich The Walking Abyss/Realsteone, personagem de fantasia; nao e capacete do Homem de Ferro.",
    },
    {
      id: "107625",
      name: "Pecas Batman",
      originalName: "batman armor parts",
      aliases: ["Batman"],
      category: "dc",
      source: "Batman",
      group: "objetos",
      slug: "pecas-batman",
      tags: ["Pecas"],
      display: "display/dc/objetos/pecas-batman/pecas-batman-armadura-107625.webp",
      thumb: "thumb/dc/objetos/pecas-batman/pecas-batman-armadura-107625.webp",
      notes:
        "Terceira passada visual: arquivo mostra pecas/partes de armadura do Batman; manter oculto como objeto, nao como heroi publico.",
    },
    {
      id: "108100",
      name: "Jessie",
      originalName: "jessie pokemon",
      aliases: ["Jessie Equipe Rocket", "Team Rocket"],
      category: "anime",
      source: "Pokemon",
      sourceType: "anime",
      group: "pokemon",
      slug: "jessie",
      variantName: "Equipe Rocket",
      display: "display/anime/pokemon/jessie/jessie-equipe-rocket-close-108100.webp",
      thumb: "thumb/anime/pokemon/jessie/jessie-equipe-rocket-close-108100.webp",
      notes:
        "Terceira passada visual: personagem e Jessie da Equipe Rocket/Pokemon, nao Harley Quinn.",
    },
    {
      id: "108510",
      name: "Doutor Manhattan",
      originalName: "doctor manhattan",
      aliases: ["Doctor Manhattan", "Jon Osterman"],
      category: "dc",
      source: "Watchmen",
      group: "anti-herois",
      slug: "doutor-manhattan",
      variantName: "Banner promocional",
      display:
        "display/dc/anti-herois/doutor-manhattan/doutor-manhattan-banner-promocional-108510.webp",
      thumb:
        "thumb/dc/anti-herois/doutor-manhattan/doutor-manhattan-banner-promocional-108510.webp",
      notes:
        "Terceira passada visual: identidade confirmada como Doutor Manhattan, mas a imagem e banner promocional com texto grande; bloquear ate surgir render limpo.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Bloqueado por qualidade de capa: banner promocional com texto grande, nao pronto para catalogo publico.",
    },
    {
      id: "106070",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/4",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-106070.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-106070.webp",
    },
    {
      id: "106146",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/4",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-banner-106146.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-banner-106146.webp",
    },
    {
      id: "106157",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/4",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-detalhe-106157.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-detalhe-106157.webp",
    },
    {
      id: "106158",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/4",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-costas-106158.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-costas-106158.webp",
    },
    {
      id: "106162",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/4",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-pose-106162.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-4-pose-106162.webp",
    },
    {
      id: "106150",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/6",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-106150.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-106150.webp",
    },
    {
      id: "106151",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/6",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-banner-106151.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-banner-106151.webp",
    },
    {
      id: "106152",
      name: "Dentes de Sabre",
      originalName: "sabretooth",
      aliases: ["Sabretooth"],
      category: "marvel",
      source: "X Men",
      group: "viloes",
      slug: "dentes-de-sabre",
      variantName: "Escala 1/6",
      display:
        "display/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-pose-106152.webp",
      thumb:
        "thumb/marvel/viloes/dentes-de-sabre/dentes-de-sabre-escala-1-6-pose-106152.webp",
    },
    {
      id: "104764",
      name: "Mulher Invisivel",
      originalName: "invisible woman",
      aliases: ["Sue Storm", "Susan Storm", "Invisible Woman"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "herois",
      slug: "mulher-invisivel",
      variantName: "Uniforme azul",
      display:
        "display/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-104764.webp",
      thumb:
        "thumb/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-104764.webp",
    },
    {
      id: "104765",
      name: "Mulher Invisivel",
      originalName: "invisible woman",
      aliases: ["Sue Storm", "Susan Storm", "Invisible Woman"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "herois",
      slug: "mulher-invisivel",
      variantName: "Uniforme azul",
      display:
        "display/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-frente-104765.webp",
      thumb:
        "thumb/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-frente-104765.webp",
    },
    {
      id: "104766",
      name: "Mulher Invisivel",
      originalName: "invisible woman",
      aliases: ["Sue Storm", "Susan Storm", "Invisible Woman"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "herois",
      slug: "mulher-invisivel",
      variantName: "Uniforme azul",
      display:
        "display/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-costas-104766.webp",
      thumb:
        "thumb/marvel/herois/mulher-invisivel/mulher-invisivel-uniforme-azul-costas-104766.webp",
    },
    {
      id: "104767",
      name: "Mulher Invisivel",
      originalName: "invisible woman",
      aliases: ["Sue Storm", "Susan Storm", "Invisible Woman"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "herois",
      slug: "mulher-invisivel",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/marvel/herois/mulher-invisivel/mulher-invisivel-nsfw-104767.webp",
      thumb:
        "thumb/marvel/herois/mulher-invisivel/mulher-invisivel-nsfw-104767.webp",
      notes:
        "Variacao adulta/NSFW da Mulher Invisivel identificada em revisao visual; manter no personagem correto, mas aplicar blur no site.",
    },
    {
      id: "105778",
      name: "Mulher Hulk",
      originalName: "she hulk",
      aliases: ["She Hulk", "Jennifer Walters"],
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "mulher-hulk",
      display:
        "display/marvel/herois/mulher-hulk/mulher-hulk-corpo-inteiro-105778.webp",
      thumb:
        "thumb/marvel/herois/mulher-hulk/mulher-hulk-corpo-inteiro-105778.webp",
    },
    {
      id: "107360",
      name: "Hulk",
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "hulk",
      variantName: "Base pedra",
      display: "display/marvel/herois/hulk/hulk-verde-base-pedra-107360.webp",
      thumb: "thumb/marvel/herois/hulk/hulk-verde-base-pedra-107360.webp",
      notes:
        "Terceira passada visual: Hulk e heroi Marvel; nao manter em anti-herois.",
    },
    {
      id: "108539",
      name: "Hulk",
      category: "marvel",
      source: "Hulk",
      group: "herois",
      slug: "hulk",
      variantName: "Base vermelha",
      display: "display/marvel/herois/hulk/hulk-verde-base-vermelha-108539.webp",
      thumb: "thumb/marvel/herois/hulk/hulk-verde-base-vermelha-108539.webp",
      notes:
        "Terceira passada visual: Hulk e heroi Marvel; nao manter em anti-herois.",
    },
    {
      id: "104668",
      name: "Batman Beyond",
      originalName: "batman beyond",
      aliases: ["Terry McGinnis"],
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batman-beyond",
      display:
        "display/dc/herois/batman-beyond/batman-beyond-red-black-104668.webp",
      thumb:
        "thumb/dc/herois/batman-beyond/batman-beyond-red-black-104668.webp",
      notes:
        "Confirmado visualmente como Batman Beyond/Terry McGinnis; nao e Homem-Aranha.",
    },
    {
      id: "107175",
      name: "Batgirl",
      originalName: "batgirl",
      aliases: ["Barbara Gordon"],
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batgirl",
      display: "display/dc/herois/batgirl/batgirl-base-roxa-107175.webp",
      thumb: "thumb/dc/herois/batgirl/batgirl-base-roxa-107175.webp",
      notes:
        "Confirmado visualmente como Batgirl; nao catalogar como Batman generico.",
    },
  ].map(directReviewOverride),
  ...[
    {
      ids: ["104630"],
      name: "Superman",
      category: "dc",
      source: "Superman",
      group: "herois",
      slug: "superman",
      variantName: "Base acao",
    },
    {
      ids: ["104718"],
      name: "Superman",
      category: "dc",
      source: "Superman",
      group: "herois",
      slug: "superman",
      variantName: "Capa vermelha",
    },
    {
      ids: ["105772"],
      name: "Batman",
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batman",
      variantName: "Diorama escuro",
    },
    {
      ids: ["105636", "105637", "105638", "105639", "105640"],
      name: "Power Girl",
      category: "dc",
      source: "Superman",
      group: "herois",
      slug: "power-girl",
      variantName: "NSFW",
      tags: ["nsfw"],
      notes:
        "Confirmado como Power Girl, mas variacao sensivel/adulta; deve aparecer apenas no fluxo NSFW com blur.",
    },
    {
      ids: ["106569", "106570", "106571", "106572"],
      name: "Batman",
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batman",
      variantName: "Azul e cinza",
    },
    {
      ids: ["106904"],
      name: "Elektra",
      category: "marvel",
      source: "Demolidor",
      group: "anti-herois",
      slug: "elektra",
    },
    {
      ids: ["107260"],
      name: "Viuva Negra",
      aliases: ["Black Widow", "Natasha Romanoff"],
      category: "marvel",
      source: "Vingadores",
      group: "herois",
      slug: "viuva-negra",
      variantName: "Traje branco",
    },
    {
      ids: ["107366"],
      name: "Wolverine",
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "wolverine",
      variantName: "Traje amarelo",
    },
    {
      ids: ["108489", "108496", "108497"],
      name: "Busto Batman The Batman",
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batman",
      tags: ["Busto", "The Batman"],
    },
    {
      ids: ["108541"],
      name: "Batman",
      category: "dc",
      source: "Batman",
      group: "herois",
      slug: "batman",
      variantName: "Estilizado azul e cinza",
    },
    {
      ids: ["104301", "104302", "104303", "104304"],
      name: "Fera",
      aliases: ["Beast", "Hank McCoy"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "fera",
      variantName: "Diorama fogo",
    },
    {
      ids: ["104822", "104823", "104824", "104825"],
      name: "Fera",
      aliases: ["Beast", "Hank McCoy"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "fera",
      variantName: "Leitor",
    },
    {
      ids: ["105008"],
      name: "Fera",
      aliases: ["Beast", "Hank McCoy"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "fera",
      variantName: "Agachado",
    },
    {
      ids: ["108130"],
      name: "Spider-Punk",
      originalName: "spider-punk",
      aliases: ["Hobie Brown"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "spider-punk",
      variantName: "Figura e busto",
      tags: ["Spider-Punk", "Hobie Brown"],
      notes:
        "Corrigido na auditoria visual: traje com jaqueta, spikes e guitarra corresponde ao Spider-Punk/Hobie Brown, nao a um conjunto generico.",
    },
    {
      ids: ["107275", "107276", "107277"],
      name: "Harley Quinn",
      aliases: ["Arlequina"],
      category: "dc",
      source: "Batman",
      group: "anti-herois",
      slug: "harley-quinn",
      variantName: "Tenista NSFW",
      tags: ["nsfw"],
      notes:
        "Confirmado visualmente como Harley Quinn; variacao adulta/reveladora para fluxo NSFW com blur.",
    },
    {
      ids: ["108395", "108397"],
      name: "Harley Quinn",
      aliases: ["Arlequina"],
      category: "dc",
      source: "Batman",
      group: "anti-herois",
      slug: "harley-quinn",
      variantName: "Boss Edition",
    },
  ].flatMap(visualReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      ids: ["172966", "172967", "172968", "172969"],
      name: "Acessorios Simbionte",
      category: "marvel",
      source: "Homem Aranha",
      group: "objetos",
      slug: "acessorios-simbionte",
      tags: ["Simbionte"],
      notes:
        "Confirmado visualmente como acessorios/partes de simbionte. Manter oculto do catalogo publico por ser objeto, mas liberar para importacao tecnica.",
    },
    {
      ids: ["104743"],
      name: "Carnificina",
      aliases: ["Carnage", "Cletus Kasady"],
      category: "marvel",
      source: "Homem Aranha",
      group: "viloes",
      slug: "carnificina",
      tags: ["Viloes Homem Aranha"],
      notes:
        "Confirmado visualmente como Carnificina/Carnage; poster/render de modelo, sem conflito de personagem.",
    },
    {
      ids: ["104815"],
      name: "Mulher Aranha",
      aliases: ["Spider-Woman", "Jessica Drew"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "mulher-aranha",
      notes:
        "Confirmado visualmente como Mulher-Aranha/Spider-Woman; nao manter como Homem-Aranha generico.",
    },
    {
      ids: ["105056"],
      name: "Capacete Homem de Ferro",
      aliases: ["Iron Man"],
      category: "marvel",
      source: "Homem de Ferro",
      group: "objetos",
      slug: "capacete-homem-de-ferro",
      tags: ["Mascara", "Capacete"],
      notes:
        "Confirmado visualmente como capacete do Homem de Ferro. Objeto oculto do catalogo publico, mas com taxonomia correta.",
    },
    {
      ids: ["108395", "108397"],
      name: "Harley Quinn",
      aliases: ["Arlequina"],
      category: "dc",
      source: "Batman",
      group: "anti-herois",
      slug: "harley-quinn",
      variantName: "Boss Edition NSFW",
      tags: ["nsfw"],
      notes:
        "Confirmado visualmente como Harley Quinn em variacao adulta/reveladora. Deve entrar no fluxo NSFW com blur, nao no catalogo normal.",
    },
  ].flatMap(visualReviewOverride),
  ...[
    {
      id: "104722",
      name: "Capitao America",
      originalName: "captain america action figure",
      aliases: ["Captain America", "Steve Rogers"],
      category: "marvel",
      source: "Capitao America",
      group: "herois",
      slug: "capitao-america",
      variantName: "Base com moto",
      display:
        "display/marvel/herois/capitao-america/capitao-america-base-moto-104722.webp",
      thumb:
        "thumb/marvel/herois/capitao-america/capitao-america-base-moto-104722.webp",
      notes:
        "Segunda passada visual: imagem mostra Capitao America com escudo, nao Gaviao Arqueiro.",
    },
    {
      id: "104807",
      name: "Bebop",
      originalName: "bebop tmnt",
      aliases: ["Bebop"],
      category: "desenhos-animacao",
      source: "Tartarugas Ninja",
      sourceType: "other",
      group: "tartarugas-ninja",
      slug: "bebop",
      variantName: "LA Figures",
      display:
        "display/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104807.webp",
      thumb:
        "thumb/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104807.webp",
      notes:
        "Segunda passada visual: personagem e Bebop de TMNT/Tartarugas Ninja, nao Senhor das Estrelas.",
    },
    {
      id: "104808",
      name: "Bebop",
      originalName: "bebop tmnt",
      aliases: ["Bebop"],
      category: "desenhos-animacao",
      source: "Tartarugas Ninja",
      sourceType: "other",
      group: "tartarugas-ninja",
      slug: "bebop",
      variantName: "LA Figures",
      display:
        "display/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104808.webp",
      thumb:
        "thumb/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104808.webp",
      notes:
        "Segunda passada visual: personagem e Bebop de TMNT/Tartarugas Ninja, nao Senhor das Estrelas.",
    },
    {
      id: "104809",
      name: "Bebop",
      originalName: "bebop tmnt",
      aliases: ["Bebop"],
      category: "desenhos-animacao",
      source: "Tartarugas Ninja",
      sourceType: "other",
      group: "tartarugas-ninja",
      slug: "bebop",
      variantName: "LA Figures",
      display:
        "display/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104809.webp",
      thumb:
        "thumb/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104809.webp",
      notes:
        "Segunda passada visual: personagem e Bebop de TMNT/Tartarugas Ninja, nao Senhor das Estrelas.",
    },
    {
      id: "104810",
      name: "Bebop",
      originalName: "bebop tmnt",
      aliases: ["Bebop"],
      category: "desenhos-animacao",
      source: "Tartarugas Ninja",
      sourceType: "other",
      group: "tartarugas-ninja",
      slug: "bebop",
      variantName: "LA Figures",
      display:
        "display/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104810.webp",
      thumb:
        "thumb/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104810.webp",
      notes:
        "Segunda passada visual: personagem e Bebop de TMNT/Tartarugas Ninja, nao Senhor das Estrelas.",
    },
    {
      id: "104811",
      name: "Bebop",
      originalName: "bebop tmnt",
      aliases: ["Bebop"],
      category: "desenhos-animacao",
      source: "Tartarugas Ninja",
      sourceType: "other",
      group: "tartarugas-ninja",
      slug: "bebop",
      variantName: "LA Figures",
      display:
        "display/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104811.webp",
      thumb:
        "thumb/desenhos-animacao/tartarugas-ninja/bebop/bebop-la-figures-104811.webp",
      notes:
        "Segunda passada visual: personagem e Bebop de TMNT/Tartarugas Ninja, nao Senhor das Estrelas.",
    },
    {
      id: "105013",
      name: "Capacete Galactus",
      originalName: "galactus helmet",
      aliases: ["Galactus"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "objetos",
      slug: "capacete-galactus",
      tags: ["Mascara", "Capacete"],
      display:
        "display/marvel/objetos/capacete-galactus/capacete-galactus-105013.webp",
      thumb:
        "thumb/marvel/objetos/capacete-galactus/capacete-galactus-105013.webp",
      notes:
        "Segunda passada visual: capacete/cabeca do Galactus, nao Homem de Ferro.",
    },
    {
      id: "105014",
      name: "Capacete Galactus",
      originalName: "galactus helmet",
      aliases: ["Galactus"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "objetos",
      slug: "capacete-galactus",
      tags: ["Mascara", "Capacete"],
      display:
        "display/marvel/objetos/capacete-galactus/capacete-galactus-lateral-105014.webp",
      thumb:
        "thumb/marvel/objetos/capacete-galactus/capacete-galactus-lateral-105014.webp",
      notes:
        "Segunda passada visual: capacete/cabeca do Galactus, nao Homem de Ferro.",
    },
    {
      id: "105015",
      name: "Capacete Galactus",
      originalName: "galactus helmet",
      aliases: ["Galactus"],
      category: "marvel",
      source: "Quarteto Fantastico",
      group: "objetos",
      slug: "capacete-galactus",
      tags: ["Mascara", "Capacete"],
      display:
        "display/marvel/objetos/capacete-galactus/capacete-galactus-perfil-105015.webp",
      thumb:
        "thumb/marvel/objetos/capacete-galactus/capacete-galactus-perfil-105015.webp",
      notes:
        "Segunda passada visual: capacete/cabeca do Galactus, nao Homem de Ferro.",
    },
    {
      id: "105249",
      name: "X-23",
      originalName: "x-23 laura kinney",
      aliases: ["Laura Kinney", "Wolverine"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "x-23",
      variantName: "Traje amarelo e preto",
      display:
        "display/marvel/herois/x-23/x-23-traje-amarelo-preto-105249.webp",
      thumb: "thumb/marvel/herois/x-23/x-23-traje-amarelo-preto-105249.webp",
      notes:
        "Segunda passada visual: figura feminina com garras e traje amarelo/preto; catalogar como X-23/Laura Kinney, nao Wolverine generico.",
    },
    {
      id: "105383",
      name: "Spider Gwen",
      originalName: "spider gwen guitar",
      aliases: ["Gwen Stacy", "Ghost-Spider"],
      category: "marvel",
      source: "Homem Aranha",
      group: "herois",
      slug: "spider-gwen",
      variantName: "Guitarra",
      display:
        "display/marvel/herois/spider-gwen/spider-gwen-guitarra-105383.webp",
      thumb: "thumb/marvel/herois/spider-gwen/spider-gwen-guitarra-105383.webp",
      notes:
        "Segunda passada visual: personagem e Spider-Gwen/Gwen Stacy com guitarra, nao Homem-Aranha generico.",
    },
    {
      id: "108340",
      name: "Mascara Exterminador",
      originalName: "deathstroke mask",
      aliases: ["Deathstroke", "Slade Wilson"],
      category: "dc",
      source: "Exterminador",
      group: "objetos",
      slug: "mascara-exterminador",
      tags: ["Mascara"],
      display:
        "display/dc/objetos/mascara-exterminador/mascara-exterminador-azul-laranja-108340.webp",
      thumb:
        "thumb/dc/objetos/mascara-exterminador/mascara-exterminador-azul-laranja-108340.webp",
      notes:
        "Confirmado visualmente como mascara do Exterminador/Deathstroke; objeto oculto do catalogo publico.",
    },
    {
      id: "108358",
      name: "Base Batman",
      originalName: "batman display base",
      aliases: ["Batman"],
      category: "dc",
      source: "Batman",
      group: "objetos",
      slug: "base-batman",
      tags: ["Base"],
      display: "display/dc/objetos/base-batman/base-batman-logo-108358.webp",
      thumb: "thumb/dc/objetos/base-batman/base-batman-logo-108358.webp",
      notes:
        "Confirmado visualmente como base/peca do Batman; objeto oculto do catalogo publico.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "119707",
      name: "Tanjiro Kamado",
      originalName: "tanjiro kamado water dragon",
      aliases: ["Tanjiro"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "tanjiro-kamado",
      variantName: "Dragao de agua",
      display:
        "display/anime/demon-slayer/tanjiro-kamado/tanjiro-kamado-dragao-de-agua-119707.webp",
      thumb:
        "thumb/anime/demon-slayer/tanjiro-kamado/tanjiro-kamado-dragao-de-agua-119707.webp",
      notes:
        "Passada visual One Piece: figura e Tanjiro Kamado de Demon Slayer, nao Aokiji/One Piece.",
    },
    {
      id: "119709",
      name: "Giyu Tomioka",
      originalName: "giyu tomioka black wing",
      aliases: ["Tomioka Giyuu", "Giyu"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "giyu-tomioka",
      variantName: "Black Wing",
      display:
        "display/anime/demon-slayer/giyu-tomioka/giyu-tomioka-black-wing-119709.webp",
      thumb:
        "thumb/anime/demon-slayer/giyu-tomioka/giyu-tomioka-black-wing-119709.webp",
      notes:
        "Passada visual One Piece: a propria imagem identifica Tomioka Giyuu/Giyu, de Demon Slayer; nao Aokiji/One Piece.",
    },
    {
      id: "119710",
      name: "Giyu Tomioka",
      originalName: "giyu tomioka black wing",
      aliases: ["Tomioka Giyuu", "Giyu"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "giyu-tomioka",
      variantName: "Black Wing card",
      display:
        "display/anime/demon-slayer/giyu-tomioka/giyu-tomioka-black-wing-card-119710.webp",
      thumb:
        "thumb/anime/demon-slayer/giyu-tomioka/giyu-tomioka-black-wing-card-119710.webp",
      notes:
        "Passada visual One Piece: collage do mesmo modelo Tomioka Giyuu/Giyu, de Demon Slayer; nao Aokiji/One Piece.",
    },
    {
      id: "172627",
      name: "Pecas Crocodile",
      originalName: "crocodile parts layout",
      aliases: ["Crocodile"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-crocodile",
      tags: ["One Piece", "Crocodile", "Pecas"],
      display:
        "display/fora-catalogo/pecas/one-piece/pecas-crocodile-172627.webp",
      thumb:
        "thumb/fora-catalogo/pecas/one-piece/pecas-crocodile-172627.webp",
      notes:
        "Passada visual One Piece: layout de pecas do modelo Crocodile, sem render limpa de produto.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas/partes, inadequado como item publico do catalogo.",
    },
    {
      id: "172632",
      name: "Pecas Crocodile",
      originalName: "crocodile parts layout",
      aliases: ["Crocodile"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-crocodile",
      tags: ["One Piece", "Crocodile", "Pecas"],
      display:
        "display/fora-catalogo/pecas/one-piece/pecas-crocodile-coloridas-172632.webp",
      thumb:
        "thumb/fora-catalogo/pecas/one-piece/pecas-crocodile-coloridas-172632.webp",
      notes:
        "Passada visual One Piece: prancha de pecas coloridas do Crocodile, nao imagem limpa de produto.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas/partes, inadequado como item publico do catalogo.",
    },
    {
      id: "178011",
      name: "Pecas Boa Hancock",
      originalName: "boa hancock demon diorama parts",
      aliases: ["Boa Hancock"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-boa-hancock",
      tags: ["One Piece", "Boa Hancock", "Pecas"],
      display:
        "display/fora-catalogo/pecas/one-piece/pecas-boa-hancock-demon-diorama-178011.webp",
      thumb:
        "thumb/fora-catalogo/pecas/one-piece/pecas-boa-hancock-demon-diorama-178011.webp",
      notes:
        "Passada visual One Piece: layout de pecas do diorama Boa Hancock, sem figura montada.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas/partes, inadequado como item publico do catalogo.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    "107945",
    "107946",
    "107947",
    "107948",
    "172846",
    "172851",
    "172852",
    "172853",
    "172854",
  ].map((id) => ({
    message_id: id,
    notes:
      "Passada visual One Piece: variacao adulta da Boa Hancock; manter personagem/pasta, mas aplicar blur apenas nesta variacao.",
    tags: [
      "anime",
      "One Piece",
      "Boa Hancock",
      "nsfw",
      "sensitive-blur",
    ],
    taxonomy_applied_reason:
      "Variacao visualmente adulta; catalogar como Boa Hancock com blur no site.",
  })),
);

OVERRIDES.push(
  ...[
    {
      id: "106073",
      name: "Wolverine",
      originalName: "wolverine logan claws",
      aliases: ["Logan"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "wolverine",
      variantName: "Sem uniforme",
      display:
        "display/marvel/herois/wolverine/wolverine-sem-uniforme-106073.webp",
      thumb:
        "thumb/marvel/herois/wolverine/wolverine-sem-uniforme-106073.webp",
      notes:
        "Passada visual One Piece: figura com garras, costeletas, dog tag e visual de Logan/Wolverine; nao e Monkey D. Luffy.",
    },
    {
      id: "106074",
      name: "Wolverine",
      originalName: "wolverine logan claws",
      aliases: ["Logan"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "wolverine",
      variantName: "Sem uniforme",
      display:
        "display/marvel/herois/wolverine/wolverine-sem-uniforme-2-106074.webp",
      thumb:
        "thumb/marvel/herois/wolverine/wolverine-sem-uniforme-2-106074.webp",
      notes:
        "Passada visual One Piece: segunda vista do mesmo Wolverine/Logan com garras; nao e Monkey D. Luffy.",
    },
    {
      id: "114780",
      name: "Card Luffy Chibi",
      originalName: "luffy chibi ready download card",
      aliases: ["Monkey D. Luffy", "Luffy"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "cards",
      slug: "card-luffy-chibi",
      tags: ["One Piece", "Luffy", "Card"],
      display:
        "display/fora-catalogo/cards/one-piece/card-luffy-chibi-ready-download-114780.webp",
      thumb:
        "thumb/fora-catalogo/cards/one-piece/card-luffy-chibi-ready-download-114780.webp",
      notes:
        "Passada visual One Piece: arte promocional 'Ready to download now', nao render limpa para galeria publica.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem promocional/card de divulgacao, inadequada como produto no catalogo publico.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "164979",
      name: "Personagem com chapeu de palha",
      originalName: "straw hat back view unidentified",
      aliases: ["One Piece"],
      category: "revisar",
      source: "identificar",
      sourceType: "anime",
      group: "anime-one-piece",
      slug: "personagem-chapeu-palha-costas",
      variantName: "Vista de costas",
      display:
        "display/revisar/anime/one-piece/personagem-chapeu-palha-costas/personagem-chapeu-palha-costas-164979.webp",
      thumb:
        "thumb/revisar/anime/one-piece/personagem-chapeu-palha-costas/personagem-chapeu-palha-costas-164979.webp",
      notes:
        "Passada visual One Piece: figura de costas com chapeu de palha; nao ha identificacao segura para manter como Monkey D. Luffy.",
      curationStatus: "needs_ptbr_name",
      taxonomyAppliedReason:
        "Identidade visual inconclusiva; remover do publico ate haver imagem frontal ou fonte confiavel.",
    },
    {
      id: "102934",
      name: "Freeza Dourado",
      originalName: "frieza ship diorama",
      aliases: ["Frieza", "Golden Frieza"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "freeza-dourado",
      variantName: "Diorama com nave",
      display:
        "display/anime/dragon-ball/freeza/freeza-diorama-com-nave-102934.webp",
      thumb:
        "thumb/anime/dragon-ball/freeza/freeza-diorama-com-nave-102934.webp",
      notes:
        "Revisao visual Dragon Ball: o diorama mostra Freeza em sua forma dourada com nave/base cenica; nome publico deve refletir a forma.",
    },
    {
      id: "117647",
      name: "Freeza",
      originalName: "freezer figure card",
      aliases: ["Frieza"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "freeza",
      variantName: "Na nave",
      display:
        "display/anime/dragon-ball/freeza/freezer-figure-card-117647.webp",
      thumb:
        "thumb/anime/dragon-ball/freeza/freezer-figure-card-117647.webp",
      notes:
        "Revisao visual Dragon Ball: a imagem nao e card promocional; e uma figura do Freeza em sua nave/capsula.",
    },
    {
      id: "166219",
      name: "Gohan",
      originalName: "gohan fiery base",
      aliases: ["Son Gohan"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gohan",
      variantName: "Chibi",
      display:
        "display/anime/dragon-ball/gohan/gohan-fiery-base-1-166219.webp",
      thumb:
        "thumb/anime/dragon-ball/gohan/gohan-fiery-base-1-166219.webp",
      notes:
        "Revisao visual Dragon Ball: a figura e uma versao chibi do Gohan Super Saiyajin em base de energia.",
    },
    {
      id: "108611",
      name: "Gohan",
      originalName: "gohan super saiyan base raio",
      aliases: ["Son Gohan"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gohan",
      variantName: "Super Saiyajin 2",
      display:
        "display/anime/dragon-ball/gohan/gohan-super-saiyan-base-raio-108611.webp",
      thumb:
        "thumb/anime/dragon-ball/gohan/gohan-super-saiyan-base-raio-108611.webp",
      notes:
        "Revisao visual Dragon Ball: a escultura mostra Gohan em Super Saiyajin 2 com raios de energia.",
    },
    {
      id: "102915",
      name: "Trunks",
      originalName: "trunks energy base",
      aliases: ["Future Trunks"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "trunks",
      variantName: "Base de energia",
      display:
        "display/anime/dragon-ball/trunks/trunks-energy-base-102915.webp",
      thumb:
        "thumb/anime/dragon-ball/trunks/trunks-energy-base-102915.webp",
      notes:
        "Revisao visual Dragon Ball: a figura mostra Trunks com espada e base de energia; variante deve refletir o produto.",
    },
    {
      id: "113314",
      name: "Painel Shenlong",
      originalName: "shenron dragon ball wall figure",
      aliases: ["Shenlong", "Shenron"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "painel-shenlong",
      variantName: "Painel",
      tags: ["Dragon Ball", "Shenlong", "Painel", "Criaturas"],
      display:
        "display/anime/dragon-ball/shenlong/shenron-dragon-ball-wall-figure-113314.webp",
      thumb:
        "thumb/anime/dragon-ball/shenlong/shenron-dragon-ball-wall-figure-113314.webp",
      notes:
        "Revisao visual Dragon Ball: a imagem mostra um painel/relevo de Shenlong para parede; nome publico deve refletir o formato do produto.",
    },
    {
      id: "170424",
      name: "Trafalgar Law",
      originalName: "trafalgar law female variant blue cape",
      aliases: ["Trafalgar D. Water Law", "Law"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "trafalgar-law",
      variantName: "Versao feminina capa azul",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/anime/one-piece/trafalgar-law/trafalgar-law-versao-feminina-capa-azul-170424.webp",
      thumb:
        "thumb/anime/one-piece/trafalgar-law/trafalgar-law-versao-feminina-capa-azul-170424.webp",
      notes:
        "Passada visual One Piece: chapeu, tatuagens e espada identificam Trafalgar Law; variacao adulta deve receber blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "114274",
      name: "Tempestade",
      originalName: "storm golden lightning statue",
      aliases: ["Storm", "Ororo Munroe"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "tempestade",
      variantName: "Energia dourada",
      display:
        "display/marvel/herois/tempestade/tempestade-energia-dourada-114274.webp",
      thumb:
        "thumb/marvel/herois/tempestade/tempestade-energia-dourada-114274.webp",
      notes:
        "Passada visual One Piece: figura com cabelo claro/roxo e raios, coerente com Tempestade/Storm; nao e Nami.",
    },
    {
      id: "107262",
      name: "Card Nami",
      originalName: "nami free download reference card",
      aliases: ["Nami"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "cards",
      slug: "card-nami",
      tags: ["One Piece", "Nami", "Card"],
      display:
        "display/fora-catalogo/cards/one-piece/card-nami-free-download-107262.webp",
      thumb:
        "thumb/fora-catalogo/cards/one-piece/card-nami-free-download-107262.webp",
      notes:
        "Passada visual One Piece: card/referencia com texto 'Free Download', nao render limpa de produto para galeria publica.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem promocional/card de download, inadequada como produto no catalogo publico.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "119987",
      name: "Naruto Uzumaki",
      originalName: "naruto uzumaki wind base",
      aliases: ["Naruto"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "naruto-uzumaki",
      variantName: "Base de vento",
      display:
        "display/anime/naruto/naruto-uzumaki/naruto-uzumaki-base-de-vento-119987.webp",
      thumb:
        "thumb/anime/naruto/naruto-uzumaki/naruto-uzumaki-base-de-vento-119987.webp",
      notes:
        "Passada visual One Piece: figura e Naruto Uzumaki, nao Monkey D. Luffy.",
    },
    {
      id: "173544",
      name: "Tifa Lockhart",
      originalName: "tifa lockhart motorcycle",
      aliases: ["Tifa"],
      category: "games",
      source: "Final Fantasy",
      sourceType: "game",
      group: "final-fantasy",
      slug: "tifa-lockhart",
      variantName: "Motocicleta",
      display:
        "display/games/final-fantasy/tifa-lockhart/tifa-lockhart-motocicleta-173544.webp",
      thumb:
        "thumb/games/final-fantasy/tifa-lockhart/tifa-lockhart-motocicleta-173544.webp",
      notes:
        "Passada visual One Piece: personagem com visual de Tifa Lockhart em motocicleta; nao e Nami.",
    },
    {
      id: "103936",
      name: "Revy",
      originalName: "revy black lagoon beach trio",
      aliases: ["Rebecca Lee"],
      category: "anime",
      source: "Black Lagoon",
      sourceType: "anime",
      group: "black-lagoon",
      slug: "revy",
      variantName: "Beach trio",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/anime/black-lagoon/revy/revy-black-lagoon-beach-trio-103936.webp",
      thumb:
        "thumb/anime/black-lagoon/revy/revy-black-lagoon-beach-trio-103936.webp",
      notes:
        "Passada visual One Piece: a propria imagem identifica Revy/Black Lagoon; variacao adulta deve receber blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "103938",
      name: "Garnet Til Alexandros XVII",
      originalName: "garnet til alexandros xvii final fantasy",
      aliases: ["Garnet", "Dagger"],
      category: "games",
      source: "Final Fantasy",
      sourceType: "game",
      group: "final-fantasy",
      slug: "garnet-til-alexandros",
      variantName: "Trio de variacoes",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/games/final-fantasy/garnet-til-alexandros/garnet-til-alexandros-trio-103938.webp",
      thumb:
        "thumb/games/final-fantasy/garnet-til-alexandros/garnet-til-alexandros-trio-103938.webp",
      notes:
        "Passada visual One Piece: a propria imagem identifica Garnet Til Alexandros XVII de Final Fantasy; nao e trio Nami/Robin/Vivi.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "103990",
      name: "Tatsumaki e Saitama",
      originalName: "tatsumaki saitama couple",
      aliases: ["Tatsumaki", "Saitama"],
      category: "anime",
      source: "One Punch Man",
      sourceType: "anime",
      group: "one-punch-man",
      slug: "tatsumaki-e-saitama",
      variantName: "Dupla",
      display:
        "display/anime/one-punch-man/tatsumaki-e-saitama/tatsumaki-e-saitama-dupla-103990.webp",
      thumb:
        "thumb/anime/one-punch-man/tatsumaki-e-saitama/tatsumaki-e-saitama-dupla-103990.webp",
      notes:
        "Passada visual One Piece: personagens sao Tatsumaki e Saitama de One Punch Man, nao Roronoa Zoro.",
    },
    {
      id: "103991",
      name: "Tatsumaki e Saitama",
      originalName: "tatsumaki saitama couple nsfw",
      aliases: ["Tatsumaki", "Saitama"],
      category: "anime",
      source: "One Punch Man",
      sourceType: "anime",
      group: "one-punch-man",
      slug: "tatsumaki-e-saitama",
      variantName: "Dupla NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/anime/one-punch-man/tatsumaki-e-saitama/tatsumaki-e-saitama-dupla-nsfw-103991.webp",
      thumb:
        "thumb/anime/one-punch-man/tatsumaki-e-saitama/tatsumaki-e-saitama-dupla-nsfw-103991.webp",
      notes:
        "Passada visual One Piece: personagens sao Tatsumaki e Saitama de One Punch Man; variacao adulta deve receber blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "177556",
      name: "Kuririn",
      originalName: "kuririn kienzan",
      aliases: ["Krillin"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "kuririn",
      variantName: "Kienzan",
      display:
        "display/anime/dragon-ball/kuririn/kuririn-kienzan-177556.webp",
      thumb: "thumb/anime/dragon-ball/kuririn/kuririn-kienzan-177556.webp",
      notes:
        "Passada visual One Punch Man: personagem e Kuririn/Krillin de Dragon Ball usando Kienzan; nao e Saitama.",
    },
    {
      id: "175480",
      name: "Kobeni",
      originalName: "kobeni nsfw",
      aliases: ["Kobeni Higashiyama"],
      category: "anime",
      source: "Chainsaw Man",
      sourceType: "anime",
      group: "chainsaw-man",
      slug: "kobeni",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display: "display/anime/chainsaw-man/kobeni/kobeni-nsfw-1-175480.webp",
      thumb: "thumb/anime/chainsaw-man/kobeni/kobeni-nsfw-1-175480.webp",
      notes:
        "Passada visual Chainsaw Man: variacao nua da Kobeni; manter no mesmo personagem, mas com blur no site.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "175481",
      name: "Kobeni",
      originalName: "kobeni nsfw",
      aliases: ["Kobeni Higashiyama"],
      category: "anime",
      source: "Chainsaw Man",
      sourceType: "anime",
      group: "chainsaw-man",
      slug: "kobeni",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display: "display/anime/chainsaw-man/kobeni/kobeni-nsfw-2-175481.webp",
      thumb: "thumb/anime/chainsaw-man/kobeni/kobeni-nsfw-2-175481.webp",
      notes:
        "Passada visual Chainsaw Man: variacao nua da Kobeni; manter no mesmo personagem, mas com blur no site.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "175482",
      name: "Kobeni",
      originalName: "kobeni nsfw",
      aliases: ["Kobeni Higashiyama"],
      category: "anime",
      source: "Chainsaw Man",
      sourceType: "anime",
      group: "chainsaw-man",
      slug: "kobeni",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display: "display/anime/chainsaw-man/kobeni/kobeni-nsfw-3-175482.webp",
      thumb: "thumb/anime/chainsaw-man/kobeni/kobeni-nsfw-3-175482.webp",
      notes:
        "Passada visual Chainsaw Man: variacao nua da Kobeni; manter no mesmo personagem, mas com blur no site.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "175483",
      name: "Kobeni",
      originalName: "kobeni nsfw",
      aliases: ["Kobeni Higashiyama"],
      category: "anime",
      source: "Chainsaw Man",
      sourceType: "anime",
      group: "chainsaw-man",
      slug: "kobeni",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display: "display/anime/chainsaw-man/kobeni/kobeni-nsfw-4-175483.webp",
      thumb: "thumb/anime/chainsaw-man/kobeni/kobeni-nsfw-4-175483.webp",
      notes:
        "Passada visual Chainsaw Man: variacao nua da Kobeni; manter no mesmo personagem, mas com blur no site.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "76468",
      name: "Card Dracule Mihawk",
      originalName: "dracule mihawk ready for print card",
      aliases: ["Dracule Mihawk", "Mihawk"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "cards",
      slug: "card-dracule-mihawk",
      tags: ["One Piece", "Mihawk", "Card"],
      display:
        "display/fora-catalogo/cards/one-piece/card-dracule-mihawk-ready-print-76468.webp",
      thumb:
        "thumb/fora-catalogo/cards/one-piece/card-dracule-mihawk-ready-print-76468.webp",
      notes:
        "Passada visual One Piece: card promocional 'Ready for 3D print', nao render limpa para galeria publica.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem promocional/card de divulgacao, inadequada como produto no catalogo publico.",
    },
    {
      id: "119138",
      name: "Crocodile",
      originalName: "crocodile one piece hook",
      aliases: ["Sir Crocodile"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "crocodile",
      variantName: "Manto e gancho",
      display:
        "display/anime/one-piece/crocodile/crocodile-manto-gancho-119138.webp",
      thumb:
        "thumb/anime/one-piece/crocodile/crocodile-manto-gancho-119138.webp",
      notes:
        "Passada visual One Piece: figura e Crocodile com gancho, nao Sanji.",
    },
    {
      id: "163866",
      name: "Yamato",
      originalName: "yamato desk pose",
      aliases: ["Yamato"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "yamato",
      variantName: "Mesa lateral",
      display: "display/anime/one-piece/yamato/yamato-mesa-lateral-163866.webp",
      thumb: "thumb/anime/one-piece/yamato/yamato-mesa-lateral-163866.webp",
      notes:
        "Passada visual One Piece: cabelo branco, chifres e roupa identificam Yamato; estava incorretamente em Sanji.",
    },
    {
      id: "108033",
      name: "Hikaru e Kaoru Hitachiin",
      originalName: "hikaru kaoru hitachiin duo back",
      aliases: ["Hikaru Hitachiin", "Kaoru Hitachiin"],
      category: "anime",
      source: "Ouran High School Host Club",
      sourceType: "anime",
      group: "ouran-high-school-host-club",
      slug: "hikaru-kaoru-hitachiin",
      variantName: "Dupla costas",
      display:
        "display/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-costas-108033.webp",
      thumb:
        "thumb/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-costas-108033.webp",
      notes:
        "Passada visual One Piece: dupla de uniforme lilas de Ouran High School Host Club; nao Sanji.",
    },
    {
      id: "108031",
      name: "Hikaru e Kaoru Hitachiin",
      originalName: "hikaru kaoru hitachiin duo front",
      aliases: ["Hikaru Hitachiin", "Kaoru Hitachiin"],
      category: "anime",
      source: "Ouran High School Host Club",
      sourceType: "anime",
      group: "ouran-high-school-host-club",
      slug: "hikaru-kaoru-hitachiin",
      variantName: "Dupla frente",
      display:
        "display/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-frente-108031.webp",
      thumb:
        "thumb/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-frente-108031.webp",
      notes:
        "Passada visual One Piece: dupla Hikaru/Kaoru de Ouran High School Host Club; nao Sanji.",
    },
    {
      id: "108032",
      name: "Hikaru e Kaoru Hitachiin",
      originalName: "hikaru kaoru hitachiin duo front",
      aliases: ["Hikaru Hitachiin", "Kaoru Hitachiin"],
      category: "anime",
      source: "Ouran High School Host Club",
      sourceType: "anime",
      group: "ouran-high-school-host-club",
      slug: "hikaru-kaoru-hitachiin",
      variantName: "Dupla frente 2",
      display:
        "display/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-frente-2-108032.webp",
      thumb:
        "thumb/anime/ouran-high-school-host-club/hikaru-kaoru-hitachiin/hikaru-kaoru-hitachiin-dupla-frente-2-108032.webp",
      notes:
        "Passada visual One Piece: dupla Hikaru/Kaoru de Ouran High School Host Club; nao Sanji.",
    },
    {
      id: "108029",
      name: "Tamaki Suoh",
      originalName: "tamaki suoh rose pose",
      aliases: ["Tamaki Suou"],
      category: "anime",
      source: "Ouran High School Host Club",
      sourceType: "anime",
      group: "ouran-high-school-host-club",
      slug: "tamaki-suoh",
      variantName: "Rosa",
      display:
        "display/anime/ouran-high-school-host-club/tamaki-suoh/tamaki-suoh-rosa-108029.webp",
      thumb:
        "thumb/anime/ouran-high-school-host-club/tamaki-suoh/tamaki-suoh-rosa-108029.webp",
      notes:
        "Passada visual One Piece: personagem loiro com uniforme lilas e rosa e Tamaki Suoh de Ouran High School Host Club; nao Sanji.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "136985",
      name: "Kisuke Urahara",
      originalName: "kisuke urahara attack",
      aliases: ["Urahara"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "kisuke-urahara",
      variantName: "Ataque",
      display:
        "display/anime/bleach/kisuke-urahara/kisuke-urahara-ataque-136985.webp",
      thumb:
        "thumb/anime/bleach/kisuke-urahara/kisuke-urahara-ataque-136985.webp",
      notes:
        "Passada visual One Piece: base com logo Bleach e personagem Kisuke Urahara; nao Roronoa Zoro.",
    },
    {
      id: "114741",
      name: "Polaris",
      originalName: "polaris magnetic energy",
      aliases: ["Lorna Dane"],
      category: "marvel",
      source: "X Men",
      group: "herois",
      slug: "polaris",
      variantName: "Energia magnetica",
      display:
        "display/marvel/herois/polaris/polaris-energia-magnetica-114741.webp",
      thumb:
        "thumb/marvel/herois/polaris/polaris-energia-magnetica-114741.webp",
      notes:
        "Passada visual One Piece: cabelo verde e energia magnetica batem com Polaris/Lorna Dane de X-Men; nao Roronoa Zoro.",
    },
    {
      id: "76466",
      name: "Kite",
      originalName: "kite scythe",
      aliases: ["Kaito"],
      category: "anime",
      source: "Hunter x Hunter",
      sourceType: "anime",
      group: "hunter-x-hunter",
      slug: "kite",
      variantName: "Foice",
      display:
        "display/anime/hunter-x-hunter/kite/kite-foice-76466.webp",
      thumb: "thumb/anime/hunter-x-hunter/kite/kite-foice-76466.webp",
      notes:
        "Passada visual One Piece: personagem de cabelo comprido com foice e boneco Crazy Slots e Kite de Hunter x Hunter; nao Roronoa Zoro.",
    },
    {
      id: "119140",
      name: "Shanks",
      originalName: "shanks red coat",
      aliases: ["Red-Haired Shanks"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "shanks",
      variantName: "Casaco vermelho",
      display: "display/anime/one-piece/shanks/shanks-casaco-vermelho-119140.webp",
      thumb: "thumb/anime/one-piece/shanks/shanks-casaco-vermelho-119140.webp",
      notes:
        "Passada visual One Piece: cabelo vermelho, espada e capa identificam Shanks; estava incorretamente em Sanji.",
    },
    {
      id: "101653",
      name: "Jill Valentine",
      originalName: "jill lewd statue series",
      aliases: ["Jill"],
      category: "games",
      source: "Resident Evil",
      sourceType: "game",
      group: "resident-evil",
      slug: "jill-valentine",
      variantName: "Lewd Statue Series",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/games/resident-evil/jill-valentine/jill-valentine-lewd-statue-series-101653.webp",
      thumb:
        "thumb/games/resident-evil/jill-valentine/jill-valentine-lewd-statue-series-101653.webp",
      notes:
        "Passada visual One Piece: a propria imagem identifica Jill/LSS 001; nao Sanji. Variacao adulta deve receber blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...["178602", "178603", "178604", "178605"].map((id) => ({
    message_id: id,
    notes:
      "Passada visual One Piece: variacao adulta de Yamato em kimono; manter personagem/pasta, mas aplicar blur nesta variacao.",
    tags: ["anime", "One Piece", "Yamato", "nsfw", "sensitive-blur"],
    taxonomy_applied_reason:
      "Variacao visualmente adulta; catalogar como Yamato com blur no site.",
  })),
);

OVERRIDES.push(
  ...[
    {
      id: "114373",
      name: "Kisame Hoshigaki",
      originalName: "kisame hoshigaki bust",
      aliases: ["Kisame"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "kisame",
      variantName: "Busto",
      tags: ["busto"],
      display:
        "display/anime/naruto/kisame/busto-kisame-hoshigaki-114373.webp",
      thumb: "thumb/anime/naruto/kisame/busto-kisame-hoshigaki-114373.webp",
      notes:
        "Passada visual Naruto: busto mostra Kisame/Samehada; estava incorretamente como Hashirama.",
    },
    {
      id: "100255",
      name: "Hashirama Senju",
      originalName: "hashirama senju red armor bust",
      aliases: ["Hashirama"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "hashirama",
      variantName: "Busto armadura vermelha",
      tags: ["busto"],
      display:
        "display/anime/naruto/hashirama/busto-hashirama-senju-armadura-vermelha-100255.webp",
      thumb:
        "thumb/anime/naruto/hashirama/busto-hashirama-senju-armadura-vermelha-100255.webp",
      notes:
        "Passada visual Naruto: busto de Hashirama Senju com armadura vermelha; nao e Itachi.",
    },
    {
      id: "100257",
      name: "Shisui Uchiha",
      originalName: "shisui uchiha bust side",
      aliases: ["Shisui"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "shisui",
      variantName: "Busto lateral",
      tags: ["busto"],
      display:
        "display/anime/naruto/shisui/busto-shisui-uchiha-lateral-100257.webp",
      thumb:
        "thumb/anime/naruto/shisui/busto-shisui-uchiha-lateral-100257.webp",
      notes:
        "Passada visual Naruto: busto com cabelo curto e emblema Uchiha bate com Shisui; nao Itachi.",
    },
    {
      id: "100258",
      name: "Shisui Uchiha",
      originalName: "shisui uchiha bust close",
      aliases: ["Shisui"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "shisui",
      variantName: "Busto close",
      tags: ["busto"],
      display:
        "display/anime/naruto/shisui/busto-shisui-uchiha-close-100258.webp",
      thumb:
        "thumb/anime/naruto/shisui/busto-shisui-uchiha-close-100258.webp",
      notes:
        "Passada visual Naruto: close do mesmo busto de Shisui Uchiha; nao Itachi.",
    },
    {
      id: "100259",
      name: "Shisui Uchiha",
      originalName: "shisui uchiha bust alternate",
      aliases: ["Shisui"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "shisui",
      variantName: "Busto alternativo",
      tags: ["busto"],
      display:
        "display/anime/naruto/shisui/busto-shisui-uchiha-alternativo-100259.webp",
      thumb:
        "thumb/anime/naruto/shisui/busto-shisui-uchiha-alternativo-100259.webp",
      notes:
        "Passada visual Naruto: variacao do mesmo busto de Shisui Uchiha; nao Itachi.",
    },
    {
      id: "99188",
      name: "Itachi Uchiha",
      originalName: "itachi uchiha red black bust",
      aliases: ["Itachi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "itachi-uchiha",
      variantName: "Busto Akatsuki",
      tags: ["busto"],
      display:
        "display/anime/naruto/itachi-uchiha/busto-itachi-uchiha-akatsuki-99188.webp",
      thumb:
        "thumb/anime/naruto/itachi-uchiha/busto-itachi-uchiha-akatsuki-99188.webp",
      notes:
        "Passada visual Naruto: consolidar busto de Itachi na pasta oficial itachi-uchiha.",
    },
    {
      id: "100035",
      name: "Sasuke Uchiha",
      originalName: "sasuke uchiha black hair bust",
      aliases: ["Sasuke"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "sasuke-uchiha",
      variantName: "Busto cabelo preto",
      tags: ["busto"],
      display:
        "display/anime/naruto/sasuke-uchiha/busto-sasuke-uchiha-cabelo-preto-100035.webp",
      thumb:
        "thumb/anime/naruto/sasuke-uchiha/busto-sasuke-uchiha-cabelo-preto-100035.webp",
      notes:
        "Passada visual Naruto: consolidar busto de Sasuke na pasta oficial sasuke-uchiha.",
    },
    {
      id: "109170",
      name: "Sasuke Uchiha",
      originalName: "sasuke uchiha figure",
      aliases: ["Sasuke"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "sasuke-uchiha",
      variantName: "Figura",
      display:
        "display/anime/naruto/sasuke-uchiha/sasuke-uchiha-figura-109170.webp",
      thumb: "thumb/anime/naruto/sasuke-uchiha/sasuke-uchiha-figura-109170.webp",
      notes:
        "Passada visual Naruto: consolidar Sasuke na pasta oficial sasuke-uchiha.",
    },
    {
      id: "98079",
      name: "Itachi Uchiha",
      originalName: "itachi plush",
      aliases: ["Itachi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "itachi-uchiha",
      variantName: "Plush",
      tags: ["plush"],
      display:
        "display/anime/naruto/itachi-uchiha/itachi-uchiha-plush-98079.webp",
      thumb: "thumb/anime/naruto/itachi-uchiha/itachi-uchiha-plush-98079.webp",
      notes:
        "Passada visual Naruto: plush e uma variacao do personagem, nao uma pasta principal separada.",
    },
    {
      id: "98065",
      name: "Naruto Uzumaki",
      originalName: "plukit naruto chibi",
      aliases: ["Naruto"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "naruto-uzumaki",
      variantName: "Chibi Plukit",
      tags: ["chibi", "plukit"],
      display:
        "display/anime/naruto/naruto-uzumaki/naruto-uzumaki-chibi-plukit-98065.webp",
      thumb:
        "thumb/anime/naruto/naruto-uzumaki/naruto-uzumaki-chibi-plukit-98065.webp",
      notes:
        "Passada visual Naruto: linha Plukit deve ficar como variacao dentro do personagem.",
    },
    {
      id: "98067",
      name: "Kakashi Hatake",
      originalName: "plukit kakashi chibi",
      aliases: ["Kakashi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "kakashi",
      variantName: "Chibi Plukit",
      tags: ["chibi", "plukit"],
      display:
        "display/anime/naruto/kakashi/kakashi-hatake-chibi-plukit-98067.webp",
      thumb: "thumb/anime/naruto/kakashi/kakashi-hatake-chibi-plukit-98067.webp",
      notes:
        "Passada visual Naruto: linha Plukit deve ficar como variacao dentro do personagem.",
    },
    {
      id: "98069",
      name: "Itachi Uchiha",
      originalName: "plukit itachi chibi",
      aliases: ["Itachi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "itachi-uchiha",
      variantName: "Chibi Plukit",
      tags: ["chibi", "plukit"],
      display:
        "display/anime/naruto/itachi-uchiha/itachi-uchiha-chibi-plukit-98069.webp",
      thumb:
        "thumb/anime/naruto/itachi-uchiha/itachi-uchiha-chibi-plukit-98069.webp",
      notes:
        "Passada visual Naruto: linha Plukit deve ficar como variacao dentro do personagem.",
    },
    {
      id: "98071",
      name: "Rock Lee",
      originalName: "plukit rock lee chibi",
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "rock-lee",
      variantName: "Chibi Plukit",
      tags: ["chibi", "plukit"],
      display:
        "display/anime/naruto/rock-lee/rock-lee-chibi-plukit-98071.webp",
      thumb: "thumb/anime/naruto/rock-lee/rock-lee-chibi-plukit-98071.webp",
      notes:
        "Passada visual Naruto: linha Plukit deve ficar como variacao dentro do personagem.",
    },
    {
      id: "98073",
      name: "Sakura Haruno",
      originalName: "plukit sakura chibi",
      aliases: ["Sakura"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "sakura-haruno",
      variantName: "Chibi Plukit",
      tags: ["chibi", "plukit"],
      display:
        "display/anime/naruto/sakura-haruno/sakura-haruno-chibi-plukit-98073.webp",
      thumb:
        "thumb/anime/naruto/sakura-haruno/sakura-haruno-chibi-plukit-98073.webp",
      notes:
        "Passada visual Naruto: linha Plukit deve ficar como variacao dentro do personagem.",
    },
    {
      id: "179244",
      name: "Pecas Naruto e Jiraiya",
      originalName: "naruto jiraiya parts layout",
      aliases: ["Naruto Uzumaki", "Jiraiya"],
      category: "fora catalogo",
      source: "Naruto",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-naruto-jiraiya",
      tags: ["Naruto", "Jiraiya", "Pecas"],
      display:
        "display/fora-catalogo/pecas/naruto/pecas-naruto-e-jiraiya-179244.webp",
      thumb:
        "thumb/fora-catalogo/pecas/naruto/pecas-naruto-e-jiraiya-179244.webp",
      notes:
        "Passada visual Naruto: layout de pecas sem figura montada; tirar do catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas/partes, inadequado como item publico do catalogo.",
    },
    {
      id: "115179",
      name: "Mascara Obito",
      originalName: "obito round mask",
      aliases: ["Obito", "Tobi"],
      category: "fora catalogo",
      source: "Naruto",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-obito",
      tags: ["Naruto", "Obito", "Mascara"],
      display:
        "display/fora-catalogo/objetos/naruto/mascara-obito-115179.webp",
      thumb: "thumb/fora-catalogo/objetos/naruto/mascara-obito-115179.webp",
      notes:
        "Passada visual Naruto: mascara isolada/objeto, nao figura de personagem para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "114739",
      name: "Suguru Geto",
      originalName: "suguru geto bust",
      aliases: ["Geto Suguru"],
      category: "anime",
      source: "Jujutsu Kaisen",
      sourceType: "anime",
      group: "jujutsu-kaisen",
      slug: "suguru-geto",
      variantName: "Busto",
      tags: ["busto"],
      display:
        "display/anime/jujutsu-kaisen/suguru-geto/busto-suguru-geto-114739.webp",
      thumb:
        "thumb/anime/jujutsu-kaisen/suguru-geto/busto-suguru-geto-114739.webp",
      notes:
        "Passada visual Naruto: imagem Kabuki Figures identifica Suguru Geto de Jujutsu Kaisen; nao Orochimaru.",
    },
    {
      id: "76483",
      name: "Piccolo",
      originalName: "piccolo green energy diorama",
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "piccolo",
      variantName: "Diorama energia verde",
      display:
        "display/anime/dragon-ball/piccolo/piccolo-diorama-energia-verde-76483.webp",
      thumb:
        "thumb/anime/dragon-ball/piccolo/piccolo-diorama-energia-verde-76483.webp",
      notes:
        "Passada visual Naruto: imagem mostra Piccolo/Dragon Ball, nao Rock Lee.",
    },
    {
      id: "186117",
      name: "Shuten-Douji",
      originalName: "shuten douji festival portrait",
      aliases: ["Shuten Douji"],
      category: "games",
      source: "Fate Grand Order",
      sourceType: "game",
      group: "fate-grand-order",
      slug: "shuten-douji",
      variantName: "Festival Portrait",
      display:
        "display/games/fate-grand-order/shuten-douji/shuten-douji-festival-portrait-186117.webp",
      thumb:
        "thumb/games/fate-grand-order/shuten-douji/shuten-douji-festival-portrait-186117.webp",
      notes:
        "Passada visual Naruto: figura de costas bate com Shuten-Douji de Fate/Grand Order; nao Naruto Uzumaki.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    "114753",
    "176987",
    "176988",
    "176989",
    "176990",
    "176992",
    "176993",
    "176994",
    "108367",
    "108371",
    "180405",
    "180406",
    "180407",
    "180408",
    "180409",
    "180410",
    "180411",
  ].map((id) => ({
    message_id: id,
    notes:
      "Passada visual Naruto: variacao sensivel/adulta identificada; manter personagem correto, mas aplicar blur no site.",
    tags: ["anime", "Naruto", "nsfw", "sensitive-blur"],
    taxonomy_applied_reason:
      "Variacao visualmente adulta/sensivel; catalogar como variacao com blur no site, sem virar capa normal.",
  })),
);

OVERRIDES.push(
  ...[
    {
      id: "105545",
      name: "Mascara Cell",
      originalName: "cell helmet mask",
      aliases: ["Cell"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-cell",
      tags: ["Cell", "Mascara"],
      display:
        "display/fora-catalogo/objetos/dragon-ball/mascara-cell-105545.webp",
      thumb: "thumb/fora-catalogo/objetos/dragon-ball/mascara-cell-105545.webp",
      notes:
        "Passada visual Dragon Ball: mascara/cabeca isolada, nao figura ou estatueta para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "116916",
      name: "Mascara Cell",
      originalName: "cell mask",
      aliases: ["Cell"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-cell",
      tags: ["Cell", "Mascara"],
      display:
        "display/fora-catalogo/objetos/dragon-ball/mascara-cell-alternativa-116916.webp",
      thumb:
        "thumb/fora-catalogo/objetos/dragon-ball/mascara-cell-alternativa-116916.webp",
      notes:
        "Passada visual Dragon Ball: mascara do Cell isolada, nao figura ou estatueta para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "116922",
      name: "Mascara Freeza",
      originalName: "freeza mask",
      aliases: ["Frieza"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-freeza",
      tags: ["Freeza", "Mascara"],
      display:
        "display/fora-catalogo/objetos/dragon-ball/mascara-freeza-116922.webp",
      thumb:
        "thumb/fora-catalogo/objetos/dragon-ball/mascara-freeza-116922.webp",
      notes:
        "Passada visual Dragon Ball: mascara do Freeza isolada, nao figura ou estatueta para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "179240",
      name: "Pecas Goku Oozaru",
      originalName: "goku oozaru parts",
      aliases: ["Goku", "Oozaru"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-goku-oozaru",
      tags: ["Goku", "Oozaru", "Pecas"],
      display:
        "display/fora-catalogo/pecas/dragon-ball/pecas-goku-oozaru-179240.webp",
      thumb:
        "thumb/fora-catalogo/pecas/dragon-ball/pecas-goku-oozaru-179240.webp",
      notes:
        "Passada visual Dragon Ball: layout de pecas do Goku Oozaru sem figura montada; tirar do catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas/partes, inadequado como item publico do catalogo.",
    },
    {
      id: "172149",
      name: "Personagem Dragon Ball em revisao",
      originalName: "gohan casual unidentified",
      aliases: ["Dragon Ball"],
      category: "revisar",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "anime-dragon-ball",
      slug: "personagem-dragon-ball-duvidoso",
      variantName: "Gohan casual duvidoso",
      tags: ["Revisar"],
      display:
        "display/revisar/anime/dragon-ball/personagem-dragon-ball-duvidoso/personagem-dragon-ball-duvidoso-172149.webp",
      thumb:
        "thumb/revisar/anime/dragon-ball/personagem-dragon-ball-duvidoso/personagem-dragon-ball-duvidoso-172149.webp",
      notes:
        "Passada visual Dragon Ball: imagem nao bate com Gohan oficial e a identidade nao foi confirmada por fonte confiavel.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identidade visual inconclusiva; remover do publico ate haver fonte confiavel ou imagem frontal adequada.",
    },
    {
      id: "172805",
      name: "Busto Guldo",
      originalName: "guldo bust",
      aliases: ["Guldo"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "guldo",
      variantName: "Busto",
      tags: ["Busto"],
      display: "display/anime/dragon-ball/guldo/busto-guldo-172805.webp",
      thumb: "thumb/anime/dragon-ball/guldo/busto-guldo-172805.webp",
      notes:
        "Passada visual Dragon Ball: item e claramente busto do Guldo; nome e tag precisam refletir busto.",
    },
    {
      id: "105407",
      name: "Referencia King Kai",
      originalName: "king kai flat reference",
      aliases: ["King Kai", "Senhor Kaioh"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-king-kai",
      tags: ["King Kai", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-king-kai-105407.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-king-kai-105407.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "116914",
      name: "Mascara Majin Boo",
      originalName: "majin buu mask",
      aliases: ["Majin Buu", "Majin Boo"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-majin-boo",
      tags: ["Majin Boo", "Mascara"],
      display:
        "display/fora-catalogo/objetos/dragon-ball/mascara-majin-boo-116914.webp",
      thumb:
        "thumb/fora-catalogo/objetos/dragon-ball/mascara-majin-boo-116914.webp",
      notes:
        "Passada visual Dragon Ball: mascara do Majin Boo isolada, nao figura ou estatueta para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "119142",
      name: "Jeice",
      originalName: "jeice ginyu force",
      aliases: ["Jheese"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "jeice",
      variantName: "Forca Ginyu",
      tags: ["Ginyu"],
      display: "display/anime/dragon-ball/jeice/jeice-forca-ginyu-119142.webp",
      thumb: "thumb/anime/dragon-ball/jeice/jeice-forca-ginyu-119142.webp",
      notes:
        "Passada visual Dragon Ball: imagem e texto identificam Jeice da Forca Ginyu, nao Nappa.",
    },
    {
      id: "119144",
      name: "Burter",
      originalName: "burter ginyu force",
      aliases: ["Barta", "Butta"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "burter",
      variantName: "Forca Ginyu",
      tags: ["Ginyu"],
      display:
        "display/anime/dragon-ball/burter/burter-forca-ginyu-119144.webp",
      thumb: "thumb/anime/dragon-ball/burter/burter-forca-ginyu-119144.webp",
      notes:
        "Passada visual Dragon Ball: imagem e texto identificam Burter da Forca Ginyu, nao Nappa.",
    },
    {
      id: "119146",
      name: "Recoome",
      originalName: "recoome ginyu force",
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "recoome",
      variantName: "Forca Ginyu",
      tags: ["Ginyu"],
      display:
        "display/anime/dragon-ball/recoome/recoome-forca-ginyu-119146.webp",
      thumb: "thumb/anime/dragon-ball/recoome/recoome-forca-ginyu-119146.webp",
      notes:
        "Passada visual Dragon Ball: imagem e texto identificam Recoome da Forca Ginyu, nao Nappa.",
    },
    {
      id: "105405",
      name: "Referencia Pilaf",
      originalName: "pilaf flat reference",
      aliases: ["Pilaf"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-pilaf",
      tags: ["Pilaf", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-pilaf-105405.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-pilaf-105405.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia de Pilaf, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "105430",
      name: "Referencia Rei Galactico",
      originalName: "galactic king flat reference",
      aliases: ["Rei Galactico"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-rei-galactico",
      tags: ["Rei Galactico", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-rei-galactico-105430.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-rei-galactico-105430.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "105350",
      name: "Referencia Trunks",
      originalName: "trunks flat reference",
      aliases: ["Trunks"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-trunks",
      tags: ["Trunks", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-trunks-105350.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-trunks-105350.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia de Trunks, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "118859",
      name: "Mascara Vegeta",
      originalName: "vegeta mask",
      aliases: ["Vegeta"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "mascara-vegeta",
      tags: ["Vegeta", "Mascara"],
      display:
        "display/fora-catalogo/objetos/dragon-ball/mascara-vegeta-118859.webp",
      thumb:
        "thumb/fora-catalogo/objetos/dragon-ball/mascara-vegeta-118859.webp",
      notes:
        "Passada visual Dragon Ball: mascara/cabeca do Vegeta isolada, nao figura ou estatueta para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "105422",
      name: "Referencia Whis",
      originalName: "whis flat reference",
      aliases: ["Whis"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-whis",
      tags: ["Whis", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-whis-105422.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-whis-105422.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia de Whis, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "105426",
      name: "Referencia Whis",
      originalName: "whis flat reference variant",
      aliases: ["Whis"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-whis",
      tags: ["Whis", "Referencia"],
      display:
        "display/fora-catalogo/referencias/dragon-ball/referencia-whis-variante-105426.webp",
      thumb:
        "thumb/fora-catalogo/referencias/dragon-ball/referencia-whis-variante-105426.webp",
      notes:
        "Passada visual Dragon Ball: arte plana/referencia de Whis, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    "179525",
    "179526",
    "179527",
    "179528",
    "173661",
    "173662",
    "177951",
    "174030",
    "174031",
    "174032",
  ].map((id) => ({
    message_id: id,
    notes:
      "Passada visual My Hero Academia: variacao sensivel/adulta identificada; manter personagem correto, mas aplicar blur no site.",
    tags: ["anime", "My Hero Academia", "nsfw", "sensitive-blur"],
    taxonomy_applied_reason:
      "Variacao visualmente adulta/sensivel; catalogar como variacao com blur no site, sem virar capa normal.",
  })),
);

OVERRIDES.push(
  ...[
    {
      id: "114626",
      name: "Izuku Midoriya",
      originalName: "izuku midoriya deku green lightning",
      aliases: ["Deku"],
      category: "anime",
      source: "My Hero Academia",
      sourceType: "anime",
      group: "my-hero-academia",
      slug: "izuku-midoriya",
      variantName: "Deku",
      tags: ["My Hero Academia", "Izuku Midoriya", "Deku"],
      display:
        "display/anime/my-hero-academia/izuku-midoriya/izuku-midoriya-deku-green-lightning-114626.webp",
      thumb:
        "thumb/anime/my-hero-academia/izuku-midoriya/izuku-midoriya-deku-green-lightning-114626.webp",
      notes:
        "Passada visual My Hero Academia: Deku e apelido de Izuku Midoriya; unificar para evitar card duplicado.",
    },
    {
      id: "164110",
      name: "Izuku Midoriya",
      originalName: "izuku midoriya vista costas",
      aliases: ["Deku"],
      category: "anime",
      source: "My Hero Academia",
      sourceType: "anime",
      group: "my-hero-academia",
      slug: "izuku-midoriya",
      variantName: "Vista de costas",
      tags: ["My Hero Academia", "Izuku Midoriya", "Deku", "Vista de costas"],
      display:
        "display/anime/my-hero-academia/izuku-midoriya/izuku-midoriya-vista-costas-164110.webp",
      thumb:
        "thumb/anime/my-hero-academia/izuku-midoriya/izuku-midoriya-vista-costas-164110.webp",
      notes:
        "Passada visual My Hero Academia: manter como variacao de Izuku Midoriya; nao deve criar card separado nem ser capa quando houver frente.",
    },
    {
      id: "116411",
      name: "Katsuki Bakugo",
      originalName: "katsuki bakugo chibi",
      aliases: ["Bakugo"],
      category: "anime",
      source: "My Hero Academia",
      sourceType: "anime",
      group: "my-hero-academia",
      slug: "katsuki-bakugo",
      variantName: "Chibi",
      tags: ["My Hero Academia", "Katsuki Bakugo", "Bakugo", "Chibi"],
      display:
        "display/anime/my-hero-academia/katsuki-bakugo/katsuki-bakugo-chibi-116411.webp",
      thumb:
        "thumb/anime/my-hero-academia/katsuki-bakugo/katsuki-bakugo-chibi-116411.webp",
      notes:
        "Passada visual My Hero Academia: Bakugo e forma abreviada; unificar no nome oficial Katsuki Bakugo.",
    },
    {
      id: "179028",
      name: "Ubel",
      originalName: "ubel bunny",
      aliases: ["Ubel Bunny"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "ubel",
      variantName: "Bunny",
      tags: ["Frieren", "Ubel", "Bunny"],
      display: "display/anime/frieren/ubel/ubel-bunny-179028.webp",
      thumb: "thumb/anime/frieren/ubel/ubel-bunny-179028.webp",
      notes:
        "Passada visual Frieren: personagem de cabelo roxo e roupa bunny e Ubel; estava no card Frieren.",
    },
    ...[
      ["113853", "modelo-1", "Modelo 1"],
      ["116417", "modelo-2", "Modelo 2"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Inosuke Hashibira",
      originalName: "inosuke hashibira",
      aliases: ["Inosuke"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "inosuke-hashibira",
      variantName,
      tags: ["Demon Slayer", "Inosuke Hashibira", "Inosuke"],
      display: `display/anime/demon-slayer/inosuke-hashibira/inosuke-hashibira-${suffix}-${id}.webp`,
      thumb: `thumb/anime/demon-slayer/inosuke-hashibira/inosuke-hashibira-${suffix}-${id}.webp`,
      notes:
        "Passada visual Demon Slayer: Inosuke e abreviacao; unificar como Inosuke Hashibira.",
    })),
    {
      id: "114371",
      name: "Nezuko Kamado",
      originalName: "nezuko kamado",
      aliases: ["Nezuko"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "nezuko-kamado",
      variantName: "Modelo 1",
      tags: ["Demon Slayer", "Nezuko Kamado", "Nezuko"],
      display:
        "display/anime/demon-slayer/nezuko-kamado/nezuko-kamado-modelo-1-114371.webp",
      thumb:
        "thumb/anime/demon-slayer/nezuko-kamado/nezuko-kamado-modelo-1-114371.webp",
      notes:
        "Passada visual Demon Slayer: Nezuko e abreviacao; unificar como Nezuko Kamado.",
    },
    {
      id: "116439",
      name: "Shinobu Kocho",
      originalName: "shinobu kocho",
      aliases: ["Shinobu"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "shinobu-kocho",
      variantName: "Modelo 1",
      tags: ["Demon Slayer", "Shinobu Kocho", "Shinobu"],
      display:
        "display/anime/demon-slayer/shinobu-kocho/shinobu-kocho-modelo-1-116439.webp",
      thumb:
        "thumb/anime/demon-slayer/shinobu-kocho/shinobu-kocho-modelo-1-116439.webp",
      notes:
        "Passada visual Demon Slayer: Shinobu e abreviacao; unificar como Shinobu Kocho.",
    },
    {
      id: "109250",
      name: "Tanjiro Kamado",
      originalName: "tanjiro kamado",
      aliases: ["Tanjiro"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "tanjiro-kamado",
      variantName: "Fogo",
      tags: ["Demon Slayer", "Tanjiro Kamado", "Tanjiro"],
      display:
        "display/anime/demon-slayer/tanjiro-kamado/tanjiro-kamado-fogo-109250.webp",
      thumb:
        "thumb/anime/demon-slayer/tanjiro-kamado/tanjiro-kamado-fogo-109250.webp",
      notes:
        "Passada visual Demon Slayer: Tanjiro e abreviacao; unificar como Tanjiro Kamado.",
    },
    ...[
      ["105516", "chibi-1"],
      ["105517", "chibi-2"],
    ].map(([id, suffix]) => ({
      id,
      name: "Tanjiro Kamado e Nezuko Kamado",
      originalName: "tanjiro kamado e nezuko kamado",
      aliases: ["Tanjiro e Nezuko", "Tanjiro Nezuko"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "tanjiro-kamado-e-nezuko-kamado",
      variantName: "Chibi",
      tags: ["Demon Slayer", "Tanjiro Kamado", "Nezuko Kamado", "Chibi"],
      display: `display/anime/demon-slayer/tanjiro-kamado-e-nezuko-kamado/tanjiro-kamado-e-nezuko-kamado-${suffix}-${id}.webp`,
      thumb: `thumb/anime/demon-slayer/tanjiro-kamado-e-nezuko-kamado/tanjiro-kamado-e-nezuko-kamado-${suffix}-${id}.webp`,
      notes:
        "Passada visual Demon Slayer: expandir Tanjiro Nezuko para nomes completos no card de dupla.",
    })),
    ...[
      ["115909", "modelo-1", "Modelo 1"],
      ["179532", "armadura", "Armadura"],
      ["180820", "chibi", "Chibi"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Shun de Andromeda",
      originalName: "shun de andromeda",
      aliases: ["Andromeda Shun"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "shun-de-andromeda",
      variantName,
      tags: ["Cavaleiros do Zodiaco", "Shun de Andromeda", "Andromeda"],
      display: `display/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/shun-de-andromeda/shun-de-andromeda-${suffix}-${id}.webp`,
      thumb: `thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/shun-de-andromeda/shun-de-andromeda-${suffix}-${id}.webp`,
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Andromeda Shun como Shun de Andromeda em portugues.",
    })),
    ...[
      ["177018", "casual-1", "Casual"],
      ["177019", "casual-2", "Casual"],
      ["177021", "modelo-1", "Modelo 1"],
      ["177525", "armadura-negra", "Armadura negra"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Ikki de Fenix",
      originalName: "ikki de fenix",
      aliases: ["Phoenix Ikki"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "ikki-de-fenix",
      variantName,
      tags: ["Cavaleiros do Zodiaco", "Ikki de Fenix", "Fenix"],
      display: `display/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/ikki-de-fenix/ikki-de-fenix-${suffix}-${id}.webp`,
      thumb: `thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/ikki-de-fenix/ikki-de-fenix-${suffix}-${id}.webp`,
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Phoenix Ikki como Ikki de Fenix em portugues.",
    })),
    ...[
      ["108138", "modelo-1", "Modelo 1"],
      ["112347", "acao", "Acao"],
      ["112349", "diorama", "Diorama"],
      ["181705", "armadura", "Armadura"],
      ["181693", "casual", "Casual"],
      ["177523", "civil", "Civil"],
      ["181187", "chibi", "Chibi"],
      ["180337", "chibi-capacete-1", "Chibi capacete"],
      ["180338", "chibi-capacete-2", "Chibi capacete"],
      ["180339", "chibi-capacete-3", "Chibi capacete"],
      ["177170", "armadura-feminina", "Armadura feminina"],
      ["179652", "armadura", "Armadura"],
      ["98144", "armadura-vermelha-frente", "Armadura"],
      ["98145", "armadura-vermelha", "Armadura"],
      ["98146", "armadura-alada", "Armadura alada"],
      ["98147", "modelo-2", "Modelo 2"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Seiya de Pegaso",
      originalName: "seiya de pegaso",
      aliases: ["Pegasus Seiya", "Seiya"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "seiya-de-pegaso",
      variantName,
      tags: ["Cavaleiros do Zodiaco", "Seiya de Pegaso", "Pegaso"],
      display: `display/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/seiya-de-pegaso/seiya-de-pegaso-${suffix}-${id}.webp`,
      thumb: `thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/seiya-de-pegaso/seiya-de-pegaso-${suffix}-${id}.webp`,
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Seiya/Pegasus Seiya como Seiya de Pegaso em portugues.",
    })),
    ...[
      ["178862", "modelo-1", "Modelo 1"],
      ["178863", "vista-costas-1", "Vista de costas"],
      ["178864", "vista-costas-2", "Vista de costas"],
      ["178865", "modelo-2", "Modelo 2"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Seiya de Pegaso e Athena Bebe",
      originalName: "seiya de pegaso e athena bebe",
      aliases: ["Pegasus Seiya e Baby Athena"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "seiya-de-pegaso-e-athena-bebe",
      variantName,
      tags: [
        "Cavaleiros do Zodiaco",
        "Seiya de Pegaso",
        "Athena",
        "Bebe",
      ],
      display: `display/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/seiya-de-pegaso-e-athena-bebe/seiya-de-pegaso-e-athena-bebe-${suffix}-${id}.webp`,
      thumb: `thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/seiya-de-pegaso-e-athena-bebe/seiya-de-pegaso-e-athena-bebe-${suffix}-${id}.webp`,
      notes:
        "Passada visual Cavaleiros do Zodiaco: traduzir Pegasus Seiya e Baby Athena e manter como diorama especifico.",
    })),
    ...[
      ["99537", "frente", "Frente"],
      ["99538", "vista-costas", "Vista de costas"],
      ["99539", "modelo-2", "Modelo 2"],
      ["121574", "diorama", "Diorama"],
    ].map(([id, suffix, variantName]) => ({
      id,
      name: "Mascara da Morte de Cancer",
      originalName: "mascara da morte de cancer",
      aliases: ["Deathmask Cancer", "Deathmask de Cancer"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-ouro",
      slug: "mascara-da-morte-de-cancer",
      variantName,
      tags: [
        "Cavaleiros do Zodiaco",
        "Mascara da Morte de Cancer",
        "Cancer",
      ],
      display: `display/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/mascara-da-morte-de-cancer/mascara-da-morte-de-cancer-${suffix}-${id}.webp`,
      thumb: `thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/mascara-da-morte-de-cancer/mascara-da-morte-de-cancer-${suffix}-${id}.webp`,
      notes:
        "Passada visual Cavaleiros do Zodiaco: Deathmask/placa Deathmask confirmado; padronizar como Mascara da Morte de Cancer.",
    })),
    {
      id: "122261",
      name: "Hyoga de Cisne",
      originalName: "hyoga de cisne armadura azul",
      aliases: ["Cygnus Hyoga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "hyoga-de-cisne",
      variantName: "Armadura",
      tags: ["Cavaleiros do Zodiaco", "Hyoga de Cisne", "Cisne"],
      display:
        "display/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/hyoga-de-cisne/hyoga-de-cisne-armadura-azul-122261.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-bronze/hyoga-de-cisne/hyoga-de-cisne-armadura-azul-122261.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: item estava generico como Saint Seiya, mas a armadura/personagem correspondem a Hyoga de Cisne.",
    },
    {
      id: "180704",
      name: "Milo de Escorpiao",
      originalName: "milo de escorpiao",
      aliases: ["Scorpio Milo"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-ouro",
      slug: "milo-de-escorpiao",
      variantName: "Modelo 1",
      tags: ["Cavaleiros do Zodiaco", "Milo de Escorpiao", "Escorpiao"],
      display:
        "display/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/milo-de-escorpiao/milo-de-escorpiao-modelo-1-180704.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/milo-de-escorpiao/milo-de-escorpiao-modelo-1-180704.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Scorpio Milo como Milo de Escorpiao em portugues.",
    },
    {
      id: "178958",
      name: "Saga de Gemeos",
      originalName: "gemini saga",
      aliases: ["Gemini Saga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "saga-de-gemeos",
      variantName: "Modelo 1",
      display:
        "display/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-modelo-1-178958.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-modelo-1-178958.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: figura identificada como Saga de Gemeos; padronizar nome em portugues.",
    },
    {
      id: "178960",
      name: "Saga de Gemeos",
      originalName: "gemini saga",
      aliases: ["Gemini Saga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "saga-de-gemeos",
      variantName: "Modelo 1",
      display:
        "display/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-modelo-1-2-178960.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-modelo-1-2-178960.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: segunda vista de Saga de Gemeos; padronizar nome em portugues.",
    },
    {
      id: "170299",
      name: "Saga de Gemeos",
      originalName: "gemini saga lucas perez",
      aliases: ["Gemini Saga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "saga-de-gemeos",
      variantName: "Lucas Perez",
      display:
        "display/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-lucas-perez-170299.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/saga-de-gemeos/saga-de-gemeos-lucas-perez-170299.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: armadura e visual de Saga de Gemeos; nao deixar como Gold Saint generico.",
    },
    {
      id: "116628",
      name: "Camus de Aquario",
      originalName: "aquarius camus portrait",
      aliases: ["Aquarius Camus", "Camus"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "camus-de-aquario",
      variantName: "Retrato",
      display:
        "display/anime/cavaleiros-do-zodiaco/camus-de-aquario/camus-de-aquario-retrato-116628.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/camus-de-aquario/camus-de-aquario-retrato-116628.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: figura identificada como Camus de Aquario; nao Gold Saint generico.",
    },
    {
      id: "187078",
      name: "Camus de Aquario",
      originalName: "aquarius camus lucas perez",
      aliases: ["Aquarius Camus", "Camus"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "camus-de-aquario",
      variantName: "Lucas Perez",
      display:
        "display/anime/cavaleiros-do-zodiaco/camus-de-aquario/camus-de-aquario-lucas-perez-187078.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/camus-de-aquario/camus-de-aquario-lucas-perez-187078.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: base com simbolo de Aquario e visual de Camus; nao Gold Saint generico.",
    },
    {
      id: "178289",
      name: "Hyoga de Cisne",
      originalName: "cygnus hyoga",
      aliases: ["Cygnus Hyoga", "Hyoga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "hyoga-de-cisne",
      variantName: "Modelo 1",
      display:
        "display/anime/cavaleiros-do-zodiaco/hyoga-de-cisne/hyoga-de-cisne-modelo-1-178289.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/hyoga-de-cisne/hyoga-de-cisne-modelo-1-178289.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Cygnus Hyoga para Hyoga de Cisne em portugues.",
    },
    {
      id: "127976",
      name: "Hyoga de Cisne",
      originalName: "hyoga blue armor",
      aliases: ["Cygnus Hyoga", "Hyoga"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "hyoga-de-cisne",
      variantName: "Armadura azul",
      display:
        "display/anime/cavaleiros-do-zodiaco/hyoga-de-cisne/hyoga-de-cisne-armadura-azul-127976.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/hyoga-de-cisne/hyoga-de-cisne-armadura-azul-127976.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: a base identifica HYOGA; nao Gold Saint generico.",
    },
    {
      id: "187037",
      name: "Mu de Aries",
      originalName: "mu aries armor",
      aliases: ["Aries Mu", "Mu"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "mu-de-aries",
      variantName: "Armadura",
      display:
        "display/anime/cavaleiros-do-zodiaco/mu-de-aries/mu-de-aries-armadura-187037.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/mu-de-aries/mu-de-aries-armadura-187037.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: armadura e simbolo de Aries identificam Mu; nao Gold Saint generico.",
    },
    {
      id: "187039",
      name: "Mu de Aries",
      originalName: "mu aries side view",
      aliases: ["Aries Mu", "Mu"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "mu-de-aries",
      variantName: "Lateral",
      display:
        "display/anime/cavaleiros-do-zodiaco/mu-de-aries/mu-de-aries-lateral-187039.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/mu-de-aries/mu-de-aries-lateral-187039.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: segunda vista de Mu de Aries; nao Gold Saint generico.",
    },
    {
      id: "132051",
      name: "Shion de Aries",
      originalName: "aries shion standing",
      aliases: ["Aries Shion", "Shion"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "shion-de-aries",
      variantName: "Standing",
      display:
        "display/anime/cavaleiros-do-zodiaco/shion-de-aries/shion-de-aries-standing-132051.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/shion-de-aries/shion-de-aries-standing-132051.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: placa na base indica Shion; nao Gold Saint generico.",
    },
    {
      id: "116629",
      name: "Manigoldo de Cancer",
      originalName: "manigoldo white cape",
      aliases: ["Manigoldo", "Cancer Manigoldo"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "manigoldo-de-cancer",
      variantName: "Capa branca",
      display:
        "display/anime/cavaleiros-do-zodiaco/manigoldo-de-cancer/manigoldo-de-cancer-capa-branca-116629.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/manigoldo-de-cancer/manigoldo-de-cancer-capa-branca-116629.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: placa na base indica Manigoldo; nao Gold Saint generico.",
    },
    {
      id: "158120",
      name: "Aldebaran de Touro",
      originalName: "taurus aldebaran chibi",
      aliases: ["Taurus Aldebaran", "Aldebaran"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "aldebaran-de-touro",
      variantName: "Chibi",
      display:
        "display/anime/cavaleiros-do-zodiaco/aldebaran-de-touro/aldebaran-de-touro-chibi-158120.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/aldebaran-de-touro/aldebaran-de-touro-chibi-158120.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: armadura de Touro identifica Aldebaran; nao Gold Saint generico.",
    },
    {
      id: "179811",
      name: "Aldebaran de Touro",
      originalName: "taurus aldebaran chibi",
      aliases: ["Taurus Aldebaran", "Aldebaran"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "aldebaran-de-touro",
      variantName: "Chibi",
      display:
        "display/anime/cavaleiros-do-zodiaco/aldebaran-de-touro/aldebaran-de-touro-chibi-2-179811.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/aldebaran-de-touro/aldebaran-de-touro-chibi-2-179811.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: padronizar Taurus Aldebaran para Aldebaran de Touro em portugues.",
    },
    {
      id: "121563",
      name: "Afrodite de Peixes",
      originalName: "afrodite pisces statue",
      aliases: ["Aphrodite Pisces", "Afrodite"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "afrodite-de-peixes",
      variantName: "Diorama rosas",
      display:
        "display/anime/cavaleiros-do-zodiaco/afrodite-de-peixes/afrodite-de-peixes-diorama-rosas-121563.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/afrodite-de-peixes/afrodite-de-peixes-diorama-rosas-121563.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: a propria imagem identifica Afrodite Pisces; nao Saint Seiya generico.",
    },
    {
      id: "184953",
      name: "Gotenks",
      originalName: "gotenks energy orb",
      aliases: ["Dragon Ball"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gotenks",
      variantName: "Esfera roxa",
      display:
        "display/anime/dragon-ball/gotenks/gotenks-esfera-roxa-184953.webp",
      thumb: "thumb/anime/dragon-ball/gotenks/gotenks-esfera-roxa-184953.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: imagem e Gotenks de Dragon Ball; nao pertence a Cavaleiros do Zodiaco.",
    },
    {
      id: "112239",
      name: "Capa Hades",
      originalName: "hades cape anime render",
      aliases: ["Hades"],
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "capa-hades",
      tags: ["Hades", "Capa", "Pecas"],
      display:
        "display/fora-catalogo/pecas/cavaleiros-do-zodiaco/capa-hades-112239.webp",
      thumb:
        "thumb/fora-catalogo/pecas/cavaleiros-do-zodiaco/capa-hades-112239.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: render isolado de capa/peca, nao figura para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Peca isolada; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "120929",
      name: "Capacete Seiya de Pegasus",
      originalName: "gold helmet display",
      aliases: ["Seiya de Pegasus"],
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "objetos",
      slug: "capacete-seiya-de-pegasus",
      tags: ["Seiya", "Capacete"],
      display:
        "display/fora-catalogo/objetos/cavaleiros-do-zodiaco/capacete-seiya-de-pegasus-120929.webp",
      thumb:
        "thumb/fora-catalogo/objetos/cavaleiros-do-zodiaco/capacete-seiya-de-pegasus-120929.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: capacete/display isolado, nao figura para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Objeto isolado; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "112243",
      name: "Referencia Ikki de Fenix",
      originalName: "ikki phoenix anime art",
      aliases: ["Ikki Phoenix", "Ikki de Fenix"],
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-ikki-de-fenix",
      tags: ["Ikki", "Referencia"],
      display:
        "display/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-ikki-de-fenix-112243.webp",
      thumb:
        "thumb/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-ikki-de-fenix-112243.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: arte plana/referencia, nao render ou foto de estatueta.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia 2D, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "182588",
      name: "Referencia Armadura de Ouro",
      originalName: "gold saint cube art",
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-armadura-de-ouro",
      tags: ["Armadura", "Referencia"],
      display:
        "display/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-armadura-de-ouro-cubo-182588.webp",
      thumb:
        "thumb/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-armadura-de-ouro-cubo-182588.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: arte/collage com cubo de armadura, nao estatueta limpa.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia/display, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "182633",
      name: "Referencia Armadura de Ouro",
      originalName: "gold saints cube diorama art",
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-armadura-de-ouro",
      tags: ["Armadura", "Referencia"],
      display:
        "display/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-armadura-de-ouro-cubo-2-182633.webp",
      thumb:
        "thumb/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-armadura-de-ouro-cubo-2-182633.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: arte/collage com cubo de armadura, nao estatueta limpa.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia/display, inadequada como item publico do catalogo de figuras.",
    },
    {
      id: "96882",
      name: "Referencia Aldebaran de Touro",
      originalName: "gold saints display",
      aliases: ["Taurus Aldebaran", "Aldebaran"],
      category: "fora catalogo",
      source: "Cavaleiros do Zodiaco",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-aldebaran-de-touro",
      tags: ["Aldebaran", "Referencia"],
      display:
        "display/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-aldebaran-de-touro-display-96882.webp",
      thumb:
        "thumb/fora-catalogo/referencias/cavaleiros-do-zodiaco/referencia-aldebaran-de-touro-display-96882.webp",
      notes:
        "Passada visual Cavaleiros do Zodiaco: imagem de display/collage, nao uma estatueta limpa para card publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Imagem de referencia/display, inadequada como item publico do catalogo de figuras.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "122645",
      name: "Fern",
      originalName: "fern standing",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "fern",
      variantName: "Standing",
      display: "display/anime/frieren/fern/fern-standing-122645.webp",
      thumb: "thumb/anime/frieren/fern/fern-standing-122645.webp",
      notes:
        "Passada visual Frieren: imagem identificada como Fern; remover legenda generica Purple Haired Girl Standing.",
    },
    {
      id: "122096",
      name: "Stark",
      originalName: "stark axe",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "stark",
      variantName: "Machado",
      display: "display/anime/frieren/stark/stark-machado-122096.webp",
      thumb: "thumb/anime/frieren/stark/stark-machado-122096.webp",
      notes:
        "Passada visual Frieren: personagem correto e Stark; corrigir legenda generica Red Hair Axe Anime Girl.",
    },
    {
      id: "120839",
      name: "Ubel",
      originalName: "ubel bunny",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "ubel",
      variantName: "Bunny",
      display: "display/anime/frieren/ubel/ubel-bunny-120839.webp",
      thumb: "thumb/anime/frieren/ubel/ubel-bunny-120839.webp",
      notes:
        "Passada visual Frieren: figura identificada como Ubel; remover legenda generica Green Bunny Anime Girl.",
    },
    {
      id: "172260",
      name: "Pecas Frieren Chibi",
      originalName: "frieren chibi parts",
      aliases: ["Frieren"],
      category: "fora catalogo",
      source: "Frieren",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-frieren-chibi",
      tags: ["Frieren", "Pecas"],
      display: "display/fora-catalogo/pecas/frieren/pecas-frieren-chibi-172260.webp",
      thumb: "thumb/fora-catalogo/pecas/frieren/pecas-frieren-chibi-172260.webp",
      notes:
        "Passada visual Frieren: imagem mostra pecas desmontadas do modelo, nao figura limpa para card publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Pecas desmontadas; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    {
      id: "172999",
      name: "Pecas Frieren Modelo Adulto",
      originalName: "frieren adult model parts",
      aliases: ["Frieren"],
      category: "fora catalogo",
      source: "Frieren",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-frieren-modelo-adulto",
      tags: ["Frieren", "Pecas", "nsfw", "sensitive-blur"],
      display:
        "display/fora-catalogo/pecas/frieren/pecas-frieren-modelo-adulto-1-172999.webp",
      thumb:
        "thumb/fora-catalogo/pecas/frieren/pecas-frieren-modelo-adulto-1-172999.webp",
      notes:
        "Passada visual Frieren: layout de pecas de variacao adulta/NSFW, nao figura limpa para card publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Pecas desmontadas de variacao adulta; manter fora do catalogo publico.",
    },
    {
      id: "173004",
      name: "Pecas Frieren Modelo Adulto",
      originalName: "frieren adult model parts",
      aliases: ["Frieren"],
      category: "fora catalogo",
      source: "Frieren",
      sourceType: "non_catalog",
      group: "pecas",
      slug: "pecas-frieren-modelo-adulto",
      tags: ["Frieren", "Pecas", "nsfw", "sensitive-blur"],
      display:
        "display/fora-catalogo/pecas/frieren/pecas-frieren-modelo-adulto-2-173004.webp",
      thumb:
        "thumb/fora-catalogo/pecas/frieren/pecas-frieren-modelo-adulto-2-173004.webp",
      notes:
        "Passada visual Frieren: segundo layout de pecas de variacao adulta/NSFW, nao figura limpa para card publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Pecas desmontadas de variacao adulta; manter fora do catalogo publico.",
    },
    {
      id: "179520",
      name: "Personagem Frieren em revisao",
      originalName: "white dress sylviana",
      aliases: ["Frieren", "Sylviana"],
      category: "revisar",
      source: "Frieren",
      sourceType: "anime",
      group: "anime-frieren",
      slug: "personagem-frieren-duvidoso",
      variantName: "White Dress Sylviana",
      tags: ["Revisar"],
      display:
        "display/revisar/anime/frieren/personagem-frieren-duvidoso/personagem-frieren-duvidoso-white-dress-sylviana-179520.webp",
      thumb:
        "thumb/revisar/anime/frieren/personagem-frieren-duvidoso/personagem-frieren-duvidoso-white-dress-sylviana-179520.webp",
      notes:
        "Passada visual Frieren: identidade nao confirmada com seguranca; nome White Dress Sylviana pode indicar personagem/variante fora de Frieren.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identidade visual inconclusiva; remover do publico ate confirmar se e Frieren, Sylviana ou outro personagem.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...["173001", "173002", "173003"].map((id) => ({
    message_id: id,
    notes:
      "Passada visual Frieren: variacao adulta/NSFW identificada; manter personagem correto, mas aplicar blur no site.",
    tags: ["anime", "Frieren", "nsfw", "sensitive-blur"],
    taxonomy_applied_reason:
      "Variacao adulta/NSFW; catalogar como variacao com blur, sem virar capa normal.",
  })),
);

OVERRIDES.push(
  ...["178689", "178690", "178691", "178692"].map((id) => ({
    message_id: id,
    notes:
      "Passada visual Frieren: variacao adulta/NSFW da Ubel; manter personagem correto, mas aplicar blur no site.",
    tags: ["anime", "Frieren", "Ubel", "nsfw", "sensitive-blur"],
    taxonomy_applied_reason:
      "Variacao adulta/NSFW; catalogar como variacao com blur, sem aparecer como capa normal segura.",
  })),
);

OVERRIDES.push(
  ...[
    {
      id: "104034",
      name: "Sosuke Aizen",
      originalName: "sosuke aizen",
      aliases: ["Aizen"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "sosuke-aizen",
      variantName: "Espada",
      display: "display/anime/bleach/sosuke-aizen/sosuke-aizen-espada-104034.webp",
      thumb: "thumb/anime/bleach/sosuke-aizen/sosuke-aizen-espada-104034.webp",
      notes:
        "Passada visual Bleach: a propria imagem identifica Sosuke Aizen; nao e Byakuya Kuchiki.",
    },
    {
      id: "181385",
      name: "Renji Abarai",
      originalName: "renji abarai zabimaru",
      aliases: ["Abarai Renji"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "renji-abarai",
      variantName: "Zabimaru",
      display: "display/anime/bleach/renji-abarai/renji-abarai-zabimaru-181385.webp",
      thumb: "thumb/anime/bleach/renji-abarai/renji-abarai-zabimaru-181385.webp",
      notes:
        "Passada visual Bleach: cabelo vermelho, tatuagens e Zabimaru identificam Renji Abarai; nao Byakuya.",
    },
    {
      id: "117628",
      name: "Ichigo Kurosaki",
      originalName: "ichigo kurosaki statue",
      aliases: ["Ichigo"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "ichigo-kurosaki",
      display:
        "display/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-statue-17-117628.webp",
      thumb:
        "thumb/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-statue-17-117628.webp",
      notes:
        "Passada visual Bleach: unificar pasta Ichigo no nome oficial Ichigo Kurosaki.",
    },
    {
      id: "117630",
      name: "Ichigo Kurosaki",
      originalName: "ichigo kurosaki statue",
      aliases: ["Ichigo"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "ichigo-kurosaki",
      display:
        "display/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-statue-18-117630.webp",
      thumb:
        "thumb/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-statue-18-117630.webp",
      notes:
        "Passada visual Bleach: unificar pasta Ichigo no nome oficial Ichigo Kurosaki.",
    },
    {
      id: "119153",
      name: "Ichigo Kurosaki",
      originalName: "ichigo kurosaki display card",
      aliases: ["Ichigo"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "ichigo-kurosaki",
      display:
        "display/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-display-card-119153.webp",
      thumb:
        "thumb/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-display-card-119153.webp",
      notes:
        "Passada visual Bleach: item e Ichigo Kurosaki; remover pasta generica Ichigo.",
    },
    {
      id: "119687",
      name: "Rukia Kuchiki",
      originalName: "rukia kuchiki",
      aliases: ["Rukia"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "rukia-kuchiki",
      display: "display/anime/bleach/rukia-kuchiki/rukia-kuchiki-119687.webp",
      thumb: "thumb/anime/bleach/rukia-kuchiki/rukia-kuchiki-119687.webp",
      notes:
        "Passada visual Bleach: unificar pasta Rukia no nome oficial Rukia Kuchiki.",
    },
    {
      id: "120359",
      name: "Grimmjow Jaegerjaquez",
      originalName: "grimmjow jaegerjaquez",
      aliases: ["Grimmjow"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "grimmjow-jaegerjaquez",
      display:
        "display/anime/bleach/grimmjow-jaegerjaquez/grimmjow-jaegerjaquez-card-120359.webp",
      thumb:
        "thumb/anime/bleach/grimmjow-jaegerjaquez/grimmjow-jaegerjaquez-card-120359.webp",
      notes:
        "Passada visual Bleach: imagem identifica Grimmjow Jaegerjaquez; nao deixar como bleach figures generico.",
    },
    {
      id: "122374",
      name: "Rangiku Matsumoto",
      originalName: "rangiku matsumoto explicit version",
      aliases: ["Matsumoto Rangiku"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "rangiku-matsumoto",
      variantName: "NSFW",
      tags: ["nsfw", "sensitive-blur"],
      display:
        "display/anime/bleach/rangiku-matsumoto/rangiku-matsumoto-nsfw-122374.webp",
      thumb:
        "thumb/anime/bleach/rangiku-matsumoto/rangiku-matsumoto-nsfw-122374.webp",
      notes:
        "Passada visual Bleach: personagem e Rangiku Matsumoto em variacao explicita; manter como variacao com blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "122395",
      name: "Ichigo Kurosaki",
      originalName: "ichigo kurosaki hollow card",
      aliases: ["Ichigo"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "ichigo-kurosaki",
      variantName: "Hollow",
      display:
        "display/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-hollow-card-122395.webp",
      thumb:
        "thumb/anime/bleach/ichigo-kurosaki/ichigo-kurosaki-hollow-card-122395.webp",
      notes:
        "Passada visual Bleach: card/render corresponde a Ichigo Kurosaki em visual Hollow; remover bleach figures generico.",
    },
    {
      id: "122398",
      name: "Shunsui Kyoraku",
      originalName: "shunsui kyoraku card",
      aliases: ["Shunsui"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "shunsui-kyoraku",
      display:
        "display/anime/bleach/shunsui-kyoraku/shunsui-kyoraku-card-122398.webp",
      thumb:
        "thumb/anime/bleach/shunsui-kyoraku/shunsui-kyoraku-card-122398.webp",
      notes:
        "Passada visual Bleach: imagem mostra Shunsui Kyoraku, nao Mayuri Kurotsuchi nem bleach figures generico.",
    },
    {
      id: "100033",
      name: "Busto Minato Namikaze",
      originalName: "minato namikaze bust",
      aliases: ["Minato"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "minato-namikaze",
      variantName: "Busto",
      tags: ["Busto"],
      display:
        "display/anime/naruto/minato-namikaze/busto-minato-namikaze-100033.webp",
      thumb:
        "thumb/anime/naruto/minato-namikaze/busto-minato-namikaze-100033.webp",
      notes:
        "Passada visual Bleach: busto com bandana da Folha e visual de Minato; nao pertence a Ichigo/Bleach.",
    },
    {
      id: "100031",
      name: "Busto Hiruzen Sarutobi",
      originalName: "hiruzen sarutobi bust",
      aliases: ["Terceiro Hokage"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "hiruzen-sarutobi",
      variantName: "Busto",
      tags: ["Busto"],
      display:
        "display/anime/naruto/hiruzen-sarutobi/busto-hiruzen-sarutobi-100031.webp",
      thumb:
        "thumb/anime/naruto/hiruzen-sarutobi/busto-hiruzen-sarutobi-100031.webp",
      notes:
        "Passada visual Bleach: busto de personagem da Folha/Naruto, identificado como Hiruzen Sarutobi; nao Nanao.",
    },
    {
      id: "181179",
      name: "Flamme",
      originalName: "flamme chibi",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "flamme",
      variantName: "Chibi 1",
      display: "display/anime/frieren/flamme/flamme-chibi-1-5-181179.webp",
      thumb: "thumb/anime/frieren/flamme/flamme-chibi-1-5-181179.webp",
      notes:
        "Passada visual Bleach: chibi corresponde a Flamme de Frieren; nao Orihime Inoue.",
    },
    {
      id: "100029",
      name: "Busto Tsunade",
      originalName: "tsunade bust",
      aliases: ["Tsunade Senju"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "tsunade",
      variantName: "Busto",
      tags: ["Busto"],
      display: "display/anime/naruto/tsunade/busto-tsunade-100029.webp",
      thumb: "thumb/anime/naruto/tsunade/busto-tsunade-100029.webp",
      notes:
        "Passada visual Bleach: busto com marca na testa e traje de Tsunade; nao Rangiku.",
    },
    {
      id: "181181",
      name: "Aura",
      originalName: "aura chibi",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "aura",
      variantName: "Chibi 1",
      display: "display/anime/frieren/aura/aura-chibi-1-9-181181.webp",
      thumb: "thumb/anime/frieren/aura/aura-chibi-1-9-181181.webp",
      notes:
        "Passada visual Bleach: chibi de cabelo roxo corresponde a Aura de Frieren; nao Rukia.",
    },
    {
      id: "181183",
      name: "Aura",
      originalName: "aura chibi",
      aliases: ["Frieren"],
      category: "anime",
      source: "Frieren",
      sourceType: "anime",
      group: "frieren",
      slug: "aura",
      variantName: "Chibi 1",
      display: "display/anime/frieren/aura/aura-chibi-1-10-181183.webp",
      thumb: "thumb/anime/frieren/aura/aura-chibi-1-10-181183.webp",
      notes:
        "Passada visual Bleach: segunda vista do chibi Aura/Frieren; nao Rukia Kuchiki.",
    },
    {
      id: "112599",
      name: "Genryusai Shigekuni Yamamoto",
      originalName: "genryusai shigekuni yamamoto",
      aliases: ["Shigekuni Yamamoto", "Yamamoto"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "genryusai-shigekuni-yamamoto",
      variantName: "Promo",
      display:
        "display/anime/bleach/genryusai-shigekuni-yamamoto/genryusai-shigekuni-yamamoto-promo-112599.webp",
      thumb:
        "thumb/anime/bleach/genryusai-shigekuni-yamamoto/genryusai-shigekuni-yamamoto-promo-112599.webp",
      notes:
        "Passada visual Bleach: padronizar o nome oficial completo de Yamamoto.",
    },
    {
      id: "112601",
      name: "Doma",
      originalName: "douma snowy promo",
      aliases: ["Douma"],
      category: "anime",
      source: "Demon Slayer",
      sourceType: "anime",
      group: "demon-slayer",
      slug: "doma",
      variantName: "Snowy Promo",
      display: "display/anime/demon-slayer/doma/doma-snowy-promo-112601.webp",
      thumb: "thumb/anime/demon-slayer/doma/doma-snowy-promo-112601.webp",
      notes:
        "Passada visual Bleach: imagem identifica Doma/Douma; nao e Yamamoto nem Bleach.",
    },
    {
      id: "146324",
      name: "Ulquiorra Cifer",
      originalName: "ulquiorra cifer white robe",
      aliases: ["Ulquiorra"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "ulquiorra-cifer",
      variantName: "White Robe",
      display:
        "display/anime/bleach/ulquiorra-cifer/ulquiorra-cifer-white-robe-146324.webp",
      thumb:
        "thumb/anime/bleach/ulquiorra-cifer/ulquiorra-cifer-white-robe-146324.webp",
      notes:
        "Passada visual Bleach: mascara parcial, uniforme branco e energia verde identificam Ulquiorra Cifer; nao manter como Shinigami generico.",
    },
    {
      id: "122443",
      name: "Yoruichi Shihoin",
      originalName: "yoruichi shihoin closeup",
      aliases: ["Yoruichi"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "yoruichi-shihoin",
      variantName: "Close-up",
      display:
        "display/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-closeup-122443.webp",
      thumb:
        "thumb/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-closeup-122443.webp",
      notes:
        "Passada visual Bleach: remover legenda generica Purple Hair Action Girl; personagem e Yoruichi Shihoin.",
    },
    {
      id: "122442",
      name: "Yoruichi Shihoin",
      originalName: "yoruichi shihoin action",
      aliases: ["Yoruichi"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "yoruichi-shihoin",
      variantName: "Acao 1",
      display:
        "display/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-acao-1-122442.webp",
      thumb:
        "thumb/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-acao-1-122442.webp",
      notes:
        "Passada visual Bleach: remover legenda generica Purple Hair Action Girl One; personagem e Yoruichi Shihoin.",
    },
    {
      id: "122444",
      name: "Yoruichi Shihoin",
      originalName: "yoruichi shihoin action",
      aliases: ["Yoruichi"],
      category: "anime",
      source: "Bleach",
      sourceType: "anime",
      group: "bleach",
      slug: "yoruichi-shihoin",
      variantName: "Acao 2",
      display:
        "display/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-acao-2-122444.webp",
      thumb:
        "thumb/anime/bleach/yoruichi-shihoin/yoruichi-shihoin-acao-2-122444.webp",
      notes:
        "Passada visual Bleach: remover legenda generica Purple Hair Action Girl Two; personagem e Yoruichi Shihoin.",
    },
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    ["111726", "10"],
    ["111727", "11"],
    ["111728", "12"],
    ["111729", "13"],
    ["111730", "14"],
    ["111731", "15"],
    ["111732", "16"],
    ["111733", "17"],
    ["111734", "18"],
  ].map(([id, card]) =>
    directReviewOverride({
      id,
      name: "Referencia Rangiku Matsumoto",
      originalName: `rangiku matsumoto model card ${card}`,
      aliases: ["Rangiku Matsumoto"],
      category: "fora catalogo",
      source: "Bleach",
      sourceType: "non_catalog",
      group: "referencias",
      slug: "referencia-rangiku-matsumoto",
      variantName: `Card ${card}`,
      tags: ["Rangiku Matsumoto", "Referencia"],
      display: `display/fora-catalogo/referencias/bleach/rangiku-matsumoto-card-${card}-${id}.webp`,
      thumb: `thumb/fora-catalogo/referencias/bleach/rangiku-matsumoto-card-${card}-${id}.webp`,
      notes:
        "Passada visual Bleach: card/folha promocional de modelo 3D com texto/interface, nao imagem limpa de figura para catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Folha promocional/referencia de modelo; manter rastreavel fora do catalogo publico de figuras/personagens.",
    }),
  ),
);

OVERRIDES.push(
  ...[
    {
      id: "158120",
      name: "Shura de Capricornio",
      originalName: "shura de capricornio chibi",
      aliases: ["Capricorn Shura"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "shura-de-capricornio",
      variantName: "Chibi",
      tags: ["Cavaleiros de Ouro", "Shura de Capricornio"],
      display:
        "display/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/shura-de-capricornio/shura-de-capricornio-chibi-158120.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/shura-de-capricornio/shura-de-capricornio-chibi-158120.webp",
      notes:
        "Correcao do usuario: nao e Aldebaran. Figura chibi com Armadura de Capricornio, catalogar como Shura de Capricornio.",
    },
    {
      id: "179811",
      name: "Shura de Capricornio",
      originalName: "shura de capricornio chibi",
      aliases: ["Capricorn Shura"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-do-zodiaco",
      slug: "shura-de-capricornio",
      variantName: "Chibi",
      tags: ["Cavaleiros de Ouro", "Shura de Capricornio"],
      display:
        "display/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/shura-de-capricornio/shura-de-capricornio-chibi-2-179811.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/shura-de-capricornio/shura-de-capricornio-chibi-2-179811.webp",
      notes:
        "Correcao do usuario: nao e Aldebaran. Figura chibi com Armadura de Capricornio, catalogar como Shura de Capricornio.",
    },
    {
      id: "184953",
      name: "Gogeta",
      originalName: "gogeta super saiyajin esfera",
      aliases: ["Gojeta"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gogeta",
      variantName: "Super Saiyajin Esfera",
      tags: ["Dragon Ball", "Gogeta", "Super Saiyajin"],
      display:
        "display/anime/dragon-ball/gogeta/gogeta-super-saiyajin-esfera-184953.webp",
      thumb:
        "thumb/anime/dragon-ball/gogeta/gogeta-super-saiyajin-esfera-184953.webp",
      notes:
        "Correcao do usuario: fusion com esfera e Gogeta, nao Gotenks.",
    },
    {
      id: "183669",
      name: "Blonde Blazer e Mecha",
      originalName: "dispatch blonde blazer mecha diorama",
      aliases: ["Blonde Blazer"],
      category: "games",
      source: "Dispatch",
      sourceType: "game",
      group: "dispatch",
      slug: "blonde-blazer-e-mecha",
      variantName: "Diorama",
      tags: ["Dispatch", "Blonde Blazer", "Diorama", "Mecha"],
      display:
        "display/games/dispatch/blonde-blazer-e-mecha/blonde-blazer-e-mecha-diorama-183669.webp",
      thumb:
        "thumb/games/dispatch/blonde-blazer-e-mecha/blonde-blazer-e-mecha-diorama-183669.webp",
      notes:
        "Correcao do usuario: item estava em Gundam, mas e diorama do jogo Dispatch com Blonde Blazer e mecha.",
    },
    {
      id: "185727",
      name: "Kakashi Hatake",
      originalName: "kakashi hatake statue",
      aliases: ["Kakashi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "kakashi-hatake",
      variantName: "Modelo 1",
      tags: ["Naruto", "Kakashi Hatake"],
      display:
        "display/anime/naruto/kakashi-hatake/kakashi-hatake-modelo-1-185727.webp",
      thumb:
        "thumb/anime/naruto/kakashi-hatake/kakashi-hatake-modelo-1-185727.webp",
      notes:
        "Correcao visual: a base da estatua identifica Kakashi; estava nomeado como Jiraiya Modelo 1.",
    },
    {
      id: "186117",
      name: "Shuten Douji",
      originalName: "shuten douji back view",
      aliases: ["Shuten-Douji"],
      category: "revisar",
      source: "Fate Grand Order",
      sourceType: "game",
      group: "games-fate-grand-order",
      slug: "shuten-douji-vista-costas",
      variantName: "Vista de costas",
      tags: ["Fate Grand Order", "Shuten Douji", "Vista de costas"],
      display:
        "display/revisar/games/fate-grand-order/shuten-douji-vista-costas/shuten-douji-vista-costas-186117.webp",
      thumb:
        "thumb/revisar/games/fate-grand-order/shuten-douji-vista-costas/shuten-douji-vista-costas-186117.webp",
      notes:
        "Capa atual esta de costas; bloquear do catalogo publico ate existir imagem frontal limpa para capa.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Imagem de costas nao deve ser capa publica; manter rastreavel em revisar ate haver frente confirmada.",
    },
    {
      id: "187985",
      name: "Naruto Uzumaki",
      originalName: "naruto uzumaki diorama",
      aliases: ["Naruto"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "naruto-uzumaki",
      tags: ["Naruto", "Naruto Uzumaki"],
      display:
        "display/anime/naruto/naruto-uzumaki/naruto-uzumaki-vista-costas-187985.webp",
      thumb:
        "thumb/anime/naruto/naruto-uzumaki/naruto-uzumaki-vista-costas-187985.webp",
      notes:
        "Correcao do usuario: imagem estava como Kaido/One Piece, mas a figura e Naruto Uzumaki. Sem subtitulo publico por nao haver frente limpa neste arquivo.",
    },
    {
      id: "189189",
      name: "Asuna",
      originalName: "asuna vestido vermelho vista costas",
      aliases: ["Asuna Yuuki", "Yuuki Asuna"],
      category: "anime",
      source: "Sword Art Online",
      sourceType: "anime",
      group: "sword-art-online",
      slug: "asuna",
      tags: ["Sword Art Online", "Asuna"],
      display:
        "display/anime/sword-art-online/asuna/asuna-vestido-vermelho-costas-189189.webp",
      thumb:
        "thumb/anime/sword-art-online/asuna/asuna-vestido-vermelho-costas-189189.webp",
      notes:
        "Imagem valida como variacao, mas nao deve gerar card/capa separada de costas nem texto Red Dress 1.",
    },
    {
      id: "182107",
      name: "Motoqueiro Fantasma",
      originalName: "ghost rider black suit",
      aliases: ["Ghost Rider"],
      category: "marvel",
      source: "Motoqueiro Fantasma",
      sourceType: "comic",
      group: "anti-herois",
      slug: "motoqueiro-fantasma",
      tags: ["Marvel", "Motoqueiro Fantasma", "Ghost Rider"],
      display:
        "display/marvel/anti-herois/motoqueiro-fantasma/motoqueiro-fantasma-182107.webp",
      thumb:
        "thumb/marvel/anti-herois/motoqueiro-fantasma/motoqueiro-fantasma-182107.webp",
      notes:
        "Correcao do usuario: imagem estava como Katsuki Bakugo/Bad Fish, mas e Motoqueiro Fantasma.",
    },
    {
      id: "112633",
      name: "Uta",
      originalName: "uta armored figure",
      aliases: ["One Piece Film Red"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "uta",
      variantName: "Armadura",
      tags: ["One Piece", "Uta"],
      display: "display/anime/one-piece/uta/uta-armadura-112633.webp",
      thumb: "thumb/anime/one-piece/uta/uta-armadura-112633.webp",
      notes:
        "Correcao visual: o escudo e a personagem identificam Uta/One Piece; item estava indevidamente em Gundam Tristan.",
    },
    {
      id: "112635",
      name: "Referencia Gundam Tristan",
      originalName: "gundam tristan reference sheet",
      aliases: ["Gundam Tristan"],
      category: "fora-catalogo",
      source: "Gundam",
      sourceType: "other",
      group: "referencias",
      slug: "referencia-gundam-tristan",
      tags: ["Gundam", "Gundam Tristan", "Referencia"],
      display:
        "display/fora-catalogo/referencias/gundam/referencia-gundam-tristan-112635.webp",
      thumb:
        "thumb/fora-catalogo/referencias/gundam/referencia-gundam-tristan-112635.webp",
      notes:
        "Folha de referencia/model sheet com texto; manter rastreavel fora do catalogo publico de figuras.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Referencia visual/model sheet, nao imagem limpa de figura/estatua para card publico.",
    },
    {
      id: "114150",
      name: "Referencia Gundam",
      originalName: "gundam display collage",
      aliases: ["Gundam"],
      category: "fora-catalogo",
      source: "Gundam",
      sourceType: "other",
      group: "referencias",
      slug: "referencia-gundam-display-collage",
      tags: ["Gundam", "Referencia"],
      display:
        "display/fora-catalogo/referencias/gundam/gundam-display-collage-114150.webp",
      thumb:
        "thumb/fora-catalogo/referencias/gundam/gundam-display-collage-114150.webp",
      notes:
        "Collage/folha de apresentacao, nao render limpo de produto para capa publica.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Collage promocional/referencia; manter fora do catalogo publico de figuras.",
    },
    {
      id: "120787",
      name: "GM Spartan",
      originalName: "gm spartan",
      aliases: ["RGM-79S GM Spartan"],
      category: "anime",
      source: "Gundam",
      sourceType: "anime",
      group: "gundam",
      slug: "gm-spartan",
      tags: ["Gundam", "GM Spartan"],
      display: "display/anime/gundam/gm-spartan/gm-spartan-120787.webp",
      thumb: "thumb/anime/gundam/gm-spartan/gm-spartan-120787.webp",
      notes:
        "Correcao visual: a propria imagem traz GM Spartan; nao manter como Gundam generico.",
    },
    ...["121244", "121245", "121246", "121247", "121248", "121249", "121250"].map(
      (id, index) => ({
        id,
        name: "Knight Gundam",
        originalName: "knight gundam",
        aliases: ["Full Armor Knight Gundam"],
        category: "anime",
        source: "Gundam",
        sourceType: "anime",
        group: "gundam",
        slug: "knight-gundam",
        tags: ["Gundam", "Knight Gundam"],
        display: `display/anime/gundam/knight-gundam/knight-gundam-${index + 1}-${id}.webp`,
        thumb: `thumb/anime/gundam/knight-gundam/knight-gundam-${index + 1}-${id}.webp`,
        notes:
          "Correcao visual: mecha com motivo medieval, lance/escudo e capa corresponde a Knight Gundam; nao manter como Gundam generico.",
      }),
    ),
    ...["121358", "121359", "121360"].map((id, index) => ({
      id,
      name: "Guncannon",
      originalName: "rx 77 2 guncannon",
      aliases: ["RX-77-2 Guncannon"],
      category: "anime",
      source: "Gundam",
      sourceType: "anime",
      group: "gundam",
      slug: "guncannon",
      tags: ["Gundam", "Guncannon", "RX-77-2"],
      display: `display/anime/gundam/guncannon/guncannon-${index + 1}-${id}.webp`,
      thumb: `thumb/anime/gundam/guncannon/guncannon-${index + 1}-${id}.webp`,
      notes:
        "Correcao visual: mobile suit vermelho com canhoes nos ombros corresponde ao RX-77-2 Guncannon; nao manter como Gundam generico.",
    })),
    {
      id: "98936",
      name: "Goku",
      originalName: "goku super saiyajin blue",
      aliases: ["Son Goku", "Goku Blue"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "goku",
      variantName: "Super Saiyajin Blue",
      tags: ["Dragon Ball", "Goku", "Super Saiyajin Blue"],
      display:
        "display/anime/dragon-ball/goku/goku-super-saiyajin-blue-98936.webp",
      thumb:
        "thumb/anime/dragon-ball/goku/goku-super-saiyajin-blue-98936.webp",
      notes:
        "Correcao visual/textual: item estava como Goku Blue Hair; manter personagem Goku com variacao Super Saiyajin Blue em portugues.",
    },
    {
      id: "99596",
      name: "Goku vs Freeza",
      originalName: "goku vs freeza",
      aliases: ["Goku vs Frieza"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "goku-vs-freeza",
      variantName: "Diorama",
      tags: ["Dragon Ball", "Goku", "Freeza", "Diorama"],
      display:
        "display/anime/dragon-ball/goku-vs-freeza/goku-vs-freeza-diorama-99596.webp",
      thumb:
        "thumb/anime/dragon-ball/goku-vs-freeza/goku-vs-freeza-diorama-99596.webp",
      notes:
        "Correcao visual: a imagem mostra Goku contra Freeza; nao e Vegeta Dynamic.",
    },
    {
      id: "105553",
      name: "Gohan",
      originalName: "gohan treino academia",
      aliases: ["Son Gohan"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gohan",
      variantName: "Treino",
      tags: ["Dragon Ball", "Gohan", "Treino"],
      display:
        "display/anime/dragon-ball/gohan/gohan-treino-academia-105553.webp",
      thumb:
        "thumb/anime/dragon-ball/gohan/gohan-treino-academia-105553.webp",
      notes:
        "Correcao visual e por busca: modelo corresponde a Gohan em treino/academia; nao manter como Goku Boxing.",
    },
    {
      id: "101647",
      name: "Monkey D. Luffy",
      originalName: "monkey d luffy praia",
      aliases: ["Luffy"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "monkey-d-luffy",
      variantName: "Praia",
      tags: ["One Piece", "Monkey D. Luffy", "Luffy", "Praia"],
      display:
        "display/anime/one-piece/monkey-d-luffy/monkey-d-luffy-praia-101647.webp",
      thumb:
        "thumb/anime/one-piece/monkey-d-luffy/monkey-d-luffy-praia-101647.webp",
      notes:
        "Correcao de normalizacao: nao publicar como Luffy Beach; manter personagem oficial Monkey D. Luffy e Praia apenas como variacao.",
    },
    {
      id: "113217",
      name: "Jinbe",
      originalName: "jinbe",
      aliases: ["Jinbei", "Jimbei"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "jinbe",
      variantName: "Modelo 1",
      tags: ["One Piece", "Jinbe"],
      display:
        "display/anime/one-piece/jinbe/jinbe-modelo-1-113217.webp",
      thumb:
        "thumb/anime/one-piece/jinbe/jinbe-modelo-1-113217.webp",
      notes:
        "Normalizacao de nome: unificar Jinbei/Jimbei como Jinbe para evitar pastas/cartoes duplicados.",
    },
    {
      id: "114782",
      name: "Jinbe",
      originalName: "jinbe chibi",
      aliases: ["Jinbei", "Jimbei"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "jinbe",
      variantName: "Chibi",
      tags: ["One Piece", "Jinbe", "Chibi"],
      display:
        "display/anime/one-piece/jinbe/jinbe-chibi-114782.webp",
      thumb:
        "thumb/anime/one-piece/jinbe/jinbe-chibi-114782.webp",
      notes:
        "Normalizacao de nome: item estava como Jimbei; unificar como Jinbe.",
    },
    {
      id: "114377",
      name: "Tony Tony Chopper",
      originalName: "tony tony chopper monster point",
      aliases: ["Chopper"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "tony-tony-chopper",
      variantName: "Monster Point",
      tags: ["One Piece", "Tony Tony Chopper", "Chopper", "Monster Point"],
      display:
        "display/anime/one-piece/tony-tony-chopper/tony-tony-chopper-monster-point-114377.webp",
      thumb:
        "thumb/anime/one-piece/tony-tony-chopper/tony-tony-chopper-monster-point-114377.webp",
      notes:
        "Normalizacao: Monster Point e variacao de Tony Tony Chopper, nao um cartao separado.",
    },
    {
      id: "116419",
      name: "Tony Tony Chopper",
      originalName: "tony tony chopper",
      aliases: ["Chopper"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "tony-tony-chopper",
      variantName: "Modelo 1",
      tags: ["One Piece", "Tony Tony Chopper", "Chopper"],
      display:
        "display/anime/one-piece/tony-tony-chopper/tony-tony-chopper-modelo-1-116419.webp",
      thumb:
        "thumb/anime/one-piece/tony-tony-chopper/tony-tony-chopper-modelo-1-116419.webp",
      notes:
        "Normalizacao: nao separar Chopper de Tony Tony Chopper.",
    },
    {
      id: "119631",
      name: "Tony Tony Chopper",
      originalName: "tony tony chopper chibi",
      aliases: ["Chopper"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "tony-tony-chopper",
      variantName: "Chibi",
      tags: ["One Piece", "Tony Tony Chopper", "Chopper", "Chibi"],
      display:
        "display/anime/one-piece/tony-tony-chopper/tony-tony-chopper-chibi-119631.webp",
      thumb:
        "thumb/anime/one-piece/tony-tony-chopper/tony-tony-chopper-chibi-119631.webp",
      notes:
        "Normalizacao: chibi e variacao de Tony Tony Chopper, nao pasta/personagem separado.",
    },
    {
      id: "125507",
      name: "Sakazuki",
      originalName: "sakazuki akainu vista costas",
      aliases: ["Akainu"],
      category: "revisar",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "sakazuki-vista-costas",
      variantName: "Vista de costas",
      tags: ["One Piece", "Sakazuki", "Akainu", "Vista de costas"],
      display:
        "display/revisar/anime/one-piece/sakazuki-vista-costas/sakazuki-vista-costas-125507.webp",
      thumb:
        "thumb/revisar/anime/one-piece/sakazuki-vista-costas/sakazuki-vista-costas-125507.webp",
      notes:
        "Correcao visual: e Sakazuki/Akainu, nao Marine Admiral generico. Bloqueado do site porque a imagem esta de costas.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identidade corrigida, mas imagem de costas nao deve virar capa publica; manter em revisar ate haver frente confirmada.",
    },
    {
      id: "125522",
      name: "Silvers Rayleigh",
      originalName: "silvers rayleigh vista costas",
      aliases: ["Rayleigh"],
      category: "revisar",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh-vista-costas",
      variantName: "Vista de costas",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Vista de costas"],
      display:
        "display/revisar/anime/one-piece/silvers-rayleigh-vista-costas/silvers-rayleigh-vista-costas-125522.webp",
      thumb:
        "thumb/revisar/anime/one-piece/silvers-rayleigh-vista-costas/silvers-rayleigh-vista-costas-125522.webp",
      notes:
        "Correcao por busca e inspecao visual: e Silvers Rayleigh, nao Marine Admiral. Bloqueado do site porque a imagem esta de costas/lateral.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identidade corrigida, mas imagem de costas/lateral nao deve virar capa publica; manter em revisar ate haver frente confirmada.",
    },
    ...["121348", "121349", "121350", "121351", "121352", "121353", "121354"].map((id, index) => ({
      id,
      name: "White Tigerzord",
      originalName: "white tigerzord",
      aliases: ["Tigerzord", "Kingtiger"],
      category: "filmes-series",
      source: "Power Rangers",
      sourceType: "series",
      group: "power-rangers",
      slug: "white-tigerzord",
      tags: ["Power Rangers", "White Tigerzord", "Tigerzord", "Zord", "Mecha"],
      display: `display/filmes-series/power-rangers/white-tigerzord/white-tigerzord-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/filmes-series/power-rangers/white-tigerzord/white-tigerzord-${
        index + 1
      }-${id}.webp`,
      notes:
        "Correcao visual: material Toymakr3D/Kingtiger corresponde ao White Tigerzord de Power Rangers; nao e Gundam.",
    })),
    ...[
      ["122074", "1"],
      ["122075", "2"],
    ].map(([id, seq]) => ({
      id,
      name: "Pecas Gundam Head",
      originalName: "gundam head parts layout",
      aliases: ["Gundam"],
      category: "fora-catalogo",
      source: "Gundam",
      sourceType: "other",
      group: "pecas",
      slug: "pecas-gundam-head",
      tags: ["Gundam", "Pecas"],
      display: `display/fora-catalogo/pecas/gundam/pecas-gundam-head-${seq}-${id}.webp`,
      thumb: `thumb/fora-catalogo/pecas/gundam/pecas-gundam-head-${seq}-${id}.webp`,
      notes:
        "Imagem mostra layout de pecas soltas; nao deve aparecer como produto/card publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Layout de pecas sem figura completa; manter fora do catalogo publico.",
    })),
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...["180919", "182070", "182071", "182072", "182073"].map((id, index) =>
    directReviewOverride({
      id,
      name: "Mago Negro",
      originalName: "mago negro",
      aliases: ["Dark Magician"],
      category: "anime",
      source: "Yu Gi Oh",
      sourceType: "anime",
      group: "yu-gi-oh",
      slug: "mago-negro",
      tags: ["Yu Gi Oh", "Mago Negro"],
      display: `display/anime/yu-gi-oh/mago-negro/mago-negro${
        index ? `-${index + 1}` : ""
      }-${id}.webp`,
      thumb: `thumb/anime/yu-gi-oh/mago-negro/mago-negro${
        index ? `-${index + 1}` : ""
      }-${id}.webp`,
      notes:
        "Correcao PT-BR: Dark Magician deve aparecer no site como Mago Negro.",
    }),
  ),
);

OVERRIDES.push(
  ...["182230", "182231", "182232", "182233"].map((id, index) =>
    directReviewOverride({
      id,
      name: "Tales",
      originalName: "tales arvore do poder",
      aliases: ["Turles", "Tullece"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "tales",
      tags: ["Dragon Ball", "Tales", "Turles", "Tullece"],
      display: `display/anime/dragon-ball/tales/tales-arvore-do-poder-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/dragon-ball/tales/tales-arvore-do-poder-${
        index + 1
      }-${id}.webp`,
      notes:
        "Correcao do usuario e confirmacao visual: item estava como Raditz, mas e Tales/Turles de Dragon Ball Z: A Arvore do Poder.",
    }),
  ),
);

OVERRIDES.push(
  ...[
    {
      id: "98338",
      name: "GM",
      originalName: "rgm-79 gm",
      aliases: ["RGM-79", "GM Mecha"],
      category: "anime",
      source: "Gundam",
      sourceType: "anime",
      group: "gundam",
      slug: "gm",
      tags: ["Gundam", "GM", "RGM-79"],
      display: "display/anime/gundam/gm/gm-rgm-79-98338.webp",
      thumb: "thumb/anime/gundam/gm/gm-rgm-79-98338.webp",
      notes:
        "Correcao visual: a propria arte identifica RGM-79 GM; nao manter como nome generico Gm Mecha.",
    },
    {
      id: "98340",
      name: "Acessorios Mecha",
      originalName: "mecha attachments",
      aliases: [],
      category: "fora-catalogo",
      source: "Gundam",
      sourceType: "other",
      group: "acessorios",
      slug: "acessorios-mecha",
      tags: ["Gundam", "Acessorios", "Mecha"],
      display:
        "display/fora-catalogo/acessorios/acessorios-mecha/mecha-attachments-98340.webp",
      thumb:
        "thumb/fora-catalogo/acessorios/acessorios-mecha/mecha-attachments-98340.webp",
      notes:
        "Imagem contem apenas armas/acessorios de mecha; nao deve entrar como personagem/figura no catalogo publico.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Acessorios/partes sem personagem ou estatua completa; manter fora do catalogo publico.",
    },
    {
      id: "112237",
      name: "Poseidon",
      originalName: "poseidon",
      aliases: [],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "deuses-e-aliados",
      slug: "poseidon",
      tags: ["Cavaleiros do Zodiaco", "Poseidon", "Deuses e Aliados"],
      display:
        "display/anime/cavaleiros-do-zodiaco/deuses-e-aliados/poseidon/poseidon-112237.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/deuses-e-aliados/poseidon/poseidon-112237.webp",
      notes:
        "Correcao visual/taxonomica: item estava como Poseidon Saint; manter nome oficial Poseidon em Deuses e Aliados.",
    },
    {
      id: "179713",
      name: "Poseidon",
      originalName: "poseidon chibi",
      aliases: [],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "deuses-e-aliados",
      slug: "poseidon",
      variantName: "Chibi",
      tags: ["Cavaleiros do Zodiaco", "Poseidon", "Deuses e Aliados", "Chibi"],
      display:
        "display/anime/cavaleiros-do-zodiaco/deuses-e-aliados/poseidon/poseidon-chibi-1-179713.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/deuses-e-aliados/poseidon/poseidon-chibi-1-179713.webp",
      notes:
        "Alinhar Poseidon chibi na mesma subcategoria Deuses e Aliados para agrupar com a estatua principal.",
    },
    {
      id: "112241",
      name: "Odisseu de Ofiuco",
      originalName: "ophiuchus odysseus",
      aliases: ["Ophiuchus Odysseus", "Odysseus de Ofiuco"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-ouro",
      slug: "odisseu-de-ofiuco",
      tags: [
        "Cavaleiros do Zodiaco",
        "Odisseu de Ofiuco",
        "Ophiuchus Odysseus",
        "Cavaleiros de Ouro",
      ],
      display:
        "display/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/odisseu-de-ofiuco/odisseu-de-ofiuco-112241.webp",
      thumb:
        "thumb/anime/cavaleiros-do-zodiaco/cavaleiros-de-ouro/odisseu-de-ofiuco/odisseu-de-ofiuco-112241.webp",
      notes:
        "Correcao visual e por referencia: armadura dourada com serpente corresponde a Ophiuchus/Odisseu de Ofiuco, o 13o Cavaleiro de Ouro; nao manter como Gold Saint generico.",
    },
    {
      id: "189187",
      name: "Satellizer L. Bridget",
      originalName: "satellizer l bridget",
      aliases: ["Satellizer el Bridget"],
      category: "anime",
      source: "Freezing",
      sourceType: "anime",
      group: "freezing",
      slug: "satellizer-l-bridget",
      tags: ["Freezing", "Satellizer L. Bridget"],
      display:
        "display/anime/freezing/satellizer-l-bridget/satellizer-l-bridget-frente-189187.webp",
      thumb:
        "thumb/anime/freezing/satellizer-l-bridget/satellizer-l-bridget-frente-189187.webp",
      notes:
        "Correcao visual: a base/imagem identifica Satellizer el Bridget, de Freezing; nao e Asuna de Sword Art Online.",
    },
    {
      id: "189189",
      name: "Satellizer L. Bridget",
      originalName: "satellizer l bridget vista costas",
      aliases: ["Satellizer el Bridget"],
      category: "anime",
      source: "Freezing",
      sourceType: "anime",
      group: "freezing",
      slug: "satellizer-l-bridget",
      tags: ["Freezing", "Satellizer L. Bridget"],
      display:
        "display/anime/freezing/satellizer-l-bridget/satellizer-l-bridget-costas-189189.webp",
      thumb:
        "thumb/anime/freezing/satellizer-l-bridget/satellizer-l-bridget-costas-189189.webp",
      notes:
        "Correcao visual: imagem de costas pertence ao mesmo set Satellizer el Bridget/Freezing; nao deve ficar em Asuna.",
    },
    {
      id: "145757",
      name: "Asuna Ichinose",
      originalName: "asuna ichinose dress",
      aliases: ["Ichinose Asuna"],
      category: "games",
      source: "Blue Archive",
      sourceType: "game",
      group: "blue-archive",
      slug: "asuna-ichinose",
      tags: ["Blue Archive", "Asuna Ichinose", "Ichinose Asuna"],
      display:
        "display/games/blue-archive/asuna-ichinose/asuna-ichinose-vestido-145757.webp",
      thumb:
        "thumb/games/blue-archive/asuna-ichinose/asuna-ichinose-vestido-145757.webp",
      notes:
        "Correcao visual e por busca: produto corresponde a Dress Asuna/Blue Archive; nao e Asuna Yuuki de Sword Art Online.",
    },
  ].map(directReviewOverride),
);

const CAVALEIROS_HIERARCHY_BY_SLUG = new Map([
  ["afrodite-de-peixes", "cavaleiros-de-ouro"],
  ["aldebaran-de-touro", "cavaleiros-de-ouro"],
  ["camus-de-aquario", "cavaleiros-de-ouro"],
  ["deathmask-cancer", "cavaleiros-de-ouro"],
  ["manigoldo-de-cancer", "cavaleiros-de-ouro"],
  ["mu-de-aries", "cavaleiros-de-ouro"],
  ["saga-de-gemeos", "cavaleiros-de-ouro"],
  ["scorpio-milo", "cavaleiros-de-ouro"],
  ["shion-de-aries", "cavaleiros-de-ouro"],
  ["shura-de-capricornio", "cavaleiros-de-ouro"],
  ["andromeda-shun", "cavaleiros-de-bronze"],
  ["hyoga-de-cisne", "cavaleiros-de-bronze"],
  ["jabu-de-unicornio", "cavaleiros-de-bronze"],
  ["pegasus-seiya-e-baby-athena", "cavaleiros-de-bronze"],
  ["phoenix-ikki", "cavaleiros-de-bronze"],
  ["seiya", "cavaleiros-de-bronze"],
  ["seiya-de-pegasus", "cavaleiros-de-bronze"],
  ["algol-de-perseu", "cavaleiros-de-prata"],
  ["black-andromeda", "cavaleiros-negros"],
  ["athena-saori", "deuses-e-aliados"],
  ["hilda-de-polaris", "deuses-e-aliados"],
  ["poseidon", "deuses-e-aliados"],
  ["odisseu-de-ofiuco", "cavaleiros-de-ouro"],
  ["poseidon-saint", "outros-personagens"],
  ["acubens", "outros-personagens"],
  ["gold-saint", "outros-personagens"],
  ["saint-seiya", "outros-personagens"],
]);

const CAVALEIROS_HIERARCHY_LABELS = {
  "cavaleiros-de-bronze": "Cavaleiros de Bronze",
  "cavaleiros-de-ouro": "Cavaleiros de Ouro",
  "cavaleiros-de-prata": "Cavaleiros de Prata",
  "cavaleiros-negros": "Cavaleiros Negros",
  "deuses-e-aliados": "Deuses e Aliados",
  "outros-personagens": "Outros Personagens",
};

const PUBLIC_PATH_MODELER_TOKENS = [
  "3dmoon",
  "3dmoonn",
  "blue-spray",
  "bluespray",
  "extra-guy",
  "gatsu",
  "grand-figures",
  "grandfigures",
  "heraldo-sculpts",
  "heraldosculpts",
  "kuru",
  "kuru-figure",
  "kuru-figures",
  "kuruf",
  "kurufigure",
  "kurufigures",
  "la-figures",
  "lafigures",
  "loot-box",
  "lootbox",
  "lucas-perez",
  "myanimate",
  "nomnom",
  "nomnom-figures",
  "chuyafactory",
  "plukit",
  "serik",
  "tanuki-figures",
  "tanukifigures",
  "toymakr",
  "toymakr3d",
];

function normalizeRelpath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
}

function comparableCatalogText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePathRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeTags(...groups) {
  const tags = [];
  const seen = new Set();
  for (const group of groups) {
    const values = Array.isArray(group) ? group : [group];
    for (const value of values) {
      const tag = String(value || "").trim();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function overrideField(override, key, fallback) {
  return Object.prototype.hasOwnProperty.call(override, key)
    ? override[key]
    : fallback;
}

function sanitizePublicPathSegment(segment) {
  let next = String(segment || "");
  for (const token of PUBLIC_PATH_MODELER_TOKENS) {
    const pattern = new RegExp(
      `(^|[-_])${escapePathRegExp(token).replaceAll("-", "[-_]")}(?=([-_.]|$))`,
      "gi",
    );
    next = next.replace(pattern, "$1");
  }
  return next
    .replace(/[-_]{2,}/g, "-")
    .replace(/[-_]+(?=\.)/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function sanitizePublicRelpath(relpath) {
  return normalizeRelpath(relpath)
    .split("/")
    .map(sanitizePublicPathSegment)
    .join("/");
}

OVERRIDES.push(
  ...[
    {
      id: "107207",
      name: "Lucy Heartfilia",
      originalName: "lucy heartfilia com happy",
      aliases: ["Lucy"],
      category: "anime",
      source: "Fairy Tail",
      sourceType: "anime",
      group: "fairy-tail",
      slug: "lucy-heartfilia",
      tags: ["Fairy Tail", "Lucy Heartfilia", "Happy"],
      display:
        "display/anime/fairy-tail/lucy-heartfilia/lucy-heartfilia-com-happy-107207.webp",
      thumb:
        "thumb/anime/fairy-tail/lucy-heartfilia/lucy-heartfilia-com-happy-107207.webp",
      notes:
        "Passada visual Sailor Moon: personagem com chaves e Happy ao lado corresponde a Lucy Heartfilia de Fairy Tail, nao Sailor Moon.",
    },
    {
      id: "102191",
      name: "Mascara Freeza",
      originalName: "freeza mask",
      aliases: ["Frieza"],
      category: "fora-catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "mascaras",
      slug: "mascara-freeza",
      tags: ["Dragon Ball", "Freeza", "Mascara"],
      display:
        "display/fora-catalogo/mascaras/dragon-ball/mascara-freeza-102191.webp",
      thumb:
        "thumb/fora-catalogo/mascaras/dragon-ball/mascara-freeza-102191.webp",
      notes:
        "Passada visual Sailor Moon: imagem mostra mascara/cabeca de Freeza, nao Silver Crystal; item fora do catalogo publico de figuras.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Mascara/prop sem figura completa; manter fora do catalogo publico.",
    },
    ...["79140", "79141", "79143", "79144"].map((id, index) => ({
      id,
      name: "Kiwi",
      originalName: "kiwi cyberpunk edgerunners",
      aliases: [],
      category: "anime",
      source: "Cyberpunk Edgerunners",
      sourceType: "anime",
      group: "cyberpunk-edgerunners",
      slug: "kiwi",
      tags: ["Cyberpunk Edgerunners", "Kiwi"],
      display: `display/anime/cyberpunk-edgerunners/kiwi/kiwi-pistola-moto-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/cyberpunk-edgerunners/kiwi/kiwi-pistola-moto-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual Cyberpunk: cabelo loiro claro, arma e mandibula/mascara vermelha batem com Kiwi; nao Lucy Kushinada.",
    })),
    ...["112673", "112674"].map((id, index) => ({
      id,
      name: "Yolei Inoue e Hawkmon",
      originalName: "yolei inoue e hawkmon",
      aliases: ["Miyako Inoue", "Hawkmon"],
      category: "anime",
      source: "Digimon",
      sourceType: "anime",
      group: "digimon",
      slug: "yolei-inoue-e-hawkmon",
      tags: ["Digimon", "Yolei Inoue", "Miyako Inoue", "Hawkmon"],
      display: `display/anime/digimon/yolei-inoue-e-hawkmon/yolei-inoue-e-hawkmon-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/digimon/yolei-inoue-e-hawkmon/yolei-inoue-e-hawkmon-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual Digimon: personagem humana com o parceiro Hawkmon; remover pasta generica Bird Digimon.",
    })),
    {
      id: "177024",
      name: "Sakuyamon",
      originalName: "sakuyamon nsfw",
      aliases: [],
      category: "anime",
      source: "Digimon",
      sourceType: "anime",
      group: "digimon",
      slug: "sakuyamon",
      variantName: "NSFW",
      tags: ["Digimon", "Sakuyamon", "nsfw", "sensitive-blur"],
      display: "display/anime/digimon/sakuyamon/sakuyamon-nsfw-177024.webp",
      thumb: "thumb/anime/digimon/sakuyamon/sakuyamon-nsfw-177024.webp",
      notes:
        "Passada visual Digimon: variacao adulta/NSFW da Sakuyamon; manter no personagem correto com blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    ...["104234", "104236", "104237", "104238", "104239"].map((id, index) => ({
      id,
      name: "Satsuki Kiryuin",
      originalName: "satsuki kiryuin junketsu",
      aliases: ["Satsuki Kiryuuin"],
      category: "anime",
      source: "Kill la Kill",
      sourceType: "anime",
      group: "kill-la-kill",
      slug: "satsuki-kiryuin",
      tags: ["Kill la Kill", "Satsuki Kiryuin", "Junketsu"],
      display: `display/anime/kill-la-kill/satsuki-kiryuin/satsuki-kiryuin-junketsu-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/kill-la-kill/satsuki-kiryuin/satsuki-kiryuin-junketsu-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual Evangelion: personagem e Satsuki Kiryuin de Kill la Kill; nao Eva Unit/Evangelion.",
    })),
    {
      id: "102647",
      name: "Rei Ayanami",
      originalName: "rei ayanami nsfw",
      aliases: [],
      category: "anime",
      source: "Evangelion",
      sourceType: "anime",
      group: "evangelion",
      slug: "rei-ayanami",
      variantName: "NSFW",
      tags: ["Evangelion", "Rei Ayanami", "nsfw", "sensitive-blur"],
      display:
        "display/anime/evangelion/rei-ayanami/rei-ayanami-nsfw-102647.webp",
      thumb:
        "thumb/anime/evangelion/rei-ayanami/rei-ayanami-nsfw-102647.webp",
      notes:
        "Passada visual Evangelion: variacao adulta/NSFW de Rei Ayanami; manter no personagem correto com blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    {
      id: "151950",
      name: "Misato Katsuragi",
      originalName: "misato katsuragi nsfw",
      aliases: [],
      category: "anime",
      source: "Evangelion",
      sourceType: "anime",
      group: "evangelion",
      slug: "misato-katsuragi",
      variantName: "NSFW",
      tags: ["Evangelion", "Misato Katsuragi", "nsfw", "sensitive-blur"],
      display:
        "display/anime/evangelion/misato-katsuragi/misato-katsuragi-nsfw-151950.webp",
      thumb:
        "thumb/anime/evangelion/misato-katsuragi/misato-katsuragi-nsfw-151950.webp",
      notes:
        "Passada visual Evangelion: variacao adulta/NSFW de Misato Katsuragi; manter no personagem correto com blur.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
    },
    ...["112746", "112747", "112748", "112749", "112750", "112751"].map(
      (id, index) => ({
        id,
        name: "Asuka Langley",
        originalName: "asuka langley nsfw red plugsuit",
        aliases: ["Asuka Langley Soryu", "Asuka Shikinami Langley"],
        category: "anime",
        source: "Evangelion",
        sourceType: "anime",
        group: "evangelion",
        slug: "asuka-langley",
        variantName: "NSFW",
        tags: ["Evangelion", "Asuka Langley", "nsfw", "sensitive-blur"],
        display: `display/anime/evangelion/asuka-langley/asuka-langley-nsfw-${
          index + 1
        }-${id}.webp`,
        thumb: `thumb/anime/evangelion/asuka-langley/asuka-langley-nsfw-${
          index + 1
        }-${id}.webp`,
        notes:
          "Passada visual Evangelion: variacao adulta/NSFW de Asuka Langley; manter no personagem correto com blur.",
        taxonomyAppliedReason:
          "Correcao manual confirmada visualmente; variacao adulta catalogada com blur no site.",
      }),
    ),
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "122070",
      variantName: "Cabecas",
      display:
        "display/anime/gundam/gundam/busto-gundam-cabecas-122070.webp",
      thumb: "thumb/anime/gundam/gundam/busto-gundam-cabecas-122070.webp",
    },
    {
      id: "122071",
      variantName: "Cabeca impressao monocor",
      display:
        "display/anime/gundam/gundam/busto-gundam-cabeca-monocor-122071.webp",
      thumb:
        "thumb/anime/gundam/gundam/busto-gundam-cabeca-monocor-122071.webp",
    },
    {
      id: "122072",
      variantName: "Cabeca impressa",
      display:
        "display/anime/gundam/gundam/busto-gundam-cabeca-impressa-122072.webp",
      thumb:
        "thumb/anime/gundam/gundam/busto-gundam-cabeca-impressa-122072.webp",
    },
    {
      id: "122073",
      variantName: "Cabeca multicolor",
      display:
        "display/anime/gundam/gundam/busto-gundam-cabeca-multicolor-122073.webp",
      thumb:
        "thumb/anime/gundam/gundam/busto-gundam-cabeca-multicolor-122073.webp",
    },
    {
      id: "173610",
      variantName: "Cabeca",
      display:
        "display/anime/gundam/gundam/busto-gundam-cabeca-1-173610.webp",
      thumb: "thumb/anime/gundam/gundam/busto-gundam-cabeca-1-173610.webp",
    },
  ].map((entry) =>
    directReviewOverride({
      ...entry,
      name: "Busto Gundam",
      originalName: "gundam head bust",
      aliases: ["Gundam Head"],
      category: "anime",
      source: "Gundam",
      sourceType: "anime",
      group: "gundam",
      slug: "gundam",
      tags: ["Gundam", "Busto", "Cabeca"],
      notes:
        "Passada visual Gundam: item e cabeca/busto de Gundam, nao figura completa; manter nome e tags de busto/cabeca no site.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; separa cabeca/busto de Gundam da figura completa no agrupamento do catalogo.",
    }),
  ),
);

OVERRIDES.push(
  ...[
    {
      id: "188179",
      name: "Naruto Uzumaki",
      originalName: "naruto uzumaki chibi",
      aliases: ["Naruto"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "naruto-uzumaki",
      variantName: "Chibi",
      tags: ["Naruto", "Naruto Uzumaki", "Chibi"],
      display:
        "display/anime/naruto/naruto-uzumaki/naruto-uzumaki-chibi-188179.webp",
      thumb:
        "thumb/anime/naruto/naruto-uzumaki/naruto-uzumaki-chibi-188179.webp",
      notes:
        "Passada visual One Piece: imagem mostra Naruto Uzumaki chibi, nao Kaido/One Piece.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; remover Naruto da pasta Kaido/One Piece.",
    },
    {
      id: "175886",
      name: "Mao Com Controle",
      originalName: "franky hand controller accessory",
      aliases: ["Franky"],
      category: "fora catalogo",
      source: "One Piece",
      sourceType: "non_catalog",
      group: "acessorios",
      slug: "mao-com-controle",
      tags: ["One Piece", "Franky", "Acessorio", "Controle"],
      display:
        "display/fora-catalogo/acessorios/one-piece/mao-com-controle-175886.webp",
      thumb:
        "thumb/fora-catalogo/acessorios/one-piece/mao-com-controle-175886.webp",
      notes:
        "Passada visual One Piece: imagem mostra uma mao com controle, nao busto/figura completa de Franky.",
      curationStatus: "excluded_non_catalog_asset",
      taxonomyAppliedReason:
        "Acessorio/parte isolada; manter rastreavel fora do catalogo publico de figuras/personagens.",
    },
    ...[
      "107945",
      "107946",
      "107947",
      "107948",
      "172846",
      "172851",
      "172852",
      "172853",
      "172854",
    ].map((id, index) => ({
      id,
      name: "Boa Hancock",
      originalName: "boa hancock nsfw",
      aliases: [],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "boa-hancock",
      variantName: "NSFW",
      tags: ["One Piece", "Boa Hancock", "nsfw", "sensitive-blur"],
      display: `display/anime/one-piece/boa-hancock/boa-hancock-nsfw-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/one-piece/boa-hancock/boa-hancock-nsfw-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual One Piece: variacao adulta de Boa Hancock; manter personagem correto com blur no site.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como Boa Hancock com blur, sem virar capa normal.",
    })),
    ...["178602", "178603", "178604", "178605"].map((id, index) => ({
      id,
      name: "Yamato",
      originalName: "yamato nsfw kimono",
      aliases: [],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "yamato",
      variantName: "NSFW",
      tags: ["One Piece", "Yamato", "nsfw", "sensitive-blur"],
      display: `display/anime/one-piece/yamato/yamato-nsfw-kimono-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/one-piece/yamato/yamato-nsfw-kimono-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual One Piece: variacao adulta de Yamato em kimono; manter personagem correto com blur no site.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como Yamato com blur, sem virar capa normal.",
    })),
    {
      id: "114753",
      name: "Hinata Hyuga",
      originalName: "hinata hyuga nsfw",
      aliases: [],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "hinata-hyuga",
      variantName: "NSFW",
      tags: ["Naruto", "Hinata Hyuga", "nsfw", "sensitive-blur"],
      display: "display/anime/naruto/hinata-hyuga/hinata-hyuga-nsfw-114753.webp",
      thumb: "thumb/anime/naruto/hinata-hyuga/hinata-hyuga-nsfw-114753.webp",
      notes:
        "Passada visual Naruto: variacao adulta de Hinata Hyuga; manter personagem correto com blur no site.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como Hinata Hyuga com blur, sem virar capa normal.",
    },
    ...["108367", "108371"].map((id, index) => ({
      id,
      name: "Naruto Uzumaki",
      originalName: "naruto jutsu sexy",
      aliases: ["Naruto Sexy Jutsu"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "naruto-uzumaki",
      variantName: "Jutsu Sexy",
      tags: ["Naruto", "Naruto Uzumaki", "Jutsu Sexy", "nsfw", "sensitive-blur"],
      display: `display/anime/naruto/naruto-uzumaki/naruto-uzumaki-jutsu-sexy-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/naruto/naruto-uzumaki/naruto-uzumaki-jutsu-sexy-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual Naruto: a imagem identifica Naruto Jutsu Sexy; nao Sakura Haruno.",
      taxonomyAppliedReason:
        "Correcao manual confirmada visualmente; variacao sensivel de Naruto deve ficar com blur.",
    })),
    ...[
      "180405",
      "180406",
      "180407",
      "180408",
      "180409",
      "180410",
      "180411",
    ].map((id, index) => ({
      id,
      name: "Tsunade e Jiraiya e Gamakichi",
      originalName: "tsunade jiraiya gamakichi nsfw",
      aliases: ["Tsunade", "Jiraiya", "Gamakichi"],
      category: "anime",
      source: "Naruto",
      sourceType: "anime",
      group: "naruto",
      slug: "tsunade-e-jiraiya-e-gamakichi",
      variantName: "NSFW",
      tags: ["Naruto", "Tsunade", "Jiraiya", "Gamakichi", "nsfw", "sensitive-blur"],
      display: `display/anime/naruto/tsunade-e-jiraiya-e-gamakichi/tsunade-e-jiraiya-e-gamakichi-nsfw-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/naruto/tsunade-e-jiraiya-e-gamakichi/tsunade-e-jiraiya-e-gamakichi-nsfw-${
        index + 1
      }-${id}.webp`,
      notes:
        "Passada visual Naruto: variacao adulta de Tsunade/Jiraiya/Gamakichi; manter personagens corretos com blur no site.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como variacao com blur, sem virar capa normal.",
    })),
  ].map(directReviewOverride),
);

OVERRIDES.push(
  ...[
    {
      id: "105776",
      name: "Bardock",
      originalName: "bardock",
      aliases: ["Bardack"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "bardock",
      tags: ["Dragon Ball", "Bardock", "Saiyajin", "Sayajin"],
      display: "display/anime/dragon-ball/bardock/bardock-105776.webp",
      thumb: "thumb/anime/dragon-ball/bardock/bardock-105776.webp",
      notes:
        "Passada visual Dragon Ball: imagem mostra Bardock com bandana vermelha e armadura Saiyajin; nao e Vegeta.",
    },
    {
      id: "110396",
      name: "Vegeta",
      originalName: "vegeta super saiyajin",
      aliases: [],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "vegeta",
      variantName: "Super Saiyajin",
      tags: ["Dragon Ball", "Vegeta", "Super Saiyajin", "Sayajin"],
      display: "display/anime/dragon-ball/vegeta/vegeta-super-saiyajin-110396.webp",
      thumb: "thumb/anime/dragon-ball/vegeta/vegeta-super-saiyajin-110396.webp",
      notes:
        "Passada visual Dragon Ball: item estava generico como Saiyans, mas a imagem principal e Vegeta Super Saiyajin.",
    },
    {
      id: "115991",
      name: "Conjunto Saiyajins Dragon Ball GT",
      originalName: "dragon ball gt saiyans set",
      aliases: ["Goku SSJ4", "Vegeta SSJ4", "Gogeta SSJ4", "Oozaru Dourado"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "conjunto-saiyajins-dragon-ball-gt",
      tags: [
        "Dragon Ball",
        "Dragon Ball GT",
        "Saiyajins",
        "Sayajin",
        "Goku",
        "Vegeta",
        "Gogeta",
        "Oozaru",
        "Conjunto",
      ],
      display:
        "display/anime/dragon-ball/conjunto-saiyajins-dragon-ball-gt/conjunto-saiyajins-dragon-ball-gt-115991.webp",
      thumb:
        "thumb/anime/dragon-ball/conjunto-saiyajins-dragon-ball-gt/conjunto-saiyajins-dragon-ball-gt-115991.webp",
      notes:
        "Passada visual Dragon Ball: diorama de grupo de Dragon Ball GT; nao deve aparecer como card generico Saiyans.",
    },
    {
      id: "124060",
      name: "Videl (Grande Saiyaman 2)",
      originalName: "great saiyaman",
      aliases: ["Videl", "Grande Saiyaman 2", "Great Saiyawoman"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "videl-grande-saiyaman-2",
      tags: ["Dragon Ball", "Videl", "Grande Saiyaman 2", "Terraqueo"],
      display:
        "display/anime/dragon-ball/great-saiyaman/great-saiyaman-cape-1-124060.webp",
      thumb:
        "thumb/anime/dragon-ball/great-saiyaman/great-saiyaman-cape-1-124060.webp",
      notes:
        "Correcao visual: a escultura feminina com uniforme Great Saiyaman corresponde a Videl em sua forma Grande Saiyaman 2.",
    },
    {
      id: "124062",
      name: "Videl (Grande Saiyaman 2)",
      originalName: "great saiyaman",
      aliases: ["Videl", "Grande Saiyaman 2", "Great Saiyawoman"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "videl-grande-saiyaman-2",
      tags: ["Dragon Ball", "Videl", "Grande Saiyaman 2", "Terraqueo"],
      display: "display/anime/dragon-ball/great-saiyaman/great-saiyaman-1-124062.webp",
      thumb: "thumb/anime/dragon-ball/great-saiyaman/great-saiyaman-1-124062.webp",
      notes:
        "Correcao visual: a escultura feminina com uniforme Great Saiyaman corresponde a Videl em sua forma Grande Saiyaman 2.",
    },
    {
      id: "101246",
      name: "Cell, Majin Boo e Freeza",
      originalName: "kid buu babidi",
      aliases: ["Cell", "Majin Boo", "Freeza"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "cell-majin-boo-freeza",
      tags: ["Dragon Ball", "Cell", "Majin Boo", "Freeza", "Conjunto"],
      display:
        "display/anime/dragon-ball/kid-buu-babidi/kid-buu-babidi-group-101246.webp",
      thumb:
        "thumb/anime/dragon-ball/kid-buu-babidi/kid-buu-babidi-group-101246.webp",
      notes:
        "Correcao visual: o conjunto nao mostra Kid Buu com Babidi; a imagem corresponde ao trio Cell, Majin Boo e Freeza.",
    },
    {
      id: "101965",
      name: "Vegetto",
      originalName: "dragon ball miniatures",
      aliases: ["Vegetto", "Vegito"],
      category: "anime",
      source: "Dragon Ball Z",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "vegetto",
      tags: ["Dragon Ball Z", "Vegetto", "Vegito", "Sayajin"],
      display:
        "display/anime/dragon-ball/dragon-ball-miniatures/dragon-ball-miniature-set-101965.webp",
      thumb:
        "thumb/anime/dragon-ball/dragon-ball-miniatures/dragon-ball-miniature-set-101965.webp",
      notes:
        "Correcao visual: a imagem nao e um busto; corresponde a uma figura completa do Vegetto.",
    },
    {
      id: "108388",
      name: "Vegetto",
      originalName: "vegeto",
      aliases: ["Vegito"],
      category: "anime",
      source: "Dragon Ball Z",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "vegetto",
      tags: ["Dragon Ball Z", "Vegetto", "Vegito", "Sayajin"],
      display: "display/anime/dragon-ball/vegeto/vegeto-dragon-ball-108388.webp",
      thumb: "thumb/anime/dragon-ball/vegeto/vegeto-dragon-ball-108388.webp",
      notes:
        "Normalizacao visual: a escultura corresponde a Vegetto; manter grafia publica consistente.",
    },
    {
      id: "180728",
      name: "Busto Recoome",
      originalName: "jeice bust",
      aliases: ["Recoome"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "recoome",
      variantName: "Busto",
      tags: ["Dragon Ball", "Recoome", "Busto", "Ginyu"],
      display: "display/anime/dragon-ball/jeice/jeice-bust-1-180728.webp",
      thumb: "thumb/anime/dragon-ball/jeice/jeice-bust-1-180728.webp",
      notes:
        "Correcao visual: o busto estava como Jeice, mas a escultura corresponde a Recoome.",
    },
    {
      id: "181460",
      name: "Goku e Chi-Chi",
      originalName: "goku e chi chi",
      aliases: ["Chi-Chi", "Chichi"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "goku-e-chi-chi",
      tags: ["Dragon Ball", "Goku", "Chi-Chi", "Sayajin"],
      display: "display/anime/dragon-ball/goku-e-chi-chi/goku-e-chi-chi-dinner-1-181460.webp",
      thumb: "thumb/anime/dragon-ball/goku-e-chi-chi/goku-e-chi-chi-dinner-1-181460.webp",
      notes:
        "Correcao visual: a tag de Chi-Chi estava truncada como Chi; padronizar a dupla como Goku e Chi-Chi.",
    },
    {
      id: "180730",
      name: "Kaioshin do Sul",
      originalName: "dodoria",
      aliases: ["South Supreme Kai", "Kaioshin do Sul"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "kaioshin-do-sul",
      tags: ["Dragon Ball", "Kaioshin do Sul", "Kaioshin"],
      display: "display/anime/dragon-ball/dodoria/dodoria-1-180730.webp",
      thumb: "thumb/anime/dragon-ball/dodoria/dodoria-1-180730.webp",
      notes:
        "Correcao visual sugerida: personagem nao e Dodoria; o visual corresponde ao Kaioshin do Sul.",
    },
    {
      id: "180444",
      name: "Tropa do Orgulho",
      originalName: "ginyu force",
      aliases: ["Pride Troopers", "Universo 11", "Jiren", "Toppo", "Dyspo"],
      category: "anime",
      source: "Dragon Ball Super",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "tropa-do-orgulho",
      tags: ["Dragon Ball Super", "Tropa do Orgulho", "Jiren", "Toppo", "Dyspo", "Universo 11"],
      display: "display/anime/dragon-ball/forcas-especiais-ginyu/ginyu-force-1-180444.webp",
      thumb: "thumb/anime/dragon-ball/forcas-especiais-ginyu/ginyu-force-1-180444.webp",
      notes:
        "Correcao visual: a imagem nao corresponde a Forcas Especiais Ginyu; o grupo e a Tropa do Orgulho/Universo 11.",
    },
    {
      id: "180635",
      name: "Busto Voldemort",
      originalName: "krillin bust",
      aliases: ["Lord Voldemort", "Voldemort"],
      category: "filmes-series",
      source: "Harry Potter",
      sourceType: "movie",
      group: "viloes",
      slug: "voldemort",
      variantName: "Busto",
      tags: ["Harry Potter", "Voldemort", "Busto"],
      display: "display/anime/dragon-ball/kuririn/krillin-bust-1-180635.webp",
      thumb: "thumb/anime/dragon-ball/kuririn/krillin-bust-1-180635.webp",
      notes:
        "Correcao visual: o busto nao e Kuririn; o visual corresponde a Voldemort.",
    },
    {
      id: "180612",
      name: "Busto Shiryu",
      originalName: "king piccolo bust",
      aliases: ["Shiryu", "Dragao"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "shiryu",
      variantName: "Busto",
      tags: ["Cavaleiros do Zodiaco", "Shiryu", "Busto", "Dragao"],
      display: "display/anime/dragon-ball/king-piccolo/king-piccolo-bust-1-180612.webp",
      thumb: "thumb/anime/dragon-ball/king-piccolo/king-piccolo-bust-1-180612.webp",
      notes:
        "Correcao visual: o busto nao e King Piccolo; o visual corresponde a Shiryu de Cavaleiros do Zodiaco.",
    },
    {
      id: "177647",
      name: "Busto Vegapunk",
      originalName: "dr briefs apple bust",
      aliases: ["Dr. Vegapunk", "Vegapunk"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "vegapunk",
      variantName: "Busto",
      tags: ["One Piece", "Vegapunk", "Busto"],
      display: "display/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-1-177647.webp",
      thumb: "thumb/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-1-177647.webp",
      notes:
        "Correcao visual: o busto nao e Dr. Briefs; o visual corresponde a Vegapunk de One Piece.",
    },
    {
      id: "177648",
      name: "Busto Silvers Rayleigh",
      originalName: "dr briefs",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-2-177648.webp",
      thumb: "thumb/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-2-177648.webp",
      notes:
        "Correcao visual: a variacao nao e Dr. Briefs; o busto corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "177649",
      name: "Busto Silvers Rayleigh",
      originalName: "dr briefs",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-3-177649.webp",
      thumb: "thumb/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-3-177649.webp",
      notes:
        "Correcao visual: a variacao nao e Dr. Briefs; o busto corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "177650",
      name: "Busto Silvers Rayleigh",
      originalName: "dr briefs",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-4-177650.webp",
      thumb: "thumb/anime/dragon-ball/dr-briefs/dr-briefs-apple-bust-1-4-177650.webp",
      notes:
        "Correcao visual: a variacao nao e Dr. Briefs; o busto corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "180708",
      name: "Busto Silvers Rayleigh",
      originalName: "dr briefs",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/dr-briefs/dr-briefs-1-180708.webp",
      thumb: "thumb/anime/dragon-ball/dr-briefs/dr-briefs-1-180708.webp",
      notes:
        "Correcao visual: a escultura nomeada como Dr. Briefs corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "175911",
      name: "Busto Silvers Rayleigh",
      originalName: "dr gero bust",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/doutor-gero/dr-gero-1-2-175911.webp",
      thumb: "thumb/anime/dragon-ball/doutor-gero/dr-gero-1-2-175911.webp",
      notes:
        "Correcao visual: o busto nao e Doutor Gero; o visual corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "175912",
      name: "Busto Silvers Rayleigh",
      originalName: "dr gero bust",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/doutor-gero/dr-gero-1-3-175912.webp",
      thumb: "thumb/anime/dragon-ball/doutor-gero/dr-gero-1-3-175912.webp",
      notes:
        "Correcao visual: o busto nao e Doutor Gero; o visual corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "175913",
      name: "Busto Silvers Rayleigh",
      originalName: "dr gero bust",
      aliases: ["Rayleigh", "Silvers Rayleigh"],
      category: "anime",
      source: "One Piece",
      sourceType: "anime",
      group: "one-piece",
      slug: "silvers-rayleigh",
      variantName: "Busto",
      tags: ["One Piece", "Silvers Rayleigh", "Rayleigh", "Busto"],
      display: "display/anime/dragon-ball/doutor-gero/dr-gero-1-4-175913.webp",
      thumb: "thumb/anime/dragon-ball/doutor-gero/dr-gero-1-4-175913.webp",
      notes:
        "Correcao visual: o busto nao e Doutor Gero; o visual corresponde a Silvers Rayleigh de One Piece.",
    },
    {
      id: "178052",
      name: "Fazendeiro",
      originalName: "android 8",
      aliases: ["NPC"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "terraqueo",
      slug: "fazendeiro",
      tags: ["Dragon Ball", "Fazendeiro", "Terraqueo", "NPC"],
      display: "display/anime/dragon-ball/androide-8/android-8-1-2-178052.webp",
      thumb: "thumb/anime/dragon-ball/androide-8/android-8-1-2-178052.webp",
      notes:
        "Correcao visual: a figura nao corresponde ao Androide 8; trata-se de um fazendeiro/NPC de Dragon Ball.",
    },
    {
      id: "178053",
      name: "Fazendeiro",
      originalName: "android 8",
      aliases: ["NPC"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "terraqueo",
      slug: "fazendeiro",
      tags: ["Dragon Ball", "Fazendeiro", "Terraqueo", "NPC"],
      display: "display/anime/dragon-ball/androide-8/android-8-1-3-178053.webp",
      thumb: "thumb/anime/dragon-ball/androide-8/android-8-1-3-178053.webp",
      notes:
        "Correcao visual: a figura nao corresponde ao Androide 8; trata-se de um fazendeiro/NPC de Dragon Ball.",
    },
    {
      id: "178054",
      name: "Fazendeiro",
      originalName: "android 8",
      aliases: ["NPC"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "terraqueo",
      slug: "fazendeiro",
      tags: ["Dragon Ball", "Fazendeiro", "Terraqueo", "NPC"],
      display: "display/anime/dragon-ball/androide-8/android-8-1-4-178054.webp",
      thumb: "thumb/anime/dragon-ball/androide-8/android-8-1-4-178054.webp",
      notes:
        "Correcao visual: a figura nao corresponde ao Androide 8; trata-se de um fazendeiro/NPC de Dragon Ball.",
    },
    {
      id: "165304",
      name: "Gohan",
      originalName: "tapion dragon ball",
      aliases: ["Son Gohan"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gohan",
      tags: ["Dragon Ball", "Gohan", "Sayajin"],
      display: "display/anime/dragon-ball/tapion/tapion-dragon-ball-1-165304.webp",
      thumb: "thumb/anime/dragon-ball/tapion/tapion-dragon-ball-1-165304.webp",
      notes:
        "Correcao visual: a figura nao e Tapion; o personagem mostrado e Gohan.",
    },
    {
      id: "133692",
      name: "Nappa",
      originalName: "mr satan dragon ball z",
      aliases: ["Nappa"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "nappa",
      tags: ["Dragon Ball", "Nappa", "Sayajin"],
      display: "display/anime/dragon-ball/mr-satan/mr-satan-dragon-ball-z-1-133692.webp",
      thumb: "thumb/anime/dragon-ball/mr-satan/mr-satan-dragon-ball-z-1-133692.webp",
      notes:
        "Correcao visual: a figura nao e Mr Satan; o personagem mostrado e Nappa.",
    },
    {
      id: "113213",
      name: "Goku e Kuririn",
      originalName: "goku and krillin dragon ball figure",
      aliases: ["Kuririn", "Krillin"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "goku-e-kuririn",
      tags: ["Dragon Ball", "Goku", "Kuririn", "Sayajin"],
      display: "display/anime/dragon-ball/goku-krillin/goku-and-krillin-dragon-ball-figure-113213.webp",
      thumb: "thumb/anime/dragon-ball/goku-krillin/goku-and-krillin-dragon-ball-figure-113213.webp",
      notes:
        "Correcao visual: o nome nao deve ficar como Goku Krillin; padronizar como Goku e Kuririn.",
    },
    {
      id: "139415",
      name: "Gohan e Androides",
      originalName: "goku vegeta attack",
      aliases: ["Gohan", "Androides"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "gohan-e-androides",
      tags: ["Dragon Ball", "Gohan", "Androides", "Sayajin"],
      display: "display/anime/dragon-ball/goku-vegeta/goku-vegeta-attack-1-139415.webp",
      thumb: "thumb/anime/dragon-ball/goku-vegeta/goku-vegeta-attack-1-139415.webp",
      notes:
        "Correcao visual: a cena nao e Goku e Vegeta; a leitura correta e Gohan e Androides.",
    },
    {
      id: "178051",
      name: "NPC Dragon Ball",
      originalName: "android 8",
      aliases: ["Androide 8", "Android 8"],
      category: "fora catalogo",
      source: "Dragon Ball",
      sourceType: "non_catalog",
      group: "dragon-ball",
      slug: "npc-dragon-ball",
      variantName: "Revisao",
      tags: ["fora catalogo", "Dragon Ball", "NPC"],
      display: "display/anime/dragon-ball/androide-8/android-8-1-1-178051.webp",
      thumb: "thumb/anime/dragon-ball/androide-8/android-8-1-1-178051.webp",
      notes:
        "Imagem sem identificacao segura para o catalogo publico; nao manter como Androide 8.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identificacao visual nao confiavel; manter fora do catalogo ate confirmacao melhor.",
    },
    {
      id: "180700",
      name: "Mestre Anciao",
      originalName: "zuno",
      aliases: ["Mestre Ancião", "Mestre Anciao"],
      category: "anime",
      source: "Cavaleiros do Zodiaco",
      sourceType: "anime",
      group: "cavaleiros-de-bronze",
      slug: "mestre-anciao",
      tags: ["Cavaleiros do Zodiaco", "Mestre Anciao"],
      display: "display/anime/dragon-ball/zuno/zuno-1-180700.webp",
      thumb: "thumb/anime/dragon-ball/zuno/zuno-1-180700.webp",
      notes:
        "Correcao visual sugerida pelo usuario: nao e Zuno; o item deve ser reavaliado como Mestre Anciao/CDZ.",
      curationStatus: "blocked_review",
      taxonomyAppliedReason:
        "Identificacao visual ainda nao segura para liberar no catalogo publico.",
    },
    ...["176287", "176288", "176289"].map((id, index) => ({
      id,
      name: "Arale Norimaki",
      originalName: "arale norimaki",
      aliases: ["Arale"],
      category: "anime",
      source: "Dr. Slump",
      sourceType: "anime",
      group: "dr-slump",
      slug: "arale-norimaki",
      tags: ["Dr. Slump", "Arale Norimaki", "Arale"],
      display: `display/anime/dr-slump/arale-norimaki/arale-norimaki-lucas-perez-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/anime/dr-slump/arale-norimaki/arale-norimaki-lucas-perez-${
        index + 1
      }-${id}.webp`,
      notes:
        "Correcao da folha Dragon Ball: menina de cabelo roxo, bone e jardineira e Arale Norimaki de Dr. Slump; nao e Bulma.",
    })),
    {
      id: "112255",
      name: "Launch",
      originalName: "launch scooter",
      aliases: ["Lunch"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "launch",
      tags: ["Dragon Ball", "Launch", "Lunch"],
      display: "display/anime/dragon-ball/launch/launch-scooter-112255.webp",
      thumb: "thumb/anime/dragon-ball/launch/launch-scooter-112255.webp",
      notes:
        "Correcao da folha Dragon Ball: personagem loira armada na scooter e Launch, nao Bulma.",
    },
    {
      id: "180732",
      name: "Launch",
      originalName: "launch chibi bike",
      aliases: ["Lunch"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "launch",
      variantName: "Chibi",
      tags: ["Dragon Ball", "Launch", "Lunch", "Chibi"],
      display: "display/anime/dragon-ball/launch/launch-chibi-bike-180732.webp",
      thumb: "thumb/anime/dragon-ball/launch/launch-chibi-bike-180732.webp",
      notes:
        "Correcao da folha Dragon Ball: personagem loira armada na moto e Launch, nao Bulma.",
    },
    {
      id: "133900",
      name: "Leona Heidern",
      originalName: "leona heidern chibi",
      aliases: ["Leona"],
      category: "games",
      source: "The King of Fighters",
      sourceType: "game",
      group: "the-king-of-fighters",
      slug: "leona",
      variantName: "Chibi",
      tags: ["The King of Fighters", "Leona Heidern", "Leona", "Chibi"],
      display: "display/games/the-king-of-fighters/leona/leona-heidern-chibi-133900.webp",
      thumb: "thumb/games/the-king-of-fighters/leona/leona-heidern-chibi-133900.webp",
      notes:
        "Correcao da folha Dragon Ball: base da imagem identifica The King of Fighters; personagem e Leona Heidern, nao Bulma.",
    },
    {
      id: "173322",
      name: "Bulma",
      originalName: "bulma tennis nsfw",
      aliases: [],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "bulma",
      variantName: "NSFW",
      tags: ["Dragon Ball", "Bulma", "nsfw", "sensitive-blur"],
      display: "display/anime/dragon-ball/bulma/bulma-tennis-nsfw-173322.webp",
      thumb: "thumb/anime/dragon-ball/bulma/bulma-tennis-nsfw-173322.webp",
      notes:
        "Passada visual Dragon Ball: mantido como Bulma pelo nome de origem, mas a pose/roupa e variacao adulta; deve aparecer com blur e nao como capa normal.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como Bulma com blur, sem virar capa normal.",
    },
    {
      id: "112737",
      name: "King",
      originalName: "king the king of fighters",
      aliases: [],
      category: "games",
      source: "The King of Fighters",
      sourceType: "game",
      group: "the-king-of-fighters",
      slug: "king",
      tags: ["The King of Fighters", "King"],
      display: "display/games/the-king-of-fighters/king/king-112737.webp",
      thumb: "thumb/games/the-king-of-fighters/king/king-112737.webp",
      notes:
        "Correcao do usuario e checagem visual: personagem e King de The King of Fighters, nao Androide 18.",
    },
    {
      id: "112738",
      name: "King",
      originalName: "king nsfw",
      aliases: [],
      category: "games",
      source: "The King of Fighters",
      sourceType: "game",
      group: "the-king-of-fighters",
      slug: "king",
      variantName: "NSFW",
      tags: ["The King of Fighters", "King", "nsfw", "sensitive-blur"],
      display: "display/games/the-king-of-fighters/king/king-nsfw-112738.webp",
      thumb: "thumb/games/the-king-of-fighters/king/king-nsfw-112738.webp",
      notes:
        "Correcao do usuario e checagem visual: variacao adulta de King de The King of Fighters; nao e Androide 18.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como King com blur, sem virar capa normal.",
    },
    ...["181090", "181091", "181092", "181093"].map((id, index) => ({
      id,
      name: "King",
      originalName: "king lingerie",
      aliases: [],
      category: "games",
      source: "The King of Fighters",
      sourceType: "game",
      group: "the-king-of-fighters",
      slug: "king",
      variantName: "Lingerie",
      tags: ["The King of Fighters", "King", "nsfw", "sensitive-blur"],
      display: `display/games/the-king-of-fighters/king/king-lingerie-${
        index + 1
      }-${id}.webp`,
      thumb: `thumb/games/the-king-of-fighters/king/king-lingerie-${
        index + 1
      }-${id}.webp`,
      notes:
        "Correcao do usuario e checagem visual: variacao adulta de King de The King of Fighters; nao e Androide 18.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como King com blur, sem virar capa normal.",
    })),
    {
      id: "181522",
      name: "Bulma",
      originalName: "bulma bunny suit",
      aliases: [],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "bulma",
      variantName: "Bunny",
      tags: ["Dragon Ball", "Bulma", "Bunny", "nsfw", "sensitive-blur"],
      display: "display/anime/dragon-ball/bulma/bulma-bunny-181522.webp",
      thumb: "thumb/anime/dragon-ball/bulma/bulma-bunny-181522.webp",
      notes:
        "Passada visual Dragon Ball: variacao adulta de Bulma em roupa bunny; manter no personagem correto com blur no site.",
      taxonomyAppliedReason:
        "Variacao visualmente adulta; catalogar como Bulma com blur, sem virar capa normal.",
    },
    {
      id: "102009",
      name: "Mestre Kame",
      originalName: "master roshi chibi",
      aliases: ["Master Roshi", "Kame Sennin"],
      category: "anime",
      source: "Dragon Ball",
      sourceType: "anime",
      group: "dragon-ball",
      slug: "mestre-kame",
      variantName: "Chibi",
      tags: ["Dragon Ball", "Mestre Kame", "Master Roshi", "Chibi"],
      display:
        "display/anime/dragon-ball/mestre-kame/mestre-kame-chibi-nomi-nomi-102009.webp",
      thumb:
        "thumb/anime/dragon-ball/mestre-kame/mestre-kame-chibi-nomi-nomi-102009.webp",
      notes:
        "Passada visual Dragon Ball: imagem e corpo inteiro/chibi do Mestre Kame; nao e busto apesar do nome de arquivo original.",
      taxonomyAppliedReason:
        "Confirmado visualmente como Mestre Kame chibi; remover tag e nome de busto.",
    },
    {
      id: "145132",
      name: "Zohouten",
      originalName: "zohouten",
      aliases: ["Zochoten", "Shitenno"],
      category: "outros",
      source: "Mitologia Japonesa",
      sourceType: "other",
      group: "mitologia-japonesa",
      slug: "zohouten",
      tags: ["Mitologia", "Zohouten", "Estatua"],
      display:
        "display/outros/mitologia-japonesa/zohouten/zohouten-sekai-term-41-145132.webp",
      thumb:
        "thumb/outros/mitologia-japonesa/zohouten/zohouten-sekai-term-41-145132.webp",
      notes:
        "Passada visual Dragon Ball: arte da imagem identifica ZOHOUTEN; nao e Goku nem Dragon Ball.",
      taxonomyAppliedReason:
        "Identificacao baseada no texto visivel da propria imagem; remover de Dragon Ball.",
    },
    {
      id: "119635",
      name: "Endeavor",
      originalName: "endeavor",
      aliases: ["Enji Todoroki"],
      category: "anime",
      source: "My Hero Academia",
      sourceType: "anime",
      group: "my-hero-academia",
      slug: "endeavor",
      tags: ["My Hero Academia", "Endeavor"],
      display:
        "display/anime/my-hero-academia/endeavor/endeavor-kaduki-119635.webp",
      thumb:
        "thumb/anime/my-hero-academia/endeavor/endeavor-kaduki-119635.webp",
      notes:
        "Passada visual Dragon Ball: base da imagem mostra My Hero Academia; personagem e Endeavor, nao Goku.",
      taxonomyAppliedReason:
        "Confirmado visualmente pelo texto My Hero Academia na base da imagem.",
    },
    {
      id: "180641",
      name: "Busto Electro",
      originalName: "electro bust",
      aliases: ["Electro", "Eletro", "Max Dillon"],
      category: "marvel",
      source: "Homem Aranha",
      sourceType: "comic",
      group: "viloes",
      slug: "electro",
      variantName: "Busto",
      tags: ["Marvel", "Homem Aranha", "Electro", "Eletro", "Busto", "Viloes Homem Aranha"],
      display:
        "display/marvel/viloes/viloes-homem-aranha/electro/busto-electro-180641.webp",
      thumb:
        "thumb/marvel/viloes/viloes-homem-aranha/electro/busto-electro-180641.webp",
      notes:
        "Correcao visual do usuario: busto com mascara classica em raios e raio no peito e Electro, vilao do Homem-Aranha; nao e Goku nem Black Flash.",
      taxonomyAppliedReason:
        "Confirmado visualmente como Electro, vilao do Homem-Aranha; mover para Marvel/viloes.",
    },
    {
      id: "105044",
      name: "Capacete Capitao America",
      originalName: "captain america sentinel helmet",
      aliases: ["Captain America", "Sam Wilson"],
      category: "marvel",
      source: "Capitao America",
      sourceType: "comic",
      group: "objetos",
      slug: "capacete-capitao-america",
      variantName: "Vermelho",
      tags: ["Marvel", "Capitao America", "Sam Wilson", "Capacete", "Objeto"],
      display:
        "display/marvel/objetos/capitao-america/capacete-capitao-america-vermelho-105044.webp",
      thumb:
        "thumb/marvel/objetos/capitao-america/capacete-capitao-america-vermelho-105044.webp",
      notes:
        "Corrigido na auditoria visual: nao e item Marvel generico; manter como objeto/acessorio do Capitao America, fora da vitrine principal de personagens.",
      taxonomyAppliedReason:
        "Identificacao refinada por revisao visual e referencia externa do modelador; classificar como objeto do Capitao America.",
    },
    {
      id: "105045",
      name: "Capacetes Capitao America",
      originalName: "captain america sentinel helmet set",
      aliases: ["Captain America", "Sam Wilson"],
      category: "marvel",
      source: "Capitao America",
      sourceType: "comic",
      group: "objetos",
      slug: "capacete-capitao-america",
      variantName: "Conjunto",
      tags: ["Marvel", "Capitao America", "Sam Wilson", "Capacete", "Objeto"],
      display:
        "display/marvel/objetos/capitao-america/capacetes-capitao-america-conjunto-105045.webp",
      thumb:
        "thumb/marvel/objetos/capitao-america/capacetes-capitao-america-conjunto-105045.webp",
      notes:
        "Corrigido na auditoria visual: conjunto de capacetes/acessorios do Capitao America; nao deve aparecer como personagem.",
      taxonomyAppliedReason:
        "Identificacao refinada por revisao visual e referencia externa do modelador; classificar como objeto do Capitao America.",
    },
    {
      id: "105047",
      name: "Capacete Capitao America",
      originalName: "captain america sentinel helmet",
      aliases: ["Captain America", "Sam Wilson"],
      category: "marvel",
      source: "Capitao America",
      sourceType: "comic",
      group: "objetos",
      slug: "capacete-capitao-america",
      variantName: "Azul",
      tags: ["Marvel", "Capitao America", "Sam Wilson", "Capacete", "Objeto"],
      display:
        "display/marvel/objetos/capitao-america/capacete-capitao-america-azul-105047.webp",
      thumb:
        "thumb/marvel/objetos/capitao-america/capacete-capitao-america-azul-105047.webp",
      notes:
        "Corrigido na auditoria visual: capacete/acessorio do Capitao America; nao deve aparecer como personagem.",
      taxonomyAppliedReason:
        "Identificacao refinada por revisao visual e referencia externa do modelador; classificar como objeto do Capitao America.",
    },
    {
      id: "105048",
      name: "Capacetes Capitao America",
      originalName: "captain america sentinel helmet set",
      aliases: ["Captain America", "Sam Wilson"],
      category: "marvel",
      source: "Capitao America",
      sourceType: "comic",
      group: "objetos",
      slug: "capacete-capitao-america",
      variantName: "Conjunto 2",
      tags: ["Marvel", "Capitao America", "Sam Wilson", "Capacete", "Objeto"],
      display:
        "display/marvel/objetos/capitao-america/capacetes-capitao-america-conjunto-2-105048.webp",
      thumb:
        "thumb/marvel/objetos/capitao-america/capacetes-capitao-america-conjunto-2-105048.webp",
      notes:
        "Corrigido na auditoria visual: conjunto de capacetes/acessorios do Capitao America; nao deve aparecer como personagem.",
      taxonomyAppliedReason:
        "Identificacao refinada por revisao visual e referencia externa do modelador; classificar como objeto do Capitao America.",
    },
    {
      id: "180722",
      name: "Tori-Bot",
      originalName: "tori bot",
      aliases: ["Akira Toriyama"],
      category: "anime",
      source: "Dr. Slump",
      sourceType: "anime",
      group: "dr-slump",
      slug: "tori-bot",
      variantName: "Courage",
      tags: ["Dr. Slump", "Tori-Bot", "Akira Toriyama"],
      display:
        "display/anime/dr-slump/tori-bot/tori-bot-courage-1-180722.webp",
      thumb: "thumb/anime/dr-slump/tori-bot/tori-bot-courage-1-180722.webp",
      notes:
        "Unificado na auditoria visual: Tori-Bot e o avatar de Akira Toriyama; manter junto dos itens de Dr. Slump, nao como Dragon Ball generico.",
      taxonomyAppliedReason:
        "Unificacao de personagem/fonte para evitar duplicidade entre Dragon Ball e Dr. Slump.",
    },
    {
      id: "116926",
      name: "Tori-Bot",
      originalName: "tori bot pencil stand",
      aliases: ["Akira Toriyama"],
      category: "anime",
      source: "Dr. Slump",
      sourceType: "anime",
      group: "dr-slump",
      slug: "tori-bot",
      variantName: "Porta lapis",
      tags: ["Dr. Slump", "Tori-Bot", "Akira Toriyama"],
      display:
        "display/anime/dr-slump/tori-bot/tori-bot-porta-lapis-116926.webp",
      thumb:
        "thumb/anime/dr-slump/tori-bot/tori-bot-porta-lapis-116926.webp",
      notes:
        "Corrigido na auditoria visual de Dragon Ball: Tori-Bot nao deve ficar como Dragon Ball generico; agrupar com Dr. Slump/Toriyama.",
      taxonomyAppliedReason:
        "Identificado visualmente como Tori-Bot; mover para a fonte Dr. Slump para consistencia do catalogo.",
    },
    {
      id: "108130",
      name: "Spider-Punk",
      originalName: "spider-punk",
      aliases: ["Hobie Brown"],
      category: "marvel",
      source: "Homem Aranha",
      sourceType: "comic",
      group: "herois",
      slug: "spider-punk",
      variantName: "Figura e busto",
      tags: ["Marvel", "Homem Aranha", "Spider-Punk", "Hobie Brown"],
      display:
        "display/marvel/herois/spider-punk/spider-punk-figura-busto-108130.webp",
      thumb:
        "thumb/marvel/herois/spider-punk/spider-punk-figura-busto-108130.webp",
      notes:
        "Corrigido na auditoria visual: traje com jaqueta, spikes e guitarra corresponde ao Spider-Punk/Hobie Brown, nao a um conjunto generico.",
      taxonomyAppliedReason:
        "Confirmado visualmente como Spider-Punk/Hobie Brown; caminho final precisa sair de conjunto generico.",
    },
  ].map(directReviewOverride),
);

function publicModelerPathOverride(record) {
  const display = sanitizePublicRelpath(record.display_relpath);
  const thumb = sanitizePublicRelpath(record.thumb_relpath);
  if (display === record.display_relpath && thumb === record.thumb_relpath)
    return null;

  return {
    display_relpath: display,
    thumb_relpath: thumb,
    notes: record.notes,
    tags: record.tags,
    curation_status: record.curation_status,
    taxonomy_applied_reason: record.taxonomy_applied_reason,
  };
}

function cavaleirosHierarchyRelpath(kind, record, hierarchy, slug) {
  const relpath =
    kind === "thumb" ? record.thumb_relpath : record.display_relpath;
  const fileName = path.posix.basename(normalizeRelpath(relpath));
  return `${kind}/anime/cavaleiros-do-zodiaco/${hierarchy}/${slug}/${fileName}`;
}

function cavaleirosHierarchyOverride(record) {
  const source = comparableCatalogText(
    record.source_title || record.source_franchise,
  );
  if (source !== "cavaleiros do zodiaco") return null;
  if (record.final_category !== "anime") return null;
  if (record.curation_status !== "taxonomy_applied") return null;

  const slug = String(record.taxonomy_slug || record.source_folder || "")
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .pop();
  if (!slug) return null;

  const hierarchy =
    CAVALEIROS_HIERARCHY_BY_SLUG.get(slug) || "outros-personagens";
  const label = CAVALEIROS_HIERARCHY_LABELS[hierarchy] || "Outros Personagens";
  return {
    display_relpath: cavaleirosHierarchyRelpath(
      "display",
      record,
      hierarchy,
      slug,
    ),
    thumb_relpath: cavaleirosHierarchyRelpath("thumb", record, hierarchy, slug),
    tags: mergeTags(record.tags, label),
    notes: record.notes,
    taxonomy_applied_reason:
      record.taxonomy_applied_reason ||
      "Organizacao fisica de Cavaleiros do Zodiaco por classe; franquia mantida no site.",
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function moveAsset(oldRelpath, newRelpath) {
  const oldPath = path.join(OUTPUT, normalizeRelpath(oldRelpath));
  const newPath = path.join(OUTPUT, normalizeRelpath(newRelpath));

  if (oldPath === newPath) return { moved: false, reason: "same_path" };
  if (await exists(newPath)) return { moved: false, reason: "target_exists" };
  if (!(await exists(oldPath)))
    return { moved: false, reason: "source_missing" };

  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.rename(oldPath, newPath);
  return { moved: true, reason: null };
}

function patchRecord(record, override) {
  const displayRelpath = overrideField(
    override,
    "display_relpath",
    record.display_relpath,
  );
  const thumbRelpath = overrideField(
    override,
    "thumb_relpath",
    record.thumb_relpath,
  );

  return {
    ...record,
    source_type: overrideField(override, "source_type", record.source_type),
    source_category: overrideField(
      override,
      "source_category",
      record.source_category,
    ),
    final_category: overrideField(
      override,
      "final_category",
      record.final_category,
    ),
    source_franchise: overrideField(
      override,
      "source_franchise",
      record.source_franchise,
    ),
    source_folder: overrideField(
      override,
      "source_folder",
      record.source_folder,
    ),
    display_relpath: displayRelpath,
    thumb_relpath: thumbRelpath,
    public_name_pt_br: overrideField(
      override,
      "public_name_pt_br",
      record.public_name_pt_br,
    ),
    original_name: overrideField(
      override,
      "original_name",
      record.original_name,
    ),
    aliases: overrideField(override, "aliases", record.aliases),
    variant_name: overrideField(
      override,
      "variant_name",
      record.variant_name,
    ),
    variant_type: overrideField(
      override,
      "variant_type",
      record.variant_type,
    ),
    confidence: "visual_confirmed",
    notes: overrideField(override, "notes", record.notes),
    curation_status: overrideField(
      override,
      "curation_status",
      "taxonomy_applied",
    ),
    taxonomy_group: overrideField(
      override,
      "taxonomy_group",
      record.taxonomy_group,
    ),
    taxonomy_slug: overrideField(
      override,
      "taxonomy_slug",
      record.taxonomy_slug,
    ),
    source_title: overrideField(override, "source_title", record.source_title),
    tags: overrideField(override, "tags", record.tags),
    taxonomy_applied_action: "visual_taxonomy_override",
    taxonomy_applied_reason: overrideField(
      override,
      "taxonomy_applied_reason",
      "Correcao manual confirmada visualmente; regra por pasta/arquivo estava incorreta.",
    ),
  };
}

async function main() {
  const raw = await fs.readFile(MANIFEST, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const overridesById = new Map(
    OVERRIDES.map((item) => [String(item.message_id), item]),
  );
  const moveResults = [];
  let patched = 0;

  const records = [];
  for (const line of lines) {
    const record = JSON.parse(line);
    const explicitOverride = overridesById.get(String(record.message_id || ""));
    const recordForHierarchy = explicitOverride
      ? patchRecord(record, explicitOverride)
      : record;
    const hierarchyOverride = cavaleirosHierarchyOverride(recordForHierarchy);
    let override = hierarchyOverride
      ? { ...(explicitOverride || {}), ...hierarchyOverride }
      : explicitOverride;
    const recordForPublicPath = override ? patchRecord(record, override) : record;
    const pathOverride = publicModelerPathOverride(recordForPublicPath);
    if (pathOverride) override = { ...(override || {}), ...pathOverride };

    if (!override) {
      records.push(record);
      continue;
    }

    const displayMove = await moveAsset(
      record.display_relpath,
      override.display_relpath ?? record.display_relpath,
    );
    const thumbMove = await moveAsset(
      record.thumb_relpath,
      override.thumb_relpath ?? record.thumb_relpath,
    );
    moveResults.push({
      message_id: override.message_id,
      display: displayMove,
      thumb: thumbMove,
    });
    records.push(patchRecord(record, override));
    patched += 1;
  }

  const missing = [...overridesById.keys()].filter(
    (id) => !records.some((record) => String(record.message_id || "") === id),
  );
  if (missing.length) {
    throw new Error(
      `Overrides sem registro no manifesto: ${missing.join(", ")}`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `${MANIFEST}.before-visual-overrides-${stamp}.bak`;
  await fs.copyFile(MANIFEST, backup);
  await fs.writeFile(
    MANIFEST,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        manifest: MANIFEST,
        backup,
        patched_records: patched,
        overrides: OVERRIDES.length,
        moveResults,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
