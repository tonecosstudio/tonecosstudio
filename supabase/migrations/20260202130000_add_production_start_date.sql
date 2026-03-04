-- Adicionar campo next_production_start na tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS next_production_start TIMESTAMPTZ;

-- ComentÃƒÂ¡rio
COMMENT ON COLUMN subscriptions.next_production_start IS 'Data de inÃƒÂ­cio da produÃƒÂ§ÃƒÂ£o do prÃƒÂ³ximo personagem (data de corte para trocas)';

-- Atualizar assinaturas existentes
-- ProduÃƒÂ§ÃƒÂ£o inicia 15 dias antes da entrega
UPDATE subscriptions
SET next_production_start = next_delivery_date - INTERVAL '15 days'
WHERE next_delivery_date IS NOT NULL 
  AND next_production_start IS NULL;

-- FunÃƒÂ§ÃƒÂ£o para calcular data de inÃƒÂ­cio de produÃƒÂ§ÃƒÂ£o
-- ProduÃƒÂ§ÃƒÂ£o inicia 15 dias antes da entrega prevista
CREATE OR REPLACE FUNCTION calculate_production_start_date(delivery_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN delivery_date - INTERVAL '15 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_production_start_date IS 'Calcula data de inÃƒÂ­cio de produÃƒÂ§ÃƒÂ£o (15 dias antes da entrega)';
