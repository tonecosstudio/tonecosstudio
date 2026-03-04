#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey || !supabaseUrl) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;
    
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });
      
      if (error) {
        console.error(`❌ Error:`, error.message);
        // Continue with next statement
      } else {
        console.log(`✅ Success`);
        if (data) console.log(data);
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message);
    }
  }
}

async function main() {
  console.log('📦 Reading SQL file...');
  const sql = readFileSync('deploy-production-management-migrations.sql', 'utf8');
  
  console.log('🚀 Applying Production Management System migrations...\n');
  
  await executeSql(sql);
  
  console.log('\n✅ Process completed!');
}

main().catch(console.error);
