#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking standalone_purchases data...\n');

const { data, error } = await supabase
  .from('standalone_purchases')
  .select('*')
  .eq('status', 'balance_paid');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Found:', data?.length);
  console.log('\nData:');
  data?.forEach(p => {
    console.log('---');
    console.log('ID:', p.id);
    console.log('User ID:', p.user_id);
    console.log('Collection ID:', p.collection_id);
    console.log('Status:', p.status);
    console.log('Created:', p.created_at);
  });
}
