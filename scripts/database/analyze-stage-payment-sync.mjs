#!/usr/bin/env node

/**
 * Script: Analyze Stage and Payment Synchronization
 * 
 * Analisa a sincronização entre payment_status, production_status e current_stage
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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
  console.log('🔍 Análise: Sincronização de Status e Estágios');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Buscar production_queue com detalhes
    const { data: items, error } = await supabase
      .from('production_queue')
      .select(`
        id,
        order_id,
        order_type,
        payment_status,
        production_status,
        current_stage
      `)
      .eq('order_type', 'standalone_purchase');

    if (error) {
      throw new Error(`Erro: ${error.message}`);
    }

    console.log(`📊 ${items?.length || 0} compras avulsa encontradas`);
    console.log('');

    for (const item of items || []) {
      console.log(`Pedido: ${item.order_id.substring(0, 8)}`);
      console.log(`   💰 payment_status: ${item.payment_status}`);
      console.log(`   🏭 production_status: ${item.production_status}`);
      console.log(`   📍 current_stage: ${item.current_stage}`);
      console.log('');

      // Análise de inconsistências
      const issues = [];

      // Regra 1: Se payment_status = 'paid', não deveria estar em 'payment_confirmed'
      if (item.payment_status === 'paid' && item.current_stage === 'payment_confirmed') {
        issues.push('❌ ERRO: Pagamento completo mas estágio ainda em "payment_confirmed"');
        issues.push('   💡 Deveria avançar para "model_preparation" ou próximo estágio');
      }

      // Regra 2: Se payment_status = 'paid', production_status deveria ser 'in_production' ou além
      if (item.payment_status === 'paid' && item.production_status === 'ready_to_start') {
        issues.push('❌ ERRO: Pagamento completo mas production_status ainda em "ready_to_start"');
        issues.push('   💡 Deveria ser "in_production" ou além');
      }

      // Regra 3: Se payment_status = 'deposit_paid', current_stage pode estar em produção
      if (item.payment_status === 'deposit_paid' && item.current_stage === 'awaiting_payment') {
        issues.push('⚠️  AVISO: Depósito pago mas estágio ainda em "awaiting_payment"');
        issues.push('   💡 Deveria avançar para "payment_confirmed"');
      }

      if (issues.length > 0) {
        console.log('   Problemas Identificados:');
        issues.forEach(issue => console.log(`   ${issue}`));
        console.log('');
      } else {
        console.log('   ✅ Status sincronizados corretamente');
        console.log('');
      }

      console.log('-'.repeat(60));
      console.log('');
    }

    // Resumo
    console.log('');
    console.log('💡 REGRAS DE SINCRONIZAÇÃO:');
    console.log('='.repeat(60));
    console.log('');
    console.log('1. payment_status = "paid" →');
    console.log('   current_stage deveria estar em produção (model_preparation ou além)');
    console.log('   production_status deveria ser "in_production" ou além');
    console.log('');
    console.log('2. payment_status = "deposit_paid" →');
    console.log('   current_stage pode estar em "payment_confirmed" ou produção');
    console.log('   production_status deveria ser "ready_to_start" ou "in_production"');
    console.log('');
    console.log('3. payment_status = "pending" →');
    console.log('   current_stage deveria ser "awaiting_payment"');
    console.log('   production_status deveria ser "not_started"');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
