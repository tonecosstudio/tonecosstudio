#!/usr/bin/env node

/**
 * Script: Analyze Payment Flow for Standalone Purchases
 * 
 * Analisa o fluxo de pagamento e estágios de produção para entender
 * quando o saldo deveria ser pago
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
  console.log('🔍 Análise: Fluxo de Pagamento de Compras Avulsa');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Buscar compras avulsa com detalhes
    const { data: purchases, error } = await supabase
      .from('standalone_purchases')
      .select(`
        id,
        status,
        character_id,
        deposit_paid_at,
        balance_paid_at,
        balance_due_date,
        created_at,
        collection_characters (
          name
        )
      `);

    if (error) {
      throw new Error(`Erro: ${error.message}`);
    }

    console.log(`📊 ${purchases?.length || 0} compras avulsa encontradas`);
    console.log('');

    // Buscar production_queue
    const { data: queue, error: queueError } = await supabase
      .from('production_queue')
      .select('order_id, current_stage, production_status, created_at')
      .eq('order_type', 'standalone_purchase');

    if (queueError) {
      throw new Error(`Erro: ${queueError.message}`);
    }

    console.log('📋 Análise Detalhada:');
    console.log('='.repeat(60));
    console.log('');

    for (const purchase of purchases || []) {
      const queueItem = queue?.find(q => q.order_id === purchase.id);
      
      console.log(`Pedido: ${purchase.id.substring(0, 8)}`);
      console.log(`   Personagem: ${purchase.collection_characters?.name || 'N/A'}`);
      console.log(`   Status: ${purchase.status}`);
      console.log('');
      
      console.log('   💰 Pagamentos:');
      console.log(`      Depósito: ${purchase.deposit_paid_at ? '✅ Pago em ' + new Date(purchase.deposit_paid_at).toLocaleDateString('pt-BR') : '❌ Não pago'}`);
      console.log(`      Saldo: ${purchase.balance_paid_at ? '✅ Pago em ' + new Date(purchase.balance_paid_at).toLocaleDateString('pt-BR') : '❌ Não pago'}`);
      
      if (purchase.balance_due_date) {
        console.log(`      Vencimento Saldo: ${new Date(purchase.balance_due_date).toLocaleDateString('pt-BR')}`);
      }
      console.log('');

      if (queueItem) {
        console.log('   🏭 Produção:');
        console.log(`      Estágio: ${queueItem.current_stage}`);
        console.log(`      Status: ${queueItem.production_status}`);
        console.log(`      Criado em: ${new Date(queueItem.created_at).toLocaleDateString('pt-BR')}`);
        console.log('');
      }

      // Análise do fluxo
      console.log('   📊 Análise do Fluxo:');
      
      const createdDate = new Date(purchase.created_at);
      const depositDate = purchase.deposit_paid_at ? new Date(purchase.deposit_paid_at) : null;
      const balanceDate = purchase.balance_paid_at ? new Date(purchase.balance_paid_at) : null;
      const queueDate = queueItem ? new Date(queueItem.created_at) : null;

      if (depositDate && balanceDate) {
        const daysBetween = Math.floor((balanceDate - depositDate) / (1000 * 60 * 60 * 24));
        console.log(`      ⏱️  Tempo entre depósito e saldo: ${daysBetween} dias`);
        
        if (daysBetween === 0) {
          console.log(`      ⚠️  ATENÇÃO: Pagamento completo no mesmo dia!`);
          console.log(`      💡 Possível pagamento à vista (não em 2 parcelas)`);
        }
      }

      if (balanceDate && queueDate) {
        const daysBeforeProduction = Math.floor((balanceDate - queueDate) / (1000 * 60 * 60 * 24));
        if (daysBeforeProduction < 0) {
          console.log(`      ⚠️  Saldo pago ANTES da produção iniciar (${Math.abs(daysBeforeProduction)} dias antes)`);
        }
      }

      console.log('');
      console.log('-'.repeat(60));
      console.log('');
    }

    // Conclusão
    console.log('');
    console.log('💡 CONCLUSÃO:');
    console.log('='.repeat(60));
    console.log('');
    console.log('Fluxo Ideal de Pagamento para Compras Avulsa:');
    console.log('');
    console.log('1️⃣  Cliente faz pedido e escolhe personagem');
    console.log('2️⃣  Cliente paga DEPÓSITO (ex: R$ 100)');
    console.log('3️⃣  Produção inicia após depósito confirmado');
    console.log('4️⃣  Produção passa por todos os estágios');
    console.log('5️⃣  Quando chegar em "quality_check" ou "packaging":');
    console.log('    → Sistema notifica cliente que está pronto');
    console.log('    → Cliente paga SALDO (ex: R$ 400)');
    console.log('6️⃣  Após saldo confirmado → Envio');
    console.log('');
    console.log('⚠️  PROBLEMA ATUAL:');
    console.log('   Ambos os pedidos têm saldo pago ANTES/DURANTE produção');
    console.log('   Isso sugere:');
    console.log('   a) Pagamento à vista (não em 2 parcelas)');
    console.log('   b) Cliente pagou adiantado');
    console.log('   c) Dados de teste');
    console.log('');
    console.log('💡 RECOMENDAÇÃO:');
    console.log('   O estágio correto depende do MODELO DE NEGÓCIO:');
    console.log('');
    console.log('   Opção A - Pagamento em 2 Parcelas:');
    console.log('   • Depósito → Inicia produção');
    console.log('   • Saldo → Pago quando pronto (quality_check/packaging)');
    console.log('   • Estágio: Avançar normalmente, aguardar saldo antes de enviar');
    console.log('');
    console.log('   Opção B - Pagamento à Vista:');
    console.log('   • Pagamento completo → Inicia produção');
    console.log('   • Sem saldo pendente');
    console.log('   • Estágio: Avançar normalmente até envio');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
