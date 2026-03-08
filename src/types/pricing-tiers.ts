/**
 * Tipos TypeScript para o Sistema de Níveis de Preço
 * 
 * Define interfaces e tipos para níveis de preço, atribuições,
 * histórico e relatórios.
 */

// =====================================================
// TIPOS BASE DO BANCO DE DADOS
// =====================================================

/**
 * Nível de Preço
 * Representa um nível de preço reutilizável que pode ser atribuído a múltiplas coleções
 */
export interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price_full: number;
  deposit_amount: number;
  pix_discount_percentage: number;
  price_pix: number; // Calculado automaticamente
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
}

/**
 * Nível de Preço com Estatísticas
 * Inclui contadores de coleções atribuídas
 */
export interface PricingTierWithStats extends PricingTier {
  collections_count: number;
  active_collections_count: number;
}

/**
 * Atribuição de Coleção a Nível
 * Registra qual nível está atribuído a cada coleção
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
 * Histórico de Preços
 * Registra todas as mudanças de preço para auditoria
 */
export interface PricingHistory {
  id: string;
  tier_id: string | null;
  collection_id: string | null;
  change_type: 'tier_created' | 'tier_updated' | 'tier_assigned' | 'tier_unassigned' | 'price_propagated' | 'custom_price_set';
  old_price_full: number | null;
  new_price_full: number | null;
  old_price_pix: number | null;
  new_price_pix: number | null;
  old_deposit_amount: number | null;
  new_deposit_amount: number | null;
  changed_at: string;
  changed_by: string;
  metadata: Record<string, any> | null;
}

/**
 * Auditoria de Migração
 * Registra execuções de migração para o sistema de níveis
 */
export interface MigrationAudit {
  id: string;
  migration_type: 'initial_migration' | 'bulk_reassignment' | 'rollback';
  collections_affected: number;
  tiers_created: number;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'completed_with_errors' | 'failed';
  executed_by: string;
  error_message: string | null;
  migration_data: Record<string, any> | null;
}

/**
 * Coleção com Informações de Preço
 * Inclui informações sobre o nível atribuído e preços efetivos
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
  pricing_source: 'custom' | 'tier' | 'default';
}

// =====================================================
// TIPOS DE INPUT PARA OPERAÇÕES
// =====================================================

/**
 * Input para Criar Nível de Preço
 */
export interface CreatePricingTierInput {
  name: string;
  description?: string;
  price_full: number;
  deposit_amount: number;
  pix_discount_percentage?: number; // Default: 5
  is_default?: boolean; // Default: false
}

/**
 * Input para Atualizar Nível de Preço
 */
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

/**
 * Input para Atribuir Coleção a Nível
 */
export interface AssignTierInput {
  collection_id: string;
  tier_id: string;
}

/**
 * Input para Atribuição em Massa
 */
export interface BulkAssignTierInput {
  collection_ids: string[];
  tier_id: string;
}

/**
 * Input para Migração
 */
export interface MigrateToTiersInput {
  dryRun: boolean;
  autoCreateTiers: boolean;
}

/**
 * Input para Relatórios
 */
export interface GetPricingReportsInput {
  reportType: 'collections_by_tier' | 'revenue_by_tier' | 'conversion_by_tier';
  dateRange?: {
    start: string;
    end: string;
  };
}

// =====================================================
// TIPOS AUXILIARES E RESULTADOS
// =====================================================

/**
 * Sugestão de Migração
 * Resultado da análise de preços existentes
 */
export interface MigrationSuggestion {
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  collection_count: number;
  collection_ids: string[];
  suggested_tier_name: string;
}

/**
 * Resultado de Propagação de Preços
 */
export interface PropagationResult {
  collection_id: string;
  old_price: number;
  new_price: number;
  success: boolean;
  error_message?: string;
}

/**
 * Resultado de Atribuição em Massa
 */
export interface BulkAssignResult {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Resultado de Migração (Dry Run)
 */
export interface MigrationDryRunResult {
  dryRun: true;
  suggestions: MigrationSuggestion[];
}

/**
 * Resultado de Migração (Real)
 */
export interface MigrationRealResult {
  dryRun: false;
  tiersCreated: number;
  collectionsAssigned: number;
  errors: string[];
}

/**
 * Resultado de Migração (Union)
 */
export type MigrationResult = MigrationDryRunResult | MigrationRealResult;

// =====================================================
// TIPOS DE RELATÓRIOS
// =====================================================

/**
 * Relatório de Coleções por Nível
 */
export interface CollectionsByTierReport {
  tier_id: string;
  tier_name: string;
  collection_count: number;
  active_collection_count: number;
}

/**
 * Relatório de Receita por Nível
 */
export interface RevenueByTierReport {
  tier_id: string;
  tier_name: string;
  total_revenue: number;
  subscription_revenue: number;
  standalone_revenue: number;
}

/**
 * Relatório de Conversão por Nível
 */
export interface ConversionByTierReport {
  tier_id: string;
  tier_name: string;
  views: number;
  purchases: number;
  conversion_rate: number;
}

/**
 * Resultado de Relatório (Union)
 */
export type PricingReportResult =
  | { reportType: 'collections_by_tier'; data: CollectionsByTierReport[] }
  | { reportType: 'revenue_by_tier'; data: RevenueByTierReport[] }
  | { reportType: 'conversion_by_tier'; data: ConversionByTierReport[] };

// =====================================================
// TIPOS DE RESPOSTA DE API
// =====================================================

/**
 * Resposta de Sucesso Genérica
 */
export interface ApiSuccessResponse<T = any> {
  ok: true;
  data?: T;
}

/**
 * Resposta de Erro Genérica
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
}

/**
 * Resposta de API (Union)
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Resposta de Propagação de Preços
 */
export interface PropagateTierPricingResponse extends ApiSuccessResponse {
  updated_count: number;
  failed_count: number;
  results: PropagationResult[];
}

/**
 * Resposta de Atribuição em Massa
 */
export interface BulkAssignTierResponse extends ApiSuccessResponse {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Resposta de Migração
 */
export type MigrateToTiersResponse = ApiSuccessResponse<MigrationResult>;

/**
 * Resposta de Relatórios
 */
export type GetPricingReportsResponse = ApiSuccessResponse<PricingReportResult>;
