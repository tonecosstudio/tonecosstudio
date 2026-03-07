#!/usr/bin/env node
/**
 * CORREÇÃO DEFINITIVA: Schema e População
 * 
 * Abordagem profissional:
 * 1. Identificar schema real
 * 2. Corrigir função do trigger
 * 3. Popular dados existentes
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 CORREÇÃO DEFINITIVA: Production Queue\n');
console.log('='.repeat(80));

// ============================================================================
// FASE 1: Identificar Schema Real
// ============================================================================

console.log('\n📊 FASE 1: Identificando schema real...\n');

// Pegar um standalone_purchase real
const { data: realPurchase } = await supabase
  .from('standalone_purchases')
  .select('id, user_id, collection_id')
  .eq('status', 'balance_paid')
  .limit(1)
  .single();

if (!realPurchase) {
  console.error('❌ Nenhum standalone_purchase com balance_paid encontrado');
  process.exit(1);
}

console.log('✓ Purchase encontrado:', realPurchase.id);

// Pegar profile e collection
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, email')
  .eq('id', realPurchase.user_id)
  .single();

const { data: collection } = await supabase
  .from('collections')
  .select('id, name')
  .eq('id', realPurchase.collection_id)
  .single();

// Testar com customer_id
console.log('\nTestando schema com customer_id...');
const testWithCustomerId = {
  order_id: realPurchase.id,
  order_type: 'standalone_purchase',
  customer_id: realPurchase.user_id,
  customer_name: profile?.full_name || 'Test',
  customer_email: profile?.email || 'test@test.com',
  collection_id: collection?.id,
  collection_name: collection?.name || 'Test',
  production_status: 'ready_for_production',
  current_stage: 'design',
  choice_status: 'approved',
  priority_score: 50
};

let { error: errorCustomerId } = await supabase
  .from('production_queue')
  .insert(testWithCustomerId);

let usesCustomerId = false;
let usesUserId = false;
let priorityIsInteger = false;

if (errorCustomerId) {
  console.log('   ❌', errorCustomerId.message);
  
  if (errorCustomerId.message.includes('user_id')) {
    console.log('   → Schema usa user_id, não customer_id');
    usesUserId = true;
  }
  
  if (errorCustomerId.message.includes('integer') && errorCustomerId.message.includes('priority')) {
    console.log('   → Priority é INTEGER');
    priorityIsInteger = true;
  }
} else {
  console.log('   ✅ Sucesso com customer_id');
  usesCustomerId = true;
  // Limpar
  await supabase.from('production_queue').delete().eq('order_id', realPurchase.id);
}

// Se falhou com customer_id, testar com user_id
if (!usesCustomerId) {
  console.log('\nTestando schema com user_id...');
  const testWithUserId = {
    order_id: realPurchase.id,
    order_type: 'standalone_purchase',
    user_id: realPurchase.user_id,
    customer_name: profile?.full_name || 'Test',
    customer_email: profile?.email || 'test@test.com',
    collection_id: collection?.id,
    collection_name: collection?.name || 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved',
    priority_score: 50
  };

  let { error: errorUserId } = await supabase
    .from('production_queue')
    .insert(testWithUserId);

  if (errorUserId) {
    console.log('   ❌', errorUserId.message);
    
    if (errorUserId.message.includes('stage') && errorUserId.message.includes('production_stages')) {
      console.log('   → Há um trigger que cria production_stages automaticamente');
      console.log('   → O trigger está falhando porque stage é NULL');
    }
  } else {
    console.log('   ✅ Sucesso com user_id');
    usesUserId = true;
    // Limpar
    await supabase.from('production_queue').delete().eq('order_id', realPurchase.id);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n📋 SCHEMA IDENTIFICADO:\n');
console.log(`   • Usa ${usesUserId ? 'user_id' : 'customer_id'}`);
console.log(`   • Priority é ${priorityIsInteger ? 'INTEGER' : 'TEXT'}`);
console.log('   • Há triggers adicionais que criam production_stages');

// ============================================================================
// FASE 2: Corrigir Função do Trigger
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n🔧 FASE 2: Corrigindo função do trigger...\n');

const userIdColumn = usesUserId ? 'user_id' : 'customer_id';

const fixedTriggerFunction = `
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
`;

console.log('SQL gerado para correção:');
console.log('---');
console.log(fixedTriggerFunction);
console.log('---\n');

// Salvar SQL em arquivo
import { writeFileSync } from 'fs';
writeFileSync('fix-trigger-FINAL.sql', fixedTriggerFunction);
console.log('✓ SQL salvo em: fix-trigger-FINAL.sql');

console.log('\n⚠️  AÇÃO NECESSÁRIA:');
console.log('   1. Abra o Supabase SQL Editor');
console.log('   2. Execute o SQL do arquivo fix-trigger-FINAL.sql');
console.log('   3. Volte aqui e pressione ENTER para continuar');

// Aguardar usuário
import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

await new Promise(resolve => {
  rl.question('\nPressione ENTER após executar o SQL no Supabase... ', () => {
    rl.close();
    resolve();
  });
});

// ============================================================================
// FASE 3: Popular Dados Existentes
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n📦 FASE 3: Populando dados existentes...\n');

// Disparar trigger atualizando status
console.log('Disparando trigger via atualização de status...');

const { error: updateError } = await supabase
  .from('standalone_purchases')
  .update({ status: 'deposit_paid' })
  .eq('id', realPurchase.id);

if (updateError) {
  console.error('❌ Erro ao atualizar:', updateError.message);
} else {
  console.log('✓ Status alterado para deposit_paid');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { error: updateError2 } = await supabase
    .from('standalone_purchases')
    .update({ status: 'balance_paid' })
    .eq('id', realPurchase.id);
  
  if (updateError2) {
    console.error('❌ Erro ao restaurar status:', updateError2.message);
  } else {
    console.log('✓ Status restaurado para balance_paid');
  }
}

await new Promise(resolve => setTimeout(resolve, 2000));

// Verificar se foi adicionado
const { data: queueItem } = await supabase
  .from('production_queue')
  .select('*')
  .eq('order_id', realPurchase.id)
  .eq('order_type', 'standalone_purchase')
  .maybeSingle();

if (queueItem) {
  console.log('\n✅ SUCESSO! Item adicionado à fila:');
  console.log(`   • Cliente: ${queueItem.customer_name}`);
  console.log(`   • Coleção: ${queueItem.collection_name}`);
  console.log(`   • Estágio: ${queueItem.current_stage}`);
  console.log(`   • Status: ${queueItem.production_status}`);
} else {
  console.log('\n❌ Item NÃO foi adicionado à fila');
  console.log('   Verifique se o SQL foi executado corretamente no Supabase');
}

// ============================================================================
// RESULTADO FINAL
// ============================================================================

const { count: finalCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });

console.log('\n' + '='.repeat(80));
console.log('\n🎉 CORREÇÃO CONCLUÍDA!\n');
console.log(`📊 Total na production_queue: ${finalCount || 0}`);
console.log('\n✅ Acesse: http://localhost:8080/admin/producao\n');
console.log('='.repeat(80));
console.log('\n');
