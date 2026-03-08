#!/usr/bin/env node

/**
 * Script: Apply Payment Status Migration
 * 
 * Aplica a migration que adiciona payment_status separado de production_status
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Aplicando Migration: Payment Status');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Estado antes
    console.log('📊 Estado ANTES da migration:');
    
    const { data: beforePurchases } = await supabase
      .from('standalone_purchases')
      .select('id, status, deposit_paid_at, balance_paid_at');
    
    console.log(`   standalone_purchases: ${beforePurchases?.length || 0} registros`);
    
    const { data: beforeQueue } = await supabase
      .from('production_queue')
      .select('id, production_status');
    
    console.log(`   production_queue: ${beforeQueue?.length || 0} registros`);
    console.log('');

    // Ler migration SQL
    const migrationPath = join(__dirname, '../../supabase/migrations/20260308200000_add_payment_status.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL carregada');
    console.log('');
    console.log('⚠️  ATENÇÃO: Esta migration será executada no Supabase Dashboard');
    console.log('');
    console.log('Copie o SQL abaixo e execute no Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('');

    // Verificação após (manual)
    console.log('📋 Após executar o SQL, verifique:');
    console.log('');
    console.log('1. Verificar payment_status em standalone_purchases:');
    console.log('   SELECT payment_status, COUNT(*) FROM standalone_purchases GROUP BY payment_status;');
    console.log('');
    console.log('2. Verificar payment_status em production_queue:');
    console.log('   SELECT payment_status, COUNT(*) FROM production_queue GROUP BY payment_status;');
    console.log('');
    console.log('3. Verificar production_status atualizado:');
    console.log('   SELECT production_status, COUNT(*) FROM production_queue GROUP BY production_status;');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
