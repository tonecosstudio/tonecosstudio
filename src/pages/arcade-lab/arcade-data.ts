/** Illustrative art direction only. These entries are never commercial inventory. */
export interface ArcadeFighter {
  id: string;
  name: string;
  universe: string;
  subtitle: string;
  description: string;
  sprite?: number;
  image?: string | null;
  href?: string;
}

export const ARCADE_UNIVERSES = [
  {
    id: "combat",
    name: "Lendas do combate",
    label: "Luta",
    subtitle: "Uma arena. Muitas lendas.",
    stage: 0,
  },
  {
    id: "metal",
    name: "Missão metal",
    label: "Metal",
    subtitle: "Pequenos heróis. Grandes missões.",
    stage: 1,
  },
  {
    id: "neo",
    name: "Neo fighters",
    label: "Neo",
    subtitle: "O próximo nível é outro universo.",
    stage: 2,
  },
] as const;

export const DEMO_FIGHTERS: ArcadeFighter[] = [
  {
    id: "kage",
    name: "Kage",
    universe: "combat",
    subtitle: "A sombra da arena",
    description:
      "Armadura marcada pelo tempo, tecido ao vento e uma pose que antecede o primeiro movimento. Um estudo de personagem para a coleção Lendas do combate.",
    sprite: 0,
  },
  {
    id: "ember",
    name: "Ember",
    universe: "combat",
    subtitle: "As ruas têm uma nova lenda",
    description:
      "Punhos firmes, jaqueta vermelha e atitude de quem nunca recua. Uma interpretação da energia dos jogos de luta dos anos 90.",
    sprite: 1,
  },
  {
    id: "atlas",
    name: "Atlas",
    universe: "metal",
    subtitle: "Missão dada. Coleção iniciada.",
    description:
      "Equipamento pesado e espírito de aventura. Um personagem inspirado no humor e nos detalhes mecânicos dos arcades de ação.",
    sprite: 2,
  },
  {
    id: "ronin",
    name: "Ronin",
    universe: "neo",
    subtitle: "Entre o aço e o silêncio",
    description:
      "Armadura em marfim, capa azul e um mundo em ruínas. Tradição e ficção científica se encontram neste estudo de colecionável.",
    sprite: 3,
  },
  {
    id: "nova",
    name: "Nova",
    universe: "neo",
    subtitle: "Além da última fase",
    description:
      "Uma exploradora de outros mundos. Formas angulares, tons de ciano e detalhes de uma aventura que ainda está por começar.",
    sprite: 4,
  },
  {
    id: "bolt",
    name: "Bolt",
    universe: "metal",
    subtitle: "Tamanho compacto. Personalidade gigante.",
    description:
      "Um pequeno tanque com uma grande presença. Chapas de metal, pintura gasta e a simpatia dos personagens mecânicos de fliperama.",
    sprite: 5,
  },
];
