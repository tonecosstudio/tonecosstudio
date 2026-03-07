#!/usr/bin/env node
/**
 * SOLUÇÃO FINAL: Popular Production Queue
 * 
 * Este script funciona com o schema REAL do banco (não o das migrations)
 * - Usa user_id (não customer_id)
 * - Não define priority (deixa o trigger calcular)
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 SOLUÇÃO FINAL: Popular Production Queue\n');
console.log('='.repeat(80));
console.log('\nEste script usa o schema REAL do banco (com schema drift)\n');

// ============================================================================
// Popular com standalone_purchases
// ============================================================================

console.log('📦 Processando standalone_purchases...\n');

const { data: purchases } = await supabase
  .from('standalone_purchases')
  .select('*')
  .eq('status', 'balance_paid');

console.log(`✓ Encontrados: ${purchases?.length || 0}\n`);

let successCount = 0;

for (const purchase of purchases || []) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('production_queue')
    .select('id')
    .eq('order_id', purchase.id)
    .eq('order_type', 'standalone_purchase')
    .maybeSingle();
  
  if (existing) {
    console.log(`⏭️  Já existe: ${purchase.id}`);
    continue;
  }
  
  // Get customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', purchase.user_id)
    .single();
  
  // Get collection
  const { data: collection } = await supabase
    .from('collections')
    .select('id, name')
    .eq('id', purchase.collection_id)
    .single();
  
  // Check if choice required
  const { count } = await supabase
    .from('collection_characters')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collection?.id);
  
  const requiresChoice = count > 1;
  
  // ADAPTED TO REAL SCHEMA:
  // - Use user_id instead of customer_id
  // - Don't set priority (let trigger calculate)
  // - Set priority_score as number
  const insertData = {
    order_id: purchase.id,
    order_type: 'standalone_purchase',
    user_id: purchase.user_id,  // ← REAL SCHEMA
    customer_name: profile?.full_name || profile?.email || 'Unknown',
    customer_email: profile?.email || '',
    collection_id: collection?.id,
    collection_name: collection?.name || 'Unknown',
    production_status: requiresChoice ? 'awaiting_choice' : 'ready_for_production',
    current_stage: requiresChoice ? 'awaiting_choice' : 'design',
    choice_status: requiresChoice ? 'pending' : 'approved',
    priority_score: 50
    // priority will be calculated by trigger
  };
  
  console.log(`Inserindo: ${profile?.full_name || 'Unknown'}...`);
  
  const { data: inserted, error } = await supabase
    .from('production_queue')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Erro:`, error.message);
    console.error(`   Detalhes:`, error);
  } else {
    console.log(`✅ Sucesso! ID: ${inserted.id}`);
    successCount++;
    
    // Create character_choices if needed
    if (requiresChoice) {
      const choiceDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabase
        .from('character_choices')
        .insert({
          order_id: purchase.id,
          order_type: 'standalone_purchase',
          user_id: purchase.user_id,
          collection_id: collection?.id,
          status: 'pending',
          deadline: choiceDeadline,
          customer_name: profile?.full_name || profile?.email || 'Unknown',
          customer_email: profile?.email || '',
          collection_name: collection?.name || 'Unknown'
        });
      
      console.log(`   ✓ Character choice criado`);
    }
  }
  
  console.log('');
}

// ============================================================================
// RESULTADO
// ============================================================================

console.log('='.repeat(80));
console.log(`\n✅ Concluído! ${successCount} registros inseridos.\n`);

// Verify
const { data: queueItems, count: finalCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact' });

console.log(`📊 Total na production_queue: ${finalCount || 0}\n`);

if (queueItems && queueItems.length > 0) {
  console.log('Itens na fila:');
  queueItems.forEach(item => {
    console.log(`  - ${item.customer_name} | ${item.collection_name} | ${item.current_stage}`);
  });
  console.log('');
}

console.log('='.repeat(80));
console.log('\n🎉 Production Queue populada com sucesso!\n');
console.log('Próximo passo: Acessar http://localhost:8080/admin/producao\n');
