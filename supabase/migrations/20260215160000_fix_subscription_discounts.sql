-- Padronizar desconto PIX para 5% em todo o sistema
-- Atualizar configuração global
UPDATE system_settings 
SET value = '5', updated_at = NOW()
WHERE key = 'pix_discount_percentage';

-- Recalcular preços PIX dos planos de assinatura com 5% de desconto
UPDATE subscription_plans
SET 
  price_pix = price_full * 0.95,
  updated_at = NOW()
WHERE is_active = true;

-- Comentário: Agora todo o sistema usa 5% de desconto PIX consistentemente
