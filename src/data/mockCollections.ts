import { Collection } from "@/types/collections";

/**
 * Mock data for collections (Fase 1 - Testing)
 * Replace with real data from database in Fase 2
 */
export const mockCollections: Collection[] = [
  {
    id: "1",
    name: "Thundercats",
    slug: "thundercats",
    description:
      "12 personagens icônicos dos Thundercats. Receba Lion-O, Cheetara, Panthro e outros heróis de Thundera.",
    coverImage: "/placeholder.svg",
    priceMonthly: 150,
    priceYearly: 810, // 10% desconto (R$ 900 → R$ 810)
    totalCharacters: 12,
    releaseFrequency: "A cada 2 meses",
  },
  {
    id: "2",
    name: "X-Men",
    slug: "x-men",
    description:
      "12 mutantes mais poderosos da Marvel. Wolverine, Ciclope, Tempestade e toda a equipe de Charles Xavier.",
    coverImage: "/placeholder.svg",
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
    releaseFrequency: "A cada 2 meses",
  },
  {
    id: "3",
    name: "Vilões do Homem-Aranha",
    slug: "viloes-homem-aranha",
    description:
      "12 vilões clássicos do Homem-Aranha. Duende Verde, Doutor Octopus, Venom e os maiores inimigos do Aranha.",
    coverImage: "/placeholder.svg",
    priceMonthly: 150,
    priceYearly: 810,
    totalCharacters: 12,
    releaseFrequency: "A cada 2 meses",
  },
];
