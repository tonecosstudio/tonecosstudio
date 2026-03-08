#!/usr/bin/env node

/**
 * Script: Analyze Standalone Purchase Stages
 * 
 * Analisa os estágios de produção de compras avulsa para identificar inconsistências
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
  console.log('🔍 Análise: Estágios de Compras Avulsa');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Buscar todas as compras avulsa
    console.log('📊 Buscando compras avulsa...');
    const { data: purchases, error: purchasesError } = await supabase
      .from('standalone_purchases')
      .select(`
        id,
        status,
        character_id,
        deposit_paid_at,
        balance_paid_at,
        created_at
      `);

    if (purchasesError) {
      throw new Error(`Erro ao buscar compras: ${purchasesError.message}`);
    }

    console.log(`   ✅ ${purchases?.length || 0} compras avulsa encontradas`);
    console.log('');

    // 2. Buscar production_queue para compras avulsa
    console.log('📊 Buscando estágios de produção...');
    const { data: productionQueue, error: queueError } = await supabase
      .from('production_queue')
      .select(`
        id,
        order_id,
        order_type,
        current_stage,
        production_status,
        choice_status,
        character_id,
        character_name
      `)
      .eq('order_type', 'standalone_purchase');

    if (queueError) {
      throw new Error(`Erro ao buscar fila de produção: ${queueError.message}`);
    }

    console.log(`   ✅ ${productionQueue?.length || 0} itens na fila de produção`);
    console.log('');

    // 3. Análise detalhada
    console.log('📋 Análise Detalhada:');
    console.log('='.repeat(60));
    console.log('');

    for (const item of productionQueue || []) {
      const purchase = purchases?.find(p => p.id === item.order_id);
      
      console.log(`Pedido: ${item.order_id.substring(0, 8)}`);
      console.log(`   Estágio Atual: ${item.current_stage}`);
      console.log(`   Status Produção: ${item.production_status}`);
      console.log(`   Status Escolha: ${item.choice_status}`);
      console.log(`   Character ID: ${item.character_id || 'NULL'}`);
      console.log(`   Character Name: ${item.character_name || 'NULL'}`);
      
      if (purchase) {
        console.log(`   Status Pagamento: ${purchase.status}`);
        console.log(`   Depósito Pago: ${purchase.deposit_paid_at ? '✅' : '❌'}`);
        console.log(`   Saldo Pago: ${purchase.balance_paid_at ? '✅' : '❌'}`);
        console.log(`   Character na Purchase: ${purchase.character_id ? '✅' : '❌'}`);
      }

      // Identificar problemas
      const problems = [];

      if (item.current_stage === 'awaiting_choice') {
        problems.push('❌ ERRO: Compra avulsa não deve ter estágio "awaiting_choice"');
      }

      if (item.choice_status === 'pending') {
        problems.push('❌ ERRO: Compra avulsa não deve ter choice_status "pending"');
      }

      if (!item.character_id) {
        problems.push('⚠️  AVISO: character_id está NULL');
      }

      if (purchase) {
        // Determinar estágio correto baseado no pagamento
        let correctStage = 'awaiting_payment';
        
        if (purchase.balance_paid_at) {
          correctStage = 'payment_confirmed'; // Pagamento completo
        } else if (purchase.deposit_paid_at) {
          correctStage = 'awaiting_payment'; // Só depósito, aguardando saldo
        }

        if (item.current_stage !== correctStage && !['model_preparation', 'printing', 'post_processing', 'painting', 'quality_check', 'packaging', 'ready_to_ship', 'shipped', 'delivered'].includes(item.current_stage)) {
          problems.push(`💡 SUGESTÃO: Estágio deveria ser "${correctStage}" baseado no pagamento`);
        }
      }

      if (problems.length > 0) {
        console.log('');
        console.log('   Problemas Identificados:');
        problems.forEach(p => console.log(`   ${p}`));
      }

      console.log('');
      console.log('-'.repeat(60));
      console.log('');
    }

    // 4. Resumo
    console.log('');
    console.log('📊 Resumo:');
    console.log('='.repeat(60));
    
    const awaitingChoice = productionQueue?.filter(i => i.current_stage === 'awaiting_choice').length || 0;
    const pendingChoice = productionQueue?.filter(i => i.choice_status === 'pending').length || 0;
    const missingCharacter = productionQueue?.filter(i => !i.character_id).length || 0;

    console.log(`   Compras com "awaiting_choice": ${awaitingChoice}`);
    console.log(`   Compras com choice_status "pending": ${pendingChoice}`);
    console.log(`   Compras sem character_id: ${missingCharacter}`);
    console.log('');

    if (awaitingChoice > 0 || pendingChoice > 0) {
      console.log('💡 Recomendação:');
      console.log('   Execute o script de correção para atualizar os estágios');
      console.log('   node scripts/database/fix-standalone-stages.mjs');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
