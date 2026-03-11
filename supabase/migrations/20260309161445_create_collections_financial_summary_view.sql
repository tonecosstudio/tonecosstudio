-- =====================================================
-- Migration: Create Collections Financial Summary View
-- Description: View agregada com resumo financeiro por coleção
-- =====================================================

-- =====================================================
-- VIEW: collections_financial_summary
-- =====================================================

CREATE OR REPLACE VIEW collections_financial_summary AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.image_url,
  c.is_active,
  c.created_at,
  c.updated_at,
  
  -- Contadores
  COUNT(DISTINCT cc.id) AS total_characters,
  COUNT(DISTINCT CASE WHEN cc.is_catalog THEN cc.id END) AS catalog_characters,
  
  -- Vendas de assinaturas
  COUNT(DISTINCT s.id) AS total_subscriptions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_subscriptions,
  COALESCE(SUM(CASE WHEN s.status = 'active' THEN sp.price END), 0) AS subscription_revenue,
  
  -- Vendas avulsas
  COUNT(DISTINCT sp_purchases.id) AS total_standalone_purchases,
  COALESCE(SUM(sp_purchases.amount), 0) AS standalone_revenue,
  
  -- Pagamentos manuais
  COUNT(DISTINCT mp.id) AS total_manual_payments,
  COALESCE(SUM(CASE WHEN mp.status IN ('paid', 'approved') THEN mp.amount END), 0) AS manual_payments_revenue,
  
  -- Orçamentos
  COUNT(DISTINCT q.id) AS total_quotes,
  COUNT(DISTINCT CASE WHEN q.status = 'approved' THEN q.id END) AS approved_quotes,
  COALESCE(SUM(CASE WHEN q.status = 'approved' THEN q.total_amount END), 0) AS quotes_revenue,
  
  -- Receita total
  COALESCE(SUM(CASE WHEN s.status = 'active' THEN sp.price END), 0) +
  COALESCE(SUM(sp_purchases.amount), 0) +
  COALESCE(SUM(CASE WHEN mp.status IN ('paid', 'approved') THEN mp.amount END), 0) +
  COALESCE(SUM(CASE WHEN q.status = 'approved' THEN q.total_amount END), 0) AS total_revenue

FROM collections c

-- Join com collection_characters
LEFT JOIN collection_characters cc ON c.id = cc.collection_id

-- Join com subscriptions
LEFT JOIN subscriptions s ON c.id = s.collection_id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id

-- Join com standalone_purchases
LEFT JOIN standalone_purchases sp_purchases ON c.id = sp_purchases.collection_id

-- Join com manual_payments (via subscription ou quote)
LEFT JOIN manual_payments mp ON (
  mp.subscription_id = s.id OR
  mp.quote_id IN (SELECT id FROM quotes WHERE id = mp.quote_id)
)

-- Join com quotes (não tem collection_id direto, então não incluímos por enquanto)
LEFT JOIN quotes q ON q.id = mp.quote_id

GROUP BY 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.image_url,
  c.is_active,
  c.created_at,
  c.updated_at

ORDER BY c.name ASC;

-- =====================================================
-- RLS para a view
-- =====================================================

-- Views herdam as permissões das tabelas base, mas vamos garantir
ALTER VIEW collections_financial_summary SET (security_invoker = true);

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT ON collections_financial_summary TO authenticated;
GRANT SELECT ON collections_financial_summary TO anon;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON VIEW collections_financial_summary IS 'Resumo financeiro agregado por coleção incluindo assinaturas, vendas avulsas, pagamentos manuais e orçamentos';

COMMENT ON COLUMN collections_financial_summary.total_characters IS 'Total de personagens na coleção';
COMMENT ON COLUMN collections_financial_summary.catalog_characters IS 'Personagens disponíveis no catálogo';
COMMENT ON COLUMN collections_financial_summary.total_subscriptions IS 'Total de assinaturas';
COMMENT ON COLUMN collections_financial_summary.active_subscriptions IS 'Assinaturas ativas';
COMMENT ON COLUMN collections_financial_summary.subscription_revenue IS 'Receita de assinaturas ativas';
COMMENT ON COLUMN collections_financial_summary.total_standalone_purchases IS 'Total de compras avulsas';
COMMENT ON COLUMN collections_financial_summary.standalone_revenue IS 'Receita de compras avulsas';
COMMENT ON COLUMN collections_financial_summary.total_manual_payments IS 'Total de pagamentos manuais';
COMMENT ON COLUMN collections_financial_summary.manual_payments_revenue IS 'Receita de pagamentos manuais aprovados/pagos';
COMMENT ON COLUMN collections_financial_summary.total_quotes IS 'Total de orçamentos';
COMMENT ON COLUMN collections_financial_summary.approved_quotes IS 'Orçamentos aprovados';
COMMENT ON COLUMN collections_financial_summary.quotes_revenue IS 'Receita de orçamentos aprovados';
COMMENT ON COLUMN collections_financial_summary.total_revenue IS 'Receita total da coleção';

