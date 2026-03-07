#!/usr/bin/env node
/**
 * Aplica correção do trigger no banco remoto
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Aplicando correção do trigger no banco remoto...');
console.log('');

const sql = `
-- Recriar função do trigger
CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  -- Calcular total gasto APENAS de escolhas confirmadas ou em produção
  -- Escolhas "pending" não gastam coins até serem confirmadas
  SELECT COALESCE(SUM(coins_spent), 0)
  INTO v_total_spent
  FROM subscription_monthly_selections
  WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id)
  AND status IN ('confirmed', 'in_production', 'shipped', 'delivered');
  
  -- Atualizar saldo
  UPDATE subscriptions
  SET 
    coins_balance = coins_initial - v_total_spent,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
`;

try {
  // Executar via RPC (se disponível) ou via query direta
  const { error } = await supabase.rpc('exec', { sql });
  
  if (error) {
    // Tentar método alternativo
    console.log('⚠️  Método RPC não disponível, tentando aplicar manualmente...');
    console.log('');
    console.log('Por favor, execute o seguinte SQL no Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(sql);
    console.log('═══════════════════════════════════════════════════════════');
  } else {
    console.log('✅ Trigger atualizado com sucesso!');
    console.log('');
    console.log('📋 Mudança aplicada:');
    console.log('  - Trigger agora conta apenas escolhas confirmadas');
    console.log('  - Escolhas "pending" não afetam o saldo');
    console.log('  - Status contabilizados: confirmed, in_production, shipped, delivered');
  }
} catch (err) {
  console.log('⚠️  Não foi possível aplicar automaticamente');
  console.log('');
  console.log('📋 Execute manualmente no Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(sql);
  console.log('═══════════════════════════════════════════════════════════');
}
