/**
 * Types for Collections (Subscription System)
 */

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  priceMonthly: number; // Preço bimestral (a cada 2 meses)
  priceYearly: number; // Preço anual (com 10% desconto)
  totalCharacters: number;
  releaseFrequency: string; // "A cada 2 meses"
}

export interface CollectionCharacter {
  id: string;
  collectionId: string;
  name: string;
  description: string;
  imageUrls: string[];
  releaseOrder: number;
  releaseDate?: Date;
  revealDate?: Date;
  status: "upcoming" | "revealed" | "released";
  availableStandalone: boolean;
}
