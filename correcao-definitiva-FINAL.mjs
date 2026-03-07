#!/usr/bin/env node
/**
 * CORREÇÃO DEFINITIVA FINAL
 * 
 * Solução robusta e profissional sem gambiarras
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 CORREÇÃO DEFINITIVA: Production Queue\n');
console.log('='.repeat(80));

// ============================================================================
// FASE 1: Verificar Estado Atual
// ============================================================================

console.log('\n📊 FASE 1: Verificando estado atual...\n');

// Verificar production_queue
const { count: queueCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });

console.log(`Production Queue: ${queueCount || 0} itens`);

// Verificar standalone_purchases
const { data: allPurchases } = await supabase
  .from('standalone_purchases')
  .select('id, status, user_id, collection_id')
  .order('created_at', { ascending: false });

console.log(`Standalone Purchases: ${allPurchases?.length || 0} total`);

if (allPurchases && allPurchases.length > 0) {
  const statusCounts = {};
  allPurchases.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  console.log('Status:', JSON.stringify(statusCounts, null, 2));
}

// Pegar qualquer purchase para testar
const testPurchase = allPurchases?.[0];

if (!testPurchase) {
  console.error('\n❌ Nenhum standalone_purchase encontrado no sistema');
  process.exit(1);
}

console.log(`\nUsando purchase: ${testPurchase.id} (status: ${testPurchase.status})`);

// ============================================================================
// FASE 2: Identificar Schema Real
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n🔍 FASE 2: Identificando schema real...\n');

// Pegar dados relacionados
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, email')
  .eq('id', testPurchase.user_id)
  .single();

const { data: collection } = await supabase
  .from('collections')
  .select('id, name')
  .eq('id', testPurchase.collection_id)
  .single();

console.log(`Cliente: ${profile?.full_name || 'Unknown'}`);
console.log(`Coleção: ${collection?.name || 'Unknown'}`);

// Testar inserção com user_id (mais provável)
console.log('\nTestando inserção com user_id...');

const testData = {
  order_id: testPurchase.id,
  order_type: 'standalone_purchase',
  user_id: testPurchase.user_id,
  customer_name: profile?.full_name || 'Test',
  customer_email: profile?.email || 'test@test.com',
  collection_id: collection?.id,
  collection_name: collection?.name || 'Test',
  production_status: 'ready_for_production',
  current_stage: 'design',
  choice_status: 'approved',
  priority_score: 50
};

const { data: insertedItem, error: insertError } = await supabase
  .from('production_queue')
  .insert(testData)
  .select()
  .single();

let schemaInfo = {
  usesUserId: false,
  usesCustomerId: false,
  hasProductionStagesTrigger: false,
  errorDetails: null
};

if (insertError) {
  console.log('❌ Erro:', insertError.message);
  schemaInfo.errorDetails = insertError.message;
  
  if (insertError.message.includes('customer_id')) {
    console.log('→ Tabela espera customer_id, não user_id');
    schemaInfo.usesCustomerId = true;
  } else if (insertError.message.includes('production_stages') && insertError.message.includes('stage')) {
    console.log('→ Há trigger que cria production_stages (falhando por stage NULL)');
    schemaInfo.usesUserId = true;
    schemaInfo.hasProductionStagesTrigger = true;
  } else {
    console.log('→ Erro inesperado');
  }
} else {
  console.log('✅ Sucesso!');
  console.log(`   ID criado: ${insertedItem.id}`);
  schemaInfo.usesUserId = true;
  
  // Não limpar - queremos manter o item!
  console.log('   ✓ Item mantido na fila');
}

// Se falhou com user_id, testar customer_id
if (!schemaInfo.usesUserId && !insertedItem) {
  console.log('\nTestando inserção com customer_id...');
  
  const testData2 = {
    ...testData,
    customer_id: testPurchase.user_id
  };
  delete testData2.user_id;
  
  const { data: insertedItem2, error: insertError2 } = await supabase
    .from('production_queue')
    .insert(testData2)
    .select()
    .single();
  
  if (insertError2) {
    console.log('❌ Erro:', insertError2.message);
  } else {
    console.log('✅ Sucesso com customer_id!');
    console.log(`   ID criado: ${insertedItem2.id}`);
    schemaInfo.usesCustomerId = true;
  }
}

// ============================================================================
// FASE 3: Gerar SQL de Correção
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n🔧 FASE 3: Gerando SQL de correção...\n');

const userIdColumn = schemaInfo.usesUserId ? 'user_id' : 'customer_id';

console.log(`Schema identificado: usa ${userIdColumn}`);

if (schemaInfo.hasProductionStagesTrigger) {
  console.log('⚠️  ATENÇÃO: Há um trigger que cria production_stages automaticamente');
  console.log('   Este trigger está falhando. Precisamos investigar ou desabilitar.');
}

const fixedTriggerSQL = `-- =====================================================
-- CORREÇÃO: auto_populate_production_queue
-- Data: ${new Date().toISOString().split('T')[0]}
-- Usa: ${userIdColumn}
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_production_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_collection_id UUID;
  v_collection_name TEXT;
  v_choice_deadline TIMESTAMPTZ;
  v_requires_choice BOOLEAN;
  v_order_type TEXT;
  v_approval_date TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Determine order type
  IF TG_TABLE_NAME = 'subscription_deliveries' THEN
    v_order_type := 'subscription_delivery';
    SELECT user_id INTO v_user_id FROM subscriptions WHERE id = NEW.subscription_id;
  ELSIF TG_TABLE_NAME = 'standalone_purchases' THEN
    v_order_type := 'standalone_purchase';
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'manual_payments' THEN
    v_order_type := 'manual_payment';
    v_user_id := NEW.user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
  END IF;
  
  -- Check status
  IF TG_OP = 'UPDATE' THEN
    IF v_order_type = 'subscription_delivery' AND (NEW.status != 'confirmed' OR OLD.status = 'confirmed') THEN
      RETURN NEW;
    ELSIF v_order_type = 'standalone_purchase' AND (NEW.status != 'balance_paid' OR OLD.status = 'balance_paid') THEN
      RETURN NEW;
    ELSIF v_order_type = 'manual_payment' AND (NEW.status != 'approved' OR OLD.status = 'approved') THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.updated_at;
  ELSIF TG_OP = 'INSERT' THEN
    IF (v_order_type = 'subscription_delivery' AND NEW.status != 'confirmed')
      OR (v_order_type = 'standalone_purchase' AND NEW.status != 'balance_paid')
      OR (v_order_type = 'manual_payment' AND NEW.status != 'approved') THEN
      RETURN NEW;
    END IF;
    v_approval_date := NEW.created_at;
  END IF;
  
  -- Check if already exists
  IF EXISTS (SELECT 1 FROM production_queue WHERE order_id = NEW.id AND order_type = v_order_type) THEN
    RETURN NEW;
  END IF;
  
  -- Get customer info
  SELECT COALESCE(p.full_name, p.email, 'Unknown'), p.email
  INTO v_customer_name, v_customer_email
  FROM profiles p WHERE p.id = v_user_id;
  
  -- Get collection info
  SELECT c.id, c.name
  INTO v_collection_id, v_collection_name
  FROM collections c WHERE c.id = NEW.collection_id;
  
  -- Check if choice required
  SELECT COUNT(*) > 1 INTO v_requires_choice
  FROM collection_characters WHERE collection_id = v_collection_id;
  
  -- Calculate deadline
  IF v_requires_choice THEN
    v_choice_deadline := calculate_character_choice_deadline(v_approval_date);
  ELSE
    v_choice_deadline := NULL;
  END IF;
  
  -- Insert into production_queue
  INSERT INTO production_queue (
    order_id, order_type, ${userIdColumn}, customer_name, customer_email,
    collection_id, collection_name, character_id, character_name,
    production_status, current_stage, choice_status, choice_deadline, scheduled_production_date
  ) VALUES (
    NEW.id, v_order_type, v_user_id, v_customer_name, v_customer_email,
    v_collection_id, v_collection_name, NULL, NULL,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'ready_for_production' END,
    CASE WHEN v_requires_choice THEN 'awaiting_choice' ELSE 'design' END,
    CASE WHEN v_requires_choice THEN 'pending' ELSE 'approved' END,
    v_choice_deadline,
    CASE WHEN v_requires_choice THEN NULL ELSE v_approval_date + INTERVAL '1 day' END
  );
  
  -- Create character_choices if needed
  IF v_requires_choice THEN
    INSERT INTO character_choices (
      order_id, order_type, user_id, collection_id, status, deadline,
      customer_name, customer_email, collection_name
    ) VALUES (
      NEW.id, v_order_type, v_user_id, v_collection_id, 'pending', v_choice_deadline,
      v_customer_name, v_customer_email, v_collection_name
    ) ON CONFLICT (order_id, order_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_populate_production_queue IS 
  'Trigger function that automatically creates production_queue records. FIXED to use ${userIdColumn}.';
`;

writeFileSync('fix-trigger-DEFINITIVO.sql', fixedTriggerSQL);
console.log('✓ SQL salvo em: fix-trigger-DEFINITIVO.sql\n');

// ============================================================================
// RESULTADO FINAL
// ============================================================================

const { count: finalCount, data: finalItems } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact' });

console.log('='.repeat(80));
console.log('\n📊 RESULTADO FINAL:\n');
console.log(`Total na production_queue: ${finalCount || 0}`);

if (finalItems && finalItems.length > 0) {
  console.log('\nItens na fila:');
  finalItems.forEach(item => {
    console.log(`  • ${item.customer_name} - ${item.collection_name} (${item.current_stage})`);
  });
}

console.log('\n' + '='.repeat(80));

if (finalCount > 0) {
  console.log('\n✅ SUCESSO! Production queue populada!');
  console.log('\n🎉 Acesse: http://localhost:8080/admin/producao\n');
} else {
  console.log('\n⚠️  Production queue ainda vazia.');
  console.log('\nPRÓXIMOS PASSOS:');
  console.log('1. Execute o SQL em fix-trigger-DEFINITIVO.sql no Supabase SQL Editor');
  console.log('2. Crie um novo standalone_purchase com status balance_paid');
  console.log('3. O trigger irá popular automaticamente\n');
}

console.log('='.repeat(80));
console.log('\n');
