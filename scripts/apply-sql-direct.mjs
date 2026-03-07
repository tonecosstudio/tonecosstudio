#!/usr/bin/env node
/**
 * Aplica SQL diretamente via query
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    }
  }
);

console.log('🚀 Aplicando SQL no banco remoto...');
console.log('');

const sql = `
CREATE OR REPLACE FUNCTION update_subscription_coins_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent INTEGER;
BEGIN
  SELECT COALESCE(SUM(coins_spent), 0)
  INTO v_total_spent
  FROM subscription_monthly_selections
  WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id)
  AND status IN ('confirmed', 'in_production', 'shipped', 'delivered');
  
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
  // Tentar executar via REST API
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('✅ SQL aplicado com sucesso!');
  } else {
    throw new Error('Método não disponível');
  }
} catch (err) {
  console.log('📋 Copie e cole este SQL no Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(sql);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Depois de aplicar, pressione Enter para continuar...');
}
