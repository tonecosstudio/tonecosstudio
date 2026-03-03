-- Analisar estrutura da tabela manual_payments e dados relacionados
SELECT 
    mp.*,
    pm.name as payment_method_name,
    pm.type as payment_method_type,
    pm.pix_key,
    pm.bank_details,
    -- Tentar buscar assinatura relacionada
    s.id as subscription_id,
    s.status as subscription_status,
    sp.name as plan_name,
    sp.price as plan_price,
    sp.billing_cycle,
    -- Tentar buscar compra avulsa relacionada
    stp.id as standalone_id,
    stp.product_name,
    stp.product_price
FROM manual_payments mp
LEFT JOIN payment_methods pm ON mp.payment_method_id = pm.id
LEFT JOIN subscriptions s ON mp.related_subscription_id = s.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN standalone_purchases stp ON mp.related_standalone_id = stp.id
WHERE mp.id = '9c6bec6d-af56-407d-89c7-6126456f4bff';

-- Ver colunas disponíveis na tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'manual_payments'
ORDER BY ordinal_position;
