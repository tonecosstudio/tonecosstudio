import { z } from "zod";

export const purchaseModeSchema = z.object({
  mode_key: z.enum(["standalone", "trimestral", "semestral", "anual"], {
    error: "Modalidade inválida",
  }),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  price_multiplier: z
    .number()
    .min(0.1, "Multiplicador deve ser no mínimo 0.1")
    .max(2.0, "Multiplicador deve ser no máximo 2.0"),
  collections_count: z
    .number()
    .int("Número de coleções deve ser inteiro")
    .positive("Número de coleções deve ser positivo"),
  deliveries_total: z
    .number()
    .int("Número de entregas deve ser inteiro")
    .positive("Número de entregas deve ser positivo"),
  includes_bonus: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const updatePurchaseModeSchema = purchaseModeSchema
  .partial()
  .omit({ mode_key: true });

export const updateMultiplierSchema = z.object({
  mode_key: z.enum(["standalone", "trimestral", "semestral", "anual"]),
  new_multiplier: z
    .number()
    .min(0.1, "Multiplicador deve ser no mínimo 0.1")
    .max(2.0, "Multiplicador deve ser no máximo 2.0"),
});

export type UpdatePurchaseModeFormData = z.infer<typeof updatePurchaseModeSchema>;
export type UpdateMultiplierFormData = z.infer<typeof updateMultiplierSchema>;

export function isValidMultiplier(multiplier: number): boolean {
  return multiplier >= 0.1 && multiplier <= 2.0;
}

export function isValidDeposit(deposit: number, priceFull: number): boolean {
  return deposit >= 0 && deposit < priceFull;
}

export function calculatePlanPrice(
  tierPrice: number,
  multiplier: number,
): number {
  if (!isValidMultiplier(multiplier)) {
    throw new Error("Multiplicador inválido");
  }

  return Math.round(tierPrice * multiplier * 100) / 100;
}

export function calculatePixPrice(
  priceFull: number,
  pixDiscountPercentage: number,
): number {
  if (pixDiscountPercentage < 0 || pixDiscountPercentage >= 100) {
    throw new Error("Desconto PIX inválido");
  }

  return Math.round(priceFull * (1 - pixDiscountPercentage / 100) * 100) / 100;
}

export function calculateAllPrices(
  tierPrice: number,
  pixDiscountPercentage: number,
  multipliers: Record<string, number>,
): Record<string, { priceFull: number; pricePix: number }> {
  const result: Record<string, { priceFull: number; pricePix: number }> = {};

  for (const [mode, multiplier] of Object.entries(multipliers)) {
    const priceFull = calculatePlanPrice(tierPrice, multiplier);
    const pricePix = calculatePixPrice(priceFull, pixDiscountPercentage);
    result[mode] = { priceFull, pricePix };
  }

  return result;
}
