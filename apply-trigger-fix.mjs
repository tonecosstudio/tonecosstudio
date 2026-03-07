#!/usr/bin/env node
/**
 * Apply Trigger Fix Directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Applying Trigger Fix...\n');

// Read the SQL file
const sql = readFileSync('supabase/migrations/20260307000003_fix_trigger_function_user_id.sql', 'utf8');

// Extract just the CREATE OR REPLACE FUNCTION part
const functionMatch = sql.match(/CREATE OR REPLACE FUNCTION auto_populate_production_queue\(\)[\s\S]*?LANGUAGE plpgsql;/);

if (!functionMatch) {
  console.error('❌ Could not find function definition in SQL file');
  process.exit(1);
}

const functionSql = functionMatch[0];

console.log('Executing SQL...\n');

try {
  const { error } = await supabase.rpc('exec_sql', { sql: functionSql });
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  RPC method not available. Trying alternative...\n');
    
    // Alternative: Use Supabase REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql: functionSql })
    });
    
    if (!response.ok) {
      console.error('❌ Failed:', await response.text());
      console.log('\n📝 Please apply this SQL manually in Supabase SQL Editor:\n');
      console.log(functionSql);
    } else {
      console.log('✅ Function updated successfully!');
    }
  } else {
    console.log('✅ Function updated successfully!');
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
  console.log('\n📝 Please apply this SQL manually in Supabase SQL Editor:\n');
  console.log(functionSql);
}

console.log('\n✅ Done!\n');
