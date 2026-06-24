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

function normalizedPhraseSet(values) {
  return new Set(values.map((value) => normalizeComparable(value)).filter(Boolean));
}

function phraseMatches(text, phrase) {
  if (!text || !phrase) return false;
  return text === phrase || text.startsWith(`${phrase} `) || text.endsWith(` ${phrase}`) || text.includes(` ${phrase} `);
}

function hasAnyPhrase(values, phrases) {
  for (const value of values) {
    const text = normalizeComparable(value);
    if (!text) continue;
    for (const phrase of phrases) {
      if (phraseMatches(text, phrase)) return true;
    }
  }
  return false;
}

function slug(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

function cleanCatalogPart(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .trim(".");
  return cleaned || fallback;
}

function cleanCatalogSlug(value, fallback) {
  return slug(cleanCatalogPart(value, fallback)) || fallback;
}

function cleanCatalogSubpath(value, fallback) {
  const parts = String(value || "")
    .split(/[\\/]+/)
    .map((part) => cleanCatalogSlug(part, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("/") : fallback;
}

const DISNEY_DIRECT_FRANCHISE_TARGETS = new Map(
  [
    ["101 dalmatians", "101-dalmatas"],
    ["101 dalmatas", "101-dalmatas"],
    ["a bela e a fera", "a-bela-e-a-fera"],
    ["adventures of the gummi bears", "os-gummis"],
    ["aladdin", "aladdin"],
    ["aladdin genie", "aladdin"],
    ["alice in wonderland", "alice-no-pais-das-maravilhas"],
    ["alice no pais das maravilhas", "alice-no-pais-das-maravilhas"],
    ["a pequena sereia", "a-pequena-sereia"],
    ["beauty and the beast", "a-bela-e-a-fera"],
    ["big hero 6", "operacao-big-hero"],
    ["branca de neve", "branca-de-neve"],
    ["chip and dale", "tico-e-teco"],
    ["chip n dale rescue rangers", "tico-e-teco"],
    ["cinderella", "cinderela"],
    ["cinderela", "cinderela"],
    ["darkwing duck", "darkwing-duck"],
    ["darkwing-duck", "darkwing-duck"],
    ["detona ralph", "detona-ralph"],
    ["disney frozen", "frozen"],
    ["disney hercules", "hercules"],
    ["disney lilo and stitch", "lilo-e-stitch"],
    ["disney pocahontas", "pocahontas"],
    ["disney tangled", "enrolados"],
    ["disney wreck it ralph", "detona-ralph"],
    ["disney wreck-it ralph", "detona-ralph"],
    ["disney zootopia", "zootopia"],
    ["donald duck", "pato-donald"],
    ["ducktales", "ducktales"],
    ["emperors new groove", "a-nova-onda-do-imperador"],
    ["enrolados", "enrolados"],
    ["frozen", "frozen"],
    ["gargoyles", "gargulas"],
    ["gargulas", "gargulas"],
    ["hercules", "hercules"],
    ["kim possible", "kim-possible"],
    ["lilo and stitch", "lilo-e-stitch"],
    ["lilo e stitch", "lilo-e-stitch"],
    ["lilo stitch", "lilo-e-stitch"],
    ["mickey minnie", "mickey-mouse"],
    ["mickey mouse", "mickey-mouse"],
    ["moana", "moana"],
    ["mulan", "mulan"],
    ["nightmare before christmas", "o-estranho-mundo-de-jack"],
    ["o estranho mundo de jack", "o-estranho-mundo-de-jack"],
    ["o rei leao", "o-rei-leao"],
    ["operacao big hero", "operacao-big-hero"],
    ["operacao-big-hero", "operacao-big-hero"],
    ["peter pan", "peter-pan"],
    ["peter-pan", "peter-pan"],
    ["pinocchio", "pinocchio"],
    ["pocahontas", "pocahontas"],
    ["snow white", "branca-de-neve"],
    ["talespin", "talespin"],
    ["tangled", "enrolados"],
    ["the emperor s new groove", "a-nova-onda-do-imperador"],
    ["the great mouse detective", "as-peripecias-do-ratinho-detetive"],
    ["the lion king", "o-rei-leao"],
    ["the little mermaid", "a-pequena-sereia"],
    ["the nightmare before christmas", "o-estranho-mundo-de-jack"],
    ["ursinho pooh", "ursinho-pooh"],
    ["winnie the pooh", "ursinho-pooh"],
    ["who framed roger rabbit", "uma-cilada-para-roger-rabbit"],
    ["wreck it ralph", "detona-ralph"],
    ["zootopia", "zootopia"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const DISNEY_PIXAR_FRANCHISE_TARGETS = new Map(
  [
    ["divertida mente", "divertida-mente"],
    ["finding nemo", "procurando-nemo"],
    ["monsters inc", "monstros-sa"],
    ["monsters inc.", "monstros-sa"],
    ["monstros s a", "monstros-sa"],
    ["monstros sa", "monstros-sa"],
    ["os incriveis", "os-incriveis"],
    ["pixar", "pixar"],
    ["procurando nemo", "procurando-nemo"],
    ["the incredibles", "os-incriveis"],
    ["toy story", "toy-story"],
    ["toy story woody", "toy-story"],
    ["wall e", "wall-e"],
    ["wall-e", "wall-e"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const DISNEY_LEGACY_FOLDER_TARGETS = new Map(
  [
    ["aurora", "bela-adormecida/aurora"],
    ["belle", "a-bela-e-a-fera/bela"],
    ["belle and beast", "a-bela-e-a-fera/bela-e-fera"],
    ["belle-and-beast", "a-bela-e-a-fera/bela-e-fera"],
    ["cinderella", "cinderela/cinderela"],
    ["cruella de vil", "101-dalmatas/cruella-de-vil"],
    ["cruella-de-vil", "101-dalmatas/cruella-de-vil"],
    ["donald duck", "pato-donald"],
    ["donald-duck", "pato-donald"],
    ["darkwing duck", "darkwing-duck"],
    ["darkwing-duck", "darkwing-duck"],
    ["gargoyles", "gargulas/gargulas"],
    ["goofy", "pateta"],
    ["hades", "hercules/hades"],
    ["maleficent", "bela-adormecida/malevola"],
    ["margarida", "margarida"],
    ["marie", "aristogatas/marie"],
    ["max goof", "pateta/max-goof"],
    ["max-goof", "pateta/max-goof"],
    ["merlin madam mim", "a-espada-era-a-lei/merlin-e-madam-mim"],
    ["merlin-madam-mim", "a-espada-era-a-lei/merlin-e-madam-mim"],
    ["mickey airplane", "mickey-mouse/mickey-aviao"],
    ["mickey-airplane", "mickey-mouse/mickey-aviao"],
    ["mickey camp", "mickey-mouse/mickey-acampamento"],
    ["mickey-camp", "mickey-mouse/mickey-acampamento"],
    ["mickey e minnie baby", "mickey-mouse/mickey-e-minnie-baby"],
    ["mickey-e-minnie-baby", "mickey-mouse/mickey-e-minnie-baby"],
    ["mickey mouse", "mickey-mouse"],
    ["mickey-mouse", "mickey-mouse"],
    ["mickey mouse e minnie mouse", "mickey-mouse/mickey-e-minnie"],
    ["mickey-mouse-e-minnie-mouse", "mickey-mouse/mickey-e-minnie"],
    ["mickey mouse variant", "mickey-mouse/mickey-mouse-variante"],
    ["mickey-mouse-variant", "mickey-mouse/mickey-mouse-variante"],
    ["minnie mouse", "mickey-mouse/minnie-mouse"],
    ["minnie-mouse", "mickey-mouse/minnie-mouse"],
    ["mirabel madrigal", "encanto/mirabel-madrigal"],
    ["mirabel-madrigal", "encanto/mirabel-madrigal"],
    ["mulan", "mulan/mulan"],
    ["oswald", "mickey-mouse/oswald"],
    ["pateta", "pateta"],
    ["pateta bust", "pateta/busto"],
    ["pateta-bust", "pateta/busto"],
    ["pato donald", "pato-donald"],
    ["pato-donald", "pato-donald"],
    ["pluto", "mickey-mouse/pluto"],
    ["pocahontas", "pocahontas/pocahontas"],
    ["princesses", "princesas"],
    ["princess figures", "princesas"],
    ["princess-figures", "princesas"],
    ["rapunzel", "enrolados/rapunzel"],
    ["robin hood", "robin-hood/robin-hood"],
    ["robin-hood", "robin-hood/robin-hood"],
    ["scrooge mcduck", "ducktales/tio-patinhas"],
    ["scrooge-mcduck", "ducktales/tio-patinhas"],
    ["seven dwarfs", "branca-de-neve/sete-anoes"],
    ["seven-dwarfs", "branca-de-neve/sete-anoes"],
    ["simba", "o-rei-leao/simba"],
    ["snow white", "branca-de-neve/branca-de-neve"],
    ["snow-white", "branca-de-neve/branca-de-neve"],
    ["tarzan", "tarzan/tarzan"],
    ["tico e teco", "tico-e-teco"],
    ["tico-e-teco", "tico-e-teco"],
    ["ursula", "a-pequena-sereia/ursula"],
    ["villains", "viloes"],
    ["viloes", "viloes"],
    ["winnie the pooh", "ursinho-pooh/ursinho-pooh"],
    ["winnie-the-pooh", "ursinho-pooh/ursinho-pooh"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const DISNEY_SUBJECT_ALIASES = new Map(
  [
    ["aladdin genie", "genio"],
    ["belle", "bela"],
    ["belle and beast", "bela-e-fera"],
    ["belle-and-beast", "bela-e-fera"],
    ["buzz lightyear", "buzz-lightyear"],
    ["cinderella", "cinderela"],
    ["donald duck figure set", "pato-donald"],
    ["donald duck hammock", "pato-donald"],
    ["elastigirl", "mulher-elastica"],
    ["genie", "genio"],
    ["goofy", "pateta"],
    ["mickey and minnie", "mickey-e-minnie"],
    ["mickey minnie couple", "mickey-e-minnie"],
    ["mickey mouse", "mickey-mouse"],
    ["mulan", "mulan"],
    ["simba", "simba"],
    ["snow white", "branca-de-neve"],
    ["stitch", "stitch"],
    ["the incredibles elastigirl", "mulher-elastica"],
    ["toy story woody", "woody"],
    ["tinker bell", "sininho"],
    ["winnie the pooh", "ursinho-pooh"],
    ["woody", "woody"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const HANNA_BARBERA_BUCKET_TARGETS = new Map(
  [
    ["atom-ant", ["a-formiga-atomica", "a-formiga-atomica"]],
    ["augie-doggie", ["augie-doggie", "augie-doggie-e-doggie-daddy"]],
    ["dastardly-and-muttley", ["corrida-maluca", "dick-vigarista-e-muttley"]],
    ["flintstones", ["os-flintstones", "familia-flintstone"]],
    ["frankenstein-jr", ["frankenstein-jr", "frankenstein-jr"]],
    ["galaxy-trio", ["galaxy-trio", "galaxy-trio"]],
    ["hair-bear-bunch", ["hair-bear-bunch", "hair-bear-bunch"]],
    ["jabberjaw", ["jabberjaw", "jabberjaw"]],
    ["jonny-quest", ["jonny-quest", "grupo"]],
    ["lippy-the-lion", ["lippy-the-lion", "lippy-the-lion-e-hardy-har-har"]],
    ["magilla-gorilla", ["magilla-gorilla", "magilla-gorilla"]],
    ["mr-jinks", ["mr-jinks", "mr-jinks"]],
    ["mumbly", ["mumbly", "mumbly"]],
    ["precious-pupp", ["precious-pupp", "precious-pupp"]],
    ["punkin-puss-and-mushmouse", ["punkin-puss-and-mushmouse", "punkin-puss-and-mushmouse"]],
    ["shazzan", ["shazzan", "shazzan"]],
    ["the-herculoids", ["os-herculoides", "grupo"]],
    ["the-impossibles", ["the-impossibles", "grupo"]],
    ["the-space-kidettes", ["the-space-kidettes", "grupo"]],
    ["touche-turtle", ["touche-turtle", "touche-turtle-e-dum-dum"]],
    ["wacky-races", ["corrida-maluca", "grupo"]],
    ["wally-gator", ["wally-gator", "wally-gator"]],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const HANNA_BARBERA_DIRECT_FRANCHISE_TARGETS = new Map(
  [
    ["a formiga atomica", "a-formiga-atomica"],
    ["a-formiga-atomica", "a-formiga-atomica"],
    ["atom ant", "a-formiga-atomica"],
    ["augie doggie", "augie-doggie"],
    ["augie-doggie", "augie-doggie"],
    ["corrida maluca", "corrida-maluca"],
    ["corrida-maluca", "corrida-maluca"],
    ["wacky races", "corrida-maluca"],
    ["frankenstein jr", "frankenstein-jr"],
    ["frankenstein-jr", "frankenstein-jr"],
    ["galaxy trio", "galaxy-trio"],
    ["galaxy-trio", "galaxy-trio"],
    ["hair bear bunch", "hair-bear-bunch"],
    ["hair-bear-bunch", "hair-bear-bunch"],
    ["jabberjaw", "jabberjaw"],
    ["jonny quest", "jonny-quest"],
    ["jonny-quest", "jonny-quest"],
    ["lippy the lion", "lippy-the-lion"],
    ["lippy-the-lion", "lippy-the-lion"],
    ["magilla gorilla", "magilla-gorilla"],
    ["magilla-gorilla", "magilla-gorilla"],
    ["mr jinks", "mr-jinks"],
    ["mr-jinks", "mr-jinks"],
    ["mumbly", "mumbly"],
    ["os flintstones", "os-flintstones"],
    ["os-flintstones", "os-flintstones"],
    ["the flintstones", "os-flintstones"],
    ["flintstones", "os-flintstones"],
    ["os herculoides", "os-herculoides"],
    ["os-herculoides", "os-herculoides"],
    ["the herculoids", "os-herculoides"],
    ["os jetsons", "os-jetsons"],
    ["os-jetsons", "os-jetsons"],
    ["the jetsons", "os-jetsons"],
    ["os manda chuvas", "os-manda-chuvas"],
    ["os-manda-chuvas", "os-manda-chuvas"],
    ["top cat", "os-manda-chuvas"],
    ["precious pupp", "precious-pupp"],
    ["precious-pupp", "precious-pupp"],
    ["punkin puss and mushmouse", "punkin-puss-and-mushmouse"],
    ["punkin-puss-and-mushmouse", "punkin-puss-and-mushmouse"],
    ["scooby doo", "scooby-doo"],
    ["scooby-doo", "scooby-doo"],
    ["shazzan", "shazzan"],
    ["space ghost", "space-ghost"],
    ["space-ghost", "space-ghost"],
    ["swat kats", "swat-kats"],
    ["swat-kats", "swat-kats"],
    ["the impossibles", "the-impossibles"],
    ["the-impossibles", "the-impossibles"],
    ["the space kidettes", "the-space-kidettes"],
    ["the-space-kidettes", "the-space-kidettes"],
    ["touche turtle", "touche-turtle"],
    ["touche-turtle", "touche-turtle"],
    ["wally gator", "wally-gator"],
    ["wally-gator", "wally-gator"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const HANNA_BARBERA_SUBJECT_ALIASES = new Map(
  [
    ["scooby-doo|gang display", "turma"],
    ["scooby-doo|scooby doo gang", "turma"],
    ["scooby-doo|scooby doo figures", "turma"],
    ["os-jetsons|jetsons family set", "familia-jetson"],
    ["os-jetsons|jetsons chibi set", "familia-jetson"],
    ["corrida-maluca|wacky races group", "grupo"],
  ].map(([key, target]) => [key, target]),
);

const CARTOON_NETWORK_DIRECT_FRANCHISE_TARGETS = new Map(
  [
    ["apenas um show", "apenas-um-show"],
    ["apenas-um-show", "apenas-um-show"],
    ["regular show", "apenas-um-show"],
    ["apenas ursos", "apenas-ursos"],
    ["apenas-ursos", "apenas-ursos"],
    ["we bare bears", "apenas-ursos"],
    ["as meninas superpoderosas", "as-meninas-superpoderosas"],
    ["as-meninas-superpoderosas", "as-meninas-superpoderosas"],
    ["powerpuff girls", "as-meninas-superpoderosas"],
    ["the powerpuff girls", "as-meninas-superpoderosas"],
    ["as terriveis aventuras de billy e mandy", "as-terriveis-aventuras-de-billy-e-mandy"],
    ["as-terriveis-aventuras-de-billy-e-mandy", "as-terriveis-aventuras-de-billy-e-mandy"],
    ["billy e mandy", "as-terriveis-aventuras-de-billy-e-mandy"],
    ["the grim adventures of billy and mandy", "as-terriveis-aventuras-de-billy-e-mandy"],
    ["ben 10", "ben-10"],
    ["ben-10", "ben-10"],
    ["coragem o cao covarde", "coragem-o-cao-covarde"],
    ["coragem-o-cao-covarde", "coragem-o-cao-covarde"],
    ["courage the cowardly dog", "coragem-o-cao-covarde"],
    ["ed edd e eddy", "ed-edd-e-eddy"],
    ["ed-edd-e-eddy", "ed-edd-e-eddy"],
    ["ed edd n eddy", "ed-edd-e-eddy"],
    ["hora de aventura", "hora-de-aventura"],
    ["hora-de-aventura", "hora-de-aventura"],
    ["adventure time", "hora-de-aventura"],
    ["johnny bravo", "johnny-bravo"],
    ["johnny-bravo", "johnny-bravo"],
    ["o laboratorio de dexter", "o-laboratorio-de-dexter"],
    ["o-laboratorio-de-dexter", "o-laboratorio-de-dexter"],
    ["dexter laboratory", "o-laboratorio-de-dexter"],
    ["samurai jack", "samurai-jack"],
    ["samurai-jack", "samurai-jack"],
    ["steven universe", "steven-universe"],
    ["steven-universe", "steven-universe"],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const CARTOON_NETWORK_BUCKET_TARGETS = new Map(
  [["ed", ["ed-edd-e-eddy", "ed"]]].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const CARTOON_NETWORK_SUBJECT_ALIASES = new Map(
  [
    ["as-meninas-superpoderosas|powerpuff girls figures", "grupo"],
    ["coragem-o-cao-covarde|courage", "coragem"],
    ["o-laboratorio-de-dexter|dexter laboratory", "dexter"],
  ].map(([key, target]) => [key, target]),
);

const GENERIC_ANIMATION_ROOT_BUCKETS = new Map(
  [
    ["animal mascot", { franchise: "original" }],
    ["animals", { franchise: "animais" }],
    ["anime original", { franchise: "original" }],
    ["black white dog", { franchise: "animais" }],
    ["blue robot character", { franchise: "sci-fi" }],
    ["cartoon animal figure", { franchise: "original" }],
    ["cartoon boy", { franchise: "original" }],
    ["cartoon couple", { franchise: "original" }],
    ["cartoon dog mascot", { franchise: "original" }],
    ["cartoon golfer", { franchise: "original" }],
    ["cartoon group", { franchise: "original" }],
    ["cartoon original", { franchise: "original" }],
    ["cartoon sign scene", { franchise: "original" }],
    ["chibi boy", { franchise: "original" }],
    ["chibi cowgirl", { franchise: "original" }],
    ["chibi girl lineup", { franchise: "original" }],
    ["christmas mascots", { franchise: "sazonal" }],
    ["crab creatures", { franchise: "animais" }],
    ["crab mascot", { franchise: "original" }],
    ["cute boat creature", { franchise: "original" }],
    ["cute figure lineup", { franchise: "original" }],
    ["cute fruit character", { franchise: "original" }],
    ["cute horn creature", { franchise: "original" }],
    ["cute kawaii 3d", { franchise: "original" }],
    ["cute pot characters", { franchise: "original" }],
    ["cute purple mascot", { franchise: "original" }],
    ["cute skull character", { franchise: "original" }],
    ["cute tiger mascot", { franchise: "original" }],
    ["diddys workshop", { franchise: "original" }],
    ["diddy's workshop", { franchise: "original" }],
    ["disney style", { franchise: "original" }],
    ["dog mascot", { franchise: "original" }],
    ["duck figures", { franchise: "animais" }],
    ["fantasy original", { franchise: "fantasia" }],
    ["fantasy toys", { franchise: "fantasia" }],
    ["farm bird", { franchise: "animais" }],
    ["flamingo character", { franchise: "animais" }],
    ["flying duck character", { franchise: "animais" }],
    ["funko", { franchise: "brinquedos" }],
    ["green controller mascot", { franchise: "original" }],
    ["green dinosaur", { franchise: "dinosaurios" }],
    ["green dress girl", { franchise: "original" }],
    ["green frog mascot", { franchise: "animais" }],
    ["green mascot", { franchise: "original" }],
    ["heart character", { franchise: "original" }],
    ["masked mascot", { franchise: "original" }],
    ["mcdonalds", { franchise: "marcas", prefix: "mcdonalds" }],
    ["mcdonalds nugget mascot", { franchise: "marcas", prefix: "mcdonalds" }],
    ["mila", { franchise: "original" }],
    ["millyverse", { franchise: "original" }],
    ["monkey character", { franchise: "animais" }],
    ["monster mascots", { franchise: "original" }],
    ["monster minis", { franchise: "brinquedos" }],
    ["muulo", { franchise: "brinquedos" }],
    ["nao identificado", { franchise: "nao-identificado" }],
    ["nomnom figures", { franchise: "original" }],
    ["old man character", { franchise: "original" }],
    ["original cartoon", { franchise: "original" }],
    ["original", { franchise: "original" }],
    ["owl mascot", { franchise: "animais" }],
    ["pig guitarist", { franchise: "animais" }],
    ["pink bird character", { franchise: "animais" }],
    ["pink creature mascot", { franchise: "original" }],
    ["pirate girl mascot", { franchise: "original" }],
    ["plakit", { franchise: "brinquedos" }],
    ["playkit", { franchise: "brinquedos" }],
    ["purple pony unicorn", { franchise: "animais" }],
    ["red cape character", { franchise: "original" }],
    ["red cartoon girl", { franchise: "original" }],
    ["red ninja mascot", { franchise: "original" }],
    ["robots", { franchise: "sci-fi" }],
    ["rock bear lumberjack", { franchise: "original" }],
    ["rooster chicken", { franchise: "animais" }],
    ["rooster figure", { franchise: "animais" }],
    ["sangoma cute figure", { franchise: "original" }],
    ["scarf hero", { franchise: "original", prefix: "scarf-hero" }],
    ["silly toys", { franchise: "brinquedos" }],
    ["sioux character", { franchise: "original" }],
    ["slime mascot", { franchise: "original" }],
    ["small mascot", { franchise: "original" }],
    ["soccer mascot", { franchise: "original" }],
    ["squirrel character", { franchise: "animais" }],
    ["squirrel characters", { franchise: "animais" }],
    ["stylized man", { franchise: "original" }],
    ["sushi mascots", { franchise: "original" }],
    ["toy mascots", { franchise: "brinquedos" }],
    ["white goose", { franchise: "animais" }],
    ["yellow cartoon figure", { franchise: "original" }],
  ].map(([alias, target]) => [normalizeComparable(alias), target]),
);

const GENERIC_ACTIVE_ROOT_BUCKETS = new Map(
  [
    ["anime|anime original", { category: "outros", franchise: "original" }],
    ["anime|anime boys reference", { category: "outros", franchise: "original" }],
    ["anime|anime female figure", { category: "outros", franchise: "original" }],
    ["anime|anime female figures", { category: "outros", franchise: "original" }],
    ["anime|anime figure pair", { category: "outros", franchise: "original" }],
    ["anime|anime girl red creature", { category: "outros", franchise: "original" }],
    ["anime|anime pinup girl", { category: "outros", franchise: "original" }],
    ["anime|anime sports girl", { category: "outros", franchise: "original" }],
    ["anime|ag figure", { category: "outros", franchise: "original" }],
    ["anime|black hair girl", { category: "outros", franchise: "original" }],
    ["anime|black haired school girl", { category: "outros", franchise: "original" }],
    ["anime|black ninja girl", { category: "outros", franchise: "original" }],
    ["anime|blonde chibi girl", { category: "outros", franchise: "original" }],
    ["anime|blonde soldier girl", { category: "outros", franchise: "original" }],
    ["anime|blue dress figure", { category: "outros", franchise: "original" }],
    ["anime|blue hair pinup", { category: "outros", franchise: "original" }],
    ["anime|blue hair anime woman", { category: "outros", franchise: "original" }],
    ["anime|blue ice woman", { category: "outros", franchise: "original" }],
    ["anime|blue red characters", { category: "outros", franchise: "original" }],
    ["anime|blue white anime girl", { category: "outros", franchise: "original" }],
    ["anime|brown hair anime girl", { category: "outros", franchise: "original" }],
    ["anime|bunny girl", { category: "outros", franchise: "original" }],
    ["anime|cat girl anime figures", { category: "outros", franchise: "original" }],
    ["anime|chibi anime characters", { category: "outros", franchise: "original" }],
    ["anime|chibi anime girl", { category: "outros", franchise: "original" }],
    ["anime|chibi black male character", { category: "outros", franchise: "original" }],
    ["anime|chibi boy", { category: "outros", franchise: "original" }],
    ["anime|chibi cat woman", { category: "outros", franchise: "original" }],
    ["anime|chibi demon girl", { category: "outros", franchise: "original" }],
    ["anime|chibi girls", { category: "outros", franchise: "original" }],
    ["anime|chibi male character", { category: "outros", franchise: "original" }],
    ["anime|chibi white hair character", { category: "outros", franchise: "original" }],
    ["anime|clown anime girl", { category: "outros", franchise: "original" }],
    ["anime|cyber female", { category: "outros", franchise: "sci-fi" }],
    ["anime|cyber girl", { category: "outros", franchise: "sci-fi" }],
    ["anime|dark hair male", { category: "outros", franchise: "original" }],
    ["anime|demon anime girl", { category: "outros", franchise: "original" }],
    ["anime|digital female", { category: "outros", franchise: "sci-fi" }],
    ["anime|female body kit", { category: "outros", franchise: "acessorios" }],
    ["anime|fantasy warrior woman", { category: "outros", franchise: "fantasia" }],
    ["anime|fire witch anime girl", { category: "outros", franchise: "fantasia" }],
    ["anime|fox girl", { category: "outros", franchise: "original" }],
    ["anime|green anime girl", { category: "outros", franchise: "original" }],
    ["anime|green dress woman", { category: "outros", franchise: "original" }],
    ["anime|green hair woman", { category: "outros", franchise: "original" }],
    ["anime|halloween anime girl", { category: "outros", franchise: "sazonal" }],
    ["anime|helmi blue hair girl", { category: "outros", franchise: "original" }],
    ["anime|hands anime woman", { category: "outros", franchise: "original" }],
    ["anime|horned anime demon girl", { category: "outros", franchise: "original" }],
    ["anime|ice cream anime girl", { category: "outros", franchise: "original" }],
    ["anime|ice anime girl", { category: "outros", franchise: "original" }],
    ["anime|ice spirit character", { category: "outros", franchise: "fantasia" }],
    ["anime|kimono woman", { category: "outros", franchise: "original" }],
    ["anime|la pinup", { category: "outros", franchise: "original" }],
    ["anime|maid cafe girl", { category: "outros", franchise: "original" }],
    ["anime|maid girl", { category: "outros", franchise: "original" }],
    ["anime|maid pinup", { category: "outros", franchise: "original" }],
    ["anime|mecha anime figure", { category: "outros", franchise: "sci-fi" }],
    ["anime|mermaid girl", { category: "outros", franchise: "fantasia" }],
    ["anime|nao identificado", { category: "outros", franchise: "nao-identificado" }],
    ["anime|nonofy bunny girl", { category: "outros", franchise: "original" }],
    ["anime|orange hair anime girl", { category: "outros", franchise: "original" }],
    ["anime|original anime", { category: "outros", franchise: "original" }],
    ["anime|original anime boy", { category: "outros", franchise: "original" }],
    ["anime|original anime cake girl", { category: "outros", franchise: "original" }],
    ["anime|original anime character", { category: "outros", franchise: "original" }],
    ["anime|original anime chibi", { category: "outros", franchise: "original" }],
    ["anime|original anime duo", { category: "outros", franchise: "original" }],
    ["anime|original anime bunny girl", { category: "outros", franchise: "original" }],
    ["anime|original anime fantasy", { category: "outros", franchise: "fantasia" }],
    ["anime|original", { category: "outros", franchise: "original" }],
    ["anime|original anime figure", { category: "outros", franchise: "original" }],
    ["anime|original anime female", { category: "outros", franchise: "original" }],
    ["anime|original anime female parts", { category: "outros", franchise: "original" }],
    ["anime|original anime gift girl", { category: "outros", franchise: "original" }],
    ["anime|original anime girl", { category: "outros", franchise: "original" }],
    ["anime|original anime mage", { category: "outros", franchise: "fantasia" }],
    ["anime|original anime pinup", { category: "outros", franchise: "original" }],
    ["anime|original anime schoolgirl", { category: "outros", franchise: "original" }],
    ["anime|original anime sci fi", { category: "outros", franchise: "sci-fi" }],
    ["anime|original anime scooter girl", { category: "outros", franchise: "original" }],
    ["anime|original anime swordswoman", { category: "outros", franchise: "original" }],
    ["anime|original archer female", { category: "outros", franchise: "original" }],
    ["anime|original armor female", { category: "outros", franchise: "original" }],
    ["anime|original black hair female", { category: "outros", franchise: "original" }],
    ["anime|original black outfit female", { category: "outros", franchise: "original" }],
    ["anime|original black suit female", { category: "outros", franchise: "original" }],
    ["anime|original blonde anime girl", { category: "outros", franchise: "original" }],
    ["anime|original bunny girl", { category: "outros", franchise: "original" }],
    ["anime|original cat girl", { category: "outros", franchise: "original" }],
    ["anime|original character", { category: "outros", franchise: "original" }],
    ["anime|original demon girl", { category: "outros", franchise: "original" }],
    ["anime|original demon girl dragon", { category: "outros", franchise: "fantasia" }],
    ["anime|original dragon girl", { category: "outros", franchise: "fantasia" }],
    ["anime|original energy female", { category: "outros", franchise: "original" }],
    ["anime|original fighter girl", { category: "outros", franchise: "original" }],
    ["anime|original fire cat girl", { category: "outros", franchise: "fantasia" }],
    ["anime|original flame woman", { category: "outros", franchise: "fantasia" }],
    ["anime|original female character", { category: "outros", franchise: "original" }],
    ["anime|original fox girl", { category: "outros", franchise: "original" }],
    ["anime|original ice female", { category: "outros", franchise: "original" }],
    ["anime|original male character", { category: "outros", franchise: "original" }],
    ["anime|original purple girl", { category: "outros", franchise: "original" }],
    ["anime|original purple suited duo", { category: "outros", franchise: "original" }],
    ["anime|original red dress girl", { category: "outros", franchise: "original" }],
    ["anime|original red hair girl", { category: "outros", franchise: "original" }],
    ["anime|original red suit female", { category: "outros", franchise: "original" }],
    ["anime|original robot girls", { category: "outros", franchise: "sci-fi" }],
    ["anime|original school girl", { category: "outros", franchise: "original" }],
    ["anime|original school girls", { category: "outros", franchise: "original" }],
    ["anime|original tentacle woman", { category: "outros", franchise: "original" }],
    ["anime|original warrior girl", { category: "outros", franchise: "original" }],
    ["anime|original white hair female", { category: "outros", franchise: "original" }],
    ["anime|pink chibi anime girl", { category: "outros", franchise: "original" }],
    ["anime|pink dress girl", { category: "outros", franchise: "original" }],
    ["anime|pink hair couch girl", { category: "outros", franchise: "original" }],
    ["anime|pink hair anime girl", { category: "outros", franchise: "original" }],
    ["anime|pink hair christmas girl", { category: "outros", franchise: "sazonal" }],
    ["anime|pink uniform girl", { category: "outros", franchise: "original" }],
    ["anime|pirate character", { category: "outros", franchise: "original" }],
    ["anime|pirate anime girl", { category: "outros", franchise: "original" }],
    ["anime|purple anime girl", { category: "outros", franchise: "original" }],
    ["anime|purple anime woman", { category: "outros", franchise: "original" }],
    ["anime|purple male fighter", { category: "outros", franchise: "original" }],
    ["anime|purple pinup", { category: "outros", franchise: "original" }],
    ["anime|rabbit anime warrior", { category: "outros", franchise: "original" }],
    ["anime|ram horn anime girl", { category: "outros", franchise: "fantasia" }],
    ["anime|red card girl", { category: "outros", franchise: "original" }],
    ["anime|red hair anime girl", { category: "outros", franchise: "original" }],
    ["anime|red white pinup", { category: "outros", franchise: "original" }],
    ["anime|samurai women", { category: "outros", franchise: "original" }],
    ["anime|school anime girl", { category: "outros", franchise: "original" }],
    ["anime|school girl", { category: "outros", franchise: "original" }],
    ["anime|school girl figure", { category: "outros", franchise: "original" }],
    ["anime|science girl", { category: "outros", franchise: "original" }],
    ["anime|unknown anime", { category: "outros", franchise: "nao-identificado" }],
    ["anime|winter anime girl", { category: "outros", franchise: "sazonal" }],
    ["anime|white bunny figure", { category: "outros", franchise: "original" }],
    ["anime|white hair chibi girl", { category: "outros", franchise: "original" }],
    ["anime|white hair luggage girl", { category: "outros", franchise: "original" }],
    ["anime|white hair warrior", { category: "outros", franchise: "original" }],
    ["anime|white purple anime girl", { category: "outros", franchise: "original" }],
    ["anime|zafren anime girl", { category: "outros", franchise: "original" }],
    ["filmes series|black suit character", { category: "outros", franchise: "original" }],
    ["filmes series|female burgundy character", { category: "outros", franchise: "original" }],
    ["filmes series|female sci fi character", { category: "outros", franchise: "sci-fi" }],
    ["filmes series|horror bust", { category: "outros", franchise: "terror" }],
    ["filmes series|jungle warrior", { category: "outros", franchise: "fantasia" }],
    ["filmes series|nacg armored character", { category: "outros", franchise: "original" }],
    ["filmes series|nacg soldier bust", { category: "outros", franchise: "original" }],
    ["filmes series|nao identificado", { category: "outros", franchise: "nao-identificado" }],
    ["filmes series|original", { category: "outros", franchise: "original" }],
    ["filmes series|pinup horror", { category: "outros", franchise: "terror" }],
    ["games|blue female character", { category: "outros", franchise: "original" }],
    ["games|blue hero figure", { category: "outros", franchise: "original" }],
    ["games|dion warrior bust", { category: "outros", franchise: "fantasia" }],
    ["games|fantasy bird warrior", { category: "outros", franchise: "fantasia" }],
    ["games|fantasy original", { category: "outros", franchise: "fantasia" }],
    ["games|female soldier", { category: "outros", franchise: "sci-fi" }],
    ["games|female tactical soldier", { category: "outros", franchise: "sci-fi" }],
    ["games|female tactical figure", { category: "outros", franchise: "sci-fi" }],
    ["games|green coat female", { category: "outros", franchise: "original" }],
    ["games|green female hero", { category: "outros", franchise: "original" }],
    ["games|male warrior figure", { category: "outros", franchise: "fantasia" }],
    ["games|medusa blue woman", { category: "outros", franchise: "fantasia" }],
    ["games|neferi blue woman", { category: "outros", franchise: "fantasia" }],
    ["games|nomnom figures", { category: "outros", franchise: "original" }],
    ["games|original", { category: "outros", franchise: "original" }],
    ["games|shield warrior woman", { category: "outros", franchise: "fantasia" }],
    ["games|unknown game", { category: "outros", franchise: "nao-identificado" }],
  ].map(([key, target]) => {
    const [category, franchise] = key.split("|");
    return [`${normalizeComparable(category)}|${normalizeComparable(franchise)}`, target];
  }),
);

const GENERIC_ACTIVE_ROOT_FOLDER_SUBJECTS = normalizedPhraseSet([
  "anime original",
  "nao identificado",
  "original",
  "unknown anime",
  "unknown game",
]);

export function collapseRedundantAdjacentParts(parts) {
  const collapsed = [];
  let changed = false;

  for (const part of parts || []) {
    const text = String(part || "");
    if (!text) continue;

    const previous = collapsed.at(-1);
    if (previous && normalizeComparable(previous) === normalizeComparable(text)) {
      changed = true;
      continue;
    }

    collapsed.push(text);
  }

  return { parts: collapsed, changed };
}

export function collapseRedundantAdjacentRelpath(relpath) {
  const separator = String(relpath || "").includes("\\") ? "\\" : "/";
  const parts = String(relpath || "").split(/[\\/]+/).filter(Boolean);
  const collapsed = collapseRedundantAdjacentParts(parts);
  return {
    relpath: collapsed.parts.join(separator),
    changed: collapsed.changed,
  };
}

const UNIVERSE_GROUP_ALIASES = new Map(
  Object.entries({
    "anti herois": "anti-herois",
    "anti heroi": "anti-herois",
    "anti heroes": "anti-herois",
    "anti hero": "anti-herois",
    "anti-herois": "anti-herois",
    "anti-hero": "anti-herois",
    "anti-heroes": "anti-herois",
    coadjuvante: "coadjuvantes",
    coadjuvantes: "coadjuvantes",
    sidekick: "coadjuvantes",
    sidekicks: "coadjuvantes",
    support: "coadjuvantes",
    equipe: "equipes",
    equipes: "equipes",
    team: "equipes",
    teams: "equipes",
    heroi: "herois",
    herois: "herois",
    hero: "herois",
    heroes: "herois",
    objetos: "objetos-acessorios",
    objeto: "objetos-acessorios",
    acessorio: "objetos-acessorios",
    acessorios: "objetos-acessorios",
    accessories: "objetos-acessorios",
    accessory: "objetos-acessorios",
    props: "objetos-acessorios",
    prop: "objetos-acessorios",
    "objetos acessorios": "objetos-acessorios",
    "objetos-acessorios": "objetos-acessorios",
    "cenas dioramas": "cenas-dioramas",
    "cenas-dioramas": "cenas-dioramas",
    cena: "cenas-dioramas",
    cenas: "cenas-dioramas",
    diorama: "cenas-dioramas",
    dioramas: "cenas-dioramas",
    set: "cenas-dioramas",
    sets: "cenas-dioramas",
    veiculo: "veiculos",
    veiculos: "veiculos",
    vehicle: "veiculos",
    vehicles: "veiculos",
    vilao: "viloes",
    viloes: "viloes",
    "viloes batman": "viloes-batman",
    "viloes-batman": "viloes-batman",
    "viloes homem aranha": "viloes-homem-aranha",
    "viloes-homem-aranha": "viloes-homem-aranha",
    "viloes x men": "viloes-x-men",
    "viloes x-men": "viloes-x-men",
    "viloes-x-men": "viloes-x-men",
    "viloes capitao america": "viloes-capitao-america",
    "viloes-capitao-america": "viloes-capitao-america",
    "viloes demolidor": "viloes-demolidor",
    "viloes-demolidor": "viloes-demolidor",
    "viloes flash": "viloes-flash",
    "viloes-flash": "viloes-flash",
    "viloes hulk": "viloes-hulk",
    "viloes-hulk": "viloes-hulk",
    "viloes lanterna verde": "viloes-lanterna-verde",
    "viloes-lanterna-verde": "viloes-lanterna-verde",
    "viloes mulher maravilha": "viloes-mulher-maravilha",
    "viloes-mulher-maravilha": "viloes-mulher-maravilha",
    "viloes quarteto fantastico": "viloes-quarteto-fantastico",
    "viloes-quarteto-fantastico": "viloes-quarteto-fantastico",
    "viloes superman": "viloes-superman",
    "viloes-superman": "viloes-superman",
    "viloes vingadores": "viloes-vingadores",
    "viloes-vingadores": "viloes-vingadores",
    villain: "viloes",
    villains: "viloes",
    outros: "outros",
    other: "outros",
    others: "outros",
  }).map(([key, value]) => [normalizeComparable(key), value]),
);

const UNIVERSE_MEDIA_BUCKETS = normalizedPhraseSet([
  "animation",
  "cartoon",
  "cartoons",
  "comic",
  "comics",
  "desenhos",
  "desenhos animacao",
  "filme serie",
  "filmes",
  "filmes series",
  "game",
  "games",
  "hq",
  "movie",
  "movies",
  "quadrinhos",
  "serie",
  "series",
  "tv",
  "web series",
]);

const CANONICAL_UNIVERSE_GROUPS = normalizedPhraseSet([
  "anti herois",
  "anti-herois",
  "cenas dioramas",
  "cenas-dioramas",
  "coadjuvantes",
  "equipes",
  "herois",
  "objetos acessorios",
  "objetos-acessorios",
  "outros",
  "veiculos",
  "viloes",
  "viloes batman",
  "viloes-batman",
  "viloes homem aranha",
  "viloes-homem-aranha",
  "viloes x men",
  "viloes x-men",
  "viloes-x-men",
  "viloes capitao america",
  "viloes-capitao-america",
  "viloes demolidor",
  "viloes-demolidor",
  "viloes flash",
  "viloes-flash",
  "viloes hulk",
  "viloes-hulk",
  "viloes lanterna verde",
  "viloes-lanterna-verde",
  "viloes mulher maravilha",
  "viloes-mulher-maravilha",
  "viloes quarteto fantastico",
  "viloes-quarteto-fantastico",
  "viloes superman",
  "viloes-superman",
  "viloes vingadores",
  "viloes-vingadores",
]);

const ACCESSORY_SOURCE_CATEGORIES = normalizedPhraseSet([
  "acessorio",
  "acessorios",
  "accessories",
  "accessory",
  "props",
  "prop",
]);

const MAIN_CATALOG_ROOTS = new Set([
  "anime",
  "dc",
  "desenhos-animacao",
  "filmes-series",
  "games",
  "marvel",
  "outros",
]);

const NAMED_FRANCHISE_ROOTS = new Map(
  [
    ["disney", { category: "desenhos-animacao", franchise: "disney" }],
    ["harry potter", { category: "filmes-series", franchise: "harry-potter" }],
    ["harry_potter", { category: "filmes-series", franchise: "harry-potter" }],
    ["ninja turtles", { category: "desenhos-animacao", franchise: "tartarugas-ninja" }],
    ["star wars", { category: "filmes-series", franchise: "star-wars" }],
    ["star_wars", { category: "filmes-series", franchise: "star-wars" }],
    ["teenage mutant ninja turtles", { category: "desenhos-animacao", franchise: "tartarugas-ninja" }],
    ["tmnt", { category: "desenhos-animacao", franchise: "tartarugas-ninja" }],
  ].map(([key, value]) => [normalizeComparable(key), value]),
);

const OTHER_ROOT_BUCKETS = new Map(
  [
    ["acessorios", "acessorios"],
    ["accessories", "acessorios"],
    ["accessory", "acessorios"],
    ["adulto", "adulto"],
    ["animals", "animais"],
    ["animal", "animais"],
    ["animais", "animais"],
    ["art", "arte"],
    ["arte", "arte"],
    ["book", "literatura"],
    ["brands", "marcas"],
    ["brinquedos", "brinquedos"],
    ["celebrity", "pessoas"],
    ["comic", "quadrinhos"],
    ["comics", "quadrinhos"],
    ["control", "controle"],
    ["crossover", "crossovers"],
    ["crossovers", "crossovers"],
    ["decor", "decoracao"],
    ["decoracao", "decoracao"],
    ["dinosaurios", "dinosaurios"],
    ["educational", "educacional"],
    ["esportes", "esportes"],
    ["fantasy", "fantasia"],
    ["figuras militares", "historicos"],
    ["historical", "historicos"],
    ["historicos", "historicos"],
    ["history", "historicos"],
    ["holiday", "sazonal"],
    ["horror", "terror"],
    ["hq", "quadrinhos"],
    ["internet", "internet"],
    ["literature", "literatura"],
    ["martial arts", "artes-marciais"],
    ["meme", "internet"],
    ["modelos originais", "original"],
    ["music", "musica"],
    ["musica", "musica"],
    ["mythology", "fantasia"],
    ["nao identificado", "nao-identificado"],
    ["original", "original"],
    ["original characters", "original"],
    ["outro", "geral"],
    ["outros", "geral"],
    ["politics", "politica"],
    ["prop", "acessorios"],
    ["props", "acessorios"],
    ["quadrinhos", "quadrinhos"],
    ["real people", "pessoas"],
    ["real_people", "pessoas"],
    ["religious", "religioso"],
    ["science", "educacional"],
    ["sci fi", "sci-fi"],
    ["sci-fi", "sci-fi"],
    ["seasonal", "sazonal"],
    ["sports", "esportes"],
    ["tabletop", "tabletop"],
    ["tech", "tecnologia"],
    ["tematicos", "tematicos"],
    ["terrain", "tabletop"],
    ["tokusatsu", "tokusatsu"],
    ["toy", "brinquedos"],
    ["toys", "brinquedos"],
    ["unknown", "nao-identificado"],
    ["vehicle", "veiculos"],
    ["veiculos", "veiculos"],
    ["virtual youtubers", "vtubers"],
    ["vtuber", "vtubers"],
    ["vtubers", "vtubers"],
    ["western", "western"],
  ].map(([key, value]) => [normalizeComparable(key), value]),
);

const GENERIC_FOLDER_PARTS = normalizedPhraseSet([
  "general",
  "geral",
  "misc",
  "nao identificado",
  "original",
  "unknown",
  "various",
]);

const STUDIO_TERMS = normalizedPhraseSet([
  "3d",
  "artguy",
  "collectibles",
  "factory",
  "figures",
  "guild",
  "miniatures",
  "minis",
  "prints",
  "sculpt",
  "sculpture",
  "studio",
  "studios",
  "workshop",
]);

const GAME_ORIGIN_ALIASES = [
  ["assassins creed", "assassins-creed"],
  ["bioshock", "bioshock"],
  ["borderlands", "borderlands"],
  ["castlevania", "castlevania"],
  ["crash bandicoot", "crash-bandicoot"],
  ["cyberpunk 2077", "cyberpunk"],
  ["diablo", "diablo"],
  ["doom", "doom"],
  ["fallout", "fallout"],
  ["final fantasy", "final-fantasy"],
  ["five nights at freddys", "five-nights-at-freddys"],
  ["fnaf", "five-nights-at-freddys"],
  ["fortnite", "fortnite"],
  ["god of war", "god-of-war"],
  ["halo", "halo"],
  ["kingdom hearts", "kingdom-hearts"],
  ["kirby", "kirby"],
  ["league of legends", "league-of-legends"],
  ["legend of zelda", "zelda"],
  ["mario", "mario"],
  ["mass effect", "mass-effect"],
  ["mega man", "mega-man"],
  ["megaman", "mega-man"],
  ["metroid", "metroid"],
  ["minecraft", "minecraft"],
  ["mortal kombat", "mortal-kombat"],
  ["overwatch", "overwatch"],
  ["pokemon", "pokemon"],
  ["resident evil", "resident-evil"],
  ["silent hill", "silent-hill"],
  ["sonic", "sonic"],
  ["sonic the hedgehog", "sonic"],
  ["spyro", "spyro"],
  ["starcraft", "starcraft"],
  ["street fighter", "street-fighter"],
  ["super mario", "mario"],
  ["tekken", "tekken"],
  ["the last of us", "the-last-of-us"],
  ["tomb raider", "tomb-raider"],
  ["warcraft", "warcraft"],
  ["world of warcraft", "warcraft"],
  ["zelda", "zelda"],
]
  .map(([name, canonical]) => [normalizeComparable(name), canonical])
  .sort((a, b) => b[0].length - a[0].length);

const SAFE_SECONDARY_GAME_ALIASES = normalizedPhraseSet([
  "cyberpunk 2077",
  "final fantasy",
  "five nights at freddys",
  "fnaf",
  "fortnite",
  "god of war",
  "kingdom hearts",
  "kirby",
  "league of legends",
  "legend of zelda",
  "mario",
  "mega man",
  "megaman",
  "metroid",
  "minecraft",
  "mortal kombat",
  "overwatch",
  "pokemon",
  "resident evil",
  "silent hill",
  "sonic",
  "sonic the hedgehog",
  "spyro",
  "street fighter",
  "super mario",
  "tekken",
  "the last of us",
  "tomb raider",
  "zelda",
]);

const SUBJECT_GROUPS = [
  [
    "herois",
    [
      "ant man",
      "aquaman",
      "asa noturna",
      "batgirl",
      "batman",
      "black panther",
      "black widow",
      "blade",
      "capita marvel",
      "capitao america",
      "captain america",
      "captain marvel",
      "cavaleiro da lua",
      "ciclope",
      "colossus",
      "coisa",
      "cyclops",
      "daredevil",
      "demolidor",
      "doctor strange",
      "doutor estranho",
      "estelar",
      "feiticeira escarlate",
      "fenix",
      "flash",
      "gambit",
      "gaviao arqueiro",
      "green lantern",
      "hawkgirl",
      "hawkeye",
      "homem aranha",
      "homem de ferro",
      "hulk",
      "human torch",
      "iron man",
      "jean grey",
      "lanterna verde",
      "miles morales",
      "moon knight",
      "mr fantastic",
      "mulher invisivel",
      "mulher maravilha",
      "nightcrawler",
      "nightwing",
      "noturno",
      "pantera negra",
      "phoenix",
      "psylocke",
      "ravena",
      "raven",
      "robin",
      "scarlet witch",
      "senhor fantastico",
      "shazam",
      "she hulk",
      "silver surfer",
      "spider gwen",
      "spider man",
      "static",
      "storm",
      "supergirl",
      "superman",
      "surfista prateado",
      "tempestade",
      "the flash",
      "thing",
      "thor",
      "tocha humana",
      "viuva negra",
      "vision",
      "war machine",
      "wolverine",
      "wonder woman",
      "zatanna",
    ],
  ],
  [
    "viloes",
    [
      "abomination",
      "apocalipse",
      "apocalypse",
      "bane",
      "carnage",
      "carnificina",
      "charada",
      "cheetah",
      "coringa",
      "darkseid",
      "doc ock",
      "doctor doom",
      "doutor destino",
      "duas caras",
      "duende verde",
      "electro",
      "espantalho",
      "fanatico",
      "galactus",
      "green goblin",
      "hera venenosa",
      "juggernaut",
      "kingpin",
      "lex luthor",
      "modok",
      "omega red",
      "penguin",
      "pinguim",
      "poison ivy",
      "red skull",
      "rei do crime",
      "rhino",
      "riddler",
      "rino",
      "sabretooth",
      "scarecrow",
      "senhor frio",
      "sinestro",
      "thanos",
      "two face",
      "ultron",
    ],
  ],
  [
    "anti-herois",
    [
      "black adam",
      "capuz vermelho",
      "catwoman",
      "deadpool",
      "deathstroke",
      "ghost rider",
      "harley quinn",
      "justiceiro",
      "lobo",
      "loki",
      "magneto",
      "mistica",
      "motoqueiro fantasma",
      "mulher gato",
      "mystique",
      "punisher",
      "red hood",
      "spawn",
      "venom",
    ],
  ],
  [
    "equipes",
    [
      "avengers",
      "bat family",
      "batman family",
      "esquadrao suicida",
      "eternals",
      "fantastic four",
      "guardians of the galaxy",
      "guardioes da galaxia",
      "hydra",
      "justice league",
      "jovens titas",
      "liga da justica",
      "quarteto fantastico",
      "shield",
      "suicide squad",
      "teen titans",
      "vingadores",
      "watchmen",
      "x men",
      "x force",
      "x-men",
    ],
  ],
  [
    "coadjuvantes",
    [
      "alfred",
      "alfred pennyworth",
      "aunt may",
      "commissioner gordon",
      "gordon",
      "jim gordon",
      "lois lane",
      "mary jane",
      "mary jane watson",
      "may parker",
      "nick fury",
      "pepper potts",
      "uncle ben",
      "wong",
    ],
  ],
]
  .flatMap(([group, aliases]) => aliases.map((alias) => [normalizeComparable(alias), group]))
  .sort((a, b) => b[0].length - a[0].length);

const UNIVERSE_CHARACTER_BUCKETS = new Map(
  [
    { category: "marvel", group: "herois", target: "capitao-america", aliases: ["captain america", "capitao america"] },
    { category: "marvel", group: "herois", target: "capita-marvel", aliases: ["captain marvel", "capita marvel"] },
    { category: "marvel", group: "herois", target: "capita-carter", aliases: ["captain carter", "capita carter"] },
    { category: "marvel", group: "herois", target: "groot", aliases: ["baby groot"] },
    { category: "marvel", group: "herois", target: "bishop", aliases: ["bishop"] },
    { category: "marvel", group: "herois", target: "ciclope", aliases: ["cyclops", "ciclope"] },
    { category: "marvel", group: "herois", target: "domino", aliases: ["domino"] },
    { category: "marvel", group: "herois", target: "emma-frost", aliases: ["emma frost"] },
    { category: "marvel", group: "herois", target: "fera", aliases: ["beast", "fera"] },
    { category: "marvel", group: "herois", target: "gamora", aliases: ["gamora"] },
    { category: "marvel", group: "herois", target: "gambit", aliases: ["gambit"] },
    { category: "marvel", group: "herois", target: "groot", aliases: ["groot"] },
    { category: "marvel", group: "herois", target: "homem-aranha", aliases: ["spider man", "homem aranha"] },
    { category: "marvel", group: "herois", target: "homem-de-ferro", aliases: ["iron man", "homem de ferro"] },
    { category: "marvel", group: "herois", target: "homem-formiga", aliases: ["ant man", "ant-man", "homem formiga"] },
    { category: "marvel", group: "herois", target: "hulk", aliases: ["hulk", "incredible hulk"] },
    { category: "marvel", group: "herois", target: "magik", aliases: ["magik"] },
    { category: "marvel", group: "herois", target: "mulher-invisivel", aliases: ["invisible woman", "mulher invisivel"] },
    { category: "marvel", group: "herois", target: "nova", aliases: ["nova"] },
    { category: "marvel", group: "herois", target: "professor-x", aliases: ["professor x"] },
    { category: "marvel", group: "herois", target: "senhor-das-estrelas", aliases: ["star lord", "star-lord", "senhor das estrelas"] },
    {
      category: "marvel",
      group: "herois",
      target: "rocket-raccoon",
      aliases: ["rocket", "rocket raccoon", "rocket raccoon chibi", "rocket raccoon dimensions"],
    },
    { category: "marvel", group: "herois", target: "vampira", aliases: ["rogue", "vampira"] },
    { category: "marvel", group: "herois", target: "wolverine", aliases: ["wolverine"] },
    { category: "marvel", group: "herois", target: "x-23", aliases: ["x 23", "x-23", "x23", "laura kinney"] },
    { category: "marvel", group: "anti-herois", target: "deadpool", aliases: ["deadpool"] },
    { category: "marvel", group: "anti-herois", target: "gata-negra", aliases: ["black cat", "gata negra"] },
    { category: "marvel", group: "anti-herois", target: "loki", aliases: ["loki"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/abutre", aliases: ["vulture", "abutre"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/camaleao", aliases: ["chameleon", "camaleao"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/carnificina", aliases: ["carnage", "carnificina"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/doutor-octopus", aliases: ["doc ock", "doctor octopus", "doutor octopus"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/duende-macabro", aliases: ["hobgoblin", "duende macabro"] },
    {
      category: "marvel",
      group: "viloes",
      target: "viloes-homem-aranha/duende-verde",
      aliases: ["green goblin", "duende verde", "green goblin e spider man", "spider man e green goblin", "spider man green goblin"],
    },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/electro", aliases: ["electro"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/escorpiao", aliases: ["scorpion", "escorpiao"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/kraven", aliases: ["kraven"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/lagarto", aliases: ["lizard", "lagarto"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/rino", aliases: ["rhino", "rino"] },
    { category: "marvel", group: "viloes", target: "viloes-homem-aranha/duende-verde", aliases: ["green goblin style"] },
    {
      category: "marvel",
      group: "viloes",
      target: "viloes-homem-aranha/carnificina-e-venom",
      aliases: ["venom carnage", "venom carnificina", "carnificina e venom"],
    },
    { category: "marvel", group: "viloes", target: "viloes-x-men/apocalipse", aliases: ["apocalypse", "apocalipse"] },
    { category: "marvel", group: "viloes", target: "viloes-x-men/apocalipse-e-magneto", aliases: ["magneto apocalypse", "apocalipse e magneto"] },
    { category: "marvel", group: "viloes", target: "viloes-x-men/dentes-de-sabre", aliases: ["sabretooth", "dentes de sabre"] },
    { category: "marvel", group: "viloes", target: "viloes-x-men/fanatico", aliases: ["juggernaut", "fanatico"] },
    { category: "marvel", group: "viloes", target: "viloes-x-men/fanatico-e-deadpool", aliases: ["deadpool juggernaut", "fanatico e deadpool"] },
    { category: "marvel", group: "viloes", target: "viloes-x-men/omega-red", aliases: ["omega red", "omega-red"] },
    { category: "marvel", group: "viloes", target: "viloes-vingadores/thanos", aliases: ["thanos", "thanos death"] },
    { category: "marvel", group: "viloes", target: "viloes-vingadores/ultron", aliases: ["ultron"] },
    { category: "marvel", group: "viloes", target: "viloes-quarteto-fantastico/doutor-destino", aliases: ["doctor doom", "doutor destino"] },
    { category: "marvel", group: "viloes", target: "viloes-quarteto-fantastico/galactus", aliases: ["galactus"] },
    { category: "marvel", group: "viloes", target: "viloes-demolidor/rei-do-crime", aliases: ["kingpin", "rei do crime"] },
    { category: "marvel", group: "viloes", target: "viloes-hulk/abominacao", aliases: ["abomination", "abominacao"] },
    { category: "marvel", group: "viloes", target: "viloes-capitao-america/caveira-vermelha", aliases: ["red skull", "caveira vermelha"] },
    { category: "marvel", group: "viloes", target: "mephisto", aliases: ["mephisto"] },

    { category: "dc", group: "viloes", target: "viloes-superman/lex-luthor", aliases: ["lex luthor"] },
    { category: "dc", group: "viloes", target: "viloes-superman/darkseid", aliases: ["darkseid"] },
    { category: "dc", group: "viloes", target: "viloes-mulher-maravilha/ares", aliases: ["ares"] },
    { category: "dc", group: "viloes", target: "viloes-mulher-maravilha/cheetah", aliases: ["cheetah"] },
    { category: "dc", group: "viloes", target: "viloes-lanterna-verde/bleez", aliases: ["bleez"] },
    { category: "dc", group: "viloes", target: "viloes-lanterna-verde/sinestro", aliases: ["sinestro"] },
    { category: "dc", group: "viloes", target: "viloes-flash/gorila-grodd", aliases: ["gorilla grodd", "gorila grodd"] },
    { category: "dc", group: "herois", target: "batman", aliases: ["batman"] },
    { category: "dc", group: "herois", target: "batwoman", aliases: ["batwoman"] },
    { category: "dc", group: "herois", target: "canario-negro", aliases: ["black canary", "canario negro"] },
    { category: "dc", group: "herois", target: "artemis-crock", aliases: ["artemis crock"] },
    { category: "dc", group: "herois", target: "cyborg", aliases: ["cyborg"] },
    { category: "dc", group: "herois", target: "estelar", aliases: ["starfire", "estelar"] },
    { category: "dc", group: "herois", target: "gaviao-negro", aliases: ["hawkman", "gaviao negro"] },
    { category: "dc", group: "herois", target: "katana", aliases: ["katana"] },
    { category: "dc", group: "herois", target: "ravena", aliases: ["raven", "ravena"] },
    { category: "dc", group: "anti-herois", target: "arlequina", aliases: ["harley quinn", "arlequina"] },
    { category: "dc", group: "anti-herois", target: "mulher-gato", aliases: ["catwoman", "mulher gato"] },
    { category: "dc", group: "viloes", target: "viloes-batman/bane", aliases: ["bane"] },
    { category: "dc", group: "viloes", target: "viloes-batman/batman-que-ri", aliases: ["batman who laughs", "batman que ri"] },
    { category: "dc", group: "viloes", target: "viloes-batman/cara-de-barro", aliases: ["clayface", "cara de barro"] },
    { category: "dc", group: "viloes", target: "viloes-batman/charada", aliases: ["riddler", "charada"] },
    { category: "dc", group: "viloes", target: "viloes-batman/coringa", aliases: ["joker", "coringa"] },
    { category: "dc", group: "viloes", target: "viloes-batman/coringa-e-arlequina", aliases: ["coringa e arlequina", "joker and harley"] },
    { category: "dc", group: "viloes", target: "viloes-batman/duas-caras", aliases: ["two face", "duas caras"] },
    { category: "dc", group: "viloes", target: "viloes-batman/espantalho", aliases: ["scarecrow", "espantalho"] },
    { category: "dc", group: "viloes", target: "viloes-batman/hera-venenosa", aliases: ["poison ivy", "hera venenosa"] },
    { category: "dc", group: "viloes", target: "viloes-batman/arlequina-e-hera-venenosa", aliases: ["arlequina e hera venenosa", "harley quinn e hera venenosa"] },
    { category: "dc", group: "viloes", target: "viloes-batman/pinguim", aliases: ["penguin", "pinguim"] },
    { category: "dc", group: "viloes", target: "lobo-da-estepe", aliases: ["steppenwolf", "lobo da estepe"] },
    { category: "dc", group: "viloes", target: "viloes-batman/senhor-frio", aliases: ["mr freeze", "senhor frio"] },
    { category: "dc", group: "viloes", target: "solomon-grundy", aliases: ["solomon grundy"] },
  ].flatMap((entry) =>
    entry.aliases.map((alias) => [
      `${normalizeComparable(entry.category)}|${normalizeComparable(alias)}`,
      { group: entry.group, target: entry.target },
    ]),
  ),
);

const VEHICLE_TERMS = normalizedPhraseSet([
  "batmobile",
  "batmovel",
  "car",
  "carro",
  "helicarrier",
  "jet",
  "moto",
  "nave",
  "ship",
  "vehicle",
  "veiculo",
]);

const DIORAMA_TERMS = normalizedPhraseSet([
  "battle",
  "batalha",
  "cena",
  "collection",
  "colecao",
  "crossover",
  "crossovers",
  "diorama",
  "duo",
  "group",
  "grupo",
  "scene",
  "set",
  "sets",
  "versus",
  "vs",
]);

const OBJECT_TERMS = normalizedPhraseSet([
  "armor",
  "armadura",
  "base",
  "bust",
  "busto",
  "capacete",
  "helmet",
  "mask",
  "mascara",
  "prop",
  "props",
  "shield",
  "stormbreaker",
  "sword",
  "trident",
  "weapon",
]);

const NON_CATALOG_EXCLUSION_TERMS = normalizedPhraseSet([
  "bust",
  "busto",
  "character",
  "estatua",
  "estatueta",
  "figure",
  "figures",
  "figurine",
  "personagem",
  "statue",
]);

const NON_CATALOG_MODEL_CONTEXT_TERMS = normalizedPhraseSet([
  "holder",
  "keycap",
  "keycaps",
  "layout",
  "part",
  "parts",
  "phone stand",
  "rack",
  "reference",
  "sheet",
  "stand",
  "stands",
  "storage",
]);

const NON_CATALOG_ACCESSORY_TERMS = normalizedPhraseSet([
  "accessories",
  "accessory",
  "aircraft",
  "alien heads",
  "alien tails",
  "armor parts",
  "asas",
  "axe",
  "bags",
  "base",
  "blade",
  "blades",
  "blaster",
  "bits",
  "billy club",
  "body parts",
  "bowl",
  "bowls",
  "capacetes",
  "cat ear headband",
  "case",
  "cases",
  "chest",
  "chests",
  "club",
  "coin",
  "coins",
  "container",
  "cup holder",
  "dagger",
  "device",
  "devil fruit",
  "digivice",
  "display",
  "emblem",
  "elmo",
  "espada",
  "fan headpiece",
  "fantasy staff",
  "fruit",
  "frutas do diabo",
  "furniture",
  "gauntlet",
  "gold key",
  "gun",
  "hand parts",
  "handgun",
  "hammer",
  "headband",
  "headpiece",
  "helmet",
  "helmet parts",
  "helmet plan",
  "helmets",
  "holder",
  "kit",
  "jiki jiki no mi",
  "knife",
  "kunai",
  "mask",
  "masks",
  "mace",
  "mascara",
  "organizer",
  "parts",
  "paint",
  "pendant",
  "pipe",
  "pistol",
  "pokebola",
  "prop",
  "props",
  "rack",
  "reference",
  "rifle",
  "sci fi discs",
  "sci fi spheres",
  "scepter",
  "shield",
  "shotgun",
  "spoons",
  "spear",
  "stand",
  "stands",
  "stormbreaker",
  "symbol",
  "symbols",
  "sword",
  "swords",
  "tails",
  "terrain",
  "tiara",
  "token",
  "tokens",
  "vessel",
  "vessels",
  "weapon",
  "weapons",
  "wrist device",
]);

const NON_CATALOG_DECOR_TERMS = normalizedPhraseSet([
  "architectural",
  "architecture",
  "architecture models",
  "award",
  "banner",
  "bird cage",
  "bookend",
  "bookends",
  "bookshelf",
  "box",
  "boxes",
  "cage",
  "cages",
  "cauldron",
  "clock",
  "coffin",
  "coffin bonsai planter",
  "coin",
  "color swatch",
  "color swatches",
  "decor",
  "decoracao",
  "decorative",
  "diorama",
  "display",
  "egg",
  "eggs",
  "floral relief",
  "frame",
  "gravestone",
  "gravestones",
  "flask",
  "halloween",
  "heart box",
  "jar",
  "jars",
  "landmark",
  "lantern",
  "lanterns",
  "mesh ball",
  "ornament",
  "ornaments",
  "orbs",
  "plaque",
  "plinth",
  "planter",
  "potion",
  "potion bottles",
  "prop",
  "props",
  "pumpkin",
  "pumpkins",
  "ruin",
  "sarcophagus",
  "scenery",
  "scene",
  "shelf",
  "sign",
  "signs",
  "skull relief",
  "stand",
  "stands",
  "star",
  "sunflower",
  "tombstone",
  "token",
  "trophy",
  "tower",
  "wall decoration",
  "wall hanger",
]);

const NON_CATALOG_VEHICLE_TERMS = normalizedPhraseSet([
  "aircraft",
  "aviao",
  "armored transport",
  "bike",
  "bikes",
  "biker",
  "car",
  "carro",
  "classic car",
  "chariot",
  "crashed car",
  "drones",
  "flying bath tub",
  "food truck",
  "fusca",
  "jeep",
  "locomotive",
  "milano race car",
  "mini car",
  "motorcycle",
  "motorcycles",
  "nave",
  "pirate ship",
  "scooter",
  "ship",
  "space ship",
  "spacecraft",
  "submarine",
  "tank",
  "tanks",
  "transport",
  "truck",
  "vehicle",
  "veiculo",
]);

const EXPLICIT_NON_CATALOG_FOLDER_TARGETS = new Map(
  [
    ["outros|acessorios|balloon prop", "decoracao"],
    ["outros|acessorios|battlecat wall plate", "decoracao"],
    ["outros|acessorios|blue cube", "decoracao"],
    ["outros|acessorios|character egg cups", "decoracao"],
    ["outros|acessorios|character keycaps", "acessorios"],
    ["outros|acessorios|chess pieces", "decoracao"],
    ["outros|acessorios|color keycaps", "acessorios"],
    ["outros|acessorios|cristal vermelho", "decoracao"],
    ["outros|acessorios|daruma", "decoracao"],
    ["outros|acessorios|daruma doll", "decoracao"],
    ["outros|acessorios|deck bases", "decoracao"],
    ["outros|acessorios|dragon keychain", "acessorios"],
    ["outros|acessorios|efeito portal", "decoracao"],
    ["outros|acessorios|efeitos fantasma", "decoracao"],
    ["outros|acessorios|fantasy chess pieces", "decoracao"],
    ["outros|acessorios|frames and props", "decoracao"],
    ["outros|acessorios|green character cup", "decoracao"],
    ["outros|acessorios|mesa de armas", "acessorios"],
    ["outros|acessorios|miniature storage system", "acessorios"],
    ["outros|acessorios|moeda caveira", "decoracao"],
    ["outros|acessorios|pink ring keychain", "acessorios"],
    ["outros|acessorios|plumas elementais", "decoracao"],
    ["outros|acessorios|tacas caveira", "decoracao"],
    ["outros|acessorios|arma sci fi", "acessorios"],
    ["outros|acessorios|articulated figure body", "acessorios"],
    ["outros|acessorios|balloon dog", "decoracao"],
    ["outros|acessorios|baton set", "acessorios"],
    ["outros|acessorios|black armor layout", "acessorios"],
    ["outros|acessorios|bushipack heads", "acessorios"],
    ["outros|acessorios|bushipack torsos", "acessorios"],
    ["outros|acessorios|chama magica", "decoracao"],
    ["outros|acessorios|character anatomy set", "acessorios"],
    ["outros|acessorios|chibi body lineup", "acessorios"],
    ["outros|acessorios|color palette card", "acessorios"],
    ["outros|acessorios|combat turbomachine", "veiculos"],
    ["outros|acessorios|corda enrolada", "decoracao"],
    ["outros|acessorios|creature bases", "decoracao"],
    ["outros|acessorios|cyberpunk bar", "decoracao"],
    ["outros|acessorios|dwarf backs", "acessorios"],
    ["outros|acessorios|eggsprites zungar bats", "acessorios"],
    ["outros|acessorios|elf body set", "acessorios"],
    ["outros|acessorios|egyptian winged skull", "decoracao"],
    ["outros|acessorios|figure pose set", "acessorios"],
    ["outros|acessorios|foot model", "acessorios"],
    ["outros|acessorios|gold panel set", "decoracao"],
    ["outros|acessorios|gothic chair", "decoracao"],
    ["outros|acessorios|graffiti sneaker", "decoracao"],
    ["outros|acessorios|hand throne", "decoracao"],
    ["outros|acessorios|hands", "acessorios"],
    ["outros|acessorios|head sculpt set", "acessorios"],
    ["outros|acessorios|holy hand grenade", "acessorios"],
    ["outros|acessorios|katana set", "acessorios"],
    ["outros|acessorios|metal rods", "acessorios"],
    ["outros|acessorios|model painting supplies", "acessorios"],
    ["outros|acessorios|muscular bodies", "acessorios"],
    ["outros|acessorios|ornate throne", "decoracao"],
    ["outros|acessorios|ornate throne chair", "decoracao"],
    ["outros|acessorios|pants set", "acessorios"],
    ["outros|acessorios|pig bank", "decoracao"],
    ["outros|acessorios|predator biohelmet", "acessorios"],
    ["outros|acessorios|ram skull", "decoracao"],
    ["outros|acessorios|red armchair", "decoracao"],
    ["outros|acessorios|rings", "acessorios"],
    ["outros|acessorios|rocket ammo set", "acessorios"],
    ["outros|acessorios|round bases", "decoracao"],
    ["outros|acessorios|saiyan armor", "acessorios"],
    ["outros|acessorios|samito teapot", "decoracao"],
    ["outros|acessorios|santa boot", "decoracao"],
    ["outros|acessorios|santa sleigh", "veiculos"],
    ["outros|acessorios|scarab beetles", "decoracao"],
    ["outros|acessorios|sci fi grenade", "acessorios"],
    ["outros|acessorios|sci fi lamp", "decoracao"],
    ["outros|acessorios|sci fi orb", "decoracao"],
    ["outros|acessorios|science candlesticks", "decoracao"],
    ["outros|acessorios|shields", "acessorios"],
    ["outros|acessorios|skateboard", "veiculos"],
    ["outros|acessorios|skeleton straw topper", "decoracao"],
    ["outros|acessorios|skull cup pair", "decoracao"],
    ["outros|acessorios|skull portal", "decoracao"],
    ["outros|acessorios|spider robot", "acessorios"],
    ["outros|acessorios|statblocks and maps", "acessorios"],
    ["outros|acessorios|straw hat keychain", "acessorios"],
    ["outros|acessorios|stylized chair", "decoracao"],
    ["outros|acessorios|stylized yellow chair", "decoracao"],
    ["outros|acessorios|super saiyan hair", "acessorios"],
    ["outros|acessorios|tech visor purple", "acessorios"],
    ["outros|acessorios|terminator themed cube", "decoracao"],
    ["outros|acessorios|titan copter", "veiculos"],
    ["outros|acessorios|titans keycaps", "acessorios"],
    ["outros|acessorios|toilet character prop", "decoracao"],
    ["outros|acessorios|toy cannon", "acessorios"],
    ["outros|acessorios|toy props", "decoracao"],
    ["outros|acessorios|white gladiator armor", "acessorios"],
    ["outros|acessorios|wooden mannequin", "acessorios"],
    ["outros|acessorios|yellow keycaps", "acessorios"],
    ["outros|acessorios|zombie door stopper", "decoracao"],
    ["outros|decoracao|capsule house", "decoracao"],
    ["outros|decoracao|crystal figure display", "decoracao"],
    ["outros|decoracao|cute creature cups", "decoracao"],
    ["outros|decoracao|dragon bust decor", "decoracao"],
    ["outros|decoracao|goblet set", "decoracao"],
    ["outros|decoracao|kawaii burger", "decoracao"],
    ["outros|decoracao|keychains", "acessorios"],
    ["outros|decoracao|lord of the rings decor", "decoracao"],
    ["outros|decoracao|miniature townhouse", "decoracao"],
    ["outros|decoracao|mulher lua", "decoracao"],
    ["outros|decoracao|oni mask model", "decoracao"],
    ["outros|decoracao|ornamental bowls", "decoracao"],
    ["outros|decoracao|pink swirl keychain", "acessorios"],
    ["outros|decoracao|roman numeral plaques", "decoracao"],
    ["outros|decoracao|skull set", "decoracao"],
    ["outros|decoracao|tiki mask", "decoracao"],
    ["outros|decoracao|toilet bust", "decoracao"],
    ["outros|decoracao|toilet paper holder", "decoracao"],
    ["outros|decoracao|tree stump vase", "decoracao"],
    ["outros|decoracao|zombie poster", "decoracao"],
    ["outros|veiculos|grenadier spaceship", "veiculos"],
    ["outros|veiculos|robot kit", "acessorios"],
  ].map(([key, target]) => [key, target]),
);

function obviousNonCatalogFolderTarget({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));
  if (!folderText || categoryText.startsWith("_")) return null;

  const explicitTarget = EXPLICIT_NON_CATALOG_FOLDER_TARGETS.get(`${categoryText}|${franchiseText}|${folderText}`);
  if (explicitTarget) {
    return { category: "_fora-catalogo", franchise: explicitTarget, folder: cleanCatalogSlug(folder, "geral") };
  }

  const candidateValues = [folderText, fileText];
  const hasExcludedSubject =
    hasAnyPhrase(candidateValues, NON_CATALOG_EXCLUSION_TERMS) &&
    !hasAnyPhrase(candidateValues, NON_CATALOG_MODEL_CONTEXT_TERMS);
  if (hasExcludedSubject) return null;

  const targetFolder = cleanCatalogSlug(folder, "geral");

  if (categoryText === "outros" && ["acessorios", "decoracao", "veiculos"].includes(franchiseText) && hasAnyPhrase(candidateValues, NON_CATALOG_VEHICLE_TERMS)) {
    return { category: "_fora-catalogo", franchise: "veiculos", folder: targetFolder };
  }
  if (categoryText === "outros" && ["acessorios", "decoracao"].includes(franchiseText) && hasAnyPhrase(candidateValues, NON_CATALOG_DECOR_TERMS)) {
    return { category: "_fora-catalogo", franchise: "decoracao", folder: targetFolder };
  }
  if (categoryText === "outros" && franchiseText === "acessorios" && hasAnyPhrase(candidateValues, NON_CATALOG_ACCESSORY_TERMS)) {
    return { category: "_fora-catalogo", franchise: "acessorios", folder: targetFolder };
  }
  if (["marvel", "dc"].includes(categoryText) && franchiseText === "objetos acessorios" && hasAnyPhrase(candidateValues, NON_CATALOG_ACCESSORY_TERMS)) {
    return {
      category: "_fora-catalogo",
      franchise: `${categoryText}-objetos-acessorios`,
      folder: targetFolder,
    };
  }

  return null;
}

const MISPLACED_ACCESSORY_CHARACTER_TARGETS = new Map(
  [
    ["outros|acessorios|astronaut figure", { category: "outros", franchise: "sci-fi", folder: "astronauta" }],
    ["outros|acessorios|aerosol bust", { category: "_revisar", franchise: "identificar", folder: "aerosol-bust" }],
    ["outros|acessorios|animals and creatures", { category: "outros", franchise: "animais", folder: "cobra" }],
    ["outros|acessorios|bear", { category: "outros", franchise: "animais", folder: "urso" }],
    ["outros|acessorios|black armor bust", { category: "_revisar", franchise: "identificar", folder: "black-armor-bust" }],
    ["outros|acessorios|black figure lineup", { category: "_revisar", franchise: "identificar", folder: "black-figure-lineup" }],
    ["outros|acessorios|blue clay bust", { category: "_revisar", franchise: "identificar", folder: "blue-clay-bust" }],
    ["outros|acessorios|bob omb figure", { category: "games", franchise: "mario", folder: "bob-omb" }],
    ["outros|acessorios|boombox robot", { category: "outros", franchise: "sci-fi", folder: "boombox-robot" }],
    ["outros|acessorios|bust collection", { category: "_revisar", franchise: "identificar", folder: "bust-collection" }],
    ["outros|acessorios|bust pack", { category: "_revisar", franchise: "identificar", folder: "bust-pack" }],
    ["outros|acessorios|busts and trophies", { category: "_revisar", franchise: "identificar", folder: "busts-and-trophies" }],
    ["outros|acessorios|character busts", { category: "_revisar", franchise: "identificar", folder: "character-busts" }],
    ["outros|acessorios|classical statue", { category: "outros", franchise: "arte", folder: "estatua-classica" }],
    ["outros|acessorios|clay character pose", { category: "_revisar", franchise: "identificar", folder: "clay-character-pose" }],
    ["outros|acessorios|cobra figure", { category: "outros", franchise: "animais", folder: "cobra" }],
    ["outros|acessorios|colored character lineup", { category: "_revisar", franchise: "identificar", folder: "colored-character-lineup" }],
    ["outros|acessorios|colorful mascot", { category: "outros", franchise: "marcas", folder: "m-and-m" }],
    ["outros|acessorios|cute sea creatures", { category: "outros", franchise: "animais", folder: "arraia" }],
    ["outros|acessorios|egyptian sarcophagus bust", { category: "outros", franchise: "historicos", folder: "egito/sarcophagus-bust" }],
    ["outros|acessorios|elephant head", { category: "outros", franchise: "animais", folder: "elefante" }],
    ["outros|acessorios|elvis presley", { category: "outros", franchise: "pessoas", folder: "elvis-presley" }],
    ["outros|acessorios|eternal pilgrims", { category: "outros", franchise: "tabletop", folder: "eternal-pilgrims" }],
    ["outros|acessorios|female anatomy", { category: "_revisar", franchise: "conteudo-sensivel", folder: "female-anatomy" }],
    ["outros|acessorios|female body clay", { category: "_revisar", franchise: "conteudo-sensivel", folder: "female-body-clay" }],
    ["outros|acessorios|female body kit", { category: "_revisar", franchise: "conteudo-sensivel", folder: "female-body-kit" }],
    ["outros|acessorios|female body turnaround", { category: "_revisar", franchise: "identificar", folder: "female-body-turnaround" }],
    ["outros|acessorios|female muscle model", { category: "anime", franchise: "attack-on-titan", folder: "tita-femea" }],
    ["outros|acessorios|gold armor bust", { category: "_revisar", franchise: "conteudo-sensivel", folder: "gold-armor-bust" }],
    ["outros|acessorios|gundam head", { category: "anime", franchise: "gundam", folder: "gundam" }],
    ["outros|acessorios|head busts", { category: "_revisar", franchise: "identificar", folder: "head-busts" }],
    ["outros|acessorios|joseph stalin bust", { category: "outros", franchise: "historicos", folder: "joseph-stalin" }],
    ["outros|acessorios|julius caesar bust", { category: "outros", franchise: "historicos", folder: "julio-cesar" }],
    ["outros|acessorios|lego minifigures", { category: "outros", franchise: "brinquedos", folder: "lego-minifigures" }],
    ["outros|acessorios|lion head sculpt", { category: "outros", franchise: "animais", folder: "leao" }],
    ["outros|acessorios|low poly bird", { category: "outros", franchise: "animais", folder: "passaro-low-poly" }],
    ["outros|acessorios|male bust clay", { category: "_revisar", franchise: "identificar", folder: "male-bust-clay" }],
    ["outros|acessorios|male figure clay", { category: "_revisar", franchise: "identificar", folder: "male-figure-clay" }],
    ["outros|acessorios|male figure clay pair", { category: "_revisar", franchise: "identificar", folder: "male-figure-clay-pair" }],
    ["outros|acessorios|male figure clay variant", { category: "_revisar", franchise: "identificar", folder: "male-figure-clay-variant" }],
    ["outros|acessorios|mechanika", { category: "outros", franchise: "sci-fi", folder: "steampunk-adventurers" }],
    ["outros|acessorios|miniatures", { category: "outros", franchise: "fantasia", folder: "cavaleira" }],
    ["outros|acessorios|orange figures", { category: "_revisar", franchise: "identificar", folder: "orange-figures" }],
    ["outros|acessorios|orbs and skulls", { category: "_revisar", franchise: "identificar", folder: "orbs-and-skulls" }],
    ["outros|acessorios|painted grick", { category: "outros", franchise: "fantasia", folder: "grick" }],
    ["outros|acessorios|power rangers figures", { category: "filmes-series", franchise: "power-rangers", folder: "rangers" }],
    ["outros|acessorios|preview errors", { category: "_problemas", franchise: "preview-errors", folder: "method-invocation-exception" }],
    ["outros|acessorios|red m and m", { category: "outros", franchise: "marcas", folder: "m-and-m-vermelho" }],
    ["outros|acessorios|red gate bridge", { category: "dc", franchise: "cenas-dioramas", folder: "superman-vs-doomsday" }],
    ["outros|acessorios|skeleton bust", { category: "outros", franchise: "terror", folder: "esqueleto" }],
    ["outros|acessorios|small busts", { category: "_revisar", franchise: "identificar", folder: "small-busts" }],
    ["outros|acessorios|small figure diorama", { category: "games", franchise: "mario", folder: "mario-e-princesa-peach" }],
    ["outros|acessorios|statue prop", { category: "_revisar", franchise: "identificar", folder: "statue-prop" }],
    ["outros|acessorios|tiger bust trophy", { category: "outros", franchise: "animais", folder: "tigre" }],
    ["outros|acessorios|titan 13 bust", { category: "outros", franchise: "sci-fi", folder: "titan-13" }],
    ["outros|acessorios|toothless head", { category: "desenhos-animacao", franchise: "como-treinar-o-seu-dragao", folder: "banguela" }],
    ["outros|acessorios|totems and statues", { category: "outros", franchise: "arte", folder: "totem" }],
    ["outros|acessorios|wedge pack", { category: "_revisar", franchise: "identificar", folder: "wedge-pack" }],
    ["outros|acessorios|yellow m and m", { category: "outros", franchise: "marcas", folder: "m-and-m-amarelo" }],
    ["outros|decoracao|animal models", { category: "outros", franchise: "animais", folder: "camaleao" }],
    ["outros|decoracao|betta fish", { category: "outros", franchise: "animais", folder: "peixe-betta" }],
    ["outros|decoracao|cactus character", { category: "outros", franchise: "original", folder: "cactus-character" }],
    ["outros|decoracao|chair display statue", { category: "_revisar", franchise: "conteudo-sensivel", folder: "chair-display-statue" }],
    ["outros|decoracao|clock statue", { category: "filmes-series", franchise: "de-volta-para-o-futuro", folder: "relogio" }],
    ["outros|decoracao|cute duck figures", { category: "outros", franchise: "sazonal", folder: "halloween/patos" }],
    ["outros|decoracao|cute winter figures", { category: "outros", franchise: "sazonal", folder: "inverno" }],
    ["outros|decoracao|dragon oriental", { category: "outros", franchise: "fantasia", folder: "dragao-oriental" }],
    ["outros|decoracao|duckling miniatures", { category: "outros", franchise: "animais", folder: "patinhos" }],
    ["outros|decoracao|easter basket figures", { category: "outros", franchise: "sazonal", folder: "pascoa" }],
    ["outros|decoracao|female marble statue", { category: "outros", franchise: "arte", folder: "estatua-classica" }],
    ["outros|decoracao|football figures", { category: "outros", franchise: "esportes", folder: "futebol/lionel-messi" }],
    ["outros|decoracao|heart gnome", { category: "outros", franchise: "sazonal", folder: "dia-dos-namorados" }],
    ["outros|decoracao|hedgehog mushroom", { category: "outros", franchise: "animais", folder: "porco-espinho" }],
    ["outros|decoracao|jesus statue", { category: "outros", franchise: "religioso", folder: "jesus" }],
    ["outros|decoracao|landmark statues", { category: "outros", franchise: "historicos", folder: "estatua-da-liberdade" }],
    ["outros|decoracao|mcdonalds ronald bench figures", { category: "outros", franchise: "marcas", folder: "mcdonalds/ronald-mcdonald" }],
    ["outros|decoracao|mcdonalds figures", { category: "outros", franchise: "marcas", folder: "mcdonalds/ronald-mcdonald" }],
    ["outros|decoracao|mona lisa", { category: "outros", franchise: "arte", folder: "mona-lisa" }],
    ["outros|decoracao|monumento mulher", { category: "outros", franchise: "arte", folder: "monumento-mulher" }],
    ["outros|decoracao|novelty bathroom figures", { category: "_revisar", franchise: "conteudo-sensivel", folder: "novelty-bathroom-figures" }],
    ["outros|decoracao|orange demon dog", { category: "outros", franchise: "original", folder: "orange-demon-dog" }],
    ["outros|decoracao|owl bust", { category: "outros", franchise: "animais", folder: "coruja" }],
    ["outros|decoracao|peixe decorativo", { category: "outros", franchise: "animais", folder: "peixe" }],
    ["outros|decoracao|red anatomy head", { category: "_revisar", franchise: "identificar", folder: "red-anatomy-head" }],
    ["outros|decoracao|retro toy figures", { category: "outros", franchise: "sci-fi", folder: "robo-retro" }],
    ["outros|decoracao|santa busts", { category: "outros", franchise: "sazonal", folder: "natal/papai-noel" }],
    ["outros|decoracao|three wise monkeys", { category: "outros", franchise: "arte", folder: "tres-macacos-sabios" }],
    ["outros|decoracao|vase figures", { category: "outros", franchise: "arte", folder: "vasos-com-figura" }],
    ["outros|decoracao|winter duck", { category: "outros", franchise: "sazonal", folder: "inverno/pato" }],
    ["outros|veiculos|red robot", { category: "outros", franchise: "sci-fi", folder: "robo-vermelho" }],
    ["outros|veiculos|robot pair", { category: "outros", franchise: "sci-fi", folder: "robos" }],
    ["dc|objetos acessorios|bizarro", { category: "dc", franchise: "viloes", folder: "viloes-superman/bizarro" }],
    ["dc|objetos acessorios|black manta", { category: "dc", franchise: "viloes", folder: "black-manta" }],
    ["dc|objetos acessorios|businessman statue", { category: "_revisar", franchise: "identificar", folder: "businessman-statue" }],
    ["dc|objetos acessorios|deadman", { category: "dc", franchise: "herois", folder: "deadman" }],
    ["dc|objetos acessorios|devastator", { category: "dc", franchise: "viloes", folder: "viloes-batman/devastador" }],
    ["dc|objetos acessorios|general zod", { category: "dc", franchise: "viloes", folder: "viloes-superman/general-zod" }],
    ["dc|objetos acessorios|grim knight", { category: "dc", franchise: "viloes", folder: "viloes-batman/grim-knight" }],
    ["dc|objetos acessorios|joker bust", { category: "dc", franchise: "viloes", folder: "viloes-batman/coringa" }],
    ["dc|objetos acessorios|joker busts", { category: "dc", franchise: "viloes", folder: "viloes-batman/coringa" }],
    ["dc|objetos acessorios|judge dredd", { category: "outros", franchise: "quadrinhos", folder: "judge-dredd" }],
    ["dc|objetos acessorios|power girl", { category: "dc", franchise: "herois", folder: "power-girl" }],
    ["dc|objetos acessorios|the comedian", { category: "dc", franchise: "anti-herois", folder: "the-comedian" }],
    ["marvel|objetos acessorios|beast bust", { category: "marvel", franchise: "herois", folder: "fera" }],
    ["marvel|objetos acessorios|famine", { category: "marvel", franchise: "viloes", folder: "viloes-x-men/fome" }],
    ["marvel|objetos acessorios|hulkbuster armor", { category: "marvel", franchise: "herois", folder: "hulkbuster" }],
    ["marvel|objetos acessorios|invincible bust", { category: "outros", franchise: "quadrinhos", folder: "invincible" }],
    ["marvel|objetos acessorios|iron fist", { category: "marvel", franchise: "herois", folder: "punho-de-ferro" }],
    ["marvel|objetos acessorios|man spider", { category: "marvel", franchise: "herois", folder: "homem-aranha/man-spider" }],
    ["marvel|objetos acessorios|rescue", { category: "marvel", franchise: "herois", folder: "rescue" }],
    ["marvel|objetos acessorios|sentry", { category: "marvel", franchise: "herois", folder: "sentinela" }],
    ["marvel|objetos acessorios|spider woman", { category: "marvel", franchise: "herois", folder: "mulher-aranha" }],
    ["marvel|objetos acessorios|superhero statues", { category: "_revisar", franchise: "identificar", folder: "superhero-statues" }],
    ["marvel|objetos acessorios|sylvie", { category: "marvel", franchise: "anti-herois", folder: "sylvie" }],
    ["marvel|objetos acessorios|symbiote spider man", { category: "marvel", franchise: "herois", folder: "homem-aranha/spider-man-simbionte" }],
    ["marvel|objetos acessorios|valkyrie", { category: "marvel", franchise: "herois", folder: "valquiria" }],
    ["marvel|objetos acessorios|war", { category: "marvel", franchise: "viloes", folder: "viloes-x-men/guerra" }],
    ["marvel|objetos acessorios|winter soldier armor", { category: "marvel", franchise: "herois", folder: "soldado-invernal" }],
    ["marvel|objetos acessorios|yondu", { category: "marvel", franchise: "anti-herois", folder: "yondu" }],
  ].map(([key, target]) => [key, target]),
);

function misplacedAccessoryCharacterRewrite({ category, franchise, folder } = {}) {
  const key = [category, franchise, folder].map((value) => normalizeComparable(value)).join("|");
  const target = MISPLACED_ACCESSORY_CHARACTER_TARGETS.get(key);
  if (!target) return null;
  return { ...target, reasons: ["misplaced_character_accessory_bucket"] };
}

function aliasKey(category, value) {
  return `${normalizeComparable(category)}|${normalizeComparable(value)}`;
}

function scopedAliasKey(category, franchise, value) {
  return `${normalizeComparable(category)}|${normalizeComparable(franchise)}|${normalizeComparable(value)}`;
}

function aliasMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const alias of entry.aliases) map.set(aliasKey(entry.category, alias), entry);
  }
  return map;
}

function scopedAliasMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      map.set(scopedAliasKey(entry.category, entry.franchise, alias), entry.target);
    }
  }
  return map;
}

const CATALOG_FRANCHISE_ALIASES = aliasMap([
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "dragon ball",
    aliases: [
      "dragon ball gt",
      "dragon ball goku vegeta",
      "dragon ball super",
      "dragon ball vegeto majin buu",
      "dragon ball what if",
      "dragon ball z",
    ],
  },
  { category: "anime", targetCategory: "anime", franchise: "dragon ball", aliases: ["dragon ball style"], folder: "original" },
  { category: "anime", targetCategory: "anime", franchise: "naruto", aliases: ["naruto figure", "naruto style figure"] },
  { category: "anime", targetCategory: "anime", franchise: "naruto", aliases: ["naruto minato"], folder: "minato-namikaze" },
  { category: "anime", targetCategory: "anime", franchise: "naruto", aliases: ["naruto sexy jutsu sakura"], folder: "sakura-haruno" },
  { category: "anime", targetCategory: "anime", franchise: "yu-gi-oh", aliases: ["yu gi oh", "yu-gi-oh", "yu-gi-oh gx"] },
  { category: "anime", targetCategory: "anime", franchise: "yu-gi-oh", aliases: ["yu-gi-oh yugi"], folder: "yugi-muto" },
  { category: "anime", targetCategory: "anime", franchise: "one-piece", aliases: ["one piece"] },
  { category: "anime", targetCategory: "anime", franchise: "bleach", aliases: ["bleach style"] },
  { category: "anime", targetCategory: "anime", franchise: "cardcaptor-sakura", aliases: ["cardcaptor sakura"] },
  { category: "anime", targetCategory: "anime", franchise: "demon-slayer", aliases: ["demon slayer", "demon slayer group"] },
  { category: "anime", targetCategory: "anime", franchise: "dungeon-meshi", aliases: ["delicious in dungeon", "dungeon meshi"] },
  { category: "anime", targetCategory: "anime", franchise: "ghost-in-the-shell", aliases: ["ghost in the shell"] },
  { category: "anime", targetCategory: "anime", franchise: "kill-la-kill", aliases: ["kill la kill"] },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "miss-kobayashis-dragon-maid",
    aliases: ["miss kobayashi dragon maid", "miss kobayashi's dragon maid", "miss kobayashis dragon maid"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "the-apothecary-diaries",
    aliases: ["apothecary diaries", "the apothecary diaries"],
  },
  { category: "anime", targetCategory: "anime", franchise: "evangelion", aliases: ["neon genesis evangelion", "evangelion style"] },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "frieren",
    aliases: ["frieren beyond journeys end", "frieren beyond journey's end", "frieren style figure"],
  },
  { category: "anime", targetCategory: "anime", franchise: "afro-samurai", aliases: ["afro samurai"] },
  { category: "anime", targetCategory: "anime", franchise: "astro-boy", aliases: ["astro boy"] },
  { category: "anime", targetCategory: "anime", franchise: "sailor-moon", aliases: ["sailor moon"] },
  { category: "anime", targetCategory: "anime", franchise: "attack-on-titan", aliases: ["attack on titan"] },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "jojo",
    aliases: ["jojo bizarre adventure", "jojos bizarre adventure", "jojo's bizarre adventure"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "my hero academia",
    aliases: ["boku no hero academia", "my hero academia"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "cavaleiros-do-zodiaco",
    aliases: ["cavaleiros do zodiaco", "saint seiya", "saint seiya seiya"],
  },
  { category: "anime", targetCategory: "anime", franchise: "detective-conan", aliases: ["detective conan"] },
  { category: "anime", targetCategory: "anime", franchise: "doraemon", aliases: ["doraemon"] },
  { category: "anime", targetCategory: "anime", franchise: "mashle", aliases: ["mashle"] },
  { category: "anime", targetCategory: "anime", franchise: "no-game-no-life", aliases: ["no game no life"] },
  { category: "anime", targetCategory: "anime", franchise: "slam-dunk", aliases: ["slam dunk"] },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "Super Campeoes",
    aliases: ["captain tsubasa", "super campeoes"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "meu-amigo-totoro",
    aliases: ["meu amigo totoro", "my neighbor totoro", "studio ghibli totoro"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "o-castelo-animado",
    aliases: ["howls moving castle", "howl's moving castle"],
  },
  {
    category: "anime",
    targetCategory: "anime",
    franchise: "o-servico-de-entregas-da-kiki",
    aliases: ["kikis delivery service", "kiki's delivery service"],
  },
  { category: "anime", targetCategory: "anime", franchise: "princesa-mononoke", aliases: ["princesa mononoke", "princess mononoke"] },
  { category: "anime", targetCategory: "anime", franchise: "a-viagem-de-chihiro", aliases: ["spirited away"] },
  { category: "anime", targetCategory: "anime", franchise: "fate", aliases: ["fate style"], folder: "original" },
  { category: "anime", targetCategory: "anime", franchise: "gundam", aliases: ["gundam style robot"], folder: "original" },
  { category: "anime", targetCategory: "anime", franchise: "jujutsu-kaisen", aliases: ["jujutsu kaisen"] },
  { category: "anime", targetCategory: "anime", franchise: "jujutsu-kaisen", aliases: ["jujutsu kaisen style"], folder: "original" },
  { category: "anime", targetCategory: "anime", franchise: "mob-psycho-100", aliases: ["mob psycho style figure"], folder: "original" },
  { category: "anime", targetCategory: "anime", franchise: "vocaloid", aliases: ["hatsune miku"], folder: "hatsune-miku" },
  { category: "anime", targetCategory: "anime", franchise: "vocaloid", aliases: ["hatsune miku style figure"], folder: "hatsune-miku" },
  { category: "anime", targetCategory: "anime", franchise: "gate", aliases: ["gate anime girl"], folder: "rory-mercury" },
  { category: "anime", targetCategory: "games", franchise: "pokemon", aliases: ["umbreon style"], folder: "umbreon" },
  { category: "anime", targetCategory: "marvel", franchise: "herois", aliases: ["x men style"], folder: "x-men" },
  {
    category: "anime",
    targetCategory: "desenhos-animacao",
    franchise: "disney",
    aliases: ["alice in wonderland style"],
    folder: "alice-no-pais-das-maravilhas/alice",
  },
  { category: "anime", targetCategory: "outros", franchise: "original", aliases: ["muffet style bunny girl"], folder: "muffy-bunny-girl" },
  { category: "anime", targetCategory: "outros", franchise: "sci-fi", aliases: ["key anime girl"], folder: "izzy-cyberpunk" },
  { category: "anime", targetCategory: "outros", franchise: "original", aliases: ["makoto figure"], folder: "makoto" },
  { category: "anime", targetCategory: "outros", franchise: "original", aliases: ["blue cyber woman"], folder: "blue-cyber-woman" },
  { category: "anime", targetCategory: "outros", franchise: "original", aliases: ["green cyber woman"], folder: "green-cyber-woman" },

  { category: "desenhos-animacao", targetCategory: "anime", franchise: "dragon ball", aliases: ["dragon ball"] },
  { category: "desenhos-animacao", targetCategory: "anime", franchise: "doraemon", aliases: ["doraemon"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "avatar-a-lenda-de-aang",
    aliases: ["avatar aang", "avatar the last airbender", "avatar toph"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "avatar-a-lenda-de-korra",
    aliases: ["avatar the legend of korra"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "bob-esponja",
    aliases: ["bob esponja", "spongebob", "spongebob squarepants"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "bob-esponja",
    aliases: ["spongebob gary"],
    folder: "gary-o-caracol",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "Scooby-Doo",
    aliases: ["scooby doo", "scooby-doo"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "Scooby-Doo",
    aliases: ["scooby-doo daphne"],
    folder: "daphne-blake",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "Scooby-Doo",
    aliases: ["scooby-doo velma"],
    folder: "velma-dinkley",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    aliases: [
      "ninja turtle",
      "ninja turtle style",
      "tartarugas ninja",
      "tartarugas-ninja",
      "teenage mutant ninja turtles",
      "tmnt",
    ],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "os-simpsons",
    aliases: ["os simpsons", "simpsons style", "the simpsons"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "Hanna-Barbera",
    aliases: ["hanna barbera", "hanna-barbera"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "esquadrao-marte",
    aliases: ["biker mice from mars"],
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "dino-riders", aliases: ["dino riders"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "extreme-dinosaurs", aliases: ["extreme dinosaurs"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "fraggle-rock", aliases: ["fraggle rock"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "garbage-pail-kids", aliases: ["garbage pail kids"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "mighty-ducks", aliases: ["mighty ducks"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "snoopy-e-sua-turma", aliases: ["peanuts", "snoopy"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "the-tick", aliases: ["the tick"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "corrida-maluca", aliases: ["wacky races"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "o-laboratorio-de-dexter",
    aliases: ["dexter laboratory", "dexters laboratory", "dexter's laboratory"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "os-flintstones",
    aliases: ["os flintstones", "the flintstones"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "os-incriveis",
    aliases: ["os incriveis", "the incredibles"],
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "as-meninas-superpoderosas",
    aliases: ["powerpuff girls", "the powerpuff girls"],
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "hora-de-aventura", aliases: ["adventure time"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "asterix", aliases: ["asterix"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "beavis-e-butt-head", aliases: ["beavis and butt-head"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "betty-boop", aliases: ["betty boop"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "o-mundo-de-bobby", aliases: ["bobby's world", "bobbys world"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "bob-o-construtor", aliases: ["bob o construtor", "bob the builder"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "bobs-burgers", aliases: ["bob's burgers", "bobs burgers"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "bojack-horseman", aliases: ["bojack horseman"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "ben-10", aliases: ["ben 10"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "ben-10",
    aliases: ["ben 10 alien"],
    folder: "alienigenas",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "ben-10",
    aliases: ["ben 10 four arms"],
    folder: "quatro-bracos",
  },
  { category: "desenhos-animacao", targetCategory: "outros", franchise: "quadrinhos", aliases: ["blacksad"], folder: "blacksad" },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "bucky-ohare", aliases: ["bucky o'hare", "bucky ohare"] },
  { category: "desenhos-animacao", targetCategory: "outros", franchise: "quadrinhos", aliases: ["calvin and hobbes", "calvin e haroldo"], folder: "calvin-e-haroldo" },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "caverna-do-dragao", aliases: ["caverna do dragao", "dungeons and dragons"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "capitao-planeta", aliases: ["captain planet"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "chapolin-colorado", aliases: ["chapolin colorado"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "coragem-o-cao-covarde", aliases: ["courage the cowardly dog"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "darkwing-duck", aliases: ["darkwing duck"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "dudley-do-right", aliases: ["dudley do right"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "ed-edd-e-eddy", aliases: ["ed edd n eddy"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "chaves", aliases: ["el chavo del ocho"], folder: "chaves-e-quico" },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "fangface", aliases: ["fangface"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "uma-familia-da-pesada", aliases: ["family guy"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "gato-felix", aliases: ["felix the cat"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "freakazoid", aliases: ["freakazoid"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "galaxy-rangers", aliases: ["galaxy rangers"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "gato-de-botas", aliases: ["puss in boots"] },
  { category: "desenhos-animacao", targetCategory: "marvel", franchise: "herois", aliases: ["guardians of the galaxy"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "os-caca-fantasmas", aliases: ["ghostbusters"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "gravity-falls", aliases: ["gravity falls"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "as-terriveis-aventuras-de-billy-e-mandy",
    aliases: ["billy e mandy", "grim adventures", "the grim adventures of billy and mandy"],
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "hazbin-hotel", aliases: ["hazbin hotel"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "helluva-boss", aliases: ["helluva boss"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "ei-arnold", aliases: ["hey arnold"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "hotel-transilvania", aliases: ["hotel transylvania"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "hello-kitty", aliases: ["hello kitty"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "inspetor-bugiganga", aliases: ["inspector gadget"] },
  { category: "desenhos-animacao", targetCategory: "outros", franchise: "quadrinhos", aliases: ["invincible"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "invasor-zim", aliases: ["invader zim"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "jem-e-as-hologramas", aliases: ["jem and the holograms"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "johnny-bravo", aliases: ["johnny bravo"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "josie-e-as-gatinhas", aliases: ["josie and the pussycats"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "meu-malvado-favorito",
    aliases: ["minions"],
    folder: "minions",
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "miraculous-as-aventuras-de-ladybug", aliases: ["miraculous ladybug"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "masters-of-the-universe", aliases: ["battle cat", "masters of the universe"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "monster-high", aliases: ["monster high"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "mumias-vivas", aliases: ["mummies alive"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "my-little-pony", aliases: ["my little pony"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "my-little-pony",
    aliases: ["my little pony equestria girls"],
    folder: "equestria-girls",
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "os-jetsons", aliases: ["the jetsons"] },
  { category: "desenhos-animacao", targetCategory: "anime", franchise: "one-piece", aliases: ["one piece"], folder: "tony-tony-chopper" },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "os-padrinhos-magicos", aliases: ["os padrinhos magicos", "fairly oddparents", "the fairly oddparents"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "peppa-pig", aliases: ["peppa pig"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "peter-pan", aliases: ["peter pan"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "phineas-e-ferb", aliases: ["phineas and ferb", "phineas e ferb"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "pantera-cor-de-rosa", aliases: ["pink panther"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "pocoyo", aliases: ["pocoyo"] },
  { category: "desenhos-animacao", targetCategory: "games", franchise: "poppy-playtime", aliases: ["poppy playtime"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "power-rangers", aliases: ["power rangers"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "punky-a-levada-da-breca", aliases: ["punky brewster"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "raggedy-ann", aliases: ["raggedy ann"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "apenas-um-show", aliases: ["regular show"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "ren-e-stimpy", aliases: ["ren and stimpy"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "rick-and-morty", aliases: ["rick and morty"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "rugrats-os-anjinhos", aliases: ["rugrats"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "samurai-jack", aliases: ["samurai jack"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "sanrio", aliases: ["sanrio kuromi"], folder: "kuromi" },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "vila-sesamo", aliases: ["sesame street"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "shaun-o-carneiro", aliases: ["shaun the sheep"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "she-ra", aliases: ["she-ra", "she ra"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "shrek", aliases: ["shrek"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "silverhawks", aliases: ["silverhawks"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "sininho", aliases: ["tinker bell"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "branca-de-neve", aliases: ["snow white"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "south-park", aliases: ["south park"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "space-ghost", aliases: ["space ghost"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "speed-racer", aliases: ["speed racer"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "steven-universe", aliases: ["steven universe"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "street-sharks", aliases: ["street sharks"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "swat-kats", aliases: ["swat kats"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "ted", aliases: ["ted"] },
  { category: "desenhos-animacao", targetCategory: "dc", franchise: "herois", aliases: ["teen titans go"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "disney",
    aliases: ["the incredibles mr incredible"],
    folder: "pixar/os-incriveis/senhor-incrivel",
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "os-smurfs", aliases: ["the smurfs"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "voltron", aliases: ["voltron"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "ursinho-pooh", aliases: ["winnie the pooh"] },
  { category: "desenhos-animacao", targetCategory: "games", franchise: "toejam-and-earl", aliases: ["toejam and earl"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "tintim", aliases: ["tintin"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "tom-e-jerry", aliases: ["tom and jerry", "tom e jerry"] },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "looney-tunes",
    aliases: ["looney tunes daffy duck"],
    folder: "patolino",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "looney-tunes",
    aliases: ["looney tunes marvin martian"],
    folder: "marvin-o-marciano",
  },
  {
    category: "desenhos-animacao",
    targetCategory: "desenhos-animacao",
    franchise: "looney-tunes",
    aliases: ["looney tunes tweety"],
    folder: "piu-piu",
  },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "os-manda-chuvas", aliases: ["top cat"] },
  { category: "desenhos-animacao", targetCategory: "filmes-series", franchise: "topo-gigio", aliases: ["topo gigio"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "Wall-E", aliases: ["wall e", "wall-e"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "wallace-e-gromit", aliases: ["wallace and gromit"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "apenas-ursos", aliases: ["we bare bears"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "wildfire", aliases: ["wildfire"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "pica-pau", aliases: ["woody woodpecker"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "vicky-o-viking", aliases: ["vicky the viking"] },
  { category: "desenhos-animacao", targetCategory: "dc", franchise: "herois", aliases: ["young justice"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "kim-possible", aliases: ["kim possible"] },
  { category: "desenhos-animacao", targetCategory: "anime", franchise: "meu-amigo-totoro", aliases: ["meu amigo totoro", "my neighbor totoro"] },
  { category: "desenhos-animacao", targetCategory: "anime", franchise: "princesa-mononoke", aliases: ["princess mononoke", "princesa mononoke"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "a-era-do-gelo", aliases: ["ice age", "a era do gelo"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "como-treinar-o-seu-dragao", aliases: ["how to train your dragon", "como treinar o seu dragao"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "coraline", aliases: ["coraline"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "detona-ralph", aliases: ["detona ralph", "wreck it ralph"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "enrolados", aliases: ["tangled", "disney tangled", "enrolados"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "frozen", aliases: ["disney frozen", "frozen"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "kung-fu-panda", aliases: ["kung fu panda"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "meu-malvado-favorito", aliases: ["despicable me", "meu malvado favorito"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "monstros-sa", aliases: ["monsters inc", "monsters inc.", "monstros sa", "monstros s.a."] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "muppets", aliases: ["the muppets", "muppets"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "o-estranho-mundo-de-jack", aliases: ["nightmare before christmas", "o estranho mundo de jack"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "o-pequeno-principe", aliases: ["the little prince", "o pequeno principe"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "o-rei-leao", aliases: ["the lion king", "o rei leao", "rei leao"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "pinky-e-o-cerebro", aliases: ["pinky and the brain", "pinky e o cerebro"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "pocahontas", aliases: ["disney pocahontas", "pocahontas"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "procurando-nemo", aliases: ["finding nemo", "pixar finding nemo", "procurando nemo"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "um-conto-americano", aliases: ["an american tail", "um conto americano"] },
  { category: "desenhos-animacao", targetCategory: "desenhos-animacao", franchise: "zootopia", aliases: ["disney zootopia", "zootopia"] },

  { category: "filmes-series", targetCategory: "filmes-series", franchise: "avatar", aliases: ["avatar neytiri"], folder: "neytiri" },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "ace-ventura", aliases: ["ace ventura"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "aladdin", aliases: ["aladdin"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "anastasia", aliases: ["anastasia"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "a-era-do-gelo", aliases: ["ice age", "a era do gelo"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "como-treinar-o-seu-dragao", aliases: ["how to train your dragon", "como treinar o seu dragao"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "coraline", aliases: ["coraline"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "detona-ralph", aliases: ["detona ralph", "wreck it ralph", "disney wreck-it ralph", "disney wreck it ralph"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "enrolados", aliases: ["tangled", "disney tangled", "enrolados"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "frozen", aliases: ["disney frozen", "frozen"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "hercules", aliases: ["disney hercules"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "kung-fu-panda", aliases: ["kung fu panda"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "meu-malvado-favorito", aliases: ["despicable me", "meu malvado favorito"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "monstros-sa", aliases: ["monsters inc", "monsters inc.", "monstros sa", "monstros s.a."] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "muppets", aliases: ["the muppets", "muppets"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "o-estranho-mundo-de-jack", aliases: ["nightmare before christmas", "o estranho mundo de jack"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "o-pequeno-principe", aliases: ["the little prince", "o pequeno principe"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "o-rei-leao", aliases: ["the lion king", "o rei leao", "rei leao"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "pinky-e-o-cerebro", aliases: ["pinky and the brain", "pinky e o cerebro"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "pocahontas", aliases: ["disney pocahontas", "pocahontas"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "procurando-nemo", aliases: ["finding nemo", "pixar finding nemo", "procurando nemo"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "rick-and-morty", aliases: ["rick and morty"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "shrek", aliases: ["shrek"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "os-incriveis", aliases: ["the incredibles"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "um-conto-americano", aliases: ["an american tail", "um conto americano"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "zootopia", aliases: ["disney zootopia", "zootopia"] },
  { category: "filmes-series", targetCategory: "anime", franchise: "meu-amigo-totoro", aliases: ["meu amigo totoro", "my neighbor totoro"] },
  { category: "filmes-series", targetCategory: "anime", franchise: "princesa-mononoke", aliases: ["princess mononoke", "princesa mononoke"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "barbarella", aliases: ["barbarella"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "um-tira-da-pesada", aliases: ["beverly hills cop"] },
  { category: "filmes-series", targetCategory: "marvel", franchise: "herois", aliases: ["blade"], folder: "blade" },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "bluey", aliases: ["bluey"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "branca-de-neve", aliases: ["snow white"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "candyman", aliases: ["candyman"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "charlie-chaplin", aliases: ["charlie chaplin"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "cinderela", aliases: ["cinderella"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "caverna-do-dragao", aliases: ["dungeons and dragons"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "conan-o-barbaro", aliases: ["conan"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "crocodile-dundee", aliases: ["crocodile dundee"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "evil-dead", aliases: ["evil dead"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "dracula", aliases: ["dracula", "dracula bust", "dracula castle scene"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "duna", aliases: ["dune"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "edward-maos-de-tesoura", aliases: ["edward scissorhands"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "elvira", aliases: ["elvira"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "godzilla", aliases: ["godzilla"] },
  {
    category: "filmes-series",
    targetCategory: "marvel",
    franchise: "equipes",
    aliases: ["guardians of the galaxy"],
    folder: "guardioes-da-galaxia",
  },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "herbie", aliases: ["herbie"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "horror-legends", aliases: ["horror legends"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "jaspion", aliases: ["jaspion"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "jack-frost", aliases: ["jack frost"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "leprechaun", aliases: ["leprechaun"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "m3gan", aliases: ["m3gan"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "marilyn-monroe", aliases: ["marilyn monroe"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "megamente", aliases: ["megamind"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "moana", aliases: ["moana"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "mulan", aliases: ["mulan"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "nosferatu", aliases: ["nosferatu"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "o-gigante-de-ferro", aliases: ["the iron giant"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "os-manda-chuvas", aliases: ["top cat"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "peter-pan", aliases: ["peter pan"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "pinocchio", aliases: ["pinocchio"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "red-sonja", aliases: ["red sonja"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "robin-hood", aliases: ["robin hood"] },
  { category: "filmes-series", targetCategory: "anime", franchise: "sand-land", aliases: ["sand land"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "sherlock", aliases: ["sherlock"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "round-6", aliases: ["round 6", "squid game"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "tubarao", aliases: ["jaws"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "ted", aliases: ["ted"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "tropic-thunder", aliases: ["tropic thunder"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "ursinho-pooh", aliases: ["winnie the pooh"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "willy-wonka", aliases: ["willy wonka"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "zorro", aliases: ["zorro"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "de-volta-para-o-futuro", aliases: ["back to the future"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "bruce-lee", aliases: ["bruce lee"] },
  {
    category: "filmes-series",
    targetCategory: "filmes-series",
    franchise: "dracula-a-historia-nunca-contada",
    aliases: ["dracula untold"],
  },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "esqueceram-de-mim", aliases: ["home alone"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "gremlins", aliases: ["gremlins"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "james-bond", aliases: ["james bond"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "malevola", aliases: ["maleficent"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "o-exterminador-do-futuro", aliases: ["terminator"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "o-maskara", aliases: ["the mask"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "os-caca-fantasmas", aliases: ["ghostbusters"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "os-goonies", aliases: ["the goonies"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "power-rangers", aliases: ["power rangers"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "star-trek", aliases: ["star trek"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "tarzan", aliases: ["tarzan"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "top-gun", aliases: ["top gun"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "twin-peaks", aliases: ["twin peaks style figures"], folder: "original" },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "indiana-jones", aliases: ["indiana jones"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "john-wick", aliases: ["john wick"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "kill-bill", aliases: ["kill bill"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "kill-bill", aliases: ["kill bill style"], folder: "original" },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "predador", aliases: ["predator", "o predador"] },
  { category: "filmes-series", targetCategory: "filmes-series", franchise: "robocop", aliases: ["robocop"] },
  { category: "filmes-series", targetCategory: "outros", franchise: "quadrinhos", aliases: ["invincible"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "Scooby-Doo", aliases: ["scooby-doo"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "o-laboratorio-de-dexter", aliases: ["dexter laboratory"] },
  { category: "filmes-series", targetCategory: "desenhos-animacao", franchise: "Wall-E", aliases: ["wall-e", "walle"] },

  { category: "desenhos-animacao", targetCategory: "outros", franchise: "animais", aliases: ["turtle character"], folder: "tartaruga" },

  {
    category: "games",
    targetCategory: "games",
    franchise: "assassins-creed",
    aliases: ["assassin's creed", "assassins creed", "assassins-creed"],
  },
  { category: "games", targetCategory: "games", franchise: "bayonetta", aliases: ["bayonetta"] },
  { category: "anime", targetCategory: "games", franchise: "bayonetta", aliases: ["bayonetta style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "banjo-kazooie", aliases: ["banjo kazooie"] },
  { category: "games", targetCategory: "games", franchise: "bomberman", aliases: ["bomberman"] },
  { category: "games", targetCategory: "games", franchise: "bomberman", aliases: ["bomberman style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "borderlands", aliases: ["borderlands"] },
  { category: "games", targetCategory: "games", franchise: "crash-bandicoot", aliases: ["crash bandicoot"] },
  { category: "games", targetCategory: "games", franchise: "chrono-trigger", aliases: ["chrono trigger"] },
  { category: "games", targetCategory: "games", franchise: "cult-of-the-lamb", aliases: ["cult of the lamb"] },
  { category: "games", targetCategory: "games", franchise: "darkstalkers", aliases: ["darkstalkers"] },
  { category: "games", targetCategory: "games", franchise: "dark-souls", aliases: ["dark souls"] },
  { category: "games", targetCategory: "games", franchise: "devil-may-cry", aliases: ["devil may cry"] },
  { category: "games", targetCategory: "games", franchise: "donkey-kong", aliases: ["donkey kong"] },
  { category: "games", targetCategory: "games", franchise: "duke-nukem", aliases: ["duke nukem"] },
  { category: "games", targetCategory: "games", franchise: "earthworm-jim", aliases: ["earthworm jim"] },
  { category: "games", targetCategory: "games", franchise: "golden-axe", aliases: ["golden axe"] },
  { category: "games", targetCategory: "games", franchise: "guilty-gear", aliases: ["guilty gear"] },
  { category: "games", targetCategory: "games", franchise: "grand-theft-auto", aliases: ["grand theft auto"] },
  {
    category: "games",
    targetCategory: "games",
    franchise: "five-nights-at-freddys",
    aliases: ["five nights at freddys", "five nights at freddy's", "five-nights-at-freddys"],
  },
  { category: "games", targetCategory: "games", franchise: "fire-emblem", aliases: ["fire emblem"] },
  { category: "games", targetCategory: "games", franchise: "fire-emblem", aliases: ["lucina"], folder: "lucina" },
  { category: "games", targetCategory: "games", franchise: "genshin-impact", aliases: ["genshin impact"] },
  { category: "games", targetCategory: "games", franchise: "atelier-ryza", aliases: ["atelier ryza"] },
  { category: "games", targetCategory: "games", franchise: "nikke", aliases: ["goddess of victory nikke", "nikke"] },
  { category: "games", targetCategory: "games", franchise: "overwatch", aliases: ["overwatch"] },
  { category: "games", targetCategory: "games", franchise: "the king of fighters", aliases: ["king of fighters", "the king of fighters", "kof"] },
  { category: "games", targetCategory: "games", franchise: "god-of-war", aliases: ["god of war", "god-of-war"] },
  { category: "games", targetCategory: "games", franchise: "god-of-war", aliases: ["god of war kratos"], folder: "kratos" },
  { category: "games", targetCategory: "games", franchise: "kirby", aliases: ["kirby"] },
  { category: "games", targetCategory: "games", franchise: "kingdom-rush", aliases: ["kingdom rush"] },
  {
    category: "games",
    targetCategory: "games",
    franchise: "baldurs-gate-3",
    aliases: ["baldur gate 3", "baldur's gate 3", "baldurs gate 3"],
  },
  { category: "games", targetCategory: "games", franchise: "baldurs-gate", aliases: ["baldur's gate", "baldurs gate"] },
  { category: "games", targetCategory: "anime", franchise: "dragon ball", aliases: ["kunshi", "kunshu"], folder: "kunshi" },
  { category: "games", targetCategory: "games", franchise: "kingdom-hearts", aliases: ["kingdom hearts"] },
  {
    category: "games",
    targetCategory: "games",
    franchise: "kingdom-hearts",
    aliases: ["kingdom hearts roxas"],
    folder: "roxas",
  },
  {
    category: "games",
    targetCategory: "games",
    franchise: "kingdom-hearts",
    aliases: ["kingdom hearts sora"],
    folder: "sora",
  },
  { category: "games", targetCategory: "games", franchise: "klonoa", aliases: ["klonoa"] },
  { category: "games", targetCategory: "games", franchise: "legacy-of-kain", aliases: ["legacy of kain"] },
  {
    category: "games",
    targetCategory: "games",
    franchise: "league-of-legends",
    aliases: ["league of legends", "league of legends style", "league-of-legends"],
  },
  { category: "games", targetCategory: "games", franchise: "mega-man", aliases: ["mega man"] },
  { category: "games", targetCategory: "games", franchise: "metroid", aliases: ["metroid"] },
  { category: "games", targetCategory: "games", franchise: "monster-hunter", aliases: ["monster hunter"] },
  { category: "games", targetCategory: "games", franchise: "mortal-kombat", aliases: ["mortal kombat", "mortal-kombat"] },
  { category: "games", targetCategory: "games", franchise: "mario", aliases: ["mario", "super mario"] },
  { category: "games", targetCategory: "games", franchise: "mario-kart", aliases: ["mario kart"] },
  {
    category: "games",
    targetCategory: "games",
    franchise: "mario",
    aliases: ["mario character", "mario luigi", "mario mushrooms", "mario rosalina", "mario yoshi"],
  },
  {
    category: "games",
    targetCategory: "games",
    franchise: "mario-kart",
    aliases: ["mario kart princess"],
    folder: "princess-peach",
  },
  { category: "games", targetCategory: "games", franchise: "metroid", aliases: ["metroid samus"] },
  { category: "games", targetCategory: "games", franchise: "nier-automata", aliases: ["nier automata"] },
  { category: "anime", targetCategory: "games", franchise: "nier-automata", aliases: ["nier automata style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "Pac-Man", aliases: ["pac man", "pac-man"] },
  { category: "games", targetCategory: "games", franchise: "plants-vs-zombies", aliases: ["plants vs zombies"] },
  { category: "games", targetCategory: "games", franchise: "poppy-playtime", aliases: ["poppy playtime"] },
  { category: "games", targetCategory: "games", franchise: "persona-5", aliases: ["persona 5"] },
  { category: "games", targetCategory: "games", franchise: "crash-bandicoot", aliases: ["crash bandicoot style"], folder: "original" },
  { category: "games", targetCategory: "anime", franchise: "attack-on-titan", aliases: ["attack on titan style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "final-fantasy", aliases: ["final fantasy style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "halo", aliases: ["halo soldier"], folder: "soldier" },
  { category: "games", targetCategory: "marvel", franchise: "herois", aliases: ["thor fantasy figure"], folder: "thor" },
  { category: "games", targetCategory: "outros", franchise: "tabletop", aliases: ["anime turtle fighters"], folder: "frog-fighters" },
  { category: "games", targetCategory: "games", franchise: "tomb-raider", aliases: ["tomb raider style"], folder: "original" },
  { category: "games", targetCategory: "filmes-series", franchise: "power-rangers", aliases: ["power rangers"] },
  { category: "games", targetCategory: "filmes-series", franchise: "predador", aliases: ["predator"] },
  { category: "games", targetCategory: "games", franchise: "rayman", aliases: ["rayman"] },
  { category: "games", targetCategory: "games", franchise: "robopunk", aliases: ["robopunk"] },
  { category: "games", targetCategory: "games", franchise: "sonic", aliases: ["sonic"] },
  { category: "games", targetCategory: "games", franchise: "spyro", aliases: ["spyro"] },
  { category: "games", targetCategory: "games", franchise: "street-fighter", aliases: ["street fighter", "street-fighter"] },
  { category: "games", targetCategory: "games", franchise: "street-fighter", aliases: ["street fighter akuma"], folder: "akuma" },
  { category: "games", targetCategory: "games", franchise: "street-fighter", aliases: ["street fighter e honda"], folder: "e-honda" },
  { category: "games", targetCategory: "games", franchise: "street-fighter", aliases: ["street fighter ryu"], folder: "ryu" },
  { category: "games", targetCategory: "games", franchise: "street-fighter", aliases: ["street fighter style"], folder: "original" },
  { category: "games", targetCategory: "games", franchise: "the-witcher", aliases: ["the witcher"] },
  { category: "games", targetCategory: "games", franchise: "toejam-and-earl", aliases: ["toejam and earl"] },
  { category: "games", targetCategory: "games", franchise: "tomb-raider", aliases: ["tomb raider"] },
  { category: "games", targetCategory: "anime", franchise: "yu-gi-oh", aliases: ["yu-gi-oh"], folder: "red-eyes-black-dragon" },
]);

const CATALOG_FOLDER_ALIASES = scopedAliasMap([
  {
    category: "marvel",
    franchise: "equipes",
    target: "guardioes-da-galaxia",
    aliases: ["guardians of the galaxy", "rocket e groot", "star lord rocket groot"],
  },
  {
    category: "marvel",
    franchise: "cenas-dioramas",
    target: "guardioes-da-galaxia",
    aliases: ["groot rocket diorama"],
  },
  {
    category: "marvel",
    franchise: "herois",
    target: "rocket-raccoon",
    aliases: ["rocket", "rocket raccoon", "rocket raccoon chibi", "rocket raccoon dimensions"],
  },
  {
    category: "dc",
    franchise: "herois",
    target: "artemis-crock",
    aliases: ["artemis crock"],
  },
  {
    category: "dc",
    franchise: "herois",
    target: "estelar",
    aliases: ["starfire"],
  },
  {
    category: "dc",
    franchise: "outros",
    target: "talia-al-ghul",
    aliases: ["talia al ghul"],
  },
  {
    category: "outros",
    franchise: "quadrinhos",
    target: "lady-death",
    aliases: ["lady death angel"],
  },
  {
    category: "outros",
    franchise: "quadrinhos",
    target: "red-sonja",
    aliases: ["red sonja armored"],
  },
  {
    category: "outros",
    franchise: "quadrinhos",
    target: "vampirella",
    aliases: ["vampirella bat wings", "vampirella coffin"],
  },
  {
    category: "anime",
    franchise: "bleach",
    target: "orihime-inoue",
    aliases: ["orihime inoue"],
  },
  {
    category: "anime",
    franchise: "bleach",
    target: "toshiro-hitsugaya",
    aliases: ["toshiro hitsugaya"],
  },
  {
    category: "anime",
    franchise: "bleach",
    target: "yoruichi-shihoin",
    aliases: ["yoruichi", "yoruichi shihoin", "yoruichi shihouin"],
  },
  {
    category: "anime",
    franchise: "cardcaptor-sakura",
    target: "sakura-kinomoto",
    aliases: ["sakura kinomoto"],
  },
  {
    category: "anime",
    franchise: "cardcaptor-sakura",
    target: "tomoyo-daidouji",
    aliases: ["tomoyo daidouji"],
  },
  {
    category: "anime",
    franchise: "cardcaptor-sakura",
    target: "sakura-kinomoto-e-kero",
    aliases: ["sakura kinomoto e kero"],
  },
  {
    category: "anime",
    franchise: "ghost-in-the-shell",
    target: "motoko-kusanagi",
    aliases: ["major motoko kusanagi", "motoko"],
  },
  {
    category: "anime",
    franchise: "hellsing",
    target: "seras-victoria",
    aliases: ["seras-victoria", "seras victoria"],
  },
  {
    category: "anime",
    franchise: "that time i got reincarnated as a slime",
    target: "rimuru-tempest",
    aliases: ["rimuru tempest"],
  },
  {
    category: "games",
    franchise: "guilty-gear",
    target: "ramlethal-valentine",
    aliases: ["ramlethal valentine"],
  },
  {
    category: "desenhos-animacao",
    franchise: "meu-malvado-favorito",
    target: "minions",
    aliases: ["minion", "minion-duck", "minion-figure", "minion-superhero-sticker-figure"],
  },
  {
    category: "desenhos-animacao",
    franchise: "corrida-maluca",
    target: "penelope-charmosa",
    aliases: ["penelope pitstop"],
  },
  {
    category: "desenhos-animacao",
    franchise: "corrida-maluca",
    target: "grupo",
    aliases: ["wacky races group"],
  },
  {
    category: "desenhos-animacao",
    franchise: "esquadrao-marte",
    target: "dr-karbunkle",
    aliases: ["dr karbunkle"],
  },
  {
    category: "desenhos-animacao",
    franchise: "esquadrao-marte",
    target: "lawrence-limburger",
    aliases: ["lawrence limburger"],
  },
  {
    category: "desenhos-animacao",
    franchise: "snoopy-e-sua-turma",
    target: "snoopy",
    aliases: ["snoopy hanging prop"],
  },
  {
    category: "filmes-series",
    franchise: "ted",
    target: "ted",
    aliases: ["ted-figure"],
  },
  {
    category: "filmes-series",
    franchise: "power-rangers",
    target: "ranger-azul",
    aliases: ["blue ranger", "blue ranger chibi"],
  },
  {
    category: "filmes-series",
    franchise: "power-rangers",
    target: "ranger-vermelho",
    aliases: ["red ranger"],
  },
  {
    category: "filmes-series",
    franchise: "power-rangers",
    target: "ranger-vermelho-capacete",
    aliases: ["red ranger helmet"],
  },
  {
    category: "games",
    franchise: "poppy-playtime",
    target: "huggy-wuggy",
    aliases: ["huggy wuggy", "huggy-wuggy-figures"],
  },
  {
    category: "games",
    franchise: "toejam-and-earl",
    target: "grupo",
    aliases: ["characters"],
  },
  {
    category: "filmes-series",
    franchise: "evil-dead",
    target: "ash-williams-e-deadite",
    aliases: ["ash williams and deadite"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "mestre-kame",
    aliases: ["master roshi", "roshi"],
  },
  {
    category: "anime",
    franchise: "gate",
    target: "rory-mercury",
    aliases: ["rory mercury"],
  },
  {
    category: "anime",
    franchise: "vocaloid",
    target: "hatsune-miku",
    aliases: ["hatsune miku"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "androide-18",
    aliases: ["android 18", "androide 18", "android-18"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "androide-21",
    aliases: ["android 21", "androide 21"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "freeza",
    aliases: ["frieza", "freezer", "frieza bust", "frieza figure", "frieza-mask", "freeza bust"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "kuririn",
    aliases: ["krillin", "krillin figure"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "majin-boo",
    aliases: [
      "majin boo",
      "majin buu",
      "majin-buu",
      "majin buu bust",
      "majin buu chibi",
      "majin buu figure",
      "majin-buu-mask",
      "majin-buu-parts",
    ],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "shenlong",
    aliases: ["shenron", "shenlong chibi", "omega shenron"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "doutor-gero",
    aliases: ["dr gero", "dr. gero"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "tenshinhan",
    aliases: ["tien shinhan"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "bills",
    aliases: ["beerus"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "bills-e-whis",
    aliases: ["beerus e whis"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "capitao-ginyu",
    aliases: ["captain ginyu"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "forcas-especiais-ginyu",
    aliases: ["ginyu force"],
  },
  {
    category: "anime",
    franchise: "dragon ball",
    target: "trunks-do-futuro",
    aliases: ["future trunks"],
  },
  {
    category: "anime",
    franchise: "naruto",
    target: "naruto-uzumaki",
    aliases: ["naruto", "naruto figure"],
  },
  {
    category: "anime",
    franchise: "naruto",
    target: "sakura-haruno",
    aliases: ["sakura", "naruto_sakura"],
  },
  {
    category: "anime",
    franchise: "naruto",
    target: "minato-namikaze",
    aliases: ["minato", "naruto minato"],
  },
  {
    category: "anime",
    franchise: "yu-gi-oh",
    target: "yugi-muto",
    aliases: ["yugi", "yugi muto"],
  },

  {
    category: "desenhos-animacao",
    franchise: "avatar-a-lenda-de-aang",
    target: "grupo",
    aliases: ["avatar", "avatar figures", "avatar-figures"],
  },
  {
    category: "desenhos-animacao",
    franchise: "hora-de-aventura",
    target: "finn-e-jake",
    aliases: ["finn jake figure"],
  },
  {
    category: "desenhos-animacao",
    franchise: "hora-de-aventura",
    target: "jake-o-cao",
    aliases: ["jake the dog"],
  },
  {
    category: "desenhos-animacao",
    franchise: "hora-de-aventura",
    target: "rei-gelado",
    aliases: ["ice king"],
  },
  {
    category: "desenhos-animacao",
    franchise: "hora-de-aventura",
    target: "princesa-jujuba",
    aliases: ["princess bubblegum"],
  },
  {
    category: "desenhos-animacao",
    franchise: "uma-familia-da-pesada",
    target: "peter-griffin-e-galinha",
    aliases: ["peter griffin chicken"],
  },
  {
    category: "desenhos-animacao",
    franchise: "gato-felix",
    target: "gato-felix",
    aliases: ["felix"],
  },
  {
    category: "desenhos-animacao",
    franchise: "gravity-falls",
    target: "bill-cipher",
    aliases: ["bill cipher"],
  },
  {
    category: "desenhos-animacao",
    franchise: "gravity-falls",
    target: "dipper-pines",
    aliases: ["dipper pines"],
  },
  {
    category: "desenhos-animacao",
    franchise: "gravity-falls",
    target: "mabel-pines",
    aliases: ["mabel pines"],
  },
  {
    category: "desenhos-animacao",
    franchise: "os-padrinhos-magicos",
    target: "timmy-e-trixie",
    aliases: ["timmy e trixie"],
  },
  {
    category: "desenhos-animacao",
    franchise: "pantera-cor-de-rosa",
    target: "pantera-cor-de-rosa",
    aliases: ["pink panther figure"],
  },
  {
    category: "desenhos-animacao",
    franchise: "apenas-um-show",
    target: "mordecai-e-rigby",
    aliases: ["mordecai e rigby"],
  },
  {
    category: "desenhos-animacao",
    franchise: "apenas-um-show",
    target: "dioramas",
    aliases: ["_dioramas"],
  },
  {
    category: "desenhos-animacao",
    franchise: "rugrats-os-anjinhos",
    target: "tommy-pickles",
    aliases: ["tommy pickles"],
  },
  {
    category: "desenhos-animacao",
    franchise: "sanrio",
    target: "my-melody",
    aliases: ["my melody"],
  },
  {
    category: "desenhos-animacao",
    franchise: "vila-sesamo",
    target: "come-come",
    aliases: ["cookie monster"],
  },
  {
    category: "desenhos-animacao",
    franchise: "south-park",
    target: "eric-cartman",
    aliases: ["cartman", "eric cartman"],
  },
  {
    category: "desenhos-animacao",
    franchise: "south-park",
    target: "grupo",
    aliases: ["south park group"],
  },
  {
    category: "desenhos-animacao",
    franchise: "south-park",
    target: "personagem",
    aliases: ["south park character"],
  },
  {
    category: "desenhos-animacao",
    franchise: "os-smurfs",
    target: "papai-smurf",
    aliases: ["papa smurf"],
  },
  {
    category: "desenhos-animacao",
    franchise: "os-smurfs",
    target: "smurf-pintor",
    aliases: ["smurf painter"],
  },
  {
    category: "desenhos-animacao",
    franchise: "wallace-e-gromit",
    target: "grupo",
    aliases: ["wallace and gromit figures"],
  },
  {
    category: "desenhos-animacao",
    franchise: "apenas-ursos",
    target: "grupo",
    aliases: ["bear stack", "bear trio", "bears trio"],
  },
  {
    category: "desenhos-animacao",
    franchise: "pica-pau",
    target: "pica-pau",
    aliases: ["pica-pau"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "bob-esponja",
    aliases: ["spongebob", "spongebob figure", "sponge bob wizard", "spongebob zombie"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "gary-o-caracol",
    aliases: ["gary", "gary the snail", "spongebob_gary"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "patrick-estrela",
    aliases: ["patrick star"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "lula-molusco",
    aliases: ["squidward", "squidward squid game"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "sandy-bochechas",
    aliases: ["sandy cheeks"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "grupo",
    aliases: ["spongebob friends", "spongebob squarepants e gary"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "rei-netuno",
    aliases: ["king neptune"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bob-esponja",
    target: "homem-sereia",
    aliases: ["mermaid man"],
  },

  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "scooby-doo",
    aliases: ["scooby_doo"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "turma",
    aliases: ["gang display", "scooby-doo gang", "scooby-doo-figures"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "daphne-blake",
    aliases: ["daphne", "daphne blake"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "daphne-e-scooby",
    aliases: ["daphne and scooby"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "salsicha",
    aliases: ["shaggy", "shaggy rogers"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "velma-dinkley",
    aliases: ["velma", "velma dinkley"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "fred-jones",
    aliases: ["fred jones"],
  },
  {
    category: "desenhos-animacao",
    franchise: "scooby-doo",
    target: "maquina-misterio",
    aliases: ["mystery machine", "maquina misterio"],
  },

  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "grupo",
    aliases: [
      "ninja_turtles",
      "ninja-turtle",
      "ninja-turtle-chibi-set",
      "ninja-turtles",
      "tartaruga ninja",
      "tartarugas ninja set",
      "tartarugas-ninja",
      "tmnt",
      "tmnt-figures",
      "tmnt-group",
      "turtle-chibi",
      "turtle-figure",
      "turtle-figures",
      "turtle-ninja-set",
      "turtle-trio",
      "turtles",
      "turtles-group",
    ],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "viloes",
    aliases: ["tmnt-villains"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "mestre-splinter",
    aliases: ["master-splinter", "splinter"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "april-o-neil",
    aliases: ["april-oneil", "april-o-neil"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "leonardo",
    aliases: ["leonardo-head", "leonardo-katana"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "donatello",
    aliases: ["donatello-head"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "michelangelo",
    aliases: ["michelangelo-head", "michelangelo-wall"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "raphael",
    aliases: ["raphael-head", "raphael-sai"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "destruidor",
    aliases: ["shredder", "shredder-helmet"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "mestre-splinter",
    aliases: ["splinter-bust"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "dioramas",
    aliases: ["ninja-turtle-diorama", "turtle-rider"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "grupo",
    aliases: ["mutant-turtle", "ninja-turtle-clay", "tmnt-cyborg"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "veiculos",
    aliases: ["turtle-van-diorama"],
  },
  {
    category: "desenhos-animacao",
    franchise: "tartarugas-ninja",
    target: "acessorios",
    aliases: ["turtle-shell"],
  },

  {
    category: "desenhos-animacao",
    franchise: "os-simpsons",
    target: "familia-simpson",
    aliases: ["simpsons", "simpsons family", "simpsons-figures"],
  },
  {
    category: "desenhos-animacao",
    franchise: "os-simpsons",
    target: "sofa-dos-simpsons",
    aliases: ["simpsons couch set"],
  },
  {
    category: "desenhos-animacao",
    franchise: "os-simpsons",
    target: "bart-e-lisa",
    aliases: ["bart lisa scene"],
  },

  {
    category: "desenhos-animacao",
    franchise: "tom-e-jerry",
    target: "tom-e-jerry",
    aliases: ["tom and jerry"],
  },
  {
    category: "desenhos-animacao",
    franchise: "wall-e",
    target: "wall-e",
    aliases: ["wall e figure", "walle and eve", "wall-e eve"],
  },
  {
    category: "desenhos-animacao",
    franchise: "bluey",
    target: "bluey",
    aliases: ["bluey characters"],
  },
  {
    category: "desenhos-animacao",
    franchise: "caverna-do-dragao",
    target: "grupo",
    aliases: ["dungeons and dragons animated group"],
  },
  {
    category: "desenhos-animacao",
    franchise: "caverna-do-dragao",
    target: "vingador",
    aliases: ["venger"],
  },
  {
    category: "desenhos-animacao",
    franchise: "masters-of-the-universe",
    target: "gato-guerreiro",
    aliases: ["battle cat"],
  },
  {
    category: "desenhos-animacao",
    franchise: "masters-of-the-universe",
    target: "maligna",
    aliases: ["evil lyn", "evil-lyn"],
  },
  {
    category: "desenhos-animacao",
    franchise: "masters-of-the-universe",
    target: "esqueleto",
    aliases: ["skeletor"],
  },
  {
    category: "desenhos-animacao",
    franchise: "my-little-pony",
    target: "personagens",
    aliases: ["my-little-pony-figures"],
  },
  {
    category: "desenhos-animacao",
    franchise: "phineas-e-ferb",
    target: "perry-o-ornitorrinco",
    aliases: ["perry the platypus"],
  },
  {
    category: "filmes-series",
    franchise: "dracula",
    target: "dracula",
    aliases: ["dracula bust", "dracula castle scene"],
  },
  {
    category: "filmes-series",
    franchise: "round-6",
    target: "guardas",
    aliases: ["guard", "guards", "masked guard", "masked guards"],
  },
  {
    category: "filmes-series",
    franchise: "round-6",
    target: "front-man",
    aliases: ["front man"],
  },
  {
    category: "filmes-series",
    franchise: "round-6",
    target: "boneca-young-hee",
    aliases: ["young hee doll", "young-hee"],
  },
  {
    category: "outros",
    franchise: "quadrinhos",
    target: "calvin-e-haroldo",
    aliases: ["calvin hobbes"],
  },
  {
    category: "outros",
    franchise: "quadrinhos",
    target: "omni-man",
    aliases: ["omni man", "omni man bust", "omni man figure"],
  },

  {
    category: "games",
    franchise: "pokemon",
    target: "geral",
    aliases: ["pokemon_misc", "pokemon misc"],
  },
  {
    category: "games",
    franchise: "pokemon",
    target: "sazonal",
    aliases: ["pokemon_holiday", "pokemon christmas", "christmas pokemon group"],
  },
  {
    category: "games",
    franchise: "pokemon",
    target: "grupo",
    aliases: ["pokemon group", "pokemon figure groups", "pokemon figure set", "pokemon figures", "pokemon-figures"],
  },
  {
    category: "games",
    franchise: "mortal-kombat",
    target: "personagens",
    aliases: ["mortal kombat characters", "mortal-kombat", "mortal-kombat-figures"],
  },
  {
    category: "games",
    franchise: "mario",
    target: "mario",
    aliases: ["mario characters", "mario character"],
  },
  {
    category: "games",
    franchise: "mario",
    target: "cogumelos",
    aliases: ["mario props", "mario mushrooms"],
  },
  {
    category: "games",
    franchise: "five-nights-at-freddys",
    target: "animatronicos",
    aliases: ["fnaf", "fnaf animatronic", "fnaf animatronics"],
  },

  {
    category: "filmes-series",
    franchise: "predador",
    target: "predador",
    aliases: ["predator", "yautja"],
  },

  {
    category: "marvel",
    franchise: "*",
    target: "capitao-america",
    aliases: [
      "captain america",
      "capitao america",
      "captain america bust",
      "captain-america-figures",
      "captain america skull mask",
      "captain america training",
      "captain america training set",
      "zombie captain america",
      "capitao america chibi",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "capita-marvel",
    aliases: ["captain marvel", "capita marvel", "captain marvel figure"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "homem-aranha",
    aliases: [
      "spider man",
      "homem aranha",
      "black suit spider man",
      "spider man bust",
      "spider man chibi",
      "spider-man-figures",
      "spider man helmet",
      "spider-man-mask",
      "marvel zombies spider man",
      "spider man ice",
      "spider man meme",
      "zombie spider man",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "homem-de-ferro",
    aliases: [
      "iron man",
      "homem de ferro",
      "iron man armor",
      "iron man bust",
      "iron man chibi",
      "iron-man-figures",
      "iron man helmet",
      "iron man helmet magenta",
      "iron man mask",
      "iron-man-props",
      "iron man standing",
      "iron man suit",
      "homem de ferro busto",
      "homem de ferro chibi",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "pantera-negra",
    aliases: [
      "black panther",
      "pantera negra",
      "black panther bust",
      "black panther cosplay",
      "black panther figure",
      "black-panther-figures",
      "black panther helmet",
      "black panther mask",
      "black panther mask printable",
      "black panther throne",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "viuva-negra",
    aliases: [
      "black widow",
      "viuva negra",
      "black widow bust",
      "black widow bust parts",
      "black widow bust set",
      "black widow statue",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "doutor-estranho",
    aliases: ["doctor strange", "doutor estranho", "doctor strange bust", "doctor strange set", "doutor estranho chibi"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "feiticeira-escarlate",
    aliases: ["scarlet witch", "feiticeira escarlate", "classic scarlet witch", "scarlet witch head"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "gaviao-arqueiro",
    aliases: ["hawkeye", "gaviao arqueiro"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "cavaleiro-da-lua",
    aliases: ["moon knight", "cavaleiro da lua", "moon knight crescents", "moon knight mask"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "demolidor",
    aliases: ["daredevil", "demolidor"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "justiceiro",
    aliases: ["punisher", "justiceiro"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "motoqueiro-fantasma",
    aliases: ["ghost rider", "motoqueiro fantasma"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "duende-verde",
    aliases: ["green goblin", "duende verde", "green-goblin-figures"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "doutor-destino",
    aliases: ["doctor doom", "doutor destino", "doctor doom mask", "doctor-doom-figures"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "caveira-vermelha",
    aliases: ["red skull"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "rei-do-crime",
    aliases: ["kingpin", "rei do crime"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "carnificina",
    aliases: ["carnage", "carnificina", "carnage-figures"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "ciclope",
    aliases: ["cyclops", "ciclope", "cyclops chibi", "cyclops-figures", "cyclops visor", "marvel zombies cyclops"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "tempestade",
    aliases: ["storm", "tempestade", "storm chibi"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "surfista-prateado",
    aliases: ["silver surfer", "surfista prateado", "silver surfer figure", "silver surfer set"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "tocha-humana",
    aliases: ["human torch", "tocha humana"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "mulher-invisivel",
    aliases: ["invisible woman", "mulher invisivel"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "senhor-fantastico",
    aliases: ["mr fantastic", "senhor fantastico"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "homem-formiga",
    aliases: ["ant man", "ant-man", "Ant-Man helmet", "ant man helmet variant"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "hulk",
    aliases: [
      "hulk bust",
      "hulk chibi",
      "hulk diorama",
      "hulk figure",
      "hulk-figures",
      "hulk helmet",
      "hulk parts",
      "hulk statue",
      "hulk variants",
      "incredible hulk",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "hulk-vermelho",
    aliases: ["red hulk", "red-hulk-figures"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "mulher-hulk",
    aliases: ["she-hulk", "she hulk bust", "she-hulk-figures", "mulher hulk parts"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "thor",
    aliases: ["thor bust", "thor-figures", "thor hammer", "thor variants"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "wolverine",
    aliases: [
      "wolverine bust",
      "wolverine chibi",
      "wolverine-figures",
      "wolverine mask",
      "wolverine statue",
      "wolverine armor parts",
      "wolverine parts",
      "wolverine-props",
      "venomized wolverine",
      "venomized wolverine bust",
      "venomized wolverine parts",
    ],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "visao",
    aliases: ["vision", "vision bust"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "gata-negra",
    aliases: ["black cat"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "thanos",
    aliases: ["thanos bust", "thanos-figures", "thanos helmet", "thanos statue", "thanos style figure"],
  },
  {
    category: "marvel",
    franchise: "*",
    target: "galactus",
    aliases: ["galactus chibi"],
  },

  {
    category: "dc",
    franchise: "*",
    target: "mulher-maravilha",
    aliases: [
      "wonder woman",
      "mulher maravilha",
      "mulher maravilha bust",
      "wonder-woman-figures",
      "wonder woman 1984",
      "wonder woman amazon",
      "wonder woman variants",
    ],
  },
  {
    category: "dc",
    franchise: "*",
    target: "mulher-gato",
    aliases: ["catwoman", "mulher gato"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "lanterna-verde",
    aliases: ["green lantern", "lanterna verde", "green-lantern-figures", "green lantern ring", "green lantern set"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "asa-noturna",
    aliases: ["nightwing", "asa noturna"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "capuz-vermelho",
    aliases: ["red hood", "capuz vermelho"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "coringa",
    aliases: ["joker", "coringa", "coringa bust"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "pinguim",
    aliases: ["penguin", "pinguim", "the penguin"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "duas-caras",
    aliases: ["two face", "duas caras", "two face bust"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "charada",
    aliases: ["riddler", "charada", "the riddler", "riddler-figures"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "hera-venenosa",
    aliases: ["poison ivy", "hera venenosa", "poison ivy set"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "espantalho",
    aliases: ["scarecrow", "espantalho"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "senhor-frio",
    aliases: ["mr freeze", "senhor frio"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "arlequina",
    aliases: ["harley quinn", "harley-quinn"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "arlequina-e-hera-venenosa",
    aliases: ["harley quinn e hera venenosa"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "batman",
    aliases: [
      "armored batman",
      "batman armored",
      "batman armored bust",
      "batman bust",
      "batman-figures",
      "batman mask",
      "batman-heads",
      "batman-helmet",
      "batman memorial statue",
      "batman miniature set",
      "batman statue",
      "batman-chibi-figures",
      "batman-lego-figures",
      "batman-props",
      "chibi batman",
    ],
  },
  {
    category: "dc",
    franchise: "*",
    target: "batman-do-futuro",
    aliases: ["batman beyond"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "batman-que-ri",
    aliases: ["batman who laughs", "batman who laughs parts"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "darkseid",
    aliases: ["darkseid bust"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "flash",
    aliases: ["the flash", "the-flash-figures", "flash bust"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "grupo",
    aliases: ["dc villains group", "dc-figures"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "aquaman",
    aliases: ["aquaman accessories", "aquaman statue", "aquaman-figures"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "superman",
    aliases: ["superman bust", "superman diorama", "superman set", "superman-figures"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "ravena",
    aliases: ["raven", "raven figure"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "batgirl",
    aliases: ["batgirl-figures"],
  },
  {
    category: "dc",
    franchise: "*",
    target: "bruce-wayne",
    aliases: ["bruce wayne parts"],
  },
]);

const POKEMON_MARKER_FOLDERS = normalizedPhraseSet(["pokemon misc", "pokemon_misc", "pokemon holiday", "pokemon_holiday"]);
const POKEMON_SPECIES_FOLDERS = new Map(
  [
    "abra",
    "arcanine",
    "breloom",
    "bulbasaur",
    "charizard",
    "charmander",
    "chikorita",
    "clefable",
    "delphox",
    "donphan",
    "dragonair",
    "eevee",
    "flamigo",
    "flygon",
    "gardevoir",
    "gengar",
    "giratina",
    "hatenna hattrem",
    "latios latias",
    "lunala",
    "mamoswine",
    "meowth",
    "mew",
    "mewtwo",
    "moltres",
    "pelipper",
    "pikachu",
    "rapidash",
    "slowpoke",
    "sobble",
    "squirtle",
    "swampert",
    "victini",
  ].map((name) => [normalizeComparable(name), slug(name)]),
);

const DIRECT_MAIN_SUBJECTS = new Map(
  [
    { category: "anime", franchise: "afro-samurai", folder: "afro-samurai", aliases: ["afro samurai"] },
    { category: "anime", franchise: "astro-boy", folder: "astro-boy", aliases: ["astro boy"] },
    { category: "anime", franchise: "chainsaw man", folder: "chainsaw-man", aliases: ["chainsaw man"] },
    { category: "anime", franchise: "devilman", folder: "devilman", aliases: ["devilman"] },
    { category: "anime", franchise: "detective-conan", folder: "conan-edogawa", aliases: ["conan edogawa"] },
    { category: "anime", franchise: "doraemon", folder: "doraemon", aliases: ["doraemon"] },
    { category: "anime", franchise: "goblin slayer", folder: "goblin-slayer", aliases: ["goblin slayer"] },
    { category: "anime", franchise: "frieren", folder: "frieren", aliases: ["frieren"] },
    { category: "anime", franchise: "gundam", folder: "gundam", aliases: ["gundam"] },
    { category: "anime", franchise: "guyver", folder: "guyver", aliases: ["guyver"] },
    { category: "anime", franchise: "inuyasha", folder: "inuyasha", aliases: ["inuyasha"] },
    { category: "anime", franchise: "kaiju no 8", folder: "kaiju-no-8", aliases: ["kaiju no 8"] },
    { category: "anime", franchise: "mazinger z", folder: "mazinger-z", aliases: ["mazinger z"] },
    { category: "anime", franchise: "mashle", folder: "mashle", aliases: ["mashle"] },
    { category: "anime", franchise: "minky momo", folder: "minky-momo", aliases: ["minky momo"] },
    { category: "anime", franchise: "nausicaa", folder: "nausicaa", aliases: ["nausicaa"] },
    { category: "anime", franchise: "sand-land", folder: "sand-land", aliases: ["sand land"] },
    { category: "anime", franchise: "sailor-moon", folder: "sailor-moon", aliases: ["sailor moon"] },
    { category: "anime", franchise: "slam-dunk", folder: "grupo", aliases: ["slam dunk"] },
    { category: "anime", franchise: "super sonico", folder: "super-sonico", aliases: ["super sonico"] },
    { category: "anime", franchise: "tetsujin 28", folder: "tetsujin-28", aliases: ["tetsujin 28"] },
    { category: "anime", franchise: "violet evergarden", folder: "violet-evergarden", aliases: ["violet evergarden"] },
    { category: "desenhos-animacao", franchise: "aladdin", folder: "aladdin", aliases: ["aladdin"] },
    { category: "desenhos-animacao", franchise: "anastasia", folder: "anastasia", aliases: ["anastasia"] },
    { category: "desenhos-animacao", franchise: "asterix", folder: "asterix", aliases: ["asterix"] },
    { category: "desenhos-animacao", franchise: "a-formiga-atomica", folder: "a-formiga-atomica", aliases: ["a formiga atomica", "atom ant"] },
    { category: "desenhos-animacao", franchise: "frankenstein-jr", folder: "frankenstein-jr", aliases: ["frankenstein jr"] },
    { category: "desenhos-animacao", franchise: "galaxy-trio", folder: "galaxy-trio", aliases: ["galaxy trio"] },
    { category: "desenhos-animacao", franchise: "hair-bear-bunch", folder: "hair-bear-bunch", aliases: ["hair bear bunch"] },
    { category: "desenhos-animacao", franchise: "jabberjaw", folder: "jabberjaw", aliases: ["jabberjaw"] },
    { category: "desenhos-animacao", franchise: "magilla-gorilla", folder: "magilla-gorilla", aliases: ["magilla gorilla"] },
    { category: "desenhos-animacao", franchise: "mr-jinks", folder: "mr-jinks", aliases: ["mr jinks"] },
    { category: "desenhos-animacao", franchise: "mumbly", folder: "mumbly", aliases: ["mumbly"] },
    { category: "desenhos-animacao", franchise: "precious-pupp", folder: "precious-pupp", aliases: ["precious pupp"] },
    {
      category: "desenhos-animacao",
      franchise: "punkin-puss-and-mushmouse",
      folder: "punkin-puss-and-mushmouse",
      aliases: ["punkin puss and mushmouse"],
    },
    { category: "desenhos-animacao", franchise: "shazzan", folder: "shazzan", aliases: ["shazzan"] },
    { category: "desenhos-animacao", franchise: "wally-gator", folder: "wally-gator", aliases: ["wally gator"] },
    {
      category: "desenhos-animacao",
      franchise: "beavis-e-butt-head",
      folder: "beavis-e-butt-head",
      aliases: ["beavis e butt-head", "beavis and butt-head"],
    },
    { category: "desenhos-animacao", franchise: "betty-boop", folder: "betty-boop", aliases: ["betty boop"] },
    { category: "desenhos-animacao", franchise: "bluey", folder: "bluey", aliases: ["bluey"] },
    { category: "desenhos-animacao", franchise: "bob-o-construtor", folder: "bob-o-construtor", aliases: ["bob o construtor"] },
    { category: "desenhos-animacao", franchise: "branca-de-neve", folder: "branca-de-neve", aliases: ["branca de neve"] },
    { category: "desenhos-animacao", franchise: "bucky-ohare", folder: "bucky-ohare", aliases: ["bucky ohare"] },
    { category: "desenhos-animacao", franchise: "caverna-do-dragao", folder: "grupo", aliases: ["caverna do dragao"] },
    { category: "desenhos-animacao", franchise: "capitao-planeta", folder: "capitao-planeta", aliases: ["capitao planeta"] },
    { category: "desenhos-animacao", franchise: "cinderela", folder: "cinderela", aliases: ["cinderela"] },
    { category: "desenhos-animacao", franchise: "coraline", folder: "coraline", aliases: ["coraline"] },
    { category: "desenhos-animacao", franchise: "darkwing-duck", folder: "darkwing-duck", aliases: ["darkwing duck"] },
    { category: "desenhos-animacao", franchise: "dudley-do-right", folder: "dudley-do-right", aliases: ["dudley do right"] },
    { category: "desenhos-animacao", franchise: "fangface", folder: "fangface", aliases: ["fangface"] },
    { category: "desenhos-animacao", franchise: "freakazoid", folder: "freakazoid", aliases: ["freakazoid"] },
    { category: "desenhos-animacao", franchise: "galaxy-rangers", folder: "grupo", aliases: ["galaxy rangers"] },
    {
      category: "desenhos-animacao",
      franchise: "gato-felix",
      folder: "gato-felix",
      aliases: ["gato felix", "felix", "felix the cat"],
    },
    { category: "desenhos-animacao", franchise: "gato-de-botas", folder: "gato-de-botas", aliases: ["gato de botas"] },
    {
      category: "desenhos-animacao",
      franchise: "as-terriveis-aventuras-de-billy-e-mandy",
      folder: "puro-osso",
      aliases: ["puro osso"],
    },
    { category: "desenhos-animacao", franchise: "hello-kitty", folder: "hello-kitty", aliases: ["hello kitty"] },
    { category: "desenhos-animacao", franchise: "inspetor-bugiganga", folder: "inspetor-bugiganga", aliases: ["inspetor bugiganga"] },
    { category: "desenhos-animacao", franchise: "johnny-bravo", folder: "johnny-bravo", aliases: ["johnny bravo"] },
    { category: "desenhos-animacao", franchise: "kim-possible", folder: "kim-possible", aliases: ["kim possible"] },
    { category: "desenhos-animacao", franchise: "megamente", folder: "megamente", aliases: ["megamente"] },
    { category: "desenhos-animacao", franchise: "meu-malvado-favorito", folder: "minions", aliases: ["minions"] },
    { category: "desenhos-animacao", franchise: "my-little-pony", folder: "personagens", aliases: ["my little pony"] },
    { category: "desenhos-animacao", franchise: "moana", folder: "moana", aliases: ["moana"] },
    { category: "desenhos-animacao", franchise: "mulan", folder: "mulan", aliases: ["mulan"] },
    { category: "desenhos-animacao", franchise: "o-gigante-de-ferro", folder: "o-gigante-de-ferro", aliases: ["gigante de ferro"] },
    { category: "desenhos-animacao", franchise: "os-jetsons", folder: "familia-jetson", aliases: ["jetsons"] },
    { category: "desenhos-animacao", franchise: "os-manda-chuvas", folder: "manda-chuva", aliases: ["manda chuva", "top cat"] },
    { category: "desenhos-animacao", franchise: "peppa-pig", folder: "peppa-pig", aliases: ["peppa pig"] },
    { category: "desenhos-animacao", franchise: "peter-pan", folder: "peter-pan", aliases: ["peter pan"] },
    { category: "desenhos-animacao", franchise: "phineas-e-ferb", folder: "grupo", aliases: ["phineas e ferb"] },
    {
      category: "desenhos-animacao",
      franchise: "pantera-cor-de-rosa",
      folder: "pantera-cor-de-rosa",
      aliases: ["pantera cor de rosa", "pink panther"],
    },
    {
      category: "desenhos-animacao",
      franchise: "pica-pau",
      folder: "pica-pau",
      aliases: ["pica pau", "pica-pau", "woody woodpecker"],
    },
    { category: "desenhos-animacao", franchise: "pinocchio", folder: "pinocchio", aliases: ["pinocchio"] },
    { category: "desenhos-animacao", franchise: "pocahontas", folder: "pocahontas", aliases: ["pocahontas"] },
    { category: "desenhos-animacao", franchise: "pocoyo", folder: "pocoyo", aliases: ["pocoyo"] },
    { category: "desenhos-animacao", franchise: "popeye", folder: "popeye", aliases: ["popeye"] },
    { category: "desenhos-animacao", franchise: "raggedy-ann", folder: "raggedy-ann", aliases: ["raggedy ann"] },
    { category: "desenhos-animacao", franchise: "rick-and-morty", folder: "rick-e-morty", aliases: ["rick e morty"] },
    { category: "desenhos-animacao", franchise: "samurai jack", folder: "samurai-jack", aliases: ["samurai jack"] },
    { category: "desenhos-animacao", franchise: "she-ra", folder: "she-ra", aliases: ["she ra"] },
    { category: "desenhos-animacao", franchise: "shrek", folder: "shrek", aliases: ["shrek"] },
    { category: "desenhos-animacao", franchise: "silverhawks", folder: "grupo", aliases: ["silverhawks"] },
    { category: "desenhos-animacao", franchise: "sininho", folder: "sininho", aliases: ["sininho"] },
    { category: "desenhos-animacao", franchise: "space-ghost", folder: "space-ghost", aliases: ["space ghost"] },
    { category: "desenhos-animacao", franchise: "speed-racer", folder: "speed-racer", aliases: ["speed racer"] },
    { category: "desenhos-animacao", franchise: "steven-universe", folder: "steven-universe", aliases: ["steven universe"] },
    { category: "desenhos-animacao", franchise: "the-tick", folder: "the-tick", aliases: ["the tick"] },
    { category: "desenhos-animacao", franchise: "the tick", folder: "the-tick", aliases: ["the tick"] },
    { category: "desenhos-animacao", franchise: "ursinho-pooh", folder: "ursinho-pooh", aliases: ["ursinho pooh"] },
    { category: "desenhos-animacao", franchise: "voltron", folder: "voltron", aliases: ["voltron"] },
    { category: "desenhos-animacao", franchise: "wildfire", folder: "wildfire", aliases: ["wildfire"] },
    { category: "filmes-series", franchise: "barbarella", folder: "barbarella", aliases: ["barbarella"] },
    { category: "filmes-series", franchise: "barbie", folder: "barbie", aliases: ["barbie"] },
    { category: "filmes-series", franchise: "ace-ventura", folder: "ace-ventura", aliases: ["ace ventura"] },
    { category: "filmes-series", franchise: "beetlejuice", folder: "beetlejuice", aliases: ["beetlejuice"] },
    { category: "filmes-series", franchise: "candyman", folder: "candyman", aliases: ["candyman"] },
    { category: "filmes-series", franchise: "bruce-lee", folder: "bruce-lee", aliases: ["bruce lee"] },
    { category: "filmes-series", franchise: "charlie-chaplin", folder: "charlie-chaplin", aliases: ["charlie chaplin"] },
    { category: "filmes-series", franchise: "chapolin-colorado", folder: "chapolin-colorado", aliases: ["chapolin colorado"] },
    { category: "filmes-series", franchise: "conan-o-barbaro", folder: "conan", aliases: ["conan"] },
    { category: "filmes-series", franchise: "coraline", folder: "coraline", aliases: ["coraline"] },
    { category: "filmes-series", franchise: "crocodile-dundee", folder: "crocodile-dundee", aliases: ["crocodile dundee"] },
    { category: "filmes-series", franchise: "dracula", folder: "dracula", aliases: ["dracula"] },
    { category: "filmes-series", franchise: "edward-maos-de-tesoura", folder: "edward-maos-de-tesoura", aliases: ["edward maos de tesoura"] },
    { category: "filmes-series", franchise: "elvira", folder: "elvira", aliases: ["elvira"] },
    { category: "filmes-series", franchise: "godzilla", folder: "godzilla", aliases: ["godzilla"] },
    { category: "filmes-series", franchise: "harry-potter", folder: "harry-potter", aliases: ["harry potter"] },
    { category: "filmes-series", franchise: "herbie", folder: "herbie", aliases: ["herbie"] },
    { category: "filmes-series", franchise: "hellboy", folder: "hellboy", aliases: ["hellboy"] },
    { category: "filmes-series", franchise: "horror-legends", folder: "grupo", aliases: ["horror legends"] },
    { category: "filmes-series", franchise: "jaspion", folder: "jaspion", aliases: ["jaspion"] },
    { category: "filmes-series", franchise: "jack-frost", folder: "jack-frost", aliases: ["jack frost"] },
    { category: "filmes-series", franchise: "james-bond", folder: "james-bond", aliases: ["james bond"] },
    { category: "filmes-series", franchise: "king kong", folder: "king-kong", aliases: ["king kong"] },
    { category: "filmes-series", franchise: "leprechaun", folder: "leprechaun", aliases: ["leprechaun"] },
    { category: "filmes-series", franchise: "m3gan", folder: "m3gan", aliases: ["m3gan"] },
    { category: "filmes-series", franchise: "malevola", folder: "malevola", aliases: ["malevola"] },
    { category: "filmes-series", franchise: "marilyn-monroe", folder: "marilyn-monroe", aliases: ["marilyn monroe"] },
    { category: "filmes-series", franchise: "nosferatu", folder: "nosferatu", aliases: ["nosferatu"] },
    { category: "filmes-series", franchise: "o-exterminador-do-futuro", folder: "o-exterminador-do-futuro", aliases: ["terminator"] },
    { category: "filmes-series", franchise: "o-maskara", folder: "o-maskara", aliases: ["maskara"] },
    { category: "filmes-series", franchise: "red-sonja", folder: "red-sonja", aliases: ["red sonja"] },
    { category: "filmes-series", franchise: "robin-hood", folder: "robin-hood", aliases: ["robin hood"] },
    { category: "filmes-series", franchise: "robocop", folder: "robocop", aliases: ["robocop"] },
    { category: "filmes-series", franchise: "sherlock", folder: "sherlock-holmes", aliases: ["sherlock"] },
    { category: "filmes-series", franchise: "tarzan", folder: "tarzan", aliases: ["tarzan"] },
    { category: "filmes-series", franchise: "ted", folder: "ted", aliases: ["ted"] },
    { category: "filmes-series", franchise: "topo-gigio", folder: "topo-gigio", aliases: ["topo gigio"] },
    { category: "filmes-series", franchise: "tropic-thunder", folder: "tropic-thunder", aliases: ["tropic thunder"] },
    { category: "filmes-series", franchise: "tubarao", folder: "tubarao", aliases: ["tubarao"] },
    { category: "filmes-series", franchise: "ultraman", folder: "ultraman", aliases: ["ultraman"] },
    { category: "filmes-series", franchise: "um-tira-da-pesada", folder: "axel-foley", aliases: ["axel foley"] },
    { category: "filmes-series", franchise: "willy-wonka", folder: "willy-wonka", aliases: ["willy wonka"] },
    { category: "filmes-series", franchise: "zorro", folder: "zorro", aliases: ["zorro"] },
    { category: "filmes-series", franchise: "godzilla", folder: "godzilla", aliases: ["godzilla"] },
    { category: "filmes-series", franchise: "indiana-jones", folder: "indiana-jones", aliases: ["indiana jones"] },
    { category: "filmes-series", franchise: "john-wick", folder: "john-wick", aliases: ["john wick"] },
    { category: "filmes-series", franchise: "predador", folder: "predador", aliases: ["predator", "yautja"] },
    { category: "filmes-series", franchise: "punky-a-levada-da-breca", folder: "punky-brewster", aliases: ["punky brewster"] },
    { category: "filmes-series", franchise: "robocop", folder: "robocop", aliases: ["robocop"] },
    { category: "games", franchise: "bayonetta", folder: "bayonetta", aliases: ["bayonetta"] },
    { category: "games", franchise: "bomberman", folder: "bomberman", aliases: ["bomberman"] },
    { category: "games", franchise: "bloodrayne", folder: "bloodrayne", aliases: ["bloodrayne"] },
    { category: "games", franchise: "crash-bandicoot", folder: "crash-bandicoot", aliases: ["crash bandicoot"] },
    { category: "games", franchise: "cuphead", folder: "cuphead", aliases: ["cuphead"] },
    { category: "games", franchise: "cult-of-the-lamb", folder: "cult-of-the-lamb", aliases: ["cult of the lamb"] },
    { category: "games", franchise: "donkey-kong", folder: "donkey-kong", aliases: ["donkey kong"] },
    { category: "games", franchise: "banjo-kazooie", folder: "banjo-kazooie", aliases: ["banjo kazooie"] },
    { category: "games", franchise: "duke-nukem", folder: "duke-nukem", aliases: ["duke nukem"] },
    { category: "games", franchise: "earthworm-jim", folder: "earthworm-jim", aliases: ["earthworm jim"] },
    { category: "games", franchise: "golden-axe", folder: "golden-axe", aliases: ["golden axe"] },
    { category: "games", franchise: "grand-theft-auto", folder: "geral", aliases: ["grand theft auto"] },
    { category: "games", franchise: "hollow knight", folder: "hollow-knight", aliases: ["hollow knight"] },
    { category: "games", franchise: "kirby", folder: "kirby", aliases: ["kirby"] },
    { category: "games", franchise: "klonoa", folder: "klonoa", aliases: ["klonoa"] },
    { category: "games", franchise: "mario", folder: "mario", aliases: ["mario"] },
    { category: "games", franchise: "mario-kart", folder: "mario-kart", aliases: ["mario kart"] },
    { category: "games", franchise: "mega-man", folder: "mega-man", aliases: ["mega man"] },
    { category: "games", franchise: "nights", folder: "nights", aliases: ["nights"] },
    { category: "games", franchise: "omori", folder: "omori", aliases: ["omori"] },
    { category: "games", franchise: "plants-vs-zombies", folder: "plantas", aliases: ["plants vs zombies"] },
    { category: "games", franchise: "rayman", folder: "rayman", aliases: ["rayman"] },
    { category: "games", franchise: "robopunk", folder: "robopunk", aliases: ["robopunk"] },
    { category: "games", franchise: "shantae", folder: "shantae", aliases: ["shantae"] },
    { category: "games", franchise: "sonic", folder: "sonic", aliases: ["sonic"] },
    { category: "games", franchise: "spyro", folder: "spyro", aliases: ["spyro"] },
  ].map((entry) => [
    scopedAliasKey(entry.category, entry.franchise, "*"),
    { folder: entry.folder, aliases: normalizedPhraseSet(entry.aliases) },
  ]),
);

const SHALLOW_FILENAME_SUBJECTS = new Map();

for (const entry of [
  { category: "anime", franchise: "dragon ball", target: "original", aliases: ["dragon ball what if"] },
  { category: "anime", franchise: "dragon ball", target: "goku-e-vegeta", aliases: ["goku vegeta", "goku vegeta dragon ball"] },
  { category: "anime", franchise: "attack on titan", target: "annie-leonhart", aliases: ["annie leonhart"] },
  { category: "anime", franchise: "attack on titan", target: "levi-ackerman", aliases: ["levi"] },
  { category: "anime", franchise: "demon slayer", target: "grupo", aliases: ["demon slayer grupo", "demon slayer group"] },
  { category: "anime", franchise: "dr slump", target: "arale-norimaki", aliases: ["arale"] },
  { category: "anime", franchise: "fullmetal alchemist", target: "roy-mustang", aliases: ["roy mustang"] },
  { category: "anime", franchise: "ghost in the shell", target: "motoko-kusanagi", aliases: ["motoko kusanagi"] },
  { category: "anime", franchise: "haruhi suzumiya", target: "haruhi-suzumiya", aliases: ["haruhi suzumiya"] },
  { category: "anime", franchise: "high school dxd", target: "rias-gremory", aliases: ["rias gremory"] },
  { category: "anime", franchise: "hunter x hunter", target: "killua-zoldyck", aliases: ["killua"] },
  { category: "anime", franchise: "hunter x hunter", target: "grupo", aliases: ["hunter x hunter character set", "hunter x hunter diorama"] },
  { category: "anime", franchise: "jujutsu kaisen", target: "grupo", aliases: ["jujutsu kaisen grupo"] },
  { category: "anime", franchise: "komi san", target: "komi-san", aliases: ["komi san"] },
  { category: "anime", franchise: "one punch man", target: "genos", aliases: ["genos"] },
  { category: "anime", franchise: "one punch man", target: "tatsumaki", aliases: ["tatsumaki"] },
  { category: "anime", franchise: "solo leveling", target: "sung-jinwoo", aliases: ["sung jinwoo"] },
  { category: "anime", franchise: "tenchi muyo", target: "ryoko-hakubi", aliases: ["ryoko hakubi"] },

  { category: "filmes-series", franchise: "de-volta-para-o-futuro", target: "delorean", aliases: ["delorean"] },
  { category: "filmes-series", franchise: "esqueceram-de-mim", target: "kevin-mccallister", aliases: ["kevin", "menino"] },
  { category: "filmes-series", franchise: "esqueceram-de-mim", target: "harry-e-marv", aliases: ["harry marv"] },
  { category: "filmes-series", franchise: "esqueceram-de-mim", target: "old-man-marley", aliases: ["velho"] },
  { category: "filmes-series", franchise: "esqueceram-de-mim", target: "grupo", aliases: ["home alone group", "home alone grupo"] },
  { category: "filmes-series", franchise: "gremlins", target: "gremlin", aliases: ["gremlin asas", "gremlin bracos", "gremlin bra os", "gremlin card", "gremlin rosto"] },
  { category: "filmes-series", franchise: "gremlins", target: "grupo", aliases: ["gremlins grupo"] },
  { category: "filmes-series", franchise: "os-caca-fantasmas", target: "slimer", aliases: ["slimer"] },
  { category: "filmes-series", franchise: "os-caca-fantasmas", target: "stay-puft", aliases: ["stay puft"] },
  { category: "filmes-series", franchise: "os-goonies", target: "andy", aliases: ["andy goonies"] },
  { category: "filmes-series", franchise: "os-goonies", target: "chunk", aliases: ["chunk goonies"] },
  { category: "filmes-series", franchise: "os-goonies", target: "sloth", aliases: ["sloth goonies"] },
  { category: "filmes-series", franchise: "os-goonies", target: "grupo", aliases: ["goonies base", "goonies grupo"] },
  { category: "filmes-series", franchise: "power-rangers", target: "ranger-vermelho", aliases: ["power ranger vermelho"] },
  { category: "filmes-series", franchise: "power-rangers", target: "ranger-branco", aliases: ["white ranger"] },
  { category: "filmes-series", franchise: "power-rangers", target: "grupo", aliases: ["power_rangers_collection", "power rangers collection"] },
  { category: "filmes-series", franchise: "star trek", target: "spock", aliases: ["spock"] },
  { category: "filmes-series", franchise: "star trek", target: "jean-luc-picard", aliases: ["patrick stewart"] },
  { category: "filmes-series", franchise: "star trek", target: "grupo", aliases: ["april team"] },
  { category: "filmes-series", franchise: "round-6", target: "guardas", aliases: ["guarda", "guard"] },
  { category: "outros", franchise: "quadrinhos", target: "invincible", aliases: ["invincible mark grayson", "mark grayson"] },

  { category: "desenhos-animacao", franchise: "ben 10 four arms", target: "quatro-bracos", aliases: ["four arms"] },
  { category: "desenhos-animacao", franchise: "big hero 6", target: "baymax", aliases: ["baymax"] },
  { category: "desenhos-animacao", franchise: "bojack horseman", target: "bojack-horseman", aliases: ["bojack"] },
  { category: "desenhos-animacao", franchise: "garfield", target: "garfield", aliases: ["garfield"] },
  { category: "desenhos-animacao", franchise: "ghostbusters", target: "stay-puft", aliases: ["stay puft"] },
  { category: "desenhos-animacao", franchise: "masters-of-the-universe", target: "gato-guerreiro", aliases: ["battle cat"] },
  { category: "desenhos-animacao", franchise: "masters-of-the-universe", target: "maligna", aliases: ["evil lyn"] },
  {
    category: "desenhos-animacao",
    franchise: "as-terriveis-aventuras-de-billy-e-mandy",
    target: "puro-osso",
    aliases: ["grim"],
  },
  { category: "desenhos-animacao", franchise: "how to train your dragon", target: "banguela", aliases: ["toothless"] },
  { category: "desenhos-animacao", franchise: "looney tunes", target: "wile-e-coyote", aliases: ["wyle e coyote", "wile e coyote"] },
  { category: "desenhos-animacao", franchise: "monsters inc", target: "mike-e-sulley", aliases: ["mike sulley"] },
  { category: "desenhos-animacao", franchise: "woody woodpecker", target: "pica-pau", aliases: ["woody woodpecker"] },
  { category: "games", franchise: "darkstalkers", target: "morrigan", aliases: ["morrigan"] },
  { category: "games", franchise: "dark-souls", target: "guerreiro-escuro", aliases: ["dark warrior"] },
  { category: "games", franchise: "devil may cry", target: "dante", aliases: ["dante"] },
  { category: "games", franchise: "fallout", target: "vault-boy", aliases: ["vault boy"] },
  { category: "games", franchise: "fallout", target: "power-armor", aliases: ["power armor"] },
  { category: "games", franchise: "genshin-impact", target: "navia", aliases: ["genshin style witch", "navia"] },
  { category: "games", franchise: "metroid", target: "samus", aliases: ["samus"] },
  { category: "games", franchise: "kingdom-rush", target: "guerreiro", aliases: ["warrior"] },
  { category: "games", franchise: "the-witcher", target: "ciri", aliases: ["ciri"] },
  { category: "games", franchise: "tomb-raider", target: "lara-croft", aliases: ["lara croft"] },
]) {
  const key = scopedAliasKey(entry.category, entry.franchise, "*");
  const rows = SHALLOW_FILENAME_SUBJECTS.get(key) || [];
  rows.push({ target: entry.target, aliases: normalizedPhraseSet(entry.aliases) });
  SHALLOW_FILENAME_SUBJECTS.set(key, rows);
}

function canonicalFolderAlias(category, franchise, folder) {
  return (
    CATALOG_FOLDER_ALIASES.get(scopedAliasKey(category, franchise, folder)) ||
    CATALOG_FOLDER_ALIASES.get(scopedAliasKey(category, "*", folder)) ||
    ""
  );
}

function pathBasenameWithoutExtension(value) {
  const filename = String(value || "").split(/[\\/]+/).pop() || "";
  return filename.replace(/\.[^.]+$/, "");
}

function directMainSubjectFolder({ category, franchise, folder, isShallow } = {}) {
  if (!isShallow || normalizeComparable(folder) !== "geral") return "";
  const entry = DIRECT_MAIN_SUBJECTS.get(scopedAliasKey(category, franchise, "*"));
  return entry?.folder || "";
}

function shallowFilenameSubjectFolder({ category, franchise, folder, filename, isShallow } = {}) {
  if (!isShallow || normalizeComparable(folder) !== "geral") return "";
  const entries = SHALLOW_FILENAME_SUBJECTS.get(scopedAliasKey(category, franchise, "*")) || [];
  if (entries.length === 0) return "";
  const text = normalizeComparable(pathBasenameWithoutExtension(filename));
  if (!text) return "";

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (phraseMatches(text, alias)) return entry.target;
    }
  }
  return "";
}

export function isDirectMainSubjectFolder({ category, franchise, folder } = {}) {
  const entry = DIRECT_MAIN_SUBJECTS.get(scopedAliasKey(category, franchise, "*"));
  if (entry && normalizeComparable(entry.folder) === normalizeComparable(folder)) return true;

  const shallowEntries = SHALLOW_FILENAME_SUBJECTS.get(scopedAliasKey(category, franchise, "*")) || [];
  return shallowEntries.some((row) => normalizeComparable(row.target) === normalizeComparable(folder));
}

function avatarFranchiseForFolder(category, franchise, folder, filename) {
  if (normalizeComparable(category) !== "desenhos animacao") return "";
  const franchiseText = normalizeComparable(franchise);
  if (franchiseText !== "avatar") return "";
  const text = [folder, filename].map((value) => normalizeComparable(value)).join(" ");
  return phraseMatches(text, "korra") ? "avatar-a-lenda-de-korra" : "avatar-a-lenda-de-aang";
}

function avatarMovieLeakRewrite({ category, franchise, folder } = {}) {
  if (normalizeComparable(category) !== "desenhos animacao") return null;
  if (normalizeComparable(franchise) !== "avatar a lenda de aang") return null;
  const folderText = normalizeComparable(folder);
  if (!["neytiri", "varang"].includes(folderText)) return null;
  return {
    category: "filmes-series",
    franchise: "avatar",
    folder: cleanCatalogSlug(folder, "geral"),
    reasons: ["avatar_movie_leak_reclassification"],
  };
}

function pokemonRewrite({ category, franchise, folder } = {}) {
  if (normalizeComparable(category) !== "games") return null;
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  if (franchiseText === "pokemon") return null;

  const speciesFolder = POKEMON_SPECIES_FOLDERS.get(franchiseText);
  if (speciesFolder) {
    return {
      category: "games",
      franchise: "pokemon",
      folder: speciesFolder,
      reasons: ["pokemon_species_consolidation"],
    };
  }

  const markerFolder = POKEMON_MARKER_FOLDERS.has(folderText);
  const franchiseMentionsPokemon = phraseMatches(franchiseText, "pokemon");
  if (!markerFolder && !franchiseMentionsPokemon) return null;

  return {
    category: "games",
    franchise: "pokemon",
    folder: cleanCatalogSlug(franchise, "geral"),
    reasons: ["pokemon_franchise_consolidation"],
  };
}

function nonOfficialStyleRewrite({ category, franchise, folder, filename } = {}) {
  if (normalizeComparable(category) !== "anime") return null;
  if (normalizeComparable(franchise) !== "one piece style") return null;

  const candidateText = [folder, filename].map((value) => normalizeComparable(value)).join(" ");
  if (!phraseMatches(candidateText, "blue clown")) return null;

  return {
    category: "outros",
    franchise: "original",
    folder: "blue-clown",
    reasons: ["non_official_style_reclassification"],
  };
}

function studioGhibliRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  if (!["anime", "desenhos animacao", "filmes series"].includes(categoryText)) return null;
  if (normalizeComparable(franchise) !== "studio ghibli") return null;

  const text = [folder, filename].map((value) => normalizeComparable(value)).join(" ");

  if (phraseMatches(text, "kiki") || phraseMatches(text, "delivery service")) {
    return {
      category: "anime",
      franchise: "o-servico-de-entregas-da-kiki",
      folder: phraseMatches(text, "jiji") ? "kiki-jiji" : "kiki",
      reasons: ["studio_ghibli_reclassification"],
    };
  }

  if (phraseMatches(text, "howl") || phraseMatches(text, "moving castle")) {
    return {
      category: "anime",
      franchise: "o-castelo-animado",
      folder: "howl",
      reasons: ["studio_ghibli_reclassification"],
    };
  }

  if (phraseMatches(text, "totoro")) {
    return {
      category: "anime",
      franchise: "meu-amigo-totoro",
      folder: phraseMatches(text, "no face") || phraseMatches(text, "sem rosto") ? "totoro-e-no-face" : "totoro",
      reasons: ["studio_ghibli_reclassification"],
    };
  }

  if (phraseMatches(text, "chihiro") && (phraseMatches(text, "no face") || phraseMatches(text, "sem rosto"))) {
    return {
      category: "anime",
      franchise: "a-viagem-de-chihiro",
      folder: "chihiro-e-sem-rosto",
      reasons: ["studio_ghibli_reclassification"],
    };
  }

  if (phraseMatches(text, "no face") || phraseMatches(text, "sem rosto") || phraseMatches(text, "spirited away")) {
    return {
      category: "anime",
      franchise: "a-viagem-de-chihiro",
      folder: "no-face",
      reasons: ["studio_ghibli_reclassification"],
    };
  }

  return null;
}

function filenameSubject(filename, removablePhrases = []) {
  let text = normalizeComparable(pathBasenameWithoutExtension(filename));
  text = text.replace(/\b\d{3,}\b/g, " ");
  for (const phrase of removablePhrases) {
    const phraseText = normalizeComparable(phrase);
    if (!phraseText) continue;
    text = ` ${text} `.replaceAll(` ${phraseText} `, " ");
  }
  return cleanCatalogSlug(text, "geral");
}

function groupedSubjectKey(group, folder) {
  return `${group}|${normalizeComparable(folder)}`;
}

function groupedSubjectFolder(group, folder, aliases) {
  return aliases.get(groupedSubjectKey(group, folder)) || cleanCatalogSubpath(folder, "geral");
}

function groupedUmbrellaFolder(group, subject) {
  const cleanGroup = cleanCatalogSubpath(group, "geral");
  const cleanSubject = cleanCatalogSubpath(subject, "geral");
  if (!cleanSubject || cleanSubject === "geral") return cleanGroup;
  if (normalizeComparable(cleanGroup) === normalizeComparable(cleanSubject)) return cleanGroup;
  return `${cleanGroup}/${cleanSubject}`;
}

function hannaBarberaAnimationBucketRewrite({ category, franchise, folder } = {}) {
  const categoryText = normalizeComparable(category);
  if (!["desenhos animacao", "filmes series"].includes(categoryText)) return null;

  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const reasons = ["hanna_barbera_animation_bucket"];

  if (["hanna barbera", "hanna-barbera"].includes(franchiseText)) {
    const target = HANNA_BARBERA_BUCKET_TARGETS.get(folderText);
    const group = target?.[0] || cleanCatalogSubpath(folder, "geral");
    const subject = target?.[1] || "geral";
    return {
      category: "desenhos-animacao",
      franchise: "hanna-barbera",
      folder: groupedUmbrellaFolder(group, subject),
      reasons,
    };
  }

  const group = HANNA_BARBERA_DIRECT_FRANCHISE_TARGETS.get(franchiseText);
  if (!group) return null;
  const subject = groupedSubjectFolder(group, folder, HANNA_BARBERA_SUBJECT_ALIASES);
  return {
    category: "desenhos-animacao",
    franchise: "hanna-barbera",
    folder: groupedUmbrellaFolder(group, subject),
    reasons,
  };
}

function cartoonNetworkAnimationBucketRewrite({ category, franchise, folder } = {}) {
  const categoryText = normalizeComparable(category);
  if (!["desenhos animacao", "filmes series"].includes(categoryText)) return null;

  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const reasons = ["cartoon_network_animation_bucket"];

  if (franchiseText === "cartoon network") {
    const target = CARTOON_NETWORK_BUCKET_TARGETS.get(folderText);
    if (target) {
      return {
        category: "desenhos-animacao",
        franchise: "cartoon-network",
        folder: groupedUmbrellaFolder(target[0], target[1]),
        reasons,
      };
    }
    const group = CARTOON_NETWORK_DIRECT_FRANCHISE_TARGETS.get(folderText);
    if (!group) return null;
    return {
      category: "desenhos-animacao",
      franchise: "cartoon-network",
      folder: group,
      reasons,
    };
  }

  const group = CARTOON_NETWORK_DIRECT_FRANCHISE_TARGETS.get(franchiseText);
  if (!group) return null;
  const subject = groupedSubjectFolder(group, folder, CARTOON_NETWORK_SUBJECT_ALIASES);
  return {
    category: "desenhos-animacao",
    franchise: "cartoon-network",
    folder: groupedUmbrellaFolder(group, subject),
    reasons,
  };
}

function genericAnimationBucketRewrite({ category, franchise, folder } = {}) {
  if (normalizeComparable(category) !== "desenhos animacao") return null;
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);

  if (franchiseText === "original" && folderText === "pink panther") {
    return {
      category: "desenhos-animacao",
      franchise: "pantera-cor-de-rosa",
      folder: "pantera-cor-de-rosa",
      reasons: ["official_character_reclassification"],
    };
  }

  const target = GENERIC_ANIMATION_ROOT_BUCKETS.get(franchiseText);
  if (!target) return null;

  const subject = cleanCatalogSubpath(folder, "geral");
  const prefixedSubject = target.prefix ? groupedUmbrellaFolder(target.prefix, subject) : subject;
  return {
    category: "outros",
    franchise: target.franchise,
    folder: prefixedSubject,
    reasons: ["generic_animation_bucket_reclassification"],
  };
}

function genericActiveRootBucketRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));

  if (categoryText === "games" && franchiseText === "original") {
    const text = [folderText, fileText].filter(Boolean).join(" ");
    if (phraseMatches(text, "black panther")) {
      return {
        category: "marvel",
        franchise: "herois",
        folder: "pantera-negra",
        reasons: ["official_character_reclassification"],
      };
    }
    if (phraseMatches(text, "green goblin")) {
      return {
        category: "marvel",
        franchise: "viloes",
        folder: "viloes-homem-aranha/duende-verde",
        reasons: ["official_character_reclassification"],
      };
    }
    if (phraseMatches(text, "bleez")) {
      return {
        category: "dc",
        franchise: "viloes",
        folder: "viloes-lanterna-verde/bleez",
        reasons: ["official_character_reclassification"],
      };
    }
    if (phraseMatches(text, "sae nijima") || phraseMatches(text, "sae niijima")) {
      return {
        category: "games",
        franchise: "persona-5",
        folder: "sae-niijima",
        reasons: ["official_character_reclassification"],
      };
    }
    if (phraseMatches(text, "tank girl")) {
      return {
        category: "outros",
        franchise: "quadrinhos",
        folder: "tank-girl",
        reasons: ["official_character_reclassification"],
      };
    }
  }

  const target = GENERIC_ACTIVE_ROOT_BUCKETS.get(`${categoryText}|${franchiseText}`);
  if (!target) return null;
  const subjectSource = GENERIC_ACTIVE_ROOT_FOLDER_SUBJECTS.has(franchiseText) ? folder : franchise;

  return {
    category: target.category,
    franchise: target.franchise,
    folder: cleanCatalogSubpath(subjectSource, "geral"),
    reasons: ["generic_active_root_bucket_reclassification"],
  };
}

function sourceStudioBucketRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));

  const identifiedStudioAsset = (category, franchise, folder, reasons = []) => ({
    category,
    franchise,
    folder,
    reasons: ["official_character_reclassification", "studio_asset_identified", ...reasons],
  });
  const reviewStudioAsset = (studio, folder) => ({
    category: "_revisar",
    franchise: "identificar",
    folder: `${cleanCatalogSlug(studio, "studio")}/${cleanCatalogSlug(folder, "geral")}`,
    reasons: ["studio_source_needs_character_identification"],
  });

  const isGenericAnimeGirlFiguresBucket =
    categoryText === "outros" && franchiseText === "original" && folderText === "anime girl figures";

  if (isGenericAnimeGirlFiguresBucket) {
    const genericAnimeGirlFigureTargets = new Map([
      ["anime girl figure 87157", ["anime", "dragon ball", "chichi"]],
      ["anime girl figure 87159", ["games", "the king of fighters", "whip"]],
      ["anime girl figure 87161", ["games", "overwatch", "lucio"]],
      ["black outfit anime girl figure 124814", ["anime", "dragon ball", "bulma"]],
      ["black outfit anime girl front 122455", ["marvel", "herois", "x-23"]],
      ["black outfit anime girl variant 122456", ["marvel", "herois", "x-23", ["nsfw_variant_identified"]]],
      ["blonde anime girl with cup 121793", ["anime", "dungeon-meshi", "marcille-donato"]],
      ["blonde gun girl statue alt 120377", ["marvel", "herois", "gwenpool"]],
      ["blonde gun girl statue front 120376", ["marvel", "herois", "gwenpool"]],
      ["blue haired girl with bottle 120639", ["anime", "that time i got reincarnated as a slime", "rimuru-tempest"]],
      ["blue dress catgirl statue 122350", ["outros", "vtubers", "gawr-gura"]],
      ["blue hair cyber anime girl 122369", ["outros", "musica", "ado/naima", ["music_video_character_identified"]]],
      ["blue suit anime girl figure 123941", ["anime", "cavaleiros-do-zodiaco", "geist"]],
      ["brown haired magic girl 122340", ["games", "atelier-ryza", "ryza"]],
      ["dark winged anime girl figure 123703", ["anime", "overlord", "albedo"]],
      ["fantasy anime girl figure 91791", ["filmes-series", "star-wars", "darth-talon", ["visual_identity_inferred"]]],
      ["fantasy anime girl figure 91797", ["games", "bayonetta", "bayonetta"]],
      ["fantasy anime girl figure 91793", ["anime", "no-game-no-life", "shiro"]],
      ["fantasy anime girl figure 91794", ["anime", "no-game-no-life", "shiro"]],
      ["fantasy anime girl figure 91795", ["anime", "no-game-no-life", "shiro"]],
      ["ghost companion anime girl 120714", ["games", "genshin-impact", "hu-tao"]],
      ["green jacket anime girl 122555", ["anime", "the-apothecary-diaries", "maomao"]],
      ["green raincoat anime girl 122463", ["anime", "kill-la-kill", "nonon-jakuzure"]],
      ["green bunny anime girl 120839", ["anime", "frieren", "ubel"]],
      ["kimono anime girl with umbrella 122465", ["anime", "demon-slayer", "shinobu-kocho", ["visual_identity_inferred"]]],
      ["long haired anime girl figure 91975", ["games", "guilty-gear", "baiken"]],
      ["maid anime girl model 95496", ["games", "genshin-impact", "barbara"]],
      ["maid anime girl model 95497", ["games", "genshin-impact", "barbara"]],
      ["pastel rainbow anime girl 121346", ["anime", "cardcaptor-sakura", "sakura-kinomoto"]],
      ["pink headphone anime girl 122343", ["games", "nikke", "jackal"]],
      ["pink headphone anime girl alt 122347", ["games", "nikke", "alice"]],
      ["purple dress anime girl 122639", ["anime", "machikado-mazoku", "shamiko-yuko-yoshida"]],
      ["purple haired girl standing 122645", ["anime", "frieren", "fern"]],
      ["purple hat anime girl 122461", ["anime", "machikado-mazoku", "shamiko-yuko-yoshida", ["nsfw_variant_identified"]]],
      ["purple robed anime woman figure 124548", ["anime", "frieren", "fern"]],
      ["purple twin tail anime girl one 122684", ["outros", "vtubers", "nekomata-okayu", ["visual_identity_inferred"]]],
      ["purple twin tail anime girl two 122685", ["outros", "vtubers", "nekomata-okayu", ["visual_identity_inferred"]]],
      ["purple anime girl figure 124086", ["anime", "ghost-in-the-shell", "motoko-kusanagi", ["visual_identity_inferred"]]],
      ["purple magic anime girl statue 121968", ["anime", "demon-slayer", "shinobu-kocho"]],
      ["red hair axe anime girl 122096", ["anime", "frieren", "stark"]],
      ["red hair gun anime girl 122557", ["games", "nikke", "rapi"]],
      ["red haired anime girl figure 124129", ["marvel", "herois", "viuva-negra", ["visual_identity_inferred"]]],
      ["red haired anime girl figure 124130", ["marvel", "herois", "viuva-negra", ["visual_identity_inferred"]]],
      ["school idol anime girl figure 124178", ["marvel", "viloes", "viloes-x-men/deathbird"]],
      ["red dress anime girl figure 124579", ["anime", "konosuba", "megumin"]],
      ["red outfit anime girl with cat 122267", ["games", "overwatch", "kiriko"]],
      ["sea creature anime girl 120716", ["games", "genshin-impact", "mualani"]],
      ["short haired anime girl figure 124550", ["anime", "yu-gi-oh", "yami-bakura"]],
      ["spy anime girl card 121986", ["anime", "spy x family", "sylvia-sherwood"]],
      ["utena hiragi statue 123208", ["anime", "gushing-over-magical-girls", "utena-hiiragi"]],
      ["white dress anime girl figure 91888", ["anime", "bleach", "orihime-inoue", ["nsfw_variant_identified"]]],
      ["white dress anime girl figure 91889", ["anime", "bleach", "orihime-inoue"]],
      ["white dress anime girl figure 91890", ["anime", "bleach", "orihime-inoue"]],
    ]);
    const target = genericAnimeGirlFigureTargets.get(fileText);
    if (target) {
      const [targetCategory, targetFranchise, targetFolder, targetReasons = []] = target;
      return identifiedStudioAsset(targetCategory, targetFranchise, targetFolder, targetReasons);
    }

    const genericAnimeGirlFigureReviewTargets = new Set([
      "anime girl with creatures 121228",
      "blue aura anime girl statue 121719",
      "blue white anime girl figure 92236",
      "gray anime girl model 121797",
      "pink haired anime girl figure 124113",
      "pink haired anime girl figure 124162",
      "purple haired anime girl figure 123557",
      "purple haired anime girl figure 123558",
      "red black magic girl parts 123228",
      "red black magic girl render 123227",
      "red black magic girl statue 123226",
      "white anime girl statue one 120810",
      "white anime girl statue two 120811",
    ]);
    if (genericAnimeGirlFigureReviewTargets.has(fileText)) {
      return reviewStudioAsset("anime-girl-figures", "personagem-nao-identificado");
    }
  }

  const isCurrent3dmoonnGirlBucket =
    categoryText === "outros" && franchiseText === "original" && folderText === "anime girl figures";
  const is3dmoonnSource = categoryText === "anime" && franchiseText === "3dmoon";

  if ((is3dmoonnSource && folderText === "anime girl figures") || isCurrent3dmoonnGirlBucket) {
    if (phraseMatches(fileText, "green outfit anime girl")) {
      return identifiedStudioAsset("dc", "outros", "talia al ghul");
    }
    if (phraseMatches(fileText, "purple outfit anime girl")) {
      return identifiedStudioAsset("games", "the king of fighters", "may-lee");
    }
    if (phraseMatches(fileText, "purple hair action girl")) {
      return identifiedStudioAsset("anime", "bleach", "yoruichi shihoin");
    }
  }

  if (
    (is3dmoonnSource && folderText === "red hair anime warrior") ||
    (categoryText === "outros" && franchiseText === "fantasia" && folderText === "red hair anime warrior")
  ) {
    return identifiedStudioAsset("anime", "that time i got reincarnated as a slime", "shion");
  }

  if (is3dmoonnSource) {
    return reviewStudioAsset("3dmoonn", folder);
  }

  const isEddyIceDragon =
    (categoryText === "anime" && franchiseText === "eddy workshop" && folderText === "ice dragon warrior") ||
    (categoryText === "outros" && franchiseText === "fantasia" && folderText === "ice dragon warrior");

  if (isEddyIceDragon) {
    return identifiedStudioAsset("anime", "bleach", "toshiro hitsugaya");
  }

  if (categoryText === "anime" && franchiseText === "eddy workshop") {
    return reviewStudioAsset("eddy-workshop", folder);
  }

  const isFunserviceVaporeon =
    (categoryText === "anime" && franchiseText === "funservicestl" && folderText === "chibi anime girl egg") ||
    (categoryText === "outros" && franchiseText === "original" && folderText === "chibi anime girl egg");

  if (isFunserviceVaporeon) {
    return identifiedStudioAsset("games", "pokemon", "vaporeon", ["pokemon_gijinka_fanart"]);
  }

  if (categoryText === "anime" && franchiseText === "funservicestl") {
    return reviewStudioAsset("funservicestl", folder);
  }

  const isH3llMita =
    (categoryText === "anime" &&
      franchiseText === "h3llcreator" &&
      (folderText === "schoolgirl with knife" || folderText === "mita" || folderText === "miside mita")) ||
    (categoryText === "outros" && franchiseText === "original" && folderText === "schoolgirl with knife");

  if (isH3llMita) {
    return identifiedStudioAsset("games", "miside", "mita");
  }

  if (categoryText === "anime" && franchiseText === "h3llcreator") {
    return reviewStudioAsset("h3llcreator", folder);
  }

  const isKuruSeia =
    (categoryText === "anime" &&
      franchiseText === "kurufigure" &&
      (folderText === "fox tactical girl" || folderText === "seia")) ||
    (categoryText === "outros" && franchiseText === "sci fi" && folderText === "fox tactical girl");

  if (isKuruSeia) {
    return identifiedStudioAsset("games", "blue archive", "seia");
  }

  const isKuruKlukai =
    (categoryText === "anime" &&
      franchiseText === "kurufigure" &&
      (folderText === "tactical anime girl" || folderText === "klukai")) ||
    (categoryText === "outros" && franchiseText === "sci fi" && folderText === "tactical anime girl");

  if (isKuruKlukai) {
    return identifiedStudioAsset("games", "girls-frontline-2-exilium", "klukai");
  }

  if (categoryText === "anime" && franchiseText === "kurufigure") {
    return reviewStudioAsset("kurufigure", folder);
  }

  const isLootboxFigureSet =
    (categoryText === "anime" && franchiseText === "lootbox" && folderText === "anime figure set") ||
    (categoryText === "outros" && franchiseText === "original" && folderText === "anime figure set");

  if (isLootboxFigureSet && phraseMatches(fileText, "lootbox anime figure set 21")) {
    return identifiedStudioAsset("anime", "violet evergarden", "violet-evergarden");
  }

  if (isLootboxFigureSet && phraseMatches(fileText, "lootbox anime figure set 22")) {
    return identifiedStudioAsset("games", "final-fantasy", "yuffie-kisaragi");
  }

  const isLootboxBeidou =
    (categoryText === "anime" && franchiseText === "lootbox" && folderText === "dual woman sculpt") ||
    (categoryText === "outros" && franchiseText === "original" && folderText === "dual woman sculpt");

  if (isLootboxBeidou) {
    return identifiedStudioAsset("games", "genshin-impact", "beidou", ["visual_identity_inferred"]);
  }

  if (categoryText === "anime" && franchiseText === "lootbox") {
    return reviewStudioAsset("lootbox", folder);
  }

  if (categoryText === "anime" && franchiseText === "pink studio") {
    return {
      category: "_revisar",
      franchise: "identificar",
      folder: `pink-studio/${cleanCatalogSlug(folder, "geral")}`,
      reasons: ["studio_source_needs_character_identification"],
    };
  }

  if (categoryText === "filmes series" && franchiseText === "castudio") {
    return {
      category: "outros",
      franchise: "original",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "filmes series" && franchiseText === "wicked" && folderText === "adventurer gunslinger") {
    return {
      category: "filmes-series",
      franchise: "evil-dead",
      folder: "ash-williams-e-deadite",
      reasons: ["official_character_reclassification"],
    };
  }

  if (categoryText === "games" && franchiseText === "rn estudio") {
    return {
      category: "outros",
      franchise: "tabletop",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "games" && franchiseText === "crucible of games" && folderText === "studio dr may quest kit") {
    return {
      category: "outros",
      franchise: "tabletop",
      folder: "dr-may-quest-kit",
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "acessorios" && folderText === "patreon bust pack") {
    return {
      category: "outros",
      franchise: "acessorios",
      folder: "bust-pack",
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "tabletop" && folderText === "loot studios miniatures") {
    return {
      category: "outros",
      franchise: "tabletop",
      folder: "fantasy-miniatures",
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "tabletop" && folderText === "blackmane studio") {
    return {
      category: "outros",
      franchise: "tabletop",
      folder: "space-marine",
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "tabletop" && folderText === "november patreon") {
    return {
      category: "outros",
      franchise: "tabletop",
      folder: filenameSubject(filename, ["tabletop terrain", "miniature"]),
      reasons: ["studio_source_bucket_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "promotional sheets" && folderText === "trident studio") {
    return {
      category: "_revisar",
      franchise: "promocionais",
      folder: "trident-studio",
      reasons: ["promotional_sheet_quarantine"],
    };
  }

  if (categoryText === "outros" && franchiseText === "fantasia" && folderText.startsWith("arcanum workshop")) {
    return {
      category: "_revisar",
      franchise: "promocionais",
      folder: "arcanum-workshop",
      reasons: ["promotional_sheet_quarantine"],
    };
  }

  if (categoryText === "outros" && franchiseText === "nao identificado" && folderText === "lootbox tim girl") {
    return {
      category: "games",
      franchise: "chrono-trigger",
      folder: "ayla",
      reasons: ["official_character_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "original" && folderText === "marble lootbox girl") {
    return {
      category: "games",
      franchise: "chrono-trigger",
      folder: "marle",
      reasons: ["official_character_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "original" && folderText === "turntable lootbox") {
    return {
      category: "games",
      franchise: "chrono-trigger",
      folder: "magus",
      reasons: ["official_character_reclassification"],
    };
  }

  return null;
}

function disneySubjectFolder(folder) {
  const folderText = normalizeComparable(folder);
  return DISNEY_SUBJECT_ALIASES.get(folderText) || cleanCatalogSlug(folder, "geral");
}

function disneyAnimationBucketRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  if (!["desenhos animacao", "filmes series"].includes(categoryText)) return null;

  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const filenameParts = String(filename || "").split(/[\\/]+/).filter(Boolean);
  const filenameHasNestedFolder = filenameParts.length > 1;
  const reasons = ["disney_animation_bucket"];

  if (franchiseText === "disney") {
    if (filenameHasNestedFolder) return null;
    const legacyTarget = DISNEY_LEGACY_FOLDER_TARGETS.get(folderText);
    if (!legacyTarget) return null;
    return {
      category: "desenhos-animacao",
      franchise: "disney",
      folder: legacyTarget,
      reasons,
    };
  }

  const disneyTarget = DISNEY_DIRECT_FRANCHISE_TARGETS.get(franchiseText);
  if (disneyTarget) {
    const subject = disneySubjectFolder(folder);
    return {
      category: "desenhos-animacao",
      franchise: "disney",
      folder: subject === "geral" ? disneyTarget : `${disneyTarget}/${subject}`,
      reasons,
    };
  }

  const pixarTarget = DISNEY_PIXAR_FRANCHISE_TARGETS.get(franchiseText);
  if (pixarTarget) {
    const subject = disneySubjectFolder(folder);
    const base = pixarTarget === "pixar" ? "pixar" : `pixar/${pixarTarget}`;
    return {
      category: "desenhos-animacao",
      franchise: "disney",
      folder: subject === "geral" ? base : `${base}/${subject}`,
      reasons,
    };
  }

  return null;
}

function officialFranchiseBucketRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));
  const reasons = ["official_franchise_bucket_reclassification"];

  const disneyAnimationBucket = disneyAnimationBucketRewrite({ category, franchise, folder, filename });
  if (disneyAnimationBucket) return disneyAnimationBucket;

  const hannaBarberaAnimationBucket = hannaBarberaAnimationBucketRewrite({ category, franchise, folder, filename });
  if (hannaBarberaAnimationBucket) return hannaBarberaAnimationBucket;

  const cartoonNetworkAnimationBucket = cartoonNetworkAnimationBucketRewrite({ category, franchise, folder, filename });
  if (cartoonNetworkAnimationBucket) return cartoonNetworkAnimationBucket;

  const genericAnimationBucket = genericAnimationBucketRewrite({ category, franchise, folder, filename });
  if (genericAnimationBucket) return genericAnimationBucket;

  const genericActiveRootBucket = genericActiveRootBucketRewrite({ category, franchise, folder, filename });
  if (genericActiveRootBucket) return genericActiveRootBucket;

  const nonCatalogFolderTarget = obviousNonCatalogFolderTarget({ category, franchise, folder, filename });
  if (nonCatalogFolderTarget) {
    return { ...nonCatalogFolderTarget, reasons: ["non_catalog_asset_section"] };
  }

  const misplacedAccessoryCharacter = misplacedAccessoryCharacterRewrite({ category, franchise, folder });
  if (misplacedAccessoryCharacter) return misplacedAccessoryCharacter;

  if (
    (categoryText === "filmes series" && franchiseText === "red sonja") ||
    (categoryText === "outros" && (franchiseText === "fantasia" || franchiseText === "tabletop") && folderText === "red sonja")
  ) {
    return {
      category: "outros",
      franchise: "quadrinhos",
      folder: "red-sonja",
      reasons: ["character_franchise_consolidation"],
    };
  }

  if (categoryText === "outros" && ["fantasia", "sazonal", "tematicos"].includes(franchiseText) && folderText === "krampus") {
    return {
      category: "outros",
      franchise: "terror",
      folder: "krampus",
      reasons: ["theme_bucket_consolidation"],
    };
  }

  const genericFantasyConsolidation = new Set([
    "angel warrior",
    "anubis",
    "aphrodite",
    "archer girl",
    "armored beast",
    "armored warrior",
    "beast rider",
    "black dragon",
    "dark armored warrior",
    "dark warrior",
    "dark winged woman",
    "demon girl",
    "demon woman",
    "dragon creature",
    "dragon rider",
    "fantasy warrior",
    "female warrior",
    "female warrior statue",
    "female warriors",
    "orc warrior",
  ]);
  if (categoryText === "outros" && ["nao identificado", "original", "tabletop"].includes(franchiseText) && genericFantasyConsolidation.has(folderText)) {
    return {
      category: "outros",
      franchise: "fantasia",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["generic_theme_consolidation"],
    };
  }

  const genericTerrorConsolidation = new Set(["ghost figures", "grim reaper", "vampire hunter"]);
  if (categoryText === "outros" && ["fantasia", "original", "tabletop"].includes(franchiseText) && genericTerrorConsolidation.has(folderText)) {
    return {
      category: "outros",
      franchise: "terror",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["generic_theme_consolidation"],
    };
  }

  if (categoryText === "outros" && ["fantasia", "original", "tabletop"].includes(franchiseText) && folderText === "alien creature") {
    return {
      category: "outros",
      franchise: "sci-fi",
      folder: "alien-creature",
      reasons: ["generic_theme_consolidation"],
    };
  }

  if (categoryText === "outros" && ["fantasia", "original", "tabletop"].includes(franchiseText) && folderText === "gunslinger") {
    return {
      category: "outros",
      franchise: "western",
      folder: "gunslinger",
      reasons: ["generic_theme_consolidation"],
    };
  }

  if (categoryText === "outros" && ["fantasia", "original", "tabletop"].includes(franchiseText) && folderText === "samurai warrior") {
    return {
      category: "outros",
      franchise: "historicos",
      folder: "samurai-warrior",
      reasons: ["generic_theme_consolidation"],
    };
  }

  if (categoryText === "outros" && ["original", "tabletop"].includes(franchiseText) && folderText === "female soldier") {
    return {
      category: "outros",
      franchise: "sci-fi",
      folder: "female-soldier",
      reasons: ["generic_theme_consolidation"],
    };
  }

  if (categoryText === "dc" && franchiseText === "outros" && folderText === "talia al ghul") {
    return { category: "dc", franchise: "outros", folder: "talia-al-ghul", reasons: ["ptbr_folder_alias"] };
  }

  if (categoryText === "anime" && franchiseText === "bleach" && folderText === "toshiro hitsugaya") {
    return { category: "anime", franchise: "bleach", folder: "toshiro-hitsugaya", reasons: ["ptbr_folder_alias"] };
  }

  if (
    categoryText === "anime" &&
    franchiseText === "hellsing" &&
    ["seras victoria", "seras-victoria"].includes(String(folder || "").toLowerCase())
  ) {
    return { category: "anime", franchise: "hellsing", folder: "seras-victoria", reasons: ["ptbr_folder_alias"] };
  }

  if (categoryText === "anime" && franchiseText === "bleach" && folderText === "orihime inoue") {
    return { category: "anime", franchise: "bleach", folder: "orihime-inoue", reasons: ["ptbr_folder_alias"] };
  }

  if (
    categoryText === "anime" &&
    franchiseText === "bleach" &&
    (folderText === "yoruichi" || folderText === "yoruichi shihoin" || folderText === "yoruichi shihouin")
  ) {
    return { category: "anime", franchise: "bleach", folder: "yoruichi-shihoin", reasons: ["ptbr_folder_alias"] };
  }

  if (categoryText === "anime" && franchiseText === "gate" && folderText === "rory mercury") {
    return { category: "anime", franchise: "gate", folder: "rory-mercury", reasons };
  }

  if (categoryText === "anime" && franchiseText === "vocaloid" && folderText === "hatsune miku") {
    return { category: "anime", franchise: "vocaloid", folder: "hatsune-miku", reasons };
  }

  if (categoryText === "anime" && franchiseText === "that time i got reincarnated as a slime" && folderText === "rimuru tempest") {
    return { category: "anime", franchise: "that time i got reincarnated as a slime", folder: "rimuru-tempest", reasons: ["ptbr_folder_alias"] };
  }

  if (
    categoryText === "anime" &&
    franchiseText === "alice" &&
    (folderText === "alice anime figures" || phraseMatches(fileText, "madness returns"))
  ) {
    return { category: "games", franchise: "alice madness returns", folder: "alice", reasons };
  }

  if (categoryText === "anime" && franchiseText === "winged demon") {
    return { category: "outros", franchise: "fantasia", folder: "winged-demon", reasons };
  }

  if (
    categoryText === "anime" &&
    franchiseText === "red green warrior" &&
    (phraseMatches(fileText, "guerreira verde vermelha") || phraseMatches(fileText, "red green warrior"))
  ) {
    return { category: "anime", franchise: "dragon ball", folder: "gogeta-e-janemba", reasons };
  }

  if (categoryText === "anime" && franchiseText === "cyberpunk edgerunners" && folderText === "nao identificado") {
    return { category: "anime", franchise: "cyberpunk-edgerunners", folder: "lucy-kushinada", reasons };
  }

  if (categoryText === "anime" && franchiseText === "spy x family" && folderText === "yor forger") {
    return { category: "anime", franchise: "spy x family", folder: "yor-forger", reasons };
  }

  if (categoryText === "anime" && franchiseText === "hammer warrior") {
    return { category: "marvel", franchise: "herois", folder: "thor/throg", reasons };
  }

  if (categoryText === "marvel" && franchiseText === "herois" && folderText === "throg") {
    return { category: "marvel", franchise: "herois", folder: "thor/throg", reasons };
  }

  if (categoryText === "marvel" && franchiseText === "herois" && folderText === "beta ray bill") {
    return { category: "marvel", franchise: "herois", folder: "thor/bill-raio-beta", reasons };
  }

  if (categoryText === "anime" && franchiseText === "hololive") {
    const hololiveFolders = new Map([
      ["chloe sakamata", "chloe-sakamata"],
      ["gawr gura", "gawr-gura"],
      ["ina ninomae", "ninomae-inanis"],
      ["la plus darknesss", "laplus-darknesss"],
      ["ninomae inanis", "ninomae-inanis"],
      ["usada pekora", "usada-pekora"],
    ]);
    return {
      category: "outros",
      franchise: "vtubers",
      folder: hololiveFolders.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  if (categoryText === "games" && ["warhammer 40000", "warhammer 40k"].includes(franchiseText)) {
    return { category: "games", franchise: "warhammer-40k", folder: cleanCatalogSlug(folder, "geral"), reasons };
  }

  if (categoryText === "outros" && ["tabletop", "sci fi"].includes(franchiseText)) {
    const warhammer40kFolders = new Map([
      ["adepta sororitas", "adepta-sororitas"],
      ["adeptus mechanicus", "adeptus-mechanicus"],
      ["ork biker", "ork-biker"],
      ["ork mech", "ork-mech"],
      ["space marine", "space-marine"],
      ["space marine bust", "space-marine-bust"],
      ["space marine helmet", "space-marine-helmet"],
      ["space marine squad", "space-marine-squad"],
      ["warhammer miniatures", "miniaturas"],
    ]);
    const warhammerFolder = warhammer40kFolders.get(folderText);
    if (warhammerFolder) {
      return { category: "games", franchise: "warhammer-40k", folder: warhammerFolder, reasons };
    }
    if (folderText === "dreadnought" && hasAnyPhrase([fileText], ["warhammer", "space marine"])) {
      return { category: "games", franchise: "warhammer-40k", folder: "dreadnought", reasons };
    }
  }

  if (categoryText === "games" && ["sonic", "sonic the hedgehog"].includes(franchiseText)) {
    const sonicFolders = new Map([
      ["dr eggman", "dr-eggman"],
      ["knuckles", "knuckles-the-echidna"],
      ["knuckles figure", "knuckles-the-echidna"],
      ["miles tails prower", "miles-tails-prower"],
      ["rouge", "rouge-the-bat"],
      ["rouge the bat", "rouge-the-bat"],
      ["shadow", "shadow-the-hedgehog"],
      ["shadow chibi", "shadow-the-hedgehog"],
      ["sonic figure", "sonic"],
      ["sonic the hedgehog", "sonic"],
      ["tails", "miles-tails-prower"],
    ]);
    return {
      category: "games",
      franchise: "sonic",
      folder: sonicFolders.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  if (
    categoryText === "games" &&
    [
      "dissidia final fantasy",
      "final fantasy",
      "final fantasy dragoon",
      "final fantasy ix",
      "final fantasy tactics",
      "final fantasy vii",
      "final fantasy viii",
      "final fantasy x",
      "final fantasy x 2",
      "final fantasy xiii",
      "final fantasy xiv",
      "final fantasy xv",
      "final fantasy xvi",
      "final fantasy yuffie",
    ].includes(franchiseText)
  ) {
    const finalFantasyFolders = new Map([
      ["aerith gainsborough", "aerith-gainsborough"],
      ["agrias oaks", "agrias-oaks"],
      ["alisaie leveilleur", "alisaie-leveilleur"],
      ["cindy aurum", "cindy-aurum"],
      ["clive rosfield", "clive-rosfield"],
      ["cloud strife", "cloud-strife"],
      ["final fantasy", "dragoon"],
      ["final fantasy vii figures", "figures"],
      ["rinoa heartilly", "rinoa-heartilly"],
      ["squall leonhart", "squall-leonhart"],
      ["tifa lockhart", "tifa-lockhart"],
      ["vivi ornitier", "vivi-ornitier"],
      ["yuffie", "yuffie-kisaragi"],
      ["yuffie kisaragi", "yuffie-kisaragi"],
    ]);
    return {
      category: "games",
      franchise: "final-fantasy",
      folder: finalFantasyFolders.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (["disney lilo and stitch", "lilo and stitch", "lilo e stitch", "lilo stitch"].includes(franchiseText) ||
      (franchiseText === "disney" && folderText === "stitch"))
  ) {
    return { category: "desenhos-animacao", franchise: "lilo-e-stitch", folder: "stitch", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (["disney ariel", "the little mermaid"].includes(franchiseText) ||
      (franchiseText === "disney" && folderText === "ariel"))
  ) {
    return { category: "desenhos-animacao", franchise: "a-pequena-sereia", folder: "ariel", reasons };
  }

  if (
    ["desenhos animacao", "filmes series", "outros"].includes(categoryText) &&
    (["aladdin", "disney aladdin"].includes(franchiseText) ||
      (["disney", "disney princess"].includes(franchiseText) && ["jasmine", "princess jasmine"].includes(folderText)) ||
      (franchiseText === "fantasia" && folderText === "aladdin"))
  ) {
    const subjectText = `${folderText} ${fileText}`;
    let subject = cleanCatalogSlug(folder, "aladdin");
    if (phraseMatches(subjectText, "jafar e iago")) subject = "jafar-e-iago";
    else if (phraseMatches(subjectText, "jafar")) subject = "jafar";
    else if (phraseMatches(subjectText, "jasmine")) subject = "jasmine";
    else if (phraseMatches(subjectText, "genie") || phraseMatches(subjectText, "genio")) subject = "genio";
    else if (phraseMatches(subjectText, "prince ali") || phraseMatches(subjectText, "aladdin")) subject = "aladdin";
    return { category: "desenhos-animacao", franchise: "aladdin", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ((["darkwing duck", "darkwing duck figure"].includes(franchiseText) ||
      (franchiseText === "darkwing duck" && ["darkwing duck", "darkwing duck figure", "geral"].includes(folderText))) ||
      (franchiseText === "disney" && folderText === "darkwing duck"))
  ) {
    return { category: "desenhos-animacao", franchise: "darkwing-duck", folder: "darkwing-duck", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ((["johnny bravo", "johnny bravo figure"].includes(franchiseText) ||
      (franchiseText === "johnny bravo" && ["johnny bravo", "geral"].includes(folderText))) ||
      (franchiseText === "cartoon network" && folderText === "johnny bravo"))
  ) {
    return { category: "desenhos-animacao", franchise: "johnny-bravo", folder: "johnny-bravo", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ((["space ghost"].includes(franchiseText) && ["space ghost", "geral"].includes(folderText)) ||
      (["hanna barbera", "hanna-barbera"].includes(franchiseText) && folderText === "space ghost"))
  ) {
    return { category: "desenhos-animacao", franchise: "space-ghost", folder: "space-ghost", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (franchiseText === "garfield odie group" || franchiseText === "garfield")
  ) {
    const subjectText = `${franchiseText} ${folderText} ${fileText}`;
    const subject = phraseMatches(subjectText, "odie") ? "garfield-e-odie" : "garfield";
    if (["garfield odie group", "garfield"].includes(franchiseText) && ["garfield", "geral"].includes(folderText)) {
      return { category: "desenhos-animacao", franchise: "garfield", folder: subject, reasons };
    }
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "candyman" && ["candyman", "geral"].includes(folderText)) ||
      (franchiseText === "terror" && folderText === "candyman"))
  ) {
    return { category: "filmes-series", franchise: "candyman", folder: "candyman", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((["army of darkness", "evil dead"].includes(franchiseText) && ["ash williams", "ash-williams"].includes(folderText)) ||
      (franchiseText === "terror" && folderText === "ash williams"))
  ) {
    return { category: "filmes-series", franchise: "evil-dead", folder: "ash-williams", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((["a nightmare on elm street", "nightmare on elm street"].includes(franchiseText) &&
      ["freddy krueger", "freddy-krueger"].includes(folderText)) ||
      (franchiseText === "terror" && folderText === "freddy krueger"))
  ) {
    return { category: "filmes-series", franchise: "a-hora-do-pesadelo", folder: "freddy-krueger", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "friday the 13th" && ["jason voorhees", "jason-voorhees"].includes(folderText)) ||
      (franchiseText === "terror" && folderText === "jason voorhees"))
  ) {
    return { category: "filmes-series", franchise: "sexta-feira-13", folder: "jason-voorhees", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "halloween" && ["michael myers", "michael-myers"].includes(folderText)) ||
      (franchiseText === "terror" && folderText === "michael myers"))
  ) {
    return { category: "filmes-series", franchise: "halloween", folder: "michael-myers", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "it" && folderText === "pennywise") || (franchiseText === "terror" && folderText === "pennywise"))
  ) {
    return { category: "filmes-series", franchise: "it-a-coisa", folder: "pennywise", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "hellraiser" && folderText === "pinhead") || (franchiseText === "terror" && folderText === "pinhead"))
  ) {
    return { category: "filmes-series", franchise: "hellraiser", folder: "pinhead", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "scream" && folderText === "ghostface") ||
      (["terror", "acessorios"].includes(franchiseText) && folderText === "ghostface"))
  ) {
    return { category: "filmes-series", franchise: "panico", folder: "ghostface", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "frankenstein" &&
      ["frankenstein", "frankenstein bust", "frankenstein monster", "frankenstein-monster", "geral"].includes(folderText)) ||
      (franchiseText === "universal monsters" &&
        ["frankenstein", "frankenstein monster", "frankenstein-monster"].includes(folderText)) ||
      (franchiseText === "terror" && ["frankenstein", "frankenstein monster"].includes(folderText)))
  ) {
    return { category: "filmes-series", franchise: "frankenstein", folder: "monstro-de-frankenstein", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((["a noiva de frankenstein", "bride of frankenstein"].includes(franchiseText) &&
      ["bride and monster", "bride of frankenstein", "geral", "noiva de frankenstein", "noiva e monstro"].includes(
        folderText
      )) ||
      (franchiseText === "universal monsters" && folderText === "bride of frankenstein"))
  ) {
    const subject =
      phraseMatches(folderText, "bride and monster") || phraseMatches(folderText, "noiva e monstro")
        ? "noiva-e-monstro"
        : "noiva-de-frankenstein";
    return { category: "filmes-series", franchise: "frankenstein", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "outros"].includes(categoryText) &&
    (franchiseText === "asterix" || (franchiseText === "quadrinhos" && folderText === "asterix"))
  ) {
    return { category: "desenhos-animacao", franchise: "asterix", folder: "asterix", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (franchiseText === "beauty and the beast" || (franchiseText === "disney" && folderText === "beauty and the beast"))
  ) {
    const subjectText = `${folderText} ${fileText}`;
    let subject = "cenas-dioramas";
    if (phraseMatches(subjectText, "lumiere") || phraseMatches(subjectText, "cogsworth")) {
      subject = "lumiere-e-horloge";
    } else if (
      (phraseMatches(subjectText, "belle") || phraseMatches(subjectText, "bela")) &&
      (phraseMatches(subjectText, "beast") || phraseMatches(subjectText, "fera"))
    ) {
      subject = "bela-e-fera";
    } else if (phraseMatches(subjectText, "belle") || phraseMatches(subjectText, "bela")) {
      subject = "bela";
    } else if (phraseMatches(subjectText, "beast") || phraseMatches(subjectText, "fera")) {
      subject = "fera";
    }
    return { category: "desenhos-animacao", franchise: "a-bela-e-a-fera", folder: subject, reasons };
  }

  if (["anime", "desenhos animacao", "filmes series"].includes(categoryText) && franchiseText === "big hero 6") {
    const subjectText = `${folderText} ${fileText}`;
    const subject = phraseMatches(subjectText, "baymax") ? "baymax" : cleanCatalogSlug(folder, "geral");
    return { category: "desenhos-animacao", franchise: "operacao-big-hero", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ["frozen", "disney frozen"].includes(franchiseText) &&
    folderText === "elsa"
  ) {
    return { category: "desenhos-animacao", franchise: "frozen", folder: "elsa", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ((franchiseText === "looney tunes" && folderText === "bugs bunny") ||
      (franchiseText === "space jam" && folderText === "bugs bunny") ||
      (franchiseText === "bugs bunny" && (folderText === "easter bunny" || phraseMatches(fileText, "bugs bunny"))))
  ) {
    const subjectText = `${folderText} ${fileText}`;
    const subject = phraseMatches(subjectText, "lola") || phraseMatches(subjectText, "easter bunny")
      ? "pernalonga-e-lola-bunny"
      : "pernalonga";
    return { category: "desenhos-animacao", franchise: "looney-tunes", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ["looney tunes", "looney tunes group"].includes(franchiseText)
  ) {
    const subjectText = `${folderText} ${fileText}`;
    let subject = cleanCatalogSlug(folder, "grupo");
    if (phraseMatches(subjectText, "sylvester and tweety") || phraseMatches(subjectText, "piu piu e frajola")) {
      subject = "piu-piu-e-frajola";
    } else if (phraseMatches(subjectText, "daffy duck")) {
      subject = "patolino";
    } else if (phraseMatches(subjectText, "foghorn leghorn")) {
      subject = "frangolino";
    } else if (phraseMatches(subjectText, "granny")) {
      subject = "vovo";
    } else if (phraseMatches(subjectText, "lola bunny")) {
      subject = "lola-bunny";
    } else if (phraseMatches(subjectText, "rock band")) {
      subject = "grupo-rock-band";
    } else if (phraseMatches(subjectText, "wile e coyote road runner")) {
      subject = "coiote-e-papa-leguas";
    } else if (phraseMatches(subjectText, "road runner")) {
      subject = "papa-leguas";
    } else if (phraseMatches(subjectText, "marvin martian") || phraseMatches(subjectText, "marvin the martian")) {
      subject = "marvin-o-marciano";
    } else if (phraseMatches(subjectText, "michigan j frog")) {
      subject = "michigan-j-frog";
    } else if (phraseMatches(subjectText, "pepe le pew")) {
      subject = "pepe-le-gamba";
    } else if (phraseMatches(subjectText, "speedy gonzales")) {
      subject = "ligeirinho";
    } else if (phraseMatches(subjectText, "sylvester")) {
      subject = "frajola";
    } else if (phraseMatches(subjectText, "tasmanian devil") || phraseMatches(subjectText, "taz")) {
      subject = "taz";
    } else if (phraseMatches(subjectText, "wile e coyote") || phraseMatches(subjectText, "wyle e coyote")) {
      subject = "coiote";
    } else if (phraseMatches(subjectText, "looney tunes")) {
      subject = "grupo";
    }
    return { category: "desenhos-animacao", franchise: "looney-tunes", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (franchiseText === "toy story" ||
      (["pixar", "disney pixar"].includes(franchiseText) && folderText === "buzz lightyear"))
  ) {
    return { category: "desenhos-animacao", franchise: "toy-story", folder: "buzz-lightyear", reasons };
  }

  if (
    ["desenhos animacao", "filmes series", "outros"].includes(categoryText) &&
    (["alice in wonderland", "disney alice in wonderland"].includes(franchiseText) ||
      (franchiseText === "disney" && folderText === "alice in wonderland") ||
      (["literatura", "fantasia"].includes(franchiseText) && folderText === "alice in wonderland") ||
      (franchiseText === "fantasia" && folderText === "alice" && phraseMatches(fileText, "alice in wonderland")))
  ) {
    const subjectText = `${folderText} ${fileText}`;
    let subject = "cenas-dioramas";
    if (phraseMatches(subjectText, "cheshire cat")) subject = "gato-de-cheshire";
    else if (phraseMatches(subjectText, "white rabbit")) subject = "coelho-branco";
    else if (phraseMatches(subjectText, "mad hatter")) subject = "chapeleiro-maluco";
    else if (folderText === "alice" || phraseMatches(fileText, "alice in wonderland alice")) subject = "alice";
    return { category: "desenhos-animacao", franchise: "alice-no-pais-das-maravilhas", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    ((["os incriveis", "the incredibles"].includes(franchiseText) && folderText === "elastigirl") ||
      franchiseText === "the incredibles elastigirl" ||
      (franchiseText === "pixar" && folderText === "elastigirl"))
  ) {
    return { category: "desenhos-animacao", franchise: "os-incriveis", folder: "mulher-elastica", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (franchiseText === "gargoyles" || (franchiseText === "disney" && folderText === "goliath"))
  ) {
    return { category: "desenhos-animacao", franchise: "gargulas", folder: "goliath", reasons };
  }

  if (
    ["desenhos animacao", "filmes series", "games", "outros"].includes(categoryText) &&
    (franchiseText === "transformers" ||
      (franchiseText === "sci fi" && folderText === "transformers") ||
      (franchiseText === "sci fi" && folderText === "megatron"))
  ) {
    const subjectText = `${folderText} ${fileText}`;
    const subjectAliases = [
      ["optimus prime", "optimus-prime"],
      ["bumblebee", "bumblebee"],
      ["megatron", "megatron"],
      ["grimlock", "grimlock"],
      ["soundwave", "soundwave"],
      ["decepticon", "decepticons"],
      ["seeker", "seekers"],
    ];
    const subject = subjectAliases.find(([alias]) => phraseMatches(subjectText, alias))?.[1] || cleanCatalogSlug(folder, "geral");
    return { category: "desenhos-animacao", franchise: "transformers", folder: subject, reasons };
  }

  if (
    ["desenhos animacao", "filmes series", "outros"].includes(categoryText) &&
    (["the grinch", "how the grinch stole christmas"].includes(franchiseText) ||
      (["decoracao", "sazonal"].includes(franchiseText) && folderText === "grinch"))
  ) {
    return { category: "desenhos-animacao", franchise: "o-grinch", folder: "grinch", reasons };
  }

  if (
    categoryText === "desenhos animacao" &&
    ((franchiseText === "sininho" && (!folderText || folderText === "sininho")) ||
      (franchiseText === "disney" && folderText === "sininho"))
  ) {
    return { category: "desenhos-animacao", franchise: "peter-pan", folder: "sininho", reasons };
  }

  if (
    ["desenhos animacao", "filmes series"].includes(categoryText) &&
    (franchiseText === "disney fairies" ||
      (["disney peter pan", "peter pan"].includes(franchiseText) && folderText === "tinker bell") ||
      (franchiseText === "disney" && folderText === "tinker bell"))
  ) {
    if (franchiseText === "disney peter pan" && fileText === "tinker bell 1") {
      return { category: "desenhos-animacao", franchise: "peter-pan", folder: "sininho-com-cajado", reasons };
    }
    return { category: "desenhos-animacao", franchise: "peter-pan", folder: "sininho", reasons };
  }

  if (
    ["desenhos animacao", "filmes series", "games"].includes(categoryText) &&
    (["masters of the universe he man", "he man"].includes(franchiseText) ||
      (franchiseText === "masters of the universe" && folderText === "he man"))
  ) {
    const subject = phraseMatches(fileText, "skeletor") ? "esqueleto" : "he-man";
    return { category: "desenhos-animacao", franchise: "masters-of-the-universe", folder: subject, reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    (franchiseText === "dracula" || (franchiseText === "terror" && folderText === "dracula"))
  ) {
    return { category: "filmes-series", franchise: "dracula", folder: "dracula", reasons };
  }

  if (
    ["games", "outros"].includes(categoryText) &&
    (franchiseText === "gundam" || (franchiseText === "sci fi" && folderText === "gundam"))
  ) {
    return { category: "anime", franchise: "gundam", folder: cleanCatalogSlug(folder, "gundam"), reasons };
  }

  if (
    categoryText === "games" &&
    (franchiseText === "cyberpunk edgerunners" ||
      (franchiseText === "cyberpunk" &&
        ["david lucy", "lucy", "lucy kushinada", "rebecca", "unknown edgerunner"].includes(folderText)))
  ) {
    const folderBySubject = new Map([
      ["david lucy", "david-e-lucy"],
      ["lucy", "lucy-kushinada"],
      ["lucy kushinada", "lucy-kushinada"],
      ["rebecca", "rebecca"],
      ["unknown edgerunner", "nao-identificado"],
    ]);
    return {
      category: "anime",
      franchise: "cyberpunk-edgerunners",
      folder: folderBySubject.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  if (
    categoryText === "games" &&
    ["the legend of zelda link", "the legend of zelda", "zelda"].includes(franchiseText)
  ) {
    const zeldaLinkFolders = [
      "link",
      "link and epona",
      "link breath of the wild",
      "link chickens",
      "link horse",
      "wind waker link",
    ];
    const zeldaPrincessFolders = ["princesa zelda", "princess zelda", "zelda", "zelda figures", "zelda warrior"];
    const canonicalFolder = zeldaLinkFolders.includes(folderText)
      || (folderText === "zelda" && phraseMatches(fileText, "link"))
      ? "link"
      : zeldaPrincessFolders.includes(folderText)
        ? "princesa-zelda"
        : cleanCatalogSlug(folder, "geral");

    return { category: "games", franchise: "the-legend-of-zelda", folder: canonicalFolder, reasons };
  }

  if (
    categoryText === "games" &&
    ["final fantasy x", "final fantasy"].includes(franchiseText) &&
    folderText === "lulu"
  ) {
    return { category: "games", franchise: "final-fantasy-x", folder: "lulu", reasons };
  }

  if (
    categoryText === "games" &&
    ["baldur s gate 3", "baldurs gate 3"].includes(franchiseText) &&
    ["karlach", "mind flayer", "owlbear cub"].includes(folderText)
  ) {
    const folderBySubject = new Map([
      ["karlach", "karlach"],
      ["mind flayer", "mind-flayer"],
      ["owlbear cub", "owlbear-cub"],
    ]);

    return {
      category: "games",
      franchise: "baldurs-gate-3",
      folder: folderBySubject.get(folderText),
      reasons,
    };
  }

  if (
    categoryText === "games" &&
    ["baldur s gate", "baldurs gate"].includes(franchiseText) &&
    folderText === "astarion"
  ) {
    return { category: "games", franchise: "baldurs-gate-3", folder: "astarion", reasons };
  }

  if (
    categoryText === "games" &&
    ["baldur s gate", "baldurs gate"].includes(franchiseText) &&
    ["karlach", "mind flayer", "owlbear cub"].includes(folderText)
  ) {
    const folderBySubject = new Map([
      ["karlach", "karlach"],
      ["mind flayer", "mind-flayer"],
      ["owlbear cub", "owlbear-cub"],
    ]);

    return {
      category: "games",
      franchise: ["karlach", "owlbear cub"].includes(folderText) ? "baldurs-gate-3" : "baldurs-gate",
      folder: folderBySubject.get(folderText),
      reasons,
    };
  }

  if (categoryText === "games" && franchiseText === "darkstalkers morrigan" && folderText === "morrigan") {
    return { category: "games", franchise: "darkstalkers", folder: "morrigan", reasons };
  }

  if (categoryText === "games" && franchiseText === "dragon age" && folderText === "morrigan") {
    return { category: "games", franchise: "dragon-age", folder: "morrigan", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    ((franchiseText === "guardians of the galaxy" && folderText === "groot") ||
      (franchiseText === "quadrinhos" && folderText === "groot"))
  ) {
    return { category: "marvel", franchise: "herois", folder: "groot", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    (franchiseText === "batman" || (franchiseText === "quadrinhos" && folderText === "batman"))
  ) {
    return { category: "dc", franchise: "herois", folder: "batman", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    (franchiseText === "bruce lee" ||
      (["artes marciais", "martial arts", "the way of the dragon"].includes(franchiseText) && folderText === "bruce lee"))
  ) {
    return { category: "filmes-series", franchise: "bruce-lee", folder: "bruce-lee", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    (["conan", "conan the barbarian"].includes(franchiseText) ||
      (["fantasia", "quadrinhos", "tabletop"].includes(franchiseText) && folderText === "conan"))
  ) {
    return { category: "filmes-series", franchise: "conan-o-barbaro", folder: "conan", reasons };
  }

  if (
    ["filmes series", "outros"].includes(categoryText) &&
    (["brinquedo assassino", "child s play", "childs play", "chucky"].includes(franchiseText) ||
      (franchiseText === "terror" && folderText === "chucky"))
  ) {
    const folderAliases = new Map([
      ["chucky", "chucky"],
      ["chucky figure", "chucky"],
      ["tiffany valentine", "tiffany-valentine"],
    ]);
    return {
      category: "filmes-series",
      franchise: "brinquedo-assassino",
      folder: folderAliases.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  if (
    ["desenhos animacao", "filmes series", "games", "outros"].includes(categoryText) &&
    (["g i joe", "gi joe"].includes(franchiseText) || (franchiseText === "acessorios" && folderText === "cobra commander"))
  ) {
    const folderAliases = new Map([
      ["baroness", "baronesa"],
      ["cobra commander", "comandante-cobra"],
    ]);
    return {
      category: "desenhos-animacao",
      franchise: "g-i-joe",
      folder: folderAliases.get(folderText) || cleanCatalogSlug(folder, "geral"),
      reasons,
    };
  }

  return null;
}

function watermarkedAssetQuarantineRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));

  if (
    categoryText === "games" &&
    franchiseText === "tron female figure" &&
    folderText === "tron" &&
    (phraseMatches(fileText, "tron mulher azul preta") || phraseMatches(fileText, "tron"))
  ) {
    return {
      category: "_revisar",
      franchise: "marca-dagua",
      folder: "tron-quorra",
      reasons: ["watermark_quarantine"],
    };
  }

  return null;
}

export function catalogReviewRestoreRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));

  if (categoryText !== "revisar") return null;

  if (franchiseText === "sci fi") {
    return {
      category: "_revisar",
      franchise: "sci-fi",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["review_bucket_alias"],
    };
  }

  if (franchiseText === "c27 collectibles") {
    const c27ProxyTargets = new Map([
      [
        "lady hiss",
        { category: "marvel", franchise: "viloes", folder: "viper", reasons: ["modeler_proxy_character_restore"] },
      ],
      [
        "sorbo",
        { category: "marvel", franchise: "herois", folder: "hercules", reasons: ["modeler_proxy_character_restore"] },
      ],
      [
        "earthquake",
        { category: "_revisar", franchise: "identificar", folder: "earthquake-tectonic-terror", reasons: ["review_studio_bucket_cleanup"] },
      ],
      [
        "en garde",
        { category: "_revisar", franchise: "identificar", folder: "en-garde-asgard", reasons: ["review_studio_bucket_cleanup"] },
      ],
      [
        "jungle boogie",
        { category: "_revisar", franchise: "identificar", folder: "jungle-boogie", reasons: ["review_studio_bucket_cleanup"] },
      ],
      [
        "winged female warrior",
        { category: "_revisar", franchise: "identificar", folder: "winged-female-warrior", reasons: ["review_studio_bucket_cleanup"] },
      ],
    ]);
    const target = c27ProxyTargets.get(folderText);
    if (target) return target;
  }

  if (["pnx studio", "pink studio", "ca3d studios"].includes(franchiseText)) {
    return {
      category: "_revisar",
      franchise: "identificar",
      folder: cleanCatalogSlug(folder, "personagem-nao-identificado"),
      reasons: ["review_studio_bucket_cleanup"],
    };
  }

  if (franchiseText === "anime" && folderText === "purple hair pin studio") {
    return {
      category: "_revisar",
      franchise: "identificar",
      folder: "purple-hair-pinup",
      reasons: ["review_studio_bucket_cleanup"],
    };
  }

  const remainingReviewStudioTargets = new Map([
    [
      "identificar|collage multiverse studio",
      { category: "_revisar", franchise: "identificar", folder: "collage-multiverse-characters" },
    ],
    [
      "identificar|patreon vip logo",
      { category: "_revisar", franchise: "promocionais", folder: "vip-logo" },
    ],
    [
      "promocionais|trident studio",
      { category: "_revisar", franchise: "promocionais", folder: "trident-new-models-april-2025" },
    ],
    [
      "unknown|patreon character group",
      { category: "_revisar", franchise: "identificar", folder: "character-group" },
    ],
  ]);
  const remainingReviewStudioTarget = remainingReviewStudioTargets.get(`${franchiseText}|${folderText}`);
  if (remainingReviewStudioTarget) {
    return { ...remainingReviewStudioTarget, reasons: ["review_studio_bucket_cleanup"] };
  }

  if (franchiseText === "conteudo sensivel") {
    const sensitiveFileTargets = new Map([
      [
        "personagem azul pinup|personagem azul pinup 66026",
        {
          category: "games",
          franchise: "metroid",
          folder: "samus-aran/nsfw",
          reasons: ["sensitive_known_character_restore"],
        },
      ],
      [
        "personagem azul pinup|personagem azul pinup 66028",
        {
          category: "outros",
          franchise: "fantasia",
          folder: "personagem-azul-fantasia/nsfw",
          reasons: ["sensitive_generic_character_restore"],
        },
      ],
    ]);
    const sensitiveNonCatalogTargets = new Map([
      ["adult figure parts", { franchise: "acessorios", folder: "adult-figure-parts" }],
      ["chair display statue", { franchise: "decoracao", folder: "chair-display-statue" }],
      ["corpo masculino", { franchise: "acessorios", folder: "corpo-masculino" }],
      ["estudo anatomico feminino", { franchise: "acessorios", folder: "estudo-anatomico-feminino" }],
      ["female anatomy", { franchise: "acessorios", folder: "female-anatomy" }],
      ["female body clay", { franchise: "acessorios", folder: "female-body-clay" }],
      ["female body kit", { franchise: "acessorios", folder: "female-body-kit" }],
      ["novelty bathroom figures", { franchise: "decoracao", folder: "novelty-bathroom-figures" }],
      ["pecas bruxa", { franchise: "acessorios", folder: "pecas-bruxa" }],
      ["pecas personagem feminina", { franchise: "acessorios", folder: "pecas-personagem-feminina" }],
      ["planta cannabis cartoon", { franchise: "decoracao", folder: "planta-cannabis-cartoon" }],
    ]);
    const sensitiveGenericTargets = new Map([
      ["alexisara possession", { category: "outros", franchise: "fantasia", folder: "alexisara-possession/nsfw" }],
      ["angie demon woman", { category: "outros", franchise: "fantasia", folder: "angie-demon-woman/nsfw" }],
      ["anime warrior woman", { category: "outros", franchise: "fantasia", folder: "anime-warrior-woman/nsfw" }],
      ["anime woman", { category: "outros", franchise: "fantasia", folder: "anime-woman-parasol/nsfw" }],
      ["armored spear woman", { category: "outros", franchise: "fantasia", folder: "guerreira-lanca/nsfw" }],
      ["aviator pinup", { category: "outros", franchise: "original", folder: "aviadora/nsfw" }],
      ["beach girl incerto", { category: "outros", franchise: "original", folder: "beach-girl/nsfw" }],
      ["beer girl seated", { category: "outros", franchise: "original", folder: "beer-girl/nsfw" }],
      ["blonde bikini pinup", { category: "outros", franchise: "original", folder: "blonde-bikini-pinup/nsfw" }],
      ["blonde captive pinup", { category: "outros", franchise: "original", folder: "blonde-captive-pinup/nsfw" }],
      ["blonde kneeling woman", { category: "outros", franchise: "original", folder: "blonde-kneeling-woman/nsfw" }],
      ["blonde slime woman", { category: "outros", franchise: "fantasia", folder: "blonde-slime-woman/nsfw" }],
      ["blue seated woman", { category: "outros", franchise: "original", folder: "blue-seated-woman/nsfw" }],
      ["blue hair warrior woman", { category: "outros", franchise: "fantasia", folder: "guerreira-cabelo-azul/nsfw" }],
      ["casino bunny irene", { category: "outros", franchise: "original", folder: "casino-bunny-irene/nsfw" }],
      ["catgirl bust incerto", { category: "outros", franchise: "original", folder: "catgirl-bust/nsfw" }],
      ["cena feminina", { category: "outros", franchise: "original", folder: "cena-feminina/nsfw" }],
      ["cheerbunny alex adult pinup", { category: "outros", franchise: "original", folder: "cheerbunny-alex/nsfw" }],
      ["demon throne scene", { category: "outros", franchise: "fantasia", folder: "demon-throne-scene/nsfw" }],
      ["demon woman statue", { category: "outros", franchise: "fantasia", folder: "demon-woman/nsfw" }],
      ["demon women couch", { category: "outros", franchise: "fantasia", folder: "demon-women-couch/nsfw" }],
      ["demonio feminino", { category: "outros", franchise: "fantasia", folder: "demonio-feminino/nsfw" }],
      ["diorama musical feminino", { category: "outros", franchise: "arte", folder: "diorama-musical-feminino/nsfw" }],
      ["egyptian female miniature", { category: "outros", franchise: "fantasia", folder: "egipcia/nsfw" }],
      ["egyptian priestess", { category: "outros", franchise: "fantasia", folder: "sacerdotisa-egipcia/nsfw" }],
      ["egyptian staff woman", { category: "outros", franchise: "fantasia", folder: "egipcia-cajado/nsfw" }],
      ["elis dune hunter", { category: "outros", franchise: "sci-fi", folder: "elis-dune-hunter/nsfw" }],
      ["esmonster blue pinup", { category: "outros", franchise: "original", folder: "esmonster-blue-pinup/nsfw" }],
      ["evening boudoir", { category: "outros", franchise: "original", folder: "evening-boudoir/nsfw" }],
      ["fada pinup", { category: "outros", franchise: "fantasia", folder: "fada/nsfw" }],
      ["fantasy throne woman", { category: "outros", franchise: "fantasia", folder: "mulher-trono/nsfw" }],
      ["female nude statue", { category: "outros", franchise: "arte", folder: "estatua-feminina/nsfw" }],
      ["female rifle miniature", { category: "outros", franchise: "sci-fi", folder: "atiradora/nsfw" }],
      ["female spear miniature", { category: "outros", franchise: "fantasia", folder: "guerreira-lanca/nsfw" }],
      ["female table statue", { category: "outros", franchise: "arte", folder: "estatua-feminina-mesa/nsfw" }],
      ["female warrior tentacle base", { category: "outros", franchise: "fantasia", folder: "guerreira-tentaculos/nsfw" }],
      ["fox woman pinup", { category: "outros", franchise: "fantasia", folder: "mulher-raposa/nsfw" }],
      ["gamer pinup", { category: "outros", franchise: "original", folder: "gamer-girl/nsfw" }],
      ["generalbuta fantasy pinup", { category: "outros", franchise: "fantasia", folder: "generalbuta-fantasy-pinup/nsfw" }],
      ["gold armor bust", { category: "outros", franchise: "fantasia", folder: "busto-guerreira-armadura-dourada/nsfw" }],
      ["greek warrior woman", { category: "outros", franchise: "fantasia", folder: "guerreira-grega/nsfw" }],
      ["guerreira fantasia", { category: "outros", franchise: "fantasia", folder: "guerreira/nsfw" }],
      ["hanging female figure", { category: "outros", franchise: "original", folder: "hanging-female-figure/nsfw" }],
      ["harpia feminina", { category: "outros", franchise: "fantasia", folder: "harpia/nsfw" }],
      ["infested imagination naga pinup", { category: "outros", franchise: "fantasia", folder: "naga-pinup/nsfw" }],
      ["jade bunny girl", { category: "outros", franchise: "original", folder: "jade-bunny/nsfw" }],
      ["jigglystix fantasy pinup", { category: "outros", franchise: "fantasia", folder: "jigglystix-fantasy-pinup/nsfw" }],
      ["kuton egyptian queen", { category: "outros", franchise: "fantasia", folder: "rainha-egipcia-kuton/nsfw" }],
      ["love bed miniq", { category: "outros", franchise: "original", folder: "love-bed-miniq/nsfw" }],
      ["mulher motociclista", { category: "outros", franchise: "original", folder: "mulher-motociclista/nsfw" }],
      ["nude back incerto", { category: "outros", franchise: "arte", folder: "estudo-feminino-costas/nsfw" }],
      ["nude fantasy queen", { category: "outros", franchise: "fantasia", folder: "rainha-fantasia/nsfw" }],
      ["nude female gun pose", { category: "outros", franchise: "original", folder: "mulher-com-arma/nsfw" }],
      ["nude woman red hat", { category: "outros", franchise: "original", folder: "mulher-chapeu-vermelho/nsfw" }],
      ["nutshell military pinup", { category: "outros", franchise: "original", folder: "nutshell-military-pinup/nsfw" }],
      ["nutshell tire pinup", { category: "outros", franchise: "original", folder: "nutshell-tire-pinup/nsfw" }],
      ["one blood", { category: "outros", franchise: "fantasia", folder: "one-blood/nsfw" }],
      ["orange hair nude woman", { category: "outros", franchise: "original", folder: "mulher-cabelo-laranja/nsfw" }],
      ["ornate couch female figure", { category: "outros", franchise: "original", folder: "ornate-couch-female-figure/nsfw" }],
      ["personagem chifres dourado", { category: "outros", franchise: "fantasia", folder: "personagem-chifres-dourado/nsfw" }],
      ["personagem azul sentada", { category: "outros", franchise: "original", folder: "personagem-azul-sentada/nsfw" }],
      ["personagem demonio feminino", { category: "outros", franchise: "fantasia", folder: "demonio-feminino-alado/nsfw" }],
      ["personagem feminina cadeira", { category: "outros", franchise: "original", folder: "personagem-feminina-cadeira/nsfw" }],
      ["personagem feminina gelo", { category: "outros", franchise: "fantasia", folder: "personagem-feminina-gelo/nsfw" }],
      ["personagem feminina kuton", { category: "outros", franchise: "fantasia", folder: "guerreira-kuton/nsfw" }],
      ["personagem feminina mohawk", { category: "outros", franchise: "original", folder: "personagem-feminina-mohawk/nsfw" }],
      ["personagem feminina nua", { category: "outros", franchise: "original", folder: "personagem-feminina-nua/nsfw" }],
      ["personagem feminina roxa", { category: "outros", franchise: "original", folder: "personagem-feminina-roxa/nsfw" }],
      ["personagem feminina sentada", { category: "outros", franchise: "original", folder: "personagem-feminina-sentada/nsfw" }],
      ["personagem loira deitada", { category: "outros", franchise: "original", folder: "personagem-loira-deitada/nsfw" }],
      ["personagem neon", { category: "outros", franchise: "sci-fi", folder: "personagem-neon/nsfw" }],
      ["personagem pinup guerra", { category: "outros", franchise: "original", folder: "personagem-pinup-guerra/nsfw" }],
      ["personagem pole dance", { category: "outros", franchise: "original", folder: "personagem-pole-dance/nsfw" }],
      ["personagem secretaria", { category: "outros", franchise: "original", folder: "personagem-secretaria/nsfw" }],
      ["personagem tentaculos", { category: "outros", franchise: "fantasia", folder: "personagem-tentaculos/nsfw" }],
      ["personagem vampira", { category: "outros", franchise: "fantasia", folder: "vampira/nsfw" }],
      ["personagens femininas trono", { category: "outros", franchise: "original", folder: "personagens-femininas-trono/nsfw" }],
      ["pinup coelhinha", { category: "outros", franchise: "original", folder: "pinup-coelhinha/nsfw" }],
      ["purple hair pinup", { category: "outros", franchise: "original", folder: "purple-hair-pinup/nsfw" }],
      ["purple hoodie woman", { category: "outros", franchise: "fantasia", folder: "vampira-hoodie-roxo/nsfw" }],
      ["ram woman nude", { category: "outros", franchise: "fantasia", folder: "mulher-carneiro/nsfw" }],
      ["red hair adult figure", { category: "outros", franchise: "original", folder: "red-hair-adult-figure/nsfw" }],
      ["red hair bunny girl", { category: "outros", franchise: "original", folder: "red-hair-bunny-girl/nsfw" }],
      ["red hair seated woman", { category: "outros", franchise: "original", folder: "red-hair-seated-woman/nsfw" }],
      ["red hood nude monster", { category: "outros", franchise: "fantasia", folder: "chapeuzinho-vermelho-monstro/nsfw" }],
      ["rosine the muse", { category: "outros", franchise: "fantasia", folder: "rosine-the-muse/nsfw" }],
      ["ryan reos blue spear woman", { category: "outros", franchise: "fantasia", folder: "ryan-reos-blue-spear-woman/nsfw" }],
      ["samurai woman", { category: "outros", franchise: "fantasia", folder: "samurai-woman/nsfw" }],
      ["sereia azul", { category: "outros", franchise: "fantasia", folder: "sereia-azul/nsfw" }],
      ["sereia feminina", { category: "outros", franchise: "fantasia", folder: "sereia-feminina/nsfw" }],
      ["sereia loira", { category: "outros", franchise: "fantasia", folder: "sereia-loira/nsfw" }],
      ["skull fire pinup", { category: "outros", franchise: "fantasia", folder: "skull-fire-pinup/nsfw" }],
      ["sleeping woman adult figure", { category: "outros", franchise: "original", folder: "sleeping-woman-adult-figure/nsfw" }],
      ["sniper female back", { category: "outros", franchise: "original", folder: "sniper-female-back/nsfw" }],
      ["succubus feminina", { category: "outros", franchise: "fantasia", folder: "succubus/nsfw" }],
      ["sword woman figure", { category: "outros", franchise: "fantasia", folder: "sword-woman/nsfw" }],
      ["tied woman adult figure", { category: "outros", franchise: "original", folder: "tied-woman-adult-figure/nsfw" }],
      ["tribal woman nude", { category: "outros", franchise: "fantasia", folder: "tribal-woman/nsfw" }],
      ["tropical pinup woman", { category: "outros", franchise: "original", folder: "tropical-pinup-woman/nsfw" }],
      ["two women couch pinup", { category: "outros", franchise: "original", folder: "two-women-couch-pinup/nsfw" }],
      ["virtual casting figure", { category: "outros", franchise: "original", folder: "virtual-casting-figure/nsfw" }],
      ["white hair fantasy woman", { category: "outros", franchise: "fantasia", folder: "white-hair-fantasy-woman/nsfw" }],
      ["white hair glasses staff woman", { category: "outros", franchise: "fantasia", folder: "white-hair-glasses-staff-woman/nsfw" }],
      ["white hair horned woman", { category: "outros", franchise: "fantasia", folder: "white-hair-horned-woman/nsfw" }],
      ["woman jacket bust", { category: "outros", franchise: "original", folder: "woman-jacket-bust/nsfw" }],
    ]);
    const sensitiveKnownTargets = new Map([
      ["afrodite", { category: "outros", franchise: "fantasia", folder: "afrodite/nsfw" }],
      ["android 18 sensitive", { category: "anime", franchise: "dragon ball", folder: "androide-18/nsfw" }],
      ["angel kof", { category: "games", franchise: "the king of fighters", folder: "angel/nsfw" }],
      ["ankh cat girl adult parody", { category: "games", franchise: "animal crossing", folder: "ankha/nsfw" }],
      ["arlequina halloween", { category: "dc", franchise: "anti-herois", folder: "arlequina/nsfw" }],
      ["blue hair princess pinup", { category: "anime", franchise: "one-piece", folder: "nefertari-vivi/nsfw" }],
      ["blue outfit pinup", { category: "games", franchise: "street-fighter", folder: "chun-li/nsfw" }],
      ["boa hancock adult pinup", { category: "anime", franchise: "one-piece", folder: "boa-hancock/nsfw" }],
      ["boa hancock chair", { category: "anime", franchise: "one-piece", folder: "boa-hancock/nsfw" }],
      ["bowsette", { category: "games", franchise: "mario", folder: "bowsette/nsfw" }],
      ["bunny athlete girl", { category: "desenhos-animacao", franchise: "looney-tunes", folder: "lola-bunny/nsfw" }],
      ["bunny pokemon style pinup", { category: "games", franchise: "pokemon", folder: "lopunny/nsfw" }],
      ["bride frankenstein nude", { category: "filmes-series", franchise: "frankenstein", folder: "noiva-de-frankenstein/nsfw" }],
      ["bulma dragon ball", { category: "anime", franchise: "dragon ball", folder: "bulma/nsfw" }],
      ["dragons lair princess daphne", { category: "games", franchise: "dragons-lair", folder: "princesa-daphne/nsfw" }],
      ["felicia darkstalkers", { category: "games", franchise: "darkstalkers", folder: "felicia/nsfw" }],
      ["ganyu genshin impact", { category: "games", franchise: "genshin-impact", folder: "ganyu/nsfw" }],
      ["harley quinn pinup", { category: "dc", franchise: "anti-herois", folder: "arlequina/nsfw" }],
      ["i dream of jeannie pinup", { category: "filmes-series", franchise: "i-dream-of-jeannie", folder: "jeannie/nsfw" }],
      ["lady death", { category: "outros", franchise: "quadrinhos", folder: "lady-death/nsfw" }],
      ["medusa feminina", { category: "outros", franchise: "fantasia", folder: "medusa/nsfw" }],
      ["mitsuri kanroji", { category: "anime", franchise: "demon-slayer", folder: "mitsuri-kanroji/nsfw" }],
      ["nami one piece variants", { category: "anime", franchise: "one-piece", folder: "nami/nsfw" }],
      ["nico robin", { category: "anime", franchise: "one-piece", folder: "nico-robin/nsfw" }],
      ["personagem estilo nier automata", { category: "games", franchise: "nier-automata", folder: "2b/nsfw" }],
      ["personagem feminina de costas", { category: "games", franchise: "metroid", folder: "samus-aran/nsfw" }],
      ["princesa peach", { category: "games", franchise: "mario", folder: "princess-peach/nsfw" }],
      ["possivel albedo", { category: "anime", franchise: "overlord", folder: "albedo/nsfw" }],
      ["possivel seras victoria", { category: "anime", franchise: "hellsing", folder: "seras-victoria/nsfw" }],
      ["psylocke adult statue", { category: "marvel", franchise: "herois", folder: "psylocke/nsfw" }],
      ["seo jiwoo", { category: "games", franchise: "solo-leveling-arise", folder: "seo-jiwoo/nsfw" }],
      ["she hulk pinup", { category: "marvel", franchise: "herois", folder: "mulher-hulk/nsfw" }],
      ["tempestade", { category: "marvel", franchise: "herois", folder: "tempestade/nsfw" }],
      ["yamato one piece pinup", { category: "anime", franchise: "one-piece", folder: "yamato/nsfw" }],
      ["yor forger", { category: "anime", franchise: "spy x family", folder: "yor-forger/nsfw" }],
    ]);
    const sensitiveAgeReviewTargets = new Map([
      ["daki gyutaro", "anime/demon-slayer/daki-e-gyutaro"],
      ["daphne blake", "desenhos-animacao/hanna-barbera/scooby-doo/daphne-blake"],
      ["daphne velma", "desenhos-animacao/hanna-barbera/scooby-doo/daphne-e-velma"],
      ["3dmoonn sci fi pinup", "identificar/3dmoonn-sci-fi-pinup"],
      ["anime back purple hair", "identificar/anime-back-purple-hair"],
      ["anime bikini figure", "identificar/anime-bikini-figure"],
      ["anime female chair", "identificar/anime-female-chair"],
      ["anime girl explicit", "identificar/anime-girl-explicit"],
      ["anime girls", "identificar/anime-girls"],
      ["anime nude drinking", "identificar/anime-nude-drinking"],
      ["anime nude blue hair", "identificar/anime-nude-blue-hair"],
      ["anime pinup black outfit", "identificar/anime-pinup-black-outfit"],
      ["anime pinup explicit", "identificar/anime-pinup-explicit"],
      ["anime ray gun pinup", "identificar/anime-ray-gun-pinup"],
      ["anime swimsuit figure", "identificar/anime-swimsuit-figure"],
      ["anjos anime", "identificar/anjos-anime"],
      ["blue hair anime bust", "identificar/blue-hair-anime-bust"],
      ["blue hair anime pinup", "identificar/blue-hair-anime-pinup"],
      ["braid anime girl nsfw", "identificar/braid-anime-girl"],
      ["cheerleader figure", "outros/original/cheerleader-figure"],
      ["hermione pinup", "filmes-series/harry-potter/hermione-granger"],
      ["ichinose asuna", "games/blue-archive/ichinose-asuna"],
      ["idade ou identidade duvidosa", "identificar/revisar-identidade-sensivel"],
      ["marin kitagawa", "anime/my-dress-up-darling/marin-kitagawa"],
      ["mei hatsume adult parody", "anime/my-hero-academia/mei-hatsume"],
      ["personagem anime cabelo preso", "identificar/personagem-anime-cabelo-preso"],
      ["personagem anime cabelo rosa", "identificar/personagem-anime-cabelo-rosa"],
      ["personagem cabelo tentaculos", "identificar/personagem-cabelo-tentaculos"],
      ["personagem ciborgue feminina", "identificar/personagem-ciborgue-feminina"],
      ["personagem coelha", "identificar/personagem-coelha"],
      ["personagem coelha azul", "anime/vocaloid/hatsune-miku"],
      ["personagem coelha rosa", "identificar/personagem-coelha-rosa"],
      ["personagem feminina contorcionista", "identificar/personagem-feminina-contorcionista"],
      ["personagem feminina guarda chuva", "identificar/personagem-feminina-guarda-chuva"],
      ["personagem feminina rosa", "identificar/personagem-feminina-rosa"],
      ["personagem praia", "identificar/personagem-praia"],
      ["personagem ruiva busto", "identificar/personagem-ruiva-busto"],
      ["personagem sofa", "identificar/personagem-sofa"],
      ["pink cat girl adult figure", "identificar/pink-cat-girl-adult-figure"],
      ["pink demon girl rear", "identificar/pink-demon-girl-rear"],
      ["pink hair acrobat girl", "identificar/pink-hair-acrobat-girl"],
      ["pink hair singer adult figure", "identificar/pink-hair-singer-adult-figure"],
      ["pink prisoner figure", "identificar/pink-prisoner-figure"],
      ["pikachu adult parody", "games/pokemon/pikachu"],
      ["poke abby", "identificar/poke-abby"],
      ["pokemon trainer nude", "games/pokemon/treinadora-pokemon"],
      ["reptile girl pinup", "identificar/reptile-girl-pinup"],
      ["rem rezero", "anime/re-zero/rem"],
      ["santa anime girl", "identificar/santa-anime-girl"],
      ["ryuko matoi", "anime/kill-la-kill/ryuko-matoi"],
      ["setsuna pinkstudio", "identificar/setsuna-pinkstudio"],
      ["squirttalene", "games/pokemon/squirttalene"],
      ["star wars pinup", "filmes-series/star-wars/ahsoka-e-leia"],
      ["velma dinkley", "desenhos-animacao/hanna-barbera/scooby-doo/velma-dinkley"],
      ["winry rockbell pinup", "anime/fullmetal-alchemist/winry-rockbell"],
      ["x men female nude", "marvel/x-men/identificar-personagem-feminina"],
    ]);

    const sensitiveFileTarget = sensitiveFileTargets.get(`${folderText}|${fileText}`);
    if (sensitiveFileTarget) {
      return sensitiveFileTarget;
    }

    const sensitiveNonCatalogTarget = sensitiveNonCatalogTargets.get(folderText);
    if (sensitiveNonCatalogTarget) {
      return {
        category: "_fora-catalogo",
        franchise: sensitiveNonCatalogTarget.franchise,
        folder: sensitiveNonCatalogTarget.folder,
        reasons: ["sensitive_non_catalog_asset_section"],
      };
    }

    const sensitiveGenericTarget = sensitiveGenericTargets.get(folderText);
    if (sensitiveGenericTarget) {
      return { ...sensitiveGenericTarget, reasons: ["sensitive_generic_character_restore"] };
    }

    const sensitiveKnownTarget = sensitiveKnownTargets.get(folderText);
    if (sensitiveKnownTarget) {
      return { ...sensitiveKnownTarget, reasons: ["sensitive_known_character_restore"] };
    }

    const sensitiveAgeReviewTarget = sensitiveAgeReviewTargets.get(folderText);
    if (sensitiveAgeReviewTarget) {
      return {
        category: "_revisar",
        franchise: "idade-ou-identidade-duvidosa",
        folder: sensitiveAgeReviewTarget,
        reasons: ["sensitive_known_character_age_review"],
      };
    }
  }

  if (franchiseText === "identificar") {
    const reviewIdentificarKnownTargets = new Map([
      ["conteudo sensivel bowsette pinup", { category: "games", franchise: "mario", folder: "bowsette/nsfw" }],
      ["conteudo sensivel emma frost", { category: "marvel", franchise: "herois", folder: "emma-frost/nsfw" }],
      ["conteudo sensivel harley bust", { category: "dc", franchise: "anti-herois", folder: "arlequina/nsfw" }],
      ["conteudo sensivel harley quinn", { category: "dc", franchise: "anti-herois", folder: "arlequina/nsfw" }],
      ["conteudo sensivel mitsuri", { category: "anime", franchise: "demon-slayer", folder: "mitsuri-kanroji/nsfw" }],
      ["conteudo sensivel morrigan", { category: "games", franchise: "darkstalkers", folder: "morrigan/nsfw" }],
      ["conteudo sensivel power", { category: "anime", franchise: "chainsaw man", folder: "power/nsfw" }],
      ["conteudo sensivel pyra", { category: "games", franchise: "xenoblade chronicles 2", folder: "pyra/nsfw" }],
      ["conteudo sensivel zatanna pinup", { category: "dc", franchise: "herois", folder: "zatanna/nsfw" }],
      ["hellsing sequencia confirmar", { category: "anime", franchise: "hellsing", folder: "alucard" }],
      ["anime male hand base", { category: "anime", franchise: "jujutsu-kaisen", folder: "nanami-kento" }],
      ["orange hair girl incerta", { category: "anime", franchise: "one-piece", folder: "nami" }],
      [
        "red haired gold dress woman",
        { category: "desenhos-animacao", franchise: "disney", folder: "uma-cilada-para-roger-rabbit/jessica-rabbit" },
      ],
      ["red black swordsman", { category: "marvel", franchise: "anti-herois", folder: "deadpool" }],
      ["supergirl topless variant", { category: "dc", franchise: "herois", folder: "supergirl/nsfw" }],
      ["white armor fox female", { category: "games", franchise: "league-of-legends", folder: "ahri/nsfw" }],
      ["winged armored female", { category: "anime", franchise: "overlord", folder: "albedo/nsfw" }],
    ]);
    const reviewIdentificarGenericTargets = new Map([
      ["action diorama", { category: "outros", franchise: "tabletop", folder: "diorama-acao" }],
      ["action figure", { category: "outros", franchise: "tabletop", folder: "action-figure" }],
      ["alien creature", { category: "outros", franchise: "sci-fi", folder: "criatura-alienigena" }],
      ["alien creature statue incerta", { category: "outros", franchise: "sci-fi", folder: "criatura-alienigena" }],
      ["alien figure", { category: "outros", franchise: "sci-fi", folder: "alienigena" }],
      ["alien warrior", { category: "outros", franchise: "sci-fi", folder: "guerreiro-alienigena" }],
      ["allia warrior woman", { category: "outros", franchise: "fantasia", folder: "guerreira-allia" }],
      ["amphibian creature incerta", { category: "outros", franchise: "fantasia", folder: "criatura-anfibia" }],
      ["ancient soldier incerto", { category: "outros", franchise: "historicos", folder: "soldado-antigo" }],
      ["ancient warrior", { category: "outros", franchise: "historicos", folder: "guerreiro-antigo" }],
      ["angel figures", { category: "outros", franchise: "fantasia", folder: "anjos" }],
      ["angry electrician", { category: "outros", franchise: "tabletop", folder: "angry-electrician" }],
      ["animated armor", { category: "outros", franchise: "fantasia", folder: "armadura-animada" }],
      ["ape bust incerto", { category: "outros", franchise: "animais", folder: "busto-macaco" }],
      ["aquamaniac incerta", { category: "outros", franchise: "fantasia", folder: "aquamaniac" }],
      ["arachne spider woman", { category: "outros", franchise: "fantasia", folder: "mulher-aranha-arachne" }],
      ["archer diorama", { category: "outros", franchise: "fantasia", folder: "arqueiro-diorama" }],
      ["archer statue", { category: "outros", franchise: "fantasia", folder: "arqueiro" }],
      ["archer woman", { category: "outros", franchise: "fantasia", folder: "arqueira" }],
      ["armed man incerto", { category: "outros", franchise: "sci-fi", folder: "homem-armado" }],
      ["armored alien", { category: "outros", franchise: "sci-fi", folder: "alienigena-armadurado" }],
      ["armored character", { category: "outros", franchise: "sci-fi", folder: "personagem-armadurado" }],
      ["armored creature", { category: "outros", franchise: "fantasia", folder: "criatura-armadurada" }],
      ["armored fantasy warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-armadura-fantasia" }],
      ["armored gun woman incerta", { category: "outros", franchise: "sci-fi", folder: "mulher-armadura-arma" }],
      ["armored knight", { category: "outros", franchise: "fantasia", folder: "cavaleiro-armadurado" }],
      ["alien bust", { category: "outros", franchise: "sci-fi", folder: "busto-alienigena" }],
      ["angel anime woman", { category: "outros", franchise: "fantasia", folder: "anjo-anime/nsfw" }],
      ["anime dragon woman", { category: "outros", franchise: "fantasia", folder: "mulher-dragao-anime" }],
      ["anime ficcao cientifica incerto", { category: "outros", franchise: "sci-fi", folder: "personagem-anime-sci-fi" }],
      ["anime fighter", { category: "outros", franchise: "artes-marciais", folder: "lutador-anime" }],
      ["anime goddess", { category: "outros", franchise: "fantasia", folder: "deusa-anime" }],
      ["anime gunner woman", { category: "outros", franchise: "sci-fi", folder: "atiradora-anime" }],
      ["anime kimono woman incerta", { category: "outros", franchise: "original", folder: "anime-kimono-woman" }],
      ["anime male bust", { category: "outros", franchise: "original", folder: "busto-masculino-anime" }],
      ["anime mecha", { category: "outros", franchise: "sci-fi", folder: "mecha" }],
      ["anime purple katana warrior incerta", { category: "outros", franchise: "original", folder: "guerreira-katana-roxa/nsfw" }],
      ["anime staff woman incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-cajado" }],
      ["anime water diorama", { category: "outros", franchise: "fantasia", folder: "diorama-agua-anime" }],
      ["antler woman bust", { category: "outros", franchise: "fantasia", folder: "busto-mulher-chifres" }],
      ["armored crab creature", { category: "outros", franchise: "fantasia", folder: "criatura-caranguejo-armadurada" }],
      ["armored fantasy woman", { category: "outros", franchise: "sci-fi", folder: "mulher-armadura-pesada" }],
      ["armored warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-armadurado" }],
      ["armored warrior incerta", { category: "outros", franchise: "fantasia", folder: "guerreiro-armadurado" }],
      ["baseball girl incerta", { category: "outros", franchise: "esportes", folder: "jogadora-beisebol" }],
      ["beach female figure", { category: "outros", franchise: "original", folder: "mulher-praia" }],
      ["beach woman figure", { category: "outros", franchise: "original", folder: "mulher-praia" }],
      ["bikini gun woman incerta", { category: "outros", franchise: "original", folder: "mulher-biquini-armas" }],
      ["black hair sword fighter", { category: "outros", franchise: "sci-fi", folder: "guerreira-traje-preto-espada" }],
      ["black haired pink dress woman", { category: "outros", franchise: "original", folder: "mulher-vestido-rosa/nsfw" }],
      ["black haired vampire woman stairs", { category: "outros", franchise: "fantasia", folder: "vampira-cabelo-preto/nsfw" }],
      ["black red sword woman", { category: "outros", franchise: "fantasia", folder: "guerreira-vermelha-preta" }],
      ["black red techwear woman", { category: "outros", franchise: "sci-fi", folder: "mulher-techwear-vermelho-preto" }],
      ["black suit woman", { category: "outros", franchise: "sci-fi", folder: "mulher-traje-preto" }],
      ["blonde female soldier", { category: "outros", franchise: "sci-fi", folder: "soldada-loira" }],
      ["blonde gun girl incerta", { category: "outros", franchise: "sci-fi", folder: "garota-loira-armas" }],
      ["blonde tactical woman rifle", { category: "outros", franchise: "sci-fi", folder: "mulher-tatica-loira-rifle" }],
      ["blue insect warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-inseto-azul" }],
      ["blue hair fantasy warrior", { category: "outros", franchise: "fantasia", folder: "guerreira-cabelo-azul" }],
      ["blue hair woman incerta", { category: "outros", franchise: "original", folder: "mulher-cabelo-azul/nsfw" }],
      ["bunny demon woman", { category: "outros", franchise: "fantasia", folder: "demonia-coelhinha/nsfw" }],
      ["bunny woman", { category: "outros", franchise: "original", folder: "coelhinha/nsfw" }],
      ["busto feminino incerto", { category: "outros", franchise: "original", folder: "busto-feminino/nsfw" }],
      ["chibi figure", { category: "outros", franchise: "brinquedos", folder: "chibi-figure" }],
      ["chibi monkey boy", { category: "outros", franchise: "fantasia", folder: "rei-macaco-chibi" }],
      ["clay character pose", { category: "outros", franchise: "tabletop", folder: "personagens-clay" }],
      ["colorful super heroine incerta", { category: "outros", franchise: "original", folder: "super-heroina-colorida" }],
      ["criatura incerta", { category: "outros", franchise: "fantasia", folder: "criaturas-pequenas" }],
      ["conteudo sensivel arcade woman", { category: "outros", franchise: "original", folder: "arcade-woman/nsfw" }],
      ["conteudo sensivel barbarian woman", { category: "outros", franchise: "fantasia", folder: "barbara/nsfw" }],
      ["conteudo sensivel catulus", { category: "outros", franchise: "fantasia", folder: "catulus/nsfw" }],
      ["conteudo sensivel demon woman", { category: "outros", franchise: "fantasia", folder: "demonia/nsfw" }],
      ["conteudo sensivel egipcia", { category: "outros", franchise: "fantasia", folder: "egipcia/nsfw" }],
      ["conteudo sensivel egyptian woman", { category: "outros", franchise: "fantasia", folder: "egipcia/nsfw" }],
      ["conteudo sensivel guerreira ruiva", { category: "outros", franchise: "fantasia", folder: "guerreira-ruiva-armada/nsfw" }],
      ["conteudo sensivel hydra member", { category: "marvel", franchise: "viloes", folder: "hidra/nsfw" }],
      ["conteudo sensivel jump kitty", { category: "outros", franchise: "original", folder: "jump-kitty/nsfw" }],
      ["conteudo sensivel kneeling woman", { category: "outros", franchise: "original", folder: "mulher-ajoelhada/nsfw" }],
      ["conteudo sensivel manza", { category: "outros", franchise: "fantasia", folder: "manza/nsfw" }],
      ["conteudo sensivel mulher", { category: "outros", franchise: "original", folder: "mulher-ruiva/nsfw" }],
      ["conteudo sensivel nutshell bust", { category: "outros", franchise: "sci-fi", folder: "busto-atiradora-nutshell" }],
      ["conteudo sensivel owl woman", { category: "outros", franchise: "fantasia", folder: "mulher-coruja/nsfw" }],
      ["conteudo sensivel pink reality", { category: "outros", franchise: "original", folder: "pink-reality/nsfw" }],
      ["conteudo sensivel rosine the muse", { category: "outros", franchise: "original", folder: "rosine-the-muse/nsfw" }],
      ["conteudo sensivel seated woman", { category: "outros", franchise: "original", folder: "mulher-gotica-sentada/nsfw" }],
      ["conteudo sensivel sniper woman", { category: "outros", franchise: "sci-fi", folder: "sniper-feminina" }],
      ["conteudo sensivel variantes", { category: "outros", franchise: "original", folder: "female-operative-squad/nsfw" }],
      ["cyber anime girl incerta", { category: "outros", franchise: "sci-fi", folder: "cyber-anime-girl" }],
      ["cyber girl incerta", { category: "outros", franchise: "sci-fi", folder: "cyber-girl" }],
      ["cybernetic claw woman", { category: "outros", franchise: "sci-fi", folder: "mulher-garra-cibernetica" }],
      ["dark hair magic woman sensual", { category: "outros", franchise: "fantasia", folder: "maga-cabelo-escuro/nsfw" }],
      ["dark anime warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-anime-sombrio" }],
      ["dark anime woman incerta", { category: "outros", franchise: "fantasia", folder: "mulher-anime-sombria" }],
      ["dark horned statue", { category: "outros", franchise: "fantasia", folder: "estatua-chifruda-sombria" }],
      ["dark horned statue incerta", { category: "outros", franchise: "fantasia", folder: "estatua-chifruda-sombria" }],
      ["dark warrior throne sensual", { category: "outros", franchise: "fantasia", folder: "guerreira-trono-sombria/nsfw" }],
      ["dancer woman incerta", { category: "outros", franchise: "arte", folder: "dancarina" }],
      ["demon warrior woman incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-demonia" }],
      ["doses3d alien woman", { category: "outros", franchise: "fantasia", folder: "mulher-alienigena" }],
      ["doses3d horned bust", { category: "outros", franchise: "fantasia", folder: "busto-chifrudo" }],
      ["doses3d warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-chifrudo-cajado" }],
      ["fairy woman", { category: "outros", franchise: "fantasia", folder: "fada/nsfw" }],
      ["female archer sensual", { category: "outros", franchise: "fantasia", folder: "arqueira/nsfw" }],
      ["female beast rider", { category: "outros", franchise: "fantasia", folder: "mulher-montaria-fera" }],
      ["female blacksmith", { category: "outros", franchise: "fantasia", folder: "ferreira" }],
      ["female bust", { category: "outros", franchise: "original", folder: "busto-feminino" }],
      ["female character figure", { category: "outros", franchise: "original", folder: "personagem-feminino" }],
      ["female guitarist", { category: "outros", franchise: "musica", folder: "guitarrista" }],
      ["female gunner", { category: "outros", franchise: "sci-fi", folder: "atiradora" }],
      ["female red motorcycle rider", { category: "outros", franchise: "original", folder: "motociclista-vermelha" }],
      ["female soldiers", { category: "outros", franchise: "sci-fi", folder: "soldadas" }],
      ["female statue", { category: "outros", franchise: "arte", folder: "estatua-feminina" }],
      ["fantasy woman sensual", { category: "outros", franchise: "fantasia", folder: "mulher-fantasia/nsfw" }],
      ["fantasy female figures", { category: "outros", franchise: "fantasia", folder: "personagens-femininas-fantasia" }],
      ["fire witch", { category: "outros", franchise: "fantasia", folder: "bruxa-do-fogo" }],
      ["geisha warrior", { category: "outros", franchise: "fantasia", folder: "guerreira-geisha" }],
      ["golden angel statue", { category: "outros", franchise: "fantasia", folder: "anjo-dourado" }],
      ["graveyard woman incerta", { category: "outros", franchise: "terror", folder: "mulher-cemiterio/nsfw" }],
      ["green beast warriors", { category: "outros", franchise: "fantasia", folder: "guerreiros-bestiais" }],
      ["green suit gun woman incerta", { category: "outros", franchise: "sci-fi", folder: "mulher-traje-verde-pistola" }],
      ["goth woman sensual", { category: "outros", franchise: "original", folder: "mulher-gotica/nsfw" }],
      ["guerreira pinup incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-pinup/nsfw" }],
      ["horned sorceress incerta", { category: "outros", franchise: "fantasia", folder: "feiticeira-chifruda/nsfw" }],
      ["horror character figures", { category: "outros", franchise: "terror", folder: "personagens-terror" }],
      ["ice queen figure", { category: "outros", franchise: "fantasia", folder: "rainha-do-gelo" }],
      ["jogador basquete incerto", { category: "outros", franchise: "esportes", folder: "jogador-basquete" }],
      ["jogador futebol incerto", { category: "outros", franchise: "esportes", folder: "jogador-futebol" }],
      ["male bust", { category: "outros", franchise: "original", folder: "busto-masculino" }],
      ["masked man suit", { category: "outros", franchise: "terror", folder: "homem-mascara-terno" }],
      ["mecha incerto", { category: "outros", franchise: "sci-fi", folder: "mecha" }],
      ["orc warrior", { category: "outros", franchise: "fantasia", folder: "orc-guerreiro" }],
      ["personagem armada incerta", { category: "outros", franchise: "sci-fi", folder: "personagem-armada" }],
      ["personagem azul armada incerta", { category: "outros", franchise: "sci-fi", folder: "personagem-azul-armada" }],
      ["personagem fantasia alado", { category: "outros", franchise: "fantasia", folder: "personagem-alado" }],
      ["personagem feminino incerto", { category: "outros", franchise: "original", folder: "personagem-feminino" }],
      ["personagem feminino guerreira incerto", { category: "outros", franchise: "fantasia", folder: "guerreira-cinza-espada" }],
      ["personagem mitologico incerto", { category: "outros", franchise: "fantasia", folder: "personagem-mitologico" }],
      ["pinup woman", { category: "outros", franchise: "original", folder: "pinup-woman/nsfw" }],
      ["pinup feminina incerta", { category: "outros", franchise: "original", folder: "pinup-feminina/nsfw" }],
      ["pink fire woman incerta", { category: "outros", franchise: "fantasia", folder: "mulher-fogo-rosa" }],
      ["purple gun girl incerta", { category: "outros", franchise: "sci-fi", folder: "garota-roxa-armas" }],
      ["purple hair bodysuit fighter", { category: "outros", franchise: "original", folder: "lutadora-cabelo-roxo/nsfw" }],
      ["purple hair female fighter", { category: "outros", franchise: "original", folder: "lutadora-cabelo-roxo/nsfw" }],
      ["purple warrior woman horns", { category: "outros", franchise: "fantasia", folder: "guerreira-roxa-chifres/nsfw" }],
      ["purple sorceress", { category: "outros", franchise: "fantasia", folder: "feiticeira-roxa" }],
      ["red hair blue skin gunner sensual", { category: "outros", franchise: "sci-fi", folder: "atiradora-pele-azul-cabelo-vermelho/nsfw" }],
      ["red demon warrior", { category: "outros", franchise: "fantasia", folder: "demonio-guerreiro-vermelho" }],
      ["red demon woman", { category: "outros", franchise: "fantasia", folder: "demonia-vermelha/nsfw" }],
      ["red dress female figure", { category: "outros", franchise: "original", folder: "mulher-vestido-vermelho/nsfw" }],
      ["red flying woman", { category: "outros", franchise: "sci-fi", folder: "mulher-voadora-vermelha" }],
      ["red hair witch", { category: "outros", franchise: "fantasia", folder: "bruxa-cabelo-vermelho" }],
      ["red haired christmas sensual woman", { category: "outros", franchise: "sazonal", folder: "mulher-natalina-cabelo-vermelho/nsfw" }],
      ["red haired purple cape sensual woman", { category: "outros", franchise: "fantasia", folder: "mulher-capa-roxa-cabelo-vermelho/nsfw" }],
      ["red queen warrior", { category: "outros", franchise: "fantasia", folder: "rainha-vermelha-guerreira" }],
      ["reptile creature", { category: "outros", franchise: "fantasia", folder: "criatura-reptiliana" }],
      ["sci fi duo incerto", { category: "outros", franchise: "sci-fi", folder: "dupla-armada-sci-fi" }],
      ["sci fi throne figure", { category: "outros", franchise: "sci-fi", folder: "personagem-trono-sci-fi" }],
      ["sci fi woman", { category: "outros", franchise: "sci-fi", folder: "mulher-sci-fi" }],
      ["seated sword woman", { category: "outros", franchise: "arte", folder: "mulher-sentada-espada/nsfw" }],
      ["seated woman", { category: "outros", franchise: "arte", folder: "mulher-sentada/nsfw" }],
      ["serpent girl incerta", { category: "outros", franchise: "fantasia", folder: "garota-serpente/nsfw" }],
      ["shield spear warrior woman", { category: "outros", franchise: "fantasia", folder: "guerreira-escudo-lanca" }],
      ["silver hair gunslinger", { category: "outros", franchise: "sci-fi", folder: "pistoleira-cabelo-prateado/nsfw" }],
      ["soldier squad", { category: "outros", franchise: "historicos", folder: "esquadrao-soldados" }],
      ["succubus bust incerta", { category: "outros", franchise: "fantasia", folder: "busto-succubus/nsfw" }],
      ["super heroine incerta", { category: "outros", franchise: "original", folder: "super-heroina" }],
      ["superhero statues", { category: "outros", franchise: "quadrinhos", folder: "bustos-super-herois" }],
      ["sword woman incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-espada" }],
      ["sword tail girl incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-cauda-espada/nsfw" }],
      ["tan bodysuit spear woman", { category: "outros", franchise: "fantasia", folder: "guerreira-lanca-traje-dourado/nsfw" }],
      ["throne diorama", { category: "outros", franchise: "fantasia", folder: "diorama-trono" }],
      ["tree woman", { category: "outros", franchise: "fantasia", folder: "mulher-arvore" }],
      ["vampire woman incerta", { category: "outros", franchise: "fantasia", folder: "vampira-capa/nsfw" }],
      ["warrior woman armor incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-armadura-escudo" }],
      ["warrior woman incerta", { category: "outros", franchise: "fantasia", folder: "guerreira-espada" }],
      ["water spirit woman", { category: "outros", franchise: "fantasia", folder: "espirito-da-agua" }],
      ["winged armored bust", { category: "outros", franchise: "sci-fi", folder: "busto-armadura-alada" }],
      ["white gun woman incerta", { category: "outros", franchise: "sci-fi", folder: "mulher-armas-brancas" }],
      ["white hair wolf warrior", { category: "outros", franchise: "fantasia", folder: "guerreiro-lobo-cabelo-branco" }],
      ["white haired blue ice woman", { category: "outros", franchise: "fantasia", folder: "mulher-gelo-cabelo-branco" }],
      ["white haired dark fantasy woman", { category: "outros", franchise: "fantasia", folder: "guerreira-fantasia-cabelo-branco" }],
      ["woman chair gun incerta", { category: "outros", franchise: "original", folder: "mulher-cadeira-arma/nsfw" }],
      ["woman chair ring incerta", { category: "outros", franchise: "arte", folder: "mulher-cadeira-anel/nsfw" }],
      ["woman evening dress incerta", { category: "outros", franchise: "arte", folder: "mulher-vestido-noite" }],
      ["woman figures", { category: "outros", franchise: "original", folder: "personagens-femininas" }],
      ["woman snake bed incerta", { category: "outros", franchise: "fantasia", folder: "mulher-serpente-cama/nsfw" }],
      ["woman statue", { category: "outros", franchise: "arte", folder: "estatua-feminina" }],
      ["woman with green robot", { category: "outros", franchise: "sci-fi", folder: "mulher-com-robo-verde" }],
      ["witch warrior parts", { category: "outros", franchise: "fantasia", folder: "bruxa-guerreira" }],
      ["zombie survivor scene", { category: "outros", franchise: "terror", folder: "cena-sobrevivente-zumbi" }],
    ]);
    const reviewIdentificarProtectedTargets = new Map([
      ["anime animal girl", "identificar/anime-animal-girl"],
      ["anime armored girl", "identificar/anime-armored-girl"],
      ["anime aventureira ruiva incerta", "identificar/anime-aventureira-ruiva-incerta"],
      ["anime basquete incerta", "identificar/anime-basquete-incerta"],
      ["anime beast group incerto", "identificar/anime-beast-group-incerto"],
      ["anime beisebol incerta", "identificar/anime-beisebol-incerta"],
      ["anime bikini girl", "identificar/anime-bikini-girl"],
      ["anime bikini personagem incerto", "identificar/anime-bikini-personagem-incerto"],
      ["anime bikini woman", "identificar/anime-bikini-woman"],
      ["anime cabelo rosa incerta", "identificar/anime-cabelo-rosa-incerta"],
      ["anime catgirl incerta", "identificar/anime-catgirl-incerta"],
      ["anime chained woman incerta", "identificar/anime-chained-woman-incerta"],
      ["anime character incerto", "identificar/anime-character-incerto"],
      ["anime chibi horta incerta", "identificar/anime-chibi-horta-incerta"],
      ["anime dancer incerta", "identificar/anime-dancer-incerta"],
      ["anime demon girl sensual", "identificar/anime-demon-girl-sensual"],
      ["anime demon woman", "identificar/anime-demon-woman"],
      ["anime display", "identificar/anime-display"],
      ["anime duo", "identificar/anime-duo"],
      ["anime enfermeira incerta", "identificar/anime-enfermeira-incerta"],
      ["anime escolar armada incerta", "identificar/anime-escolar-armada-incerta"],
      ["anime female face closeup", "identificar/anime-female-face-closeup"],
      ["anime figure", "identificar/anime-figure"],
      ["anime figure sensual", "identificar/anime-figure-sensual"],
      ["anime futebol incerto", "identificar/anime-futebol-incerto"],
      ["anime garota dragao incerta", "identificar/anime-garota-dragao-incerta"],
      ["anime girl", "identificar/anime-girl"],
      ["anime girl figure", "identificar/anime-girl-figure"],
      ["anime girl set", "identificar/anime-girl-set"],
      ["anime girl statue", "identificar/anime-girl-statue"],
      ["anime bunny rifle incerto", "identificar/anime-bunny-rifle-incerto"],
      ["anime garota arma incerta", "identificar/anime-garota-arma-incerta"],
      ["anime girl figures", "identificar/anime-girl-figures"],
      ["anime hammer girl incerta", "identificar/anime-hammer-girl-incerta"],
      ["anime horned girl incerta", "identificar/anime-horned-girl-incerta"],
      ["anime idol girl incerta", "identificar/anime-idol-girl-incerta"],
      ["anime loba branca incerta", "identificar/anime-loba-branca-incerta"],
      ["anime loira biquini incerta", "identificar/anime-loira-biquini-incerta"],
      ["anime lutadora vermelha incerta", "identificar/anime-lutadora-vermelha-incerta"],
      ["anime maga cartola incerta", "identificar/anime-maga-cartola-incerta"],
      ["anime menina pose incerta", "identificar/anime-menina-pose-incerta"],
      ["anime militar metralhadora incerta", "identificar/anime-militar-metralhadora-incerta"],
      ["anime moon woman incerta", "identificar/anime-moon-woman-incerta"],
      ["anime mulher ajoelhada incerta", "identificar/anime-mulher-ajoelhada-incerta"],
      ["anime nurse", "identificar/anime-nurse"],
      ["anime personagem incerto", "identificar/anime-personagem-incerto"],
      ["anime personagem roxo incerto", "identificar/anime-personagem-roxo-incerto"],
      ["anime pin up blue hair set", "identificar/anime-pin-up-blue-hair-set"],
      ["anime praia cabelo verde incerto", "identificar/anime-praia-cabelo-verde-incerto"],
      ["anime preto branco incerto", "identificar/anime-preto-branco-incerto"],
      ["anime puppet girl incerta", "identificar/anime-puppet-girl-incerta"],
      ["anime ruiva correntes incerta", "identificar/anime-ruiva-correntes-incerta"],
      ["anime ruiva traje branco incerta", "identificar/anime-ruiva-traje-branco-incerta"],
      ["anime singer girl", "identificar/anime-singer-girl"],
      ["anime snowboard incerta", "identificar/anime-snowboard-incerta"],
      ["anime spear girl incerta", "identificar/anime-spear-girl-incerta"],
      ["anime sunflower girl incerta", "identificar/anime-sunflower-girl-incerta"],
      ["anime swimsuit girl", "identificar/anime-swimsuit-girl"],
      ["anime sword girl", "identificar/anime-sword-girl"],
      ["anime sword warrior incerta", "identificar/anime-sword-warrior-incerta"],
      ["anime sword woman", "identificar/anime-sword-woman"],
      ["anime swordswoman", "identificar/anime-swordswoman"],
      ["anime vending machine figure", "identificar/anime-vending-machine-figure"],
      ["anime woman", "identificar/anime-woman"],
      ["anime woman fan sensual", "identificar/anime-woman-fan-sensual"],
      ["blue hair anime woman", "identificar/blue-hair-anime-woman"],
      ["blue hair crouching girl incerta", "identificar/blue-hair-crouching-girl-incerta"],
      ["bunny anime girl", "games/azur-lane/le-malin"],
      ["bunny maid girl incerta", "identificar/bunny-maid-girl-incerta"],
      ["cat girl", "identificar/cat-girl"],
      ["cat girl incerta", "identificar/cat-girl-incerta"],
      ["conteudo sensivel anime girl", "identificar/conteudo-sensivel-anime-girl"],
      ["conteudo sensivel anime woman", "identificar/conteudo-sensivel-anime-woman"],
      ["conteudo sensivel bunny girl incerto", "identificar/conteudo-sensivel-bunny-girl-incerto"],
      ["conteudo sensivel cat girl", "identificar/conteudo-sensivel-cat-girl"],
      ["conteudo sensivel personagem incerto", "identificar/conteudo-sensivel-personagem-incerto"],
      ["conteudo sensivel scooby doo", "desenhos-animacao/hanna-barbera/scooby-doo/daphne-e-velma"],
      ["demon girl art incerta", "identificar/demon-girl-art-incerta"],
      ["girl bedroom incerta", "identificar/girl-bedroom-incerta"],
      ["green hair pinup", "identificar/green-hair-pinup"],
      ["green hair girl incerta", "identificar/green-hair-girl-incerta"],
      ["japanese doll master incerta", "identificar/japanese-doll-master-incerta"],
      ["komi swimsuit floatie", "anime/komi-cant-communicate/komi-shouko"],
      ["mermaid girl", "identificar/mermaid-girl"],
      ["pink anime girl", "identificar/pink-anime-girl"],
      ["pink hair anime girl", "anime/my-dress-up-darling/marin-kitagawa"],
      ["pink tentacle girl", "identificar/pink-tentacle-girl"],
      ["purple haired anime woman throne", "identificar/purple-haired-anime-woman-throne"],
      ["purple bodysuit woman incerta", "dc/ravena"],
      ["purple hair pinup", "anime/highschool-of-the-dead/saeko-busujima"],
      ["school girl", "anime/my-dress-up-darling/marin-kitagawa"],
      ["street fighter ibuki pinup", "games/street-fighter/ibuki"],
    ]);
    const reviewIdentificarNonCatalogTargets = new Map([
      ["aerosol bust", { franchise: "estudos", folder: "aerosol-bust" }],
      ["animal statue", { franchise: "animais", folder: "animal-statue" }],
      ["anime figure parts", { franchise: "pecas", folder: "anime-figure-parts" }],
      ["anime sword", { franchise: "acessorios", folder: "espada-anime" }],
      ["base azul redonda", { franchise: "acessorios", folder: "base-azul-redonda" }],
      ["cat cannon model", { franchise: "veiculos", folder: "cat-cannon-model" }],
      ["female pose model", { franchise: "estudos", folder: "modelo-poses-feminino" }],
      ["mecha parts incerto", { franchise: "pecas", folder: "mecha-parts" }],
      ["model parts sheet", { franchise: "pecas", folder: "model-parts-sheet" }],
      ["personagens variados incertos", { franchise: "referencias", folder: "personagens-variados-incertos" }],
      ["sci fi bike", { franchise: "veiculos", folder: "sci-fi-bike" }],
      ["sci fi vehicle", { franchise: "veiculos", folder: "sci-fi-vehicle" }],
      ["urban miniature scene", { franchise: "cenarios", folder: "cena-urbana-miniatura" }],
      ["wanted fire character", { franchise: "artes-promocionais", folder: "wanted-fire-character" }],
      ["wooden bird machine", { franchise: "objetos", folder: "maquina-passaro-madeira" }],
    ]);

    if (folderText === "revisar") {
      if (/\b59777\b/.test(fileText)) {
        return {
          category: "dc",
          franchise: "herois",
          folder: "canario-negro",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b59808\b/.test(fileText)) {
        return {
          category: "dc",
          franchise: "herois",
          folder: "zatanna",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b59755\b/.test(fileText)) {
        return {
          category: "_revisar",
          franchise: "idade-ou-identidade-duvidosa",
          folder: "games/league-of-legends/personagem-alada",
          reasons: ["review_age_identity_hold"],
        };
      }
      if (/\b59636\b/.test(fileText)) {
        return {
          category: "_fora-catalogo",
          franchise: "pecas",
          folder: "partial-anime-figure",
          reasons: ["review_non_catalog_asset_section"],
        };
      }
      if (/\b(59643|59822|59885|59917|60006|60025|60063|60182|60203|60240)\b/.test(fileText)) {
        return {
          category: "_revisar",
          franchise: "idade-ou-identidade-duvidosa",
          folder: "identificar/revisar-anime-ou-personagem-sensivel",
          reasons: ["review_age_identity_hold"],
        };
      }
      if (/\b(59662|59663)\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "sci-fi",
          folder: "humanoide-monstruoso",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b59667\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "bruxa-pinup/nsfw",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b59753\b/.test(fileText)) {
        return {
          category: "_revisar",
          franchise: "idade-ou-identidade-duvidosa",
          folder: "identificar/harpia-anime",
          reasons: ["review_age_identity_hold"],
        };
      }
      if (/\b59780\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "original",
          folder: "personagem-pole-dance/nsfw",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b59874\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "feiticeira-roxa",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b59876\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "mulher-arvore",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b60153\b/.test(fileText)) {
        return {
          category: "_fora-catalogo",
          franchise: "estudos",
          folder: "estudo-anatomico-feminino",
          reasons: ["review_non_catalog_asset_section"],
        };
      }
      if (/\b60184\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "mulher-serpente/nsfw",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b(60195|60196|60197|60198|60199|60200|60201)\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "guerreira-espada/nsfw",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b(60218|60219|60220|60221)\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "original",
          folder: "digital-dark-pinups/nsfw",
          reasons: ["review_generic_character_restore"],
        };
      }
    }

    if (folderText === "character figure") {
      if (/\b39100\b/.test(fileText)) {
        return {
          category: "filmes-series",
          franchise: "star-wars",
          folder: "c-3po",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b39102\b/.test(fileText)) {
        return {
          category: "marvel",
          franchise: "herois",
          folder: "capitao-america",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    if (folderText === "chibi figure" && /\b38580\b/.test(fileText)) {
      return {
        category: "filmes-series",
        franchise: "brinquedo-assassino",
        folder: "chucky",
        reasons: ["review_identified_file_restore"],
      };
    }

    if (folderText === "colorful armored woman") {
      return {
        category: "outros",
        franchise: "sci-fi",
        folder: /\b38744\b/.test(fileText) ? "mulher-armadura-colorida/nsfw" : "mulher-armadura-colorida",
        reasons: ["review_identified_file_restore"],
      };
    }

    if (folderText === "fighter character") {
      if (/\b39015\b/.test(fileText)) {
        return {
          category: "anime",
          franchise: "dragon ball",
          folder: "trunks-do-futuro",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b39017\b/.test(fileText)) {
        return {
          category: "marvel",
          franchise: "herois",
          folder: "ikaris",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    if (folderText === "horror character figures" && /\b20625\b/.test(fileText)) {
      return {
        category: "games",
        franchise: "silent hill",
        folder: "pyramid head",
        reasons: ["review_identified_file_restore"],
      };
    }

    if (folderText === "personagem nao identificado") {
      if (/\b8454\b/.test(fileText)) {
        return {
          category: "games",
          franchise: "league-of-legends",
          folder: "evelynn/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b8458\b/.test(fileText)) {
        return {
          category: "_revisar",
          franchise: "idade-ou-identidade-duvidosa",
          folder: "anime/naruto/hinata-hyuga",
          reasons: ["review_age_identity_hold"],
        };
      }
    }

    if (folderText === "personagem incerto") {
      if (/\b2602\b/.test(fileText)) {
        return {
          category: "_revisar",
          franchise: "idade-ou-identidade-duvidosa",
          folder: "games/apex-legends/possivel-loba",
          reasons: ["review_age_identity_hold"],
        };
      }
      if (/\b73751\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "homem-com-passaro-azul",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b73585\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "sci-fi",
          folder: "personagem-cabelo-rosa-veiculos",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b73757\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "guerreira-espada",
          reasons: ["review_generic_character_restore"],
        };
      }
      if (/\b73774\b/.test(fileText)) {
        return {
          category: "_fora-catalogo",
          franchise: "referencias",
          folder: "mini-figuras-coloridas",
          reasons: ["review_non_catalog_asset_section"],
        };
      }
    }

    if (folderText === "personagens multiverso incertos") {
      if (/\b73852\b/.test(fileText)) {
        return {
          category: "dc",
          franchise: "anti-herois",
          folder: "arlequina",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b73854\b/.test(fileText)) {
        return {
          category: "dc",
          franchise: "viloes",
          folder: "viloes-batman/coringa",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    if (folderText === "android woman incerta") {
      if (/\b2162[78]\b|\b2162?9\b|\b2163[0-3]\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "sci-fi",
          folder: "android-woman/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b2162[56]\b|\b2166[2-5]\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "sci-fi",
          folder: "android-woman",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    if (folderText === "blonde glasses pistol woman") {
      if (/\b2267[12]\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "original",
          folder: "loira-oculos-pistola/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (/\b2266[9]\b|\b22670\b/.test(fileText)) {
        return {
          category: "outros",
          franchise: "original",
          folder: "loira-oculos-pistola",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    if (folderText === "anime girl parts") {
      return {
        category: "_revisar",
        franchise: "idade-ou-identidade-duvidosa",
        folder: /\b(51967|52032)\b/.test(fileText)
          ? "anime/the-rising-of-the-shield-hero/raphtalia"
          : "identificar/anime-girl-parts",
        reasons: ["review_age_identity_hold"],
      };
    }

    if (folderText === "conteudo sensivel") {
      if (phraseMatches(fileText, "android female")) {
        return {
          category: "outros",
          franchise: "sci-fi",
          folder: "android-female/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (phraseMatches(fileText, "female serpent")) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "mulher-serpente/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (phraseMatches(fileText, "high elf archer")) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "elfa-arqueira/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (phraseMatches(fileText, "seated nude gray")) {
        return {
          category: "_fora-catalogo",
          franchise: "acessorios",
          folder: "estudo-anatomico-feminino",
          reasons: ["review_non_catalog_asset_section"],
        };
      }
    }

    if (folderText === "conteudo sensivel infected imagination") {
      if (phraseMatches(fileText, "infested imagination female") || phraseMatches(fileText, "infected imagination female")) {
        return {
          category: "games",
          franchise: "overwatch",
          folder: "dva/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
      if (phraseMatches(fileText, "creature woman") || phraseMatches(fileText, "pink creature woman")) {
        return {
          category: "outros",
          franchise: "fantasia",
          folder: "infested-imagination-creature/nsfw",
          reasons: ["review_identified_file_restore"],
        };
      }
    }

    const knownTarget = reviewIdentificarKnownTargets.get(folderText);
    if (knownTarget) return { ...knownTarget, reasons: ["review_known_character_restore"] };

    const genericTarget = reviewIdentificarGenericTargets.get(folderText);
    if (genericTarget) return { ...genericTarget, reasons: ["review_generic_character_restore"] };

    const protectedTarget = reviewIdentificarProtectedTargets.get(folderText);
    if (protectedTarget) {
      return {
        category: "_revisar",
        franchise: "idade-ou-identidade-duvidosa",
        folder: protectedTarget,
        reasons: ["review_age_identity_hold"],
      };
    }

    const nonCatalogTarget = reviewIdentificarNonCatalogTargets.get(folderText);
    if (nonCatalogTarget) {
      return {
        category: "_fora-catalogo",
        franchise: nonCatalogTarget.franchise,
        folder: nonCatalogTarget.folder,
        reasons: ["review_non_catalog_asset_section"],
      };
    }

    const targetFolder = folderText === "identificar" ? "personagem-nao-identificado" : cleanCatalogSlug(folder, "personagem-nao-identificado");
    if (targetFolder !== String(folder || "")) {
      return {
        category: "_revisar",
        franchise: "identificar",
        folder: targetFolder,
        reasons: ["review_bucket_alias"],
      };
    }
  }

  const knownReviewTargets = new Map([
    [
      "barbarella|barbarella",
      { category: "filmes-series", franchise: "barbarella", folder: "barbarella" },
    ],
    [
      "jessica rabbit|jessica rabbit",
      {
        category: "desenhos-animacao",
        franchise: "disney",
        folder: "uma-cilada-para-roger-rabbit/jessica-rabbit",
      },
    ],
    [
      "lady death|lady death",
      { category: "outros", franchise: "quadrinhos", folder: "lady-death" },
    ],
    [
      "lady death|lady death gray",
      { category: "outros", franchise: "quadrinhos", folder: "lady-death" },
    ],
    [
      "red sonja|red sonja",
      { category: "outros", franchise: "quadrinhos", folder: "red-sonja" },
    ],
    [
      "the incredibles|elastigirl chair",
      {
        category: "desenhos-animacao",
        franchise: "disney",
        folder: "pixar/os-incriveis/mulher-elastica",
      },
    ],
    [
      "the incredibles|elastigirl figure",
      {
        category: "desenhos-animacao",
        franchise: "disney",
        folder: "pixar/os-incriveis/mulher-elastica",
      },
    ],
    [
      "the incredibles|elastigirl pinup",
      {
        category: "desenhos-animacao",
        franchise: "disney",
        folder: "pixar/os-incriveis/mulher-elastica",
      },
    ],
    [
      "vampirella|vampirella",
      { category: "outros", franchise: "quadrinhos", folder: "vampirella" },
    ],
  ]);
  const knownReviewTarget = knownReviewTargets.get(`${franchiseText}|${folderText}`);
  if (knownReviewTarget) {
    return { ...knownReviewTarget, reasons: ["review_known_character_restore"] };
  }

  if (franchiseText !== "marca dagua") return null;

  const restoreTargets = new Map([
    [
      "os incriveis mulher elastica",
      {
        category: "desenhos-animacao",
        franchise: "disney",
        folder: "pixar/os-incriveis/mulher-elastica",
        filename: "mulher elastica omnidroid 1.jpg",
      },
    ],
    ["patreon lordzochi cyber girl", { category: "outros", franchise: "sci-fi", folder: "cyber-girl" }],
    ["patreon vaevictis ghost figures", { category: "outros", franchise: "terror", folder: "ghost-figures" }],
    ["patreon il paddyy frieren", { category: "anime", franchise: "frieren", folder: "frieren" }],
    ["xhunart yor forger", { category: "anime", franchise: "spy x family", folder: "yor-forger" }],
    [
      "patreon appendix stl saint seiya nao identificado",
      { category: "anime", franchise: "cavaleiros-do-zodiaco", folder: "personagem-nao-identificado" },
    ],
    ["ayeen3d gawr gura", { category: "outros", franchise: "vtubers", folder: "gawr-gura" }],
    [
      "patreon shinobu sculpts azur lane nao identificado",
      { category: "games", franchise: "azur lane", folder: "nao-identificado" },
    ],
    [
      "patreon neko figurines zenless zone zero nao identificado",
      { category: "games", franchise: "zenless zone zero", folder: "nao-identificado" },
    ],
    ["patreon remysculpts gawr gura", { category: "outros", franchise: "vtubers", folder: "gawr-gura" }],
    ["patreon hex3d commando john matrix", { category: "filmes-series", franchise: "commando", folder: "john-matrix" }],
  ]);
  const target = restoreTargets.get(folderText);
  if (!target) return null;

  return { ...target, reasons: ["modeler_mark_restore"] };
}

function dcUniverseLeakRewrite({ category, franchise, folder } = {}) {
  const categoryText = normalizeComparable(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);

  if (categoryText === "filmes series" && franchiseText === "batman beyond") {
    return {
      category: "dc",
      franchise: "herois",
      folder: "batman-do-futuro",
      reasons: ["dc_universe_reclassification"],
    };
  }

  if (categoryText === "games" && franchiseText === "batman arkham city") {
    return {
      category: "dc",
      franchise: "viloes",
      folder: cleanCatalogSlug(folder, "geral"),
      reasons: ["dc_universe_reclassification"],
    };
  }

  if (categoryText === "outros" && franchiseText === "quadrinhos" && folderText === "harley quinn") {
    return {
      category: "dc",
      franchise: "viloes",
      folder: "arlequina",
      reasons: ["dc_universe_reclassification"],
    };
  }

  return null;
}

function universeGroupKind(groupText) {
  const normalized = normalizeComparable(groupText);
  if (normalized.startsWith("viloes")) return "viloes";
  if (normalized === "herois") return "herois";
  if (normalized === "anti herois") return "anti-herois";
  return normalized;
}

function universeCharacterBucketFromText(categoryText, text, preferredGroupText) {
  const preferredKind = universeGroupKind(preferredGroupText);
  const matches = [];

  for (const [key, entry] of UNIVERSE_CHARACTER_BUCKETS) {
    const separatorIndex = key.indexOf("|");
    const entryCategory = key.slice(0, separatorIndex);
    const alias = key.slice(separatorIndex + 1);
    if (entryCategory !== categoryText || !phraseMatches(text, alias)) continue;

    const entryGroupText = normalizeComparable(entry.group);
    matches.push({
      entry,
      aliasLength: alias.length,
      preferredGroup: entryGroupText === preferredGroupText ? 1 : 0,
      preferredKind: universeGroupKind(entry.group) === preferredKind ? 1 : 0,
    });
  }

  if (matches.length === 0) return null;

  matches.sort(
    (a, b) =>
      b.aliasLength - a.aliasLength ||
      b.preferredGroup - a.preferredGroup ||
      b.preferredKind - a.preferredKind ||
      String(a.entry.group).localeCompare(String(b.entry.group)) ||
      String(a.entry.target).localeCompare(String(b.entry.target)),
  );
  return matches[0].entry;
}

function universeCharacterBucketRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = normalizeComparable(category);
  if (!["dc", "marvel"].includes(categoryText)) return null;

  const franchiseText = normalizeComparable(franchise);
  if (!CANONICAL_UNIVERSE_GROUPS.has(franchiseText)) return null;

  const folderText = normalizeComparable(folder);
  let entry = UNIVERSE_CHARACTER_BUCKETS.get(`${categoryText}|${folderText}`);
  if (!entry && ["dioramas", "grupo"].includes(folderText)) {
    entry = universeCharacterBucketFromText(
      categoryText,
      normalizeComparable(pathBasenameWithoutExtension(filename)),
      franchiseText,
    );
  }
  if (!entry) return null;

  if (
    normalizeComparable(entry.group) === franchiseText &&
    String(entry.target).toLowerCase() === String(folder || "").toLowerCase()
  ) {
    return null;
  }

  return {
    category: categoryText,
    franchise: entry.group,
    folder: entry.target,
    reasons: ["universe_character_bucket_canonicalization"],
  };
}

function corruptCatalogAssetQuarantineRewrite({ category, franchise, folder, filename } = {}) {
  const categoryText = slug(category);
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  const fileText = normalizeComparable(pathBasenameWithoutExtension(filename));

  if (
    categoryText === "outros" &&
    franchiseText === "tabletop" &&
    folderText === "winged biker" &&
    fileText === "winged biker pose 1"
  ) {
    return {
      category: "_problemas",
      franchise: "arquivos-corrompidos",
      folder: "outros/tabletop/winged-biker",
      reasons: ["corrupt_input_quarantine"],
    };
  }

  return null;
}

export function catalogOfficialPtBrRewrite({ category, franchise, folder, filename, isShallow = false } = {}) {
  const normalizedCategory = slug(category);
  if (!normalizedCategory || normalizedCategory.startsWith("_")) return null;

  let nextCategory = normalizedCategory;
  let nextFranchise = franchise;
  let nextFolder = folder;
  const reasons = [];

  const avatarFranchise = avatarFranchiseForFolder(nextCategory, franchise, folder, filename);
  const avatarMovieLeak = avatarMovieLeakRewrite({ category: nextCategory, franchise, folder });
  const franchiseAlias = CATALOG_FRANCHISE_ALIASES.get(aliasKey(nextCategory, franchise));
  const pokemon = pokemonRewrite({ category: nextCategory, franchise, folder });
  const nonOfficialStyle = nonOfficialStyleRewrite({ category: nextCategory, franchise, folder, filename });
  const studioGhibli = studioGhibliRewrite({ category: nextCategory, franchise, folder, filename });
  const sourceStudioBucket = sourceStudioBucketRewrite({ category: nextCategory, franchise, folder, filename });
  const officialFranchiseBucket = officialFranchiseBucketRewrite({ category: nextCategory, franchise, folder, filename });
  const corruptInputQuarantine = corruptCatalogAssetQuarantineRewrite({ category: nextCategory, franchise, folder, filename });
  const watermarkedAssetQuarantine = watermarkedAssetQuarantineRewrite({ category: nextCategory, franchise, folder, filename });
  const dcUniverseLeak = dcUniverseLeakRewrite({ category: nextCategory, franchise, folder, filename });
  const universeCharacterBucket = universeCharacterBucketRewrite({ category: nextCategory, franchise, folder, filename });

  if (corruptInputQuarantine) {
    nextCategory = corruptInputQuarantine.category;
    nextFranchise = corruptInputQuarantine.franchise;
    nextFolder = corruptInputQuarantine.folder;
    reasons.push(...corruptInputQuarantine.reasons);
  } else if (watermarkedAssetQuarantine) {
    nextCategory = watermarkedAssetQuarantine.category;
    nextFranchise = watermarkedAssetQuarantine.franchise;
    nextFolder = watermarkedAssetQuarantine.folder;
    reasons.push(...watermarkedAssetQuarantine.reasons);
  } else if (dcUniverseLeak) {
    nextCategory = dcUniverseLeak.category;
    nextFranchise = dcUniverseLeak.franchise;
    nextFolder = dcUniverseLeak.folder;
    reasons.push(...dcUniverseLeak.reasons);
  } else if (universeCharacterBucket) {
    nextCategory = universeCharacterBucket.category;
    nextFranchise = universeCharacterBucket.franchise;
    nextFolder = universeCharacterBucket.folder;
    reasons.push(...universeCharacterBucket.reasons);
  } else if (studioGhibli) {
    nextCategory = studioGhibli.category;
    nextFranchise = studioGhibli.franchise;
    nextFolder = studioGhibli.folder;
    reasons.push(...studioGhibli.reasons);
  } else if (sourceStudioBucket) {
    nextCategory = sourceStudioBucket.category;
    nextFranchise = sourceStudioBucket.franchise;
    nextFolder = sourceStudioBucket.folder;
    reasons.push(...sourceStudioBucket.reasons);
  } else if (officialFranchiseBucket) {
    nextCategory = officialFranchiseBucket.category;
    nextFranchise = officialFranchiseBucket.franchise;
    nextFolder = officialFranchiseBucket.folder;
    reasons.push(...officialFranchiseBucket.reasons);
  } else if (nonOfficialStyle) {
    nextCategory = nonOfficialStyle.category;
    nextFranchise = nonOfficialStyle.franchise;
    nextFolder = nonOfficialStyle.folder;
    reasons.push(...nonOfficialStyle.reasons);
  } else if (avatarMovieLeak) {
    nextCategory = avatarMovieLeak.category;
    nextFranchise = avatarMovieLeak.franchise;
    nextFolder = avatarMovieLeak.folder;
    reasons.push(...avatarMovieLeak.reasons);
  } else if (avatarFranchise) {
    nextCategory = "desenhos-animacao";
    nextFranchise = avatarFranchise;
    reasons.push("ptbr_franchise_alias");
  } else if (franchiseAlias) {
    nextCategory = franchiseAlias.targetCategory;
    nextFranchise = franchiseAlias.franchise;
    if (franchiseAlias.folder) nextFolder = franchiseAlias.folder;
    reasons.push("ptbr_franchise_alias");
  } else if (pokemon) {
    nextCategory = pokemon.category;
    nextFranchise = pokemon.franchise;
    nextFolder = pokemon.folder;
    reasons.push(...pokemon.reasons);
  }

  const shallowFilenameSubject = shallowFilenameSubjectFolder({
    category: nextCategory,
    franchise: nextFranchise,
    folder: nextFolder,
    filename,
    isShallow,
  });
  if (shallowFilenameSubject && normalizeComparable(shallowFilenameSubject) !== normalizeComparable(nextFolder)) {
    nextFolder = shallowFilenameSubject;
    reasons.push("shallow_filename_subject_folder");
  }

  const directMainSubject = directMainSubjectFolder({
    category: nextCategory,
    franchise: nextFranchise,
    folder: nextFolder,
    filename,
    isShallow,
  });
  if (!shallowFilenameSubject && directMainSubject && normalizeComparable(directMainSubject) !== normalizeComparable(nextFolder)) {
    nextFolder = directMainSubject;
    reasons.push("direct_main_subject_folder");
  }

  const folderAlias = canonicalFolderAlias(nextCategory, nextFranchise, nextFolder);
  if (folderAlias && normalizeComparable(folderAlias) !== normalizeComparable(nextFolder)) {
    nextFolder = folderAlias;
    reasons.push("ptbr_folder_alias");
  }

  if (reasons.length === 0) return null;
  return {
    category: nextCategory,
    franchise: nextFranchise,
    folder: cleanCatalogSubpath(nextFolder, "geral"),
    reasons,
  };
}

export function universeRoot(value) {
  const comparable = normalizeComparable(value);
  if (comparable === "marvel" || comparable === "marvel comics" || comparable === "mcu") return "marvel";
  if (["dc", "d c", "dc comics", "dceu", "detective comics"].includes(comparable)) return "dc";
  return "";
}

function namedFranchiseRoot(value) {
  return NAMED_FRANCHISE_ROOTS.get(normalizeComparable(value)) || null;
}

function otherRootBucket(value) {
  return OTHER_ROOT_BUCKETS.get(normalizeComparable(value)) || "";
}

function isStudioLike(value) {
  const text = normalizeComparable(value);
  if (!text) return false;
  if (/^c\d+\b/.test(text)) return true;
  for (const term of STUDIO_TERMS) {
    if (phraseMatches(text, term)) return true;
  }
  return false;
}

function collapseSubjectFolder(franchise, folder, fallback = "geral") {
  const franchiseText = normalizeComparable(franchise);
  const folderText = normalizeComparable(folder);
  if (folderText && (isStudioLike(franchise) || GENERIC_FOLDER_PARTS.has(franchiseText))) {
    return cleanCatalogSlug(folder, fallback);
  }
  if (!folderText || GENERIC_FOLDER_PARTS.has(folderText) || folderText === franchiseText) {
    return cleanCatalogSlug(franchise, fallback);
  }
  return cleanCatalogSlug(folder, fallback);
}

export function catalogRootRewrite({ category, franchise, folder } = {}) {
  const normalizedCategory = slug(category);
  if (!normalizedCategory || normalizedCategory.startsWith("_")) return null;

  const categoryFranchise = namedFranchiseRoot(category);
  const directFranchise = namedFranchiseRoot(franchise);
  const franchiseRoot = categoryFranchise || directFranchise;
  if (franchiseRoot) {
    return {
      category: franchiseRoot.category,
      franchise: franchiseRoot.franchise,
      folder: directFranchise
        ? cleanCatalogSubpath(folder, "geral")
        : collapseSubjectFolder(franchise, folder),
      reasons: ["franchise_canonicalization"],
    };
  }

  if (MAIN_CATALOG_ROOTS.has(normalizedCategory)) return null;

  const bucket = otherRootBucket(category);
  if (!bucket) return null;

  const reasons = ["main_root_consolidation"];
  if (isStudioLike(franchise)) reasons.push("studio_folder_collapse");
  return {
    category: "outros",
    franchise: bucket,
    folder: collapseSubjectFolder(franchise, folder),
    reasons,
  };
}

export function universeGroupAlias(value) {
  return UNIVERSE_GROUP_ALIASES.get(normalizeComparable(value)) || "";
}

export function universeMediaBucket(value) {
  return UNIVERSE_MEDIA_BUCKETS.has(normalizeComparable(value));
}

export function universeContentGroupCanonicalization({ category, franchise, folder, filename } = {}) {
  const currentUniverse = universeRoot(category);
  if (!currentUniverse) return "";

  const groupAlias = universeGroupAlias(franchise);
  if (groupAlias && normalizeComparable(groupAlias) !== normalizeComparable(franchise)) return groupAlias;

  const franchiseComparable = normalizeComparable(franchise);
  const shouldClassify =
    universeRoot(franchise) ||
    universeMediaBucket(franchise) ||
    !CANONICAL_UNIVERSE_GROUPS.has(franchiseComparable) ||
    franchiseComparable === "outros";

  if (!shouldClassify) return "";

  const group = universeContentGroup({
    category: franchise,
    franchise,
    folder,
    filename,
  });
  if (franchiseComparable === "outros" && normalizeComparable(group) === "outros") return "";
  return group;
}

export function gameOriginFranchise(...values) {
  if (values.length === 1 && values[0] && typeof values[0] === "object" && !Array.isArray(values[0])) {
    const { franchise, folder, filename } = values[0];
    const primaryText = normalizeComparable(franchise);
    for (const [alias, canonical] of GAME_ORIGIN_ALIASES) {
      if (phraseMatches(primaryText, alias)) return canonical;
    }

    const secondaryText = [folder, filename].map((value) => normalizeComparable(value)).filter(Boolean).join(" ");
    for (const [alias, canonical] of GAME_ORIGIN_ALIASES) {
      if (SAFE_SECONDARY_GAME_ALIASES.has(alias) && phraseMatches(secondaryText, alias)) return canonical;
    }
    return "";
  }

  const [franchise = "", ...secondary] = values;
  const primaryText = normalizeComparable(franchise);
  for (const [alias, canonical] of GAME_ORIGIN_ALIASES) {
    if (phraseMatches(primaryText, alias)) return canonical;
  }

  const secondaryText = secondary.map((value) => normalizeComparable(value)).filter(Boolean).join(" ");
  for (const [alias, canonical] of GAME_ORIGIN_ALIASES) {
    if (SAFE_SECONDARY_GAME_ALIASES.has(alias) && phraseMatches(secondaryText, alias)) return canonical;
  }
  return "";
}

export function universeContentGroup({ category, franchise, folder, filename } = {}) {
  const sourceCategory = normalizeComparable(category);
  const accessorySource = ACCESSORY_SOURCE_CATEGORIES.has(sourceCategory);
  const candidateValues = [folder, franchise, filename].filter(Boolean);

  if (accessorySource && hasAnyPhrase(candidateValues, OBJECT_TERMS)) return "objetos-acessorios";
  if (hasAnyPhrase(candidateValues, VEHICLE_TERMS)) return "veiculos";

  for (const value of candidateValues) {
    const text = normalizeComparable(value);
    if (!text || UNIVERSE_MEDIA_BUCKETS.has(text) || universeRoot(text)) continue;
    for (const [alias, group] of SUBJECT_GROUPS) {
      if (phraseMatches(text, alias) || phraseMatches(slug(text), slug(alias))) return group;
    }
  }

  if (hasAnyPhrase(candidateValues, DIORAMA_TERMS)) return "cenas-dioramas";
  if (accessorySource || hasAnyPhrase(candidateValues, OBJECT_TERMS)) return "objetos-acessorios";
  return "outros";
}
