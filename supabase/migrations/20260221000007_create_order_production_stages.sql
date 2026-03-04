-- =====================================================
-- Migration: Create order_production_stages table
-- Description: Internal production stages for orders (admin-only visibility)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('molde_pronto', 'impressao_iniciada', 'pintura_iniciada', 'finalizacao')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CREATE INDEX IF NOT EXISTS for efficient querying by order
CREATE INDEX IF NOT EXISTS idx_order_production_stages_order 
ON order_production_stages(order_id, created_at DESC);

-- Add comments
COMMENT ON TABLE order_production_stages IS 'EstÃƒÂ¡gios internos de produÃƒÂ§ÃƒÂ£o dos pedidos (visÃƒÂ­vel apenas para admins)';
COMMENT ON COLUMN order_production_stages.stage IS 'EstÃƒÂ¡gio de produÃƒÂ§ÃƒÂ£o: molde_pronto | impressao_iniciada | pintura_iniciada | finalizacao';
COMMENT ON COLUMN order_production_stages.notes IS 'Notas internas sobre o estÃƒÂ¡gio de produÃƒÂ§ÃƒÂ£o';
COMMENT ON COLUMN order_production_stages.created_by IS 'Admin que registrou o estÃƒÂ¡gio';
