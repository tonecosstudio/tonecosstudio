#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('subscription_monthly_selections')
  .select('*')
  .eq('subscription_id', '308d0b5a-4d44-4297-bade-d8270f8c5d82');

console.log('Escolhas:', data);
console.log('Erro:', error);

const { data: sub } = await supabase
  .from('subscriptions')
  .select('coins_balance, coins_initial')
  .eq('id', '308d0b5a-4d44-4297-bade-d8270f8c5d82')
  .single();

console.log('Saldo:', sub);
