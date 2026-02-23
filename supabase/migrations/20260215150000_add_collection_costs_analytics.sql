-- ============================================
-- Migration: Sistema de Custos e Análise Financeira por Coleção
-- Data: 2026-02-15 15:00
-- Descrição: Adicionar custos de produção e métricas financeiras
-- ============================================

-- =====================================================
-- 1. ADICIONAR CAMPOS DE CUSTO NAS COLEÇÕES
-- =====================================================

ALTER TABLE collections
ADD COLUMN IF NOT EXISTS cost_material NUMERIC(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS cost_labor NUMERIC(10,2) DEFAULT 80.00,
ADD COLUMN IF NOT EXISTS cost_packaging NUMERIC(10,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS cost_shipping NUMERIC(10,2) DEFAULT 40.00,
ADD COLUMN IF NOT EXISTS cost_other NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_notes TEXT;

-- Comentários
COMMENT ON COLUMN collections.cost_material IS 'Custo de material/resina por peça';
COMMENT ON COLUMN collections.cost_labor IS 'Custo de mão de obra (pintura, escultura)';
COMMENT ON COLUMN collections.cost_packaging IS 'Custo de embalagem MDF';
COMMENT ON COLUMN collections.cost_shipping IS 'Custo médio de frete';
COMMENT ON COLUMN collections.cost_other IS 'Outros custos (marketing, etc)';
COMMENT ON COLUMN collections.cost_notes IS 'Observações sobre custos';

-- =====================================================
-- 2. FUNÇÃO: Calcular Custo Total de Produção
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_production_cost(p_collection_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  SELECT 
    COALESCE(cost_material, 0) +
    COALESCE(cost_labor, 0) +
    COALESCE(cost_packaging, 0) +
    COALESCE(cost_shipping, 0) +
    COALESCE(cost_other, 0)
  INTO v_total_cost
  FROM collections
  WHERE id = p_collection_id;
  
  RETURN COALESCE(v_total_cost, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_production_cost IS 'Calcula custo total de produção de uma peça';

-- =====================================================
-- 3. FUNÇÃO: Análise Financeira Completa da Coleção
-- =====================================================

CREATE OR REPLACE FUNCTION get_collection_financial_analysis(p_collection_id UUID)
RETURNS TABLE (
  -- Preços
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  
  -- Custos
  cost_total NUMERIC,
  cost_material NUMERIC,
  cost_labor NUMERIC,
  cost_packaging NUMERIC,
  cost_shipping NUMERIC,
  cost_other NUMERIC,
  
  -- Lucro Bruto (sem taxas)
  profit_full NUMERIC,
  profit_pix NUMERIC,
  profit_margin_full NUMERIC,
  profit_margin_pix NUMERIC,
  
  -- Taxas Mercado Pago
  tax_pix NUMERIC,
  tax_card_6x NUMERIC,
  tax_card_10x_store NUMERIC,
  tax_card_10x_client NUMERIC,
  
  -- Lucro Líquido (com taxas)
  net_profit_pix NUMERIC,
  net_profit_card_6x NUMERIC,
  net_profit_card_10x_store NUMERIC,
  net_profit_card_10x_client NUMERIC,
  
  -- Margens Líquidas
  net_margin_pix NUMERIC,
  net_margin_card_6x NUMERIC,
  net_margin_card_10x_store NUMERIC,
  net_margin_card_10x_client NUMERIC,
  
  -- ROI
  roi_pix NUMERIC,
  roi_card_6x NUMERIC,
  roi_card_10x_store NUMERIC,
  roi_card_10x_client NUMERIC,
  
  -- Breakeven
  breakeven_units NUMERIC,
  
  -- Vendas (estatísticas)
  total_sales INTEGER,
  total_revenue NUMERIC,
  total_profit NUMERIC
) AS $$
DECLARE
  v_collection RECORD;
  v_pricing RECORD;
  v_cost_total NUMERIC;
  
  -- Taxas Mercado Pago
  v_tax_pix_rate NUMERIC := 0.01; -- 1%
  v_tax_card_sale NUMERIC := 0.0498; -- 4,98%
  v_tax_card_6x NUMERIC := 0.0996; -- 9,96%
  v_tax_card_10x_store NUMERIC := 0.1493; -- 14,93%
  v_tax_card_10x_client NUMERIC := 0.2065; -- 20,65%
  
  v_pix_discount NUMERIC;
BEGIN
  -- Buscar dados da coleção
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não encontrada';
  END IF;
  
  -- Buscar preços
  SELECT * INTO v_pricing FROM get_collection_pricing(p_collection_id) LIMIT 1;
  
  -- Calcular custo total
  v_cost_total := calculate_production_cost(p_collection_id);
  
  -- Buscar desconto PIX
  SELECT value::NUMERIC INTO v_pix_discount 
  FROM system_settings 
  WHERE key = 'pix_discount_percentage';
  
  RETURN QUERY
  SELECT
    -- Preços
    v_pricing.price_full,
    v_pricing.price_pix,
    v_pricing.deposit_amount,
    
    -- Custos
    v_cost_total,
    v_collection.cost_material,
    v_collection.cost_labor,
    v_collection.cost_packaging,
    v_collection.cost_shipping,
    v_collection.cost_other,
    
    -- Lucro Bruto
    v_pricing.price_full - v_cost_total as profit_full,
    v_pricing.price_pix - v_cost_total as profit_pix,
    ROUND(((v_pricing.price_full - v_cost_total) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as profit_margin_full,
    ROUND(((v_pricing.price_pix - v_cost_total) / NULLIF(v_pricing.price_pix, 0)) * 100, 2) as profit_margin_pix,
    
    -- Taxas
    v_pricing.price_pix * v_tax_pix_rate as tax_pix,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x) as tax_card_6x,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store) as tax_card_10x_store,
    v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client) as tax_card_10x_client,
    
    -- Lucro Líquido
    v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate) as net_profit_pix,
    v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x)) as net_profit_card_6x,
    v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store)) as net_profit_card_10x_store,
    (v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client)) as net_profit_card_10x_client,
    
    -- Margens Líquidas
    ROUND(((v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) / NULLIF(v_pricing.price_pix, 0)) * 100, 2) as net_margin_pix,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_6x,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_10x_store,
    ROUND((((v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client))) / NULLIF(v_pricing.price_full, 0)) * 100, 2) as net_margin_card_10x_client,
    
    -- ROI
    ROUND(((v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_pix,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_6x))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_6x,
    ROUND(((v_pricing.price_full - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_store))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_10x_store,
    ROUND((((v_pricing.price_full * (1 + v_tax_card_10x_client)) - v_cost_total - (v_pricing.price_full * (v_tax_card_sale + v_tax_card_10x_client))) / NULLIF(v_cost_total, 0)) * 100, 2) as roi_card_10x_client,
    
    -- Breakeven
    CASE 
      WHEN (v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)) > 0 
      THEN CEIL(1000 / (v_pricing.price_pix - v_cost_total - (v_pricing.price_pix * v_tax_pix_rate)))
      ELSE NULL
    END as breakeven_units,
    
    -- Vendas (TODO: implementar quando tiver tabela de vendas)
    0::INTEGER as total_sales,
    0::NUMERIC as total_revenue,
    0::NUMERIC as total_profit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_collection_financial_analysis IS 'Retorna análise financeira completa de uma coleção';

-- =====================================================
-- 4. VIEW: Resumo Financeiro de Todas as Coleções
-- =====================================================

CREATE OR REPLACE VIEW collections_financial_summary AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.is_active,
  
  -- Preços
  CASE 
    WHEN c.is_price_custom THEN c.price_full
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_full')
  END as price_full,
  
  CASE 
    WHEN c.is_price_custom THEN c.price_pix
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
  END as price_pix,
  
  -- Custos
  COALESCE(c.cost_material, 0) +
  COALESCE(c.cost_labor, 0) +
  COALESCE(c.cost_packaging, 0) +
  COALESCE(c.cost_shipping, 0) +
  COALESCE(c.cost_other, 0) as cost_total,
  
  -- Lucro Bruto PIX
  (CASE 
    WHEN c.is_price_custom THEN c.price_pix
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
  END) - (
    COALESCE(c.cost_material, 0) +
    COALESCE(c.cost_labor, 0) +
    COALESCE(c.cost_packaging, 0) +
    COALESCE(c.cost_shipping, 0) +
    COALESCE(c.cost_other, 0)
  ) as profit_pix_gross,
  
  -- Margem Bruta PIX
  ROUND((
    ((CASE 
      WHEN c.is_price_custom THEN c.price_pix
      ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
    END) - (
      COALESCE(c.cost_material, 0) +
      COALESCE(c.cost_labor, 0) +
      COALESCE(c.cost_packaging, 0) +
      COALESCE(c.cost_shipping, 0) +
      COALESCE(c.cost_other, 0)
    )) / NULLIF((CASE 
      WHEN c.is_price_custom THEN c.price_pix
      ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
    END), 0)
  ) * 100, 2) as margin_pix_gross
  
FROM collections c;

COMMENT ON VIEW collections_financial_summary IS 'Resumo financeiro de todas as coleções';

-- =====================================================
-- 5. DADOS INICIAIS
-- =====================================================

-- Atualizar coleções existentes com custos padrão
UPDATE collections
SET 
  cost_material = 50.00,
  cost_labor = 80.00,
  cost_packaging = 30.00,
  cost_shipping = 40.00,
  cost_other = 0.00
WHERE cost_material IS NULL;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Permitir leitura da view para admins
GRANT SELECT ON collections_financial_summary TO authenticated;

-- =====================================================
-- 7. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_collections_costs ON collections(cost_material, cost_labor, cost_packaging);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

