-- Adicionar campo next_production_start na tabela subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS next_production_start TIMESTAMPTZ;

-- Comentário
COMMENT ON COLUMN subscriptions.next_production_start IS 'Data de início da produção do próximo personagem (data de corte para trocas)';

-- Atualizar assinaturas existentes
-- Produção inicia 15 dias antes da entrega
UPDATE subscriptions
SET next_production_start = next_delivery_date - INTERVAL '15 days'
WHERE next_delivery_date IS NOT NULL 
  AND next_production_start IS NULL;

-- Função para calcular data de início de produção
-- Produção inicia 15 dias antes da entrega prevista
CREATE OR REPLACE FUNCTION calculate_production_start_date(delivery_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN delivery_date - INTERVAL '15 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_production_start_date IS 'Calcula data de início de produção (15 dias antes da entrega)';
