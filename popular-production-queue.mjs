#!/usr/bin/env node
/**
 * Script para Popular Production Queue
 * 
 * Popula a production_queue com registros existentes que têm status correto
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

console.log('🚀 Populando Production Queue\n');
console.log('='.repeat(80));

let totalProcessed = 0;

// ============================================================================
// 1. Process standalone_purchases with status = 'balance_paid'
// ============================================================================

console.log('\n📦 Processando standalone_purchases...');

const { data: purchases, error: purchasesError } = await supabase
  .from('standalone_purchases')
  .select('id, user_id, collection_id, updated_at, created_at')
  .eq('status', 'balance_paid');

if (purchasesError) {
  console.error('❌ Erro:', purchasesError.message);
} else {
  console.log(`✓ Encontrados: ${purchases?.length || 0}`);
  
  for (const purchase of purchases || []) {
    // Check if already in queue
    const { data: existing } = await supabase
      .from('production_queue')
      .select('id')
      .eq('order_id', purchase.id)
      .eq('order_type', 'standalone_purchase')
      .single();
    
    if (existing) {
      console.log(`  ⏭️  Já existe: ${purchase.id}`);
      continue;
    }
    
    // Get customer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', purchase.user_id)
      .single();
    
    // Get collection info
    const { data: collection } = await supabase
      .from('collections')
      .select('id, name')
      .eq('id', purchase.collection_id)
      .single();
    
    // Check if choice is required
    const { count: charCount } = await supabase
      .from('collection_characters')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collection?.id);
    
    const requiresChoice = charCount > 1;
    
    // Calculate choice deadline (7 days from now)
    const choiceDeadline = requiresChoice 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    
    // Insert into production_queue
    const { error: insertError } = await supabase
      .from('production_queue')
      .insert({
        order_id: purchase.id,
        order_type: 'standalone_purchase',
        customer_id: purchase.user_id,
        customer_name: profile?.full_name || profile?.email || 'Unknown',
        customer_email: profile?.email || '',
        collection_id: collection?.id,
        collection_name: collection?.name || 'Unknown',
        production_status: requiresChoice ? 'awaiting_choice' : 'ready_for_production',
        current_stage: requiresChoice ? 'awaiting_choice' : 'design',
        choice_status: requiresChoice ? 'pending' : 'approved',
        choice_deadline: choiceDeadline,
        scheduled_production_date: requiresChoice ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (insertError) {
      console.error(`  ❌ Erro ao inserir ${purchase.id}:`, insertError.message);
    } else {
      console.log(`  ✓ Inserido: ${purchase.id} (${profile?.full_name || 'Unknown'})`);
      totalProcessed++;
      
      // Create character_choices if needed
      if (requiresChoice) {
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
          })
          .select()
          .single();
      }
    }
  }
}

// ============================================================================
// RESULTADO
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Concluído! ${totalProcessed} registros processados.\n`);

// Verify
const { count: finalCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Total na production_queue: ${finalCount || 0}\n`);
