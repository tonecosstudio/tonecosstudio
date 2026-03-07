#!/usr/bin/env node
/**
 * Trigger Auto-Populate
 * 
 * Instead of manually inserting, let's trigger the auto_populate function
 * by updating the status of existing records
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

console.log('🔄 Triggering Auto-Populate via Status Update\n');
console.log('='.repeat(80));

// Get standalone_purchases with balance_paid
const { data: purchases } = await supabase
  .from('standalone_purchases')
  .select('id, status')
  .eq('status', 'balance_paid');

console.log(`\nFound ${purchases?.length || 0} purchases with balance_paid status\n`);

for (const purchase of purchases || []) {
  console.log(`Processing: ${purchase.id}`);
  
  // Check if already in queue
  const { data: existing } = await supabase
    .from('production_queue')
    .select('id')
    .eq('order_id', purchase.id)
    .eq('order_type', 'standalone_purchase')
    .maybeSingle();
  
  if (existing) {
    console.log(`  ✓ Already in queue\n`);
    continue;
  }
  
  // Trigger the auto-populate by updating status
  // First change to a different status, then back to balance_paid
  console.log(`  → Changing status to deposit_paid...`);
  await supabase
    .from('standalone_purchases')
    .update({ status: 'deposit_paid' })
    .eq('id', purchase.id);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`  → Changing status back to balance_paid...`);
  const { error } = await supabase
    .from('standalone_purchases')
    .update({ status: 'balance_paid' })
    .eq('id', purchase.id);
  
  if (error) {
    console.error(`  ❌ Error:`, error.message);
  } else {
    console.log(`  ✓ Status updated`);
  }
  
  // Wait a bit for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if it was added to queue
  const { data: newItem } = await supabase
    .from('production_queue')
    .select('id, customer_name')
    .eq('order_id', purchase.id)
    .eq('order_type', 'standalone_purchase')
    .maybeSingle();
  
  if (newItem) {
    console.log(`  ✅ SUCCESS! Added to queue: ${newItem.customer_name}\n`);
  } else {
    console.log(`  ❌ NOT added to queue (trigger may not be working)\n`);
  }
}

// Final check
const { count } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });

console.log('='.repeat(80));
console.log(`\n📊 Total in production_queue: ${count || 0}\n`);
