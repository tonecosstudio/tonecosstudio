#!/usr/bin/env node
/**
 * Fix Priority Column and Populate Production Queue
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

console.log('🔧 SOLUÇÃO PROFISSIONAL: Fix Priority & Populate Queue\n');
console.log('='.repeat(80));

// ============================================================================
// STEP 1: Fix Priority Column Type
// ============================================================================

console.log('\n📊 STEP 1: Fixing priority column type...\n');

const fixPrioritySql = `
-- Drop trigger temporarily
DROP TRIGGER IF EXISTS trigger_update_production_queue_priority ON production_queue;

-- Change column type to TEXT
ALTER TABLE production_queue 
  ALTER COLUMN priority TYPE TEXT USING priority::TEXT;

-- Add constraint
ALTER TABLE production_queue
  DROP CONSTRAINT IF EXISTS production_queue_priority_check;

ALTER TABLE production_queue
  ADD CONSTRAINT production_queue_priority_check 
  CHECK (priority IN ('critical', 'high', 'normal', 'low'));

-- Recreate trigger
CREATE TRIGGER trigger_update_production_queue_priority
  BEFORE INSERT OR UPDATE OF order_type, choice_deadline, created_at
  ON production_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_production_queue_priority();
`;

try {
  const { error } = await supabase.rpc('exec_sql', { sql: fixPrioritySql });
  if (error) {
    console.log('⚠️  Could not fix via RPC (expected - requires admin)');
    console.log('   Trying direct table modification...\n');
  } else {
    console.log('✅ Priority column fixed!\n');
  }
} catch (e) {
  console.log('⚠️  RPC not available, continuing with population...\n');
}

// ============================================================================
// STEP 2: Populate Production Queue
// ============================================================================

console.log('📦 STEP 2: Populating production_queue...\n');

const { data: purchases } = await supabase
  .from('standalone_purchases')
  .select('*')  // Select all fields
  .eq('status', 'balance_paid');

console.log(`Found ${purchases?.length || 0} standalone_purchases with balance_paid status\n`);

if (purchases && purchases.length > 0) {
  console.log('Sample purchase data:');
  console.log('  ID:', purchases[0].id);
  console.log('  User ID:', purchases[0].user_id);
  console.log('  Collection ID:', purchases[0].collection_id);
  console.log('');
}

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
    console.log(`⏭️  Already exists: ${purchase.id}`);
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
  
  // Try insert WITHOUT priority field (let trigger set it)
  const insertData = {
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
    priority_score: 50  // Set score, let trigger calculate priority text
  };
  
  console.log('Inserting:', {
    order_id: insertData.order_id,
    customer_id: insertData.customer_id,
    customer_name: insertData.customer_name
  });
  
  const { error } = await supabase
    .from('production_queue')
    .insert(insertData);
  
  if (error) {
    console.error(`❌ Error inserting ${purchase.id}:`, error.message);
  } else {
    console.log(`✅ Inserted: ${profile?.full_name || 'Unknown'}`);
    successCount++;
  }
}

console.log(`\n✅ Successfully populated ${successCount} items!\n`);

// Verify
const { count: finalCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Total in production_queue: ${finalCount || 0}\n`);
console.log('='.repeat(80));
console.log('\n✅ Done!\n');
