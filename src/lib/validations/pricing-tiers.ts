import { log } from "@/lib/logger";
import type { PricingTier as PricingTierModel } from "@/types/pricing-tiers";
import { z } from "zod";

const MAX_PRICE = 999999.99;
const MIN_PRICE = 0.01;
const MAX_DISCOUNT_PERCENTAGE = 100;
const MIN_DISCOUNT_PERCENTAGE = 0;
const DEFAULT_PIX_DISCOUNT = 5;

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const NAME_REGEX = /^[\p{L}0-9\s_-]+$/u;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

type PricingTierRecord = Pick<PricingTierModel, "id" | "name" | "is_active">;

interface CollectionRecord {
  id: string;
  name: string;
  is_price_custom: boolean;
}

interface QueryError {
  code?: string;
  message?: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

interface ValidationQuery<T> {
  select(columns: string): ValidationQuery<T>;
  eq(column: string, value: string): ValidationQuery<T>;
  neq(column: string, value: string): ValidationQuery<T>;
  single(): Promise<QueryResult<T>>;
}

interface PricingValidationClient {
  from(table: "pricing_tiers"): ValidationQuery<PricingTierRecord>;
  from(table: "collections"): ValidationQuery<CollectionRecord>;
}

export const uuidSchema = z.string().uuid({
  message: "ID deve ser um UUID válido",
});

export const tierNameSchema = z
  .string()
  .min(NAME_MIN_LENGTH, {
    message: `Nome deve ter pelo menos ${NAME_MIN_LENGTH} caractere`,
  })
  .max(NAME_MAX_LENGTH, {
    message: `Nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`,
  })
  .regex(NAME_REGEX, {
    message: "Nome deve conter apenas letras, números, espaços, hífens e underscores",
  })
  .trim();

export const tierDescriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, {
    message: `Descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  .trim()
  .optional();

export const priceFullSchema = z
  .number({
    required_error: "Preço cheio é obrigatório",
    invalid_type_error: "Preço cheio deve ser um número",
  })
  .positive({
    message: "Preço cheio deve ser maior que zero",
  })
  .min(MIN_PRICE, {
    message: `Preço cheio deve ser no mínimo R$ ${MIN_PRICE.toFixed(2)}`,
  })
  .max(MAX_PRICE, {
    message: `Preço cheio deve ser no máximo R$ ${MAX_PRICE.toFixed(2)}`,
  })
  .multipleOf(0.01, {
    message: "Preço cheio deve ter no máximo 2 casas decimais",
  });

export const depositAmountSchema = z
  .number({
    required_error: "Valor de entrada é obrigatório",
    invalid_type_error: "Valor de entrada deve ser um número",
  })
  .positive({
    message: "Valor de entrada deve ser maior que zero",
  })
  .min(MIN_PRICE, {
    message: `Valor de entrada deve ser no mínimo R$ ${MIN_PRICE.toFixed(2)}`,
  })
  .max(MAX_PRICE, {
    message: `Valor de entrada deve ser no máximo R$ ${MAX_PRICE.toFixed(2)}`,
  })
  .multipleOf(0.01, {
    message: "Valor de entrada deve ter no máximo 2 casas decimais",
  });

export const pixDiscountPercentageSchema = z
  .number({
    invalid_type_error: "Percentual de desconto deve ser um número",
  })
  .min(MIN_DISCOUNT_PERCENTAGE, {
    message: `Percentual de desconto deve ser no mínimo ${MIN_DISCOUNT_PERCENTAGE}%`,
  })
  .max(MAX_DISCOUNT_PERCENTAGE, {
    message: `Percentual de desconto deve ser no máximo ${MAX_DISCOUNT_PERCENTAGE}%`,
  })
  .default(DEFAULT_PIX_DISCOUNT);

export const createPricingTierSchema = z
  .object({
    name: tierNameSchema,
    description: tierDescriptionSchema,
    price_full: priceFullSchema,
    deposit_amount: depositAmountSchema,
    pix_discount_percentage: pixDiscountPercentageSchema,
    is_default: z.boolean().default(false),
  })
  .refine((data) => data.deposit_amount < data.price_full, {
    message: "Valor de entrada deve ser menor que o preço cheio",
    path: ["deposit_amount"],
  });

export const updatePricingTierSchema = z
  .object({
    name: tierNameSchema.optional(),
    description: tierDescriptionSchema,
    price_full: priceFullSchema.optional(),
    deposit_amount: depositAmountSchema.optional(),
    pix_discount_percentage: pixDiscountPercentageSchema.optional(),
    is_active: z.boolean().optional(),
    is_default: z.boolean().optional(),
    display_order: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => {
      if (data.price_full !== undefined && data.deposit_amount !== undefined) {
        return data.deposit_amount < data.price_full;
      }
      return true;
    },
    {
      message: "Valor de entrada deve ser menor que o preço cheio",
      path: ["deposit_amount"],
    }
  );

export const assignTierSchema = z.object({
  collection_id: uuidSchema,
  tier_id: uuidSchema,
});

export const bulkAssignTierSchema = z.object({
  collection_ids: z
    .array(uuidSchema)
    .min(1, {
      message: "Deve haver pelo menos uma coleção para atribuir",
    })
    .max(100, {
      message: "Não é possível atribuir mais de 100 coleções de uma vez",
    }),
  tier_id: uuidSchema,
});

export const migrateToTiersSchema = z.object({
  dryRun: z.boolean().default(true),
  autoCreateTiers: z.boolean().default(true),
});

export const getPricingReportsSchema = z.object({
  reportType: z.enum(["collections_by_tier", "revenue_by_tier", "conversion_by_tier"], {
    required_error: "Tipo de relatório é obrigatório",
    invalid_type_error: "Tipo de relatório inválido",
  }),
  dateRange: z
    .object({
      start: z.string().datetime({
        message: "Data de início deve estar no formato ISO 8601",
      }),
      end: z.string().datetime({
        message: "Data de fim deve estar no formato ISO 8601",
      }),
    })
    .optional()
    .refine(
      (data) => {
        if (!data) return true;
        return new Date(data.start) <= new Date(data.end);
      },
      {
        message: "Data de início deve ser anterior ou igual à data de fim",
        path: ["start"],
      }
    ),
});

export type CreatePricingTierInput = z.infer<typeof createPricingTierSchema>;
export type UpdatePricingTierInput = z.infer<typeof updatePricingTierSchema>;
export type AssignTierInput = z.infer<typeof assignTierSchema>;
export type BulkAssignTierInput = z.infer<typeof bulkAssignTierSchema>;
export type MigrateToTiersInput = z.infer<typeof migrateToTiersSchema>;
export type GetPricingReportsInput = z.infer<typeof getPricingReportsSchema>;

export async function validateTierExists(
  tierId: string,
  supabaseClient: PricingValidationClient
): Promise<ValidationResult & { tier?: PricingTierRecord }> {
  try {
    const { data, error } = await supabaseClient
      .from("pricing_tiers")
      .select("id, name, is_active")
      .eq("id", tierId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "Nível de preço não encontrado",
      };
    }

    return { valid: true, tier: data };
  } catch (error) {
    log.error("Erro ao validar nível de preço", { error, tierId });
    return {
      valid: false,
      error: "Erro ao validar nível de preço",
    };
  }
}

export function validateTierActive(
  tier: Pick<PricingTierRecord, "is_active" | "name">
): ValidationResult {
  if (!tier.is_active) {
    return {
      valid: false,
      error: `Nível '${tier.name}' não está ativo`,
    };
  }

  return { valid: true };
}

export async function validateCollectionExists(
  collectionId: string,
  supabaseClient: PricingValidationClient
): Promise<ValidationResult & { collection?: CollectionRecord }> {
  try {
    const { data, error } = await supabaseClient
      .from("collections")
      .select("id, name, is_price_custom")
      .eq("id", collectionId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "Coleção não encontrada",
      };
    }

    return { valid: true, collection: data };
  } catch (error) {
    log.error("Erro ao validar coleção", { error, collectionId });
    return {
      valid: false,
      error: "Erro ao validar coleção",
    };
  }
}

export async function validateTierNameUnique(
  name: string,
  supabaseClient: PricingValidationClient,
  excludeTierId?: string
): Promise<ValidationResult> {
  try {
    let query = supabaseClient.from("pricing_tiers").select("id").eq("name", name);

    if (excludeTierId) {
      query = query.neq("id", excludeTierId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      log.error("Erro ao verificar unicidade do nome do nível", { error, name, excludeTierId });
      return {
        valid: false,
        error: "Erro ao validar nome do nível",
      };
    }

    if (data) {
      return {
        valid: false,
        error: "Já existe um nível com este nome",
      };
    }

    return { valid: true };
  } catch (error) {
    log.error("Erro ao validar unicidade do nome do nível", { error, name, excludeTierId });
    return {
      valid: false,
      error: "Erro ao validar nome do nível",
    };
  }
}

export function calculatePixPrice(priceFull: number, pixDiscountPercentage: number): number {
  return Math.round(priceFull * (1 - pixDiscountPercentage / 100) * 100) / 100;
}
