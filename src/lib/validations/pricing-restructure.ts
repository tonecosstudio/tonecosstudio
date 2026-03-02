// src/lib/validations/pricing-restructure.ts
// Feature: pricing-system-restructure
// Schemas de validação Zod para o sistema de preços reestruturado

import { z } from 'zod';

/**
 * Schema para modalidade de compra
 */
export const purchaseModeSchema = z.object({
  mode_key: z.enum(['standalone', 'trimestral', 'semestral', 'anual'], {
    errorMap: () => ({ message: 'Modalidade inválida' }),
  }),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  price_multiplier: z
    .number()
    .min(0.1, 'Multiplicador deve ser no mínimo 0.1')
    .max(2.0, 'Multiplicador deve ser no máximo 2.0'),
  collections_count: z
    .number()
    .int('Número de coleções deve ser inteiro')
    .positive('Número de coleções deve ser positivo'),
  deliveries_total: z
    .number()
    .int('Número de entregas deve ser inteiro')
    .positive('Número de entregas deve ser positivo'),
  includes_bonus: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

/**
 * Schema para atualizar modalidade de compra
 */
export const updatePurchaseModeSchema = purchaseModeSchema
  .partial()
  .omit({ mode_key: true });

/**
 * Schema para criar nível com planos
 */
export const createTierWithPlansSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    description: z.string().max(500, 'Descrição muito longa').optional(),
    price_full: z
      .number()
      .positive('Preço cheio deve ser maior que zero')
      .max(100000, 'Preço muito alto'),
    deposit_amount: z
      .number()
      .positive('Valor da entrada deve ser maior que zero')
      .max(100000, 'Valor muito alto'),
    pix_discount_percentage: z
      .number()
      .min(0, 'Desconto não pode ser negativo')
      .max(100, 'Desconto não pode ser maior que 100%')
      .default(5),
    is_default: z.boolean().default(false),
    display_order: z.number().int().min(0).default(0),
  })
  .refine((data) => data.deposit_amount < data.price_full, {
    message: 'Valor da entrada deve ser menor que o preço cheio',
    path: ['deposit_amount'],
  });

/**
 * Schema para atualizar nível e recalcular planos
 */
export const updateTierAndRecalculateSchema = z.object({
  tier_id: z.string().uuid('ID do nível inválido'),
  price_full: z.number().positive('Preço deve ser positivo').optional(),
  deposit_amount: z.number().positive('Entrada deve ser positiva').optional(),
  pix_discount_percentage: z
    .number()
    .min(0)
    .max(100)
    .optional(),
});

/**
 * Schema para atualizar multiplicador de modalidade
 */
export const updateMultiplierSchema = z.object({
  mode_key: z.enum(['standalone', 'trimestral', 'semestral', 'anual']),
  new_multiplier: z
    .number()
    .min(0.1, 'Multiplicador deve ser no mínimo 0.1')
    .max(2.0, 'Multiplicador deve ser no máximo 2.0'),
});

/**
 * Tipos inferidos dos schemas
 */
export type CreateTierWithPlansFormData = z.infer<typeof createTierWithPlansSchema>;
export type UpdatePurchaseModeFormData = z.infer<typeof updatePurchaseModeSchema>;
export type UpdateTierAndRecalculateFormData = z.infer<typeof updateTierAndRecalculateSchema>;
export type UpdateMultiplierFormData = z.infer<typeof updateMultiplierSchema>;

/**
 * Funções auxiliares de validação
 */

/**
 * Valida se um multiplicador está no intervalo válido
 */
export function isValidMultiplier(multiplier: number): boolean {
  return multiplier >= 0.1 && multiplier <= 2.0;
}

/**
 * Valida se o valor da entrada é menor que o preço cheio
 */
export function isValidDeposit(deposit: number, priceFull: number): boolean {
  return deposit > 0 && deposit < priceFull;
}

/**
 * Calcula o preço de um plano baseado no preço do nível e multiplicador
 */
export function calculatePlanPrice(
  tierPrice: number,
  multiplier: number
): number {
  if (!isValidMultiplier(multiplier)) {
    throw new Error('Multiplicador inválido');
  }
  return Math.round(tierPrice * multiplier * 100) / 100;
}

/**
 * Calcula o preço PIX baseado no preço cheio e desconto
 */
export function calculatePixPrice(
  priceFull: number,
  pixDiscountPercentage: number
): number {
  if (pixDiscountPercentage < 0 || pixDiscountPercentage > 100) {
    throw new Error('Desconto PIX inválido');
  }
  return Math.round(priceFull * (1 - pixDiscountPercentage / 100) * 100) / 100;
}

/**
 * Valida e calcula todos os preços de um nível
 */
export function calculateAllPrices(
  tierPrice: number,
  pixDiscountPercentage: number,
  multipliers: Record<string, number>
): Record<string, { priceFull: number; pricePix: number }> {
  const result: Record<string, { priceFull: number; pricePix: number }> = {};

  for (const [mode, multiplier] of Object.entries(multipliers)) {
    const priceFull = calculatePlanPrice(tierPrice, multiplier);
    const pricePix = calculatePixPrice(priceFull, pixDiscountPercentage);
    result[mode] = { priceFull, pricePix };
  }

  return result;
}
