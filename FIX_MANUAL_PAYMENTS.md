# Fix Manual Payments - Aplicar Agora

## Problema
Erro 400 ao criar pagamento: `POST /manual_payments` falha porque `payment_method_id` é obrigatório mas não é enviado.

## Solução
Tornar `payment_method_id` opcional e adicionar tipo `subscription` ao enum.

## SQL para Aplicar

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

Cole e execute:

```sql
-- Tornar payment_method_id opcional
ALTER TABLE manual_payments ALTER COLUMN payment_method_id DROP NOT NULL;

-- Atualizar constraint de payment_type
ALTER TABLE manual_payments DROP CONSTRAINT IF EXISTS manual_payments_payment_type_check;
ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_payment_type_check 
  CHECK (payment_type IN ('one_time', 'recurring', 'subscription'));

-- Verificar
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'manual_payments'
AND column_name = 'payment_method_id';
```

Resultado esperado:
```
payment_method_id | uuid | YES
```

## Após Aplicar

Teste criar uma assinatura novamente. O erro 400 deve estar resolvido.
