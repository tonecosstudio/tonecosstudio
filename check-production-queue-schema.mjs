#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Try to insert a minimal record to see what fails
const testData = {
  order_id: '00000000-0000-0000-0000-000000000001',
  order_type: 'standalone_purchase',
  customer_id: '00000000-0000-0000-0000-000000000002',
  customer_name: 'Test',
  customer_email: 'test@test.com',
  collection_id: '00000000-0000-0000-0000-000000000003',
  collection_name: 'Test Collection',
  production_status: 'ready_for_production',
  current_stage: 'design',
  choice_status: 'approved'
};

console.log('Testing insert with minimal data...\n');
console.log('Data:', JSON.stringify(testData, null, 2));

const { data, error } = await supabase
  .from('production_queue')
  .insert(testData)
  .select()
  .single();

if (error) {
  console.error('\n❌ Error:', error.message);
  console.error('Details:', error);
} else {
  console.log('\n✅ Success!', data);
  
  // Clean up
  await supabase
    .from('production_queue')
    .delete()
    .eq('id', data.id);
}
