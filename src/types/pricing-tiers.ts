import type { Json } from "@/integrations/supabase/types";

/**
 * Tipos TypeScript para o Sistema de Níveis de Preço.
 *
 * Define interfaces e tipos para níveis de preço, atribuições,
 * histórico e relatórios do modelo canônico atual.
 */

// =====================================================
// TIPOS BASE DO BANCO DE DADOS
// =====================================================

/**
 * Nível de Preço
 * Representa um nível de preço reutilizável que pode ser atribuído a múltiplas coleções.
 */
export interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price_full: number;
  deposit_amount: number;
  pix_discount_percentage: number;
  price_pix: number;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Nível de Preço com Estatísticas.
 */
export interface PricingTierWithStats extends PricingTier {
  collections_count: number;
  active_collections_count: number;
}

/**
 * Atribuição de Coleção a Nível.
 */
export interface CollectionTierAssignment {
  id: string;
  collection_id: string;
  tier_id: string;
  assigned_at: string;
  assigned_by: string;
  previous_tier_id: string | null;
}

/**
 * Histórico de Preços.
 */
export interface PricingHistory {
  id: string;
  tier_id: string | null;
  collection_id: string | null;
  change_type:
    | "tier_created"
    | "tier_updated"
    | "tier_assigned"
    | "tier_unassigned"
    | "price_propagated"
    | "custom_price_set";
  old_price_full: number | null;
  new_price_full: number | null;
  old_price_pix: number | null;
  new_price_pix: number | null;
  old_deposit_amount: number | null;
  new_deposit_amount: number | null;
  changed_at: string;
  changed_by: string;
  metadata: Record<string, Json> | null;
}

/**
 * Coleção com Informações de Preço.
 */
export interface CollectionWithPricing {
  id: string;
  name: string;
  slug: string;
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  is_price_custom: boolean;
  uses_tier_pricing: boolean;
  tier_id: string | null;
  tier_name: string | null;
  pricing_source: "custom" | "tier" | "default";
}

// =====================================================
// TIPOS DE INPUT PARA OPERAÇÕES
// =====================================================

export interface CreatePricingTierInput {
  name: string;
  description?: string;
  price_full: number;
  deposit_amount: number;
  pix_discount_percentage?: number;
  is_default?: boolean;
}

export interface UpdatePricingTierInput {
  name?: string;
  description?: string;
  price_full?: number;
  deposit_amount?: number;
  pix_discount_percentage?: number;
  is_active?: boolean;
  is_default?: boolean;
  display_order?: number;
}

export interface AssignTierInput {
  collection_id: string;
  tier_id: string;
}

export interface BulkAssignTierInput {
  collection_ids: string[];
  tier_id: string;
}

export interface GetPricingReportsInput {
  reportType: "collections_by_tier" | "revenue_by_tier" | "conversion_by_tier";
  dateRange?: {
    start: string;
    end: string;
  };
}

// =====================================================
// TIPOS AUXILIARES E RESULTADOS
// =====================================================

export interface PropagationResult {
  collection_id: string;
  old_price: number;
  new_price: number;
  success: boolean;
  error_message?: string;
}

export interface BulkAssignResult {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// =====================================================
// TIPOS DE RELATÓRIOS
// =====================================================

export interface CollectionsByTierReport {
  tier_id: string;
  tier_name: string;
  collection_count: number;
  active_collection_count: number;
}

export interface RevenueByTierReport {
  tier_id: string;
  tier_name: string;
  total_revenue: number;
  subscription_revenue: number;
  standalone_revenue: number;
}

export interface ConversionByTierReport {
  tier_id: string;
  tier_name: string;
  views: number | null;
  purchases: number;
  conversion_rate: number | null;
}

export type PricingReportResult =
  | { reportType: "collections_by_tier"; data: CollectionsByTierReport[] }
  | { reportType: "revenue_by_tier"; data: RevenueByTierReport[] }
  | { reportType: "conversion_by_tier"; data: ConversionByTierReport[] };

// =====================================================
// TIPOS DE RESPOSTA DE API
// =====================================================

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PropagateTierPricingResponse extends ApiSuccessResponse {
  updated_count: number;
  failed_count: number;
  results: PropagationResult[];
}

export interface BulkAssignTierResponse extends ApiSuccessResponse {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

export type GetPricingReportsResponse = ApiSuccessResponse<PricingReportResult>;
