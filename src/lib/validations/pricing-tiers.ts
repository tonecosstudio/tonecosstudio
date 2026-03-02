import { z } from "zod";

/**
 * Schemas de Validação Zod para Sistema de Níveis de Preço
 * 
 * Define validações para criação, atualização e operações com níveis de preço.
 * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */

// =====================================================
// CONSTANTES DE VALIDAÇÃO
// =====================================================

const MAX_PRICE = 999999.99;
const MIN_PRICE = 0.01;
const MAX_DISCOUNT_PERCENTAGE = 100;
const MIN_DISCOUNT_PERCENTAGE = 0;
const DEFAULT_PIX_DISCOUNT = 5;

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

// Regex para nome alfanumérico com espaços, hífens e underscores
const NAME_REGEX = /^[a-zA-Z0-9\s\-_áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+$/;

// =====================================================
// SCHEMAS BASE
// =====================================================

/**
 * Schema para validar UUID
 */
export const uuidSchema = z.string().uuid({
  message: "ID deve ser um UUID válido",
});

/**
 * Schema para validar nome de nível
 * Requisitos: 1.2, 7.1
 */
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

/**
 * Schema para validar descrição de nível
 */
export const tierDescriptionSchema = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, {
    message: `Descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  .trim()
  .optional();

/**
 * Schema para validar preço cheio
 * Requisitos: 7.2
 */
export const priceFullSchema = z
  .number({
    required_error: "Preço cheio é obrigatório",
    invalid_type_error: "Preço cheio deve ser um número",
  })
  .positive({
    message: "Preço cheio deve ser maior que zero",
  })
  .max(MAX_PRICE, {
    message: `Preço cheio deve ser no máximo R$ ${MAX_PRICE.toFixed(2)}`,
  })
  .multipleOf(0.01, {
    message: "Preço cheio deve ter no máximo 2 casas decimais",
  });

/**
 * Schema para validar valor de entrada
 * Requisitos: 7.3
 */
export const depositAmountSchema = z
  .number({
    required_error: "Valor de entrada é obrigatório",
    invalid_type_error: "Valor de entrada deve ser um número",
  })
  .positive({
    message: "Valor de entrada deve ser maior que zero",
  })
  .max(MAX_PRICE, {
    message: `Valor de entrada deve ser no máximo R$ ${MAX_PRICE.toFixed(2)}`,
  })
  .multipleOf(0.01, {
    message: "Valor de entrada deve ter no máximo 2 casas decimais",
  });

/**
 * Schema para validar percentual de desconto PIX
 * Requisitos: 7.4
 */
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

// =====================================================
// SCHEMAS DE INPUT
// =====================================================

/**
 * Schema para criar nível de preço
 * Requisitos: 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const createPricingTierSchema = z
  .object({
    name: tierNameSchema,
    description: tierDescriptionSchema,
    price_full: priceFullSchema,
    deposit_amount: depositAmountSchema,
    pix_discount_percentage: pixDiscountPercentageSchema,
    is_default: z.boolean().default(false),
  })
  .refine(
    (data) => data.deposit_amount < data.price_full,
    {
      message: "Valor de entrada deve ser menor que o preço cheio",
      path: ["deposit_amount"],
    }
  );

/**
 * Schema para atualizar nível de preço
 * Requisitos: 1.6, 7.1, 7.2, 7.3, 7.4
 */
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
      // Se ambos price_full e deposit_amount estão presentes, validar relação
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

/**
 * Schema para atribuir coleção a nível
 * Requisitos: 2.1, 2.5
 */
export const assignTierSchema = z.object({
  collection_id: uuidSchema,
  tier_id: uuidSchema,
});

/**
 * Schema para atribuição em massa
 * Requisitos: 10.1, 10.2
 */
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

/**
 * Schema para migração
 * Requisitos: 5.1, 5.4
 */
export const migrateToTiersSchema = z.object({
  dryRun: z.boolean().default(true),
  autoCreateTiers: z.boolean().default(true),
});

/**
 * Schema para relatórios
 * Requisitos: 11.1
 */
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
        const start = new Date(data.start);
        const end = new Date(data.end);
        return start <= end;
      },
      {
        message: "Data de início deve ser anterior ou igual à data de fim",
        path: ["start"],
      }
    ),
});

// =====================================================
// TIPOS INFERIDOS DOS SCHEMAS
// =====================================================

export type CreatePricingTierInput = z.infer<typeof createPricingTierSchema>;
export type UpdatePricingTierInput = z.infer<typeof updatePricingTierSchema>;
export type AssignTierInput = z.infer<typeof assignTierSchema>;
export type BulkAssignTierInput = z.infer<typeof bulkAssignTierSchema>;
export type MigrateToTiersInput = z.infer<typeof migrateToTiersSchema>;
export type GetPricingReportsInput = z.infer<typeof getPricingReportsSchema>;

// =====================================================
// FUNÇÕES DE VALIDAÇÃO AUXILIARES
// =====================================================

/**
 * Valida se um nível existe no banco de dados
 * Requisitos: 2.1, 10.4
 */
export async function validateTierExists(
  tierId: string,
  supabase: any
): Promise<{ valid: boolean; error?: string; tier?: any }> {
  try {
    const { data, error } = await supabase
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
    console.error("Error validating tier:", error);
    return {
      valid: false,
      error: "Erro ao validar nível de preço",
    };
  }
}

/**
 * Valida se um nível está ativo
 * Requisitos: 1.8, 10.4
 */
export function validateTierActive(tier: any): { valid: boolean; error?: string } {
  if (!tier.is_active) {
    return {
      valid: false,
      error: `Nível '${tier.name}' não está ativo`,
    };
  }

  return { valid: true };
}

/**
 * Valida se uma coleção existe no banco de dados
 * Requisitos: 2.1
 */
export async function validateCollectionExists(
  collectionId: string,
  supabase: any
): Promise<{ valid: boolean; error?: string; collection?: any }> {
  try {
    const { data, error } = await supabase
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
    console.error("Error validating collection:", error);
    return {
      valid: false,
      error: "Erro ao validar coleção",
    };
  }
}

/**
 * Valida se um nome de nível é único
 * Requisitos: 1.2
 */
export async function validateTierNameUnique(
  name: string,
  supabase: any,
  excludeTierId?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    let query = supabase
      .from("pricing_tiers")
      .select("id")
      .eq("name", name);

    if (excludeTierId) {
      query = query.neq("id", excludeTierId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (which is what we want)
      console.error("Error checking tier name uniqueness:", error);
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
    console.error("Error validating tier name uniqueness:", error);
    return {
      valid: false,
      error: "Erro ao validar nome do nível",
    };
  }
}

/**
 * Calcula o preço PIX baseado no preço cheio e percentual de desconto
 * Requisitos: 1.4
 */
export function calculatePixPrice(priceFull: number, pixDiscountPercentage: number): number {
  return Math.round(priceFull * (1 - pixDiscountPercentage / 100) * 100) / 100;
}
