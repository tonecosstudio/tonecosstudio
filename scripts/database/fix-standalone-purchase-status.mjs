#!/usr/bin/env node

/**
 * Script para corrigir status de compras avulsas
 * Atualiza o status baseado nos pagamentos realizados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Buscando compras avulsas com status incorreto...\n');

  // Buscar todas as compras
  const { data: purchases, error } = await supabase
    .from('standalone_purchases')
    .select('*');

  if (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }

  console.log(`📊 Total de compras: ${purchases.length}\n`);

  const toFix = [];

  purchases.forEach(purchase => {
    const hasDepositPaid = !!purchase.deposit_paid_at;
    const hasBalancePaid = !!purchase.balance_paid_at;
    const currentStatus = purchase.status;

    let expectedStatus = currentStatus;
    let needsFix = false;

    // Determinar status esperado
    if (hasBalancePaid) {
      // Se saldo foi pago, status deveria ser balance_paid (no mínimo)
      if (purchase.actual_delivery_date) {
        expectedStatus = 'delivered';
      } else if (purchase.tracking_code) {
        expectedStatus = 'shipped';
      } else {
        expectedStatus = 'balance_paid';
      }
      
      if (currentStatus !== expectedStatus) {
        needsFix = true;
      }
    } else if (hasDepositPaid && currentStatus === 'awaiting_deposit') {
      expectedStatus = 'deposit_paid';
      needsFix = true;
    }

    if (needsFix) {
      toFix.push({
        id: purchase.id,
        currentStatus,
        expectedStatus,
        depositPaid: hasDepositPaid,
        balancePaid: hasBalancePaid,
      });
    }
  });

  if (toFix.length === 0) {
    console.log('✅ Todas as compras estão com status correto!');
    return;
  }

  console.log(`⚠️  Encontradas ${toFix.length} compra(s) com status incorreto:\n`);

  toFix.forEach(item => {
    console.log(`ID: ${item.id.slice(0, 8)}`);
    console.log(`  Status atual: ${item.currentStatus}`);
    console.log(`  Status esperado: ${item.expectedStatus}`);
    console.log(`  Depósito pago: ${item.depositPaid ? 'Sim' : 'Não'}`);
    console.log(`  Saldo pago: ${item.balancePaid ? 'Sim' : 'Não'}`);
    console.log('');
  });

  console.log('🔧 Aplicando correções...\n');

  let success = 0;
  let failed = 0;

  for (const item of toFix) {
    const { error } = await supabase
      .from('standalone_purchases')
      .update({ status: item.expectedStatus })
      .eq('id', item.id);

    if (error) {
      console.error(`❌ Erro ao atualizar ${item.id.slice(0, 8)}:`, error.message);
      failed++;
    } else {
      console.log(`✅ ${item.id.slice(0, 8)}: ${item.currentStatus} → ${item.expectedStatus}`);
      success++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${success} compra(s) corrigida(s)`);
  if (failed > 0) {
    console.log(`❌ ${failed} compra(s) falharam`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
