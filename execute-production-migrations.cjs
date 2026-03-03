#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnv() {
  const envFile = fs.readFileSync('.env', 'utf8');
  const env = {};
  envFile.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        env[key.trim()] = value;
      }
    }
  });
  return env;
}

const env = loadEnv();
console.log('Loaded environment variables:', Object.keys(env));

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key:', serviceKey ? '***' + serviceKey.slice(-10) : 'NOT FOUND');

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Available keys:', Object.keys(env));
  process.exit(1);
}

const migrations = [
  '20260428000000_create_production_queue.sql',
  '20260428000001_create_character_choices.sql',
  '20260428000002_create_production_stages.sql',
  '20260428000003_create_production_views.sql',
  '20260428000004_create_production_functions.sql'
];

async function executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function applyMigrations() {
  console.log('🚀 Starting production migrations...\n');
  
  for (const migration of migrations) {
    const migrationPath = path.join('supabase', 'migrations', migration);
    console.log(`📝 Applying ${migration}...`);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Try to execute the SQL
      try {
        await executeSql(sql);
        console.log(`✅ Successfully applied ${migration}\n`);
      } catch (apiError) {
        // If exec_sql RPC doesn't exist, we need to create it or use a different method
        console.error(`❌ Error applying ${migration}:`);
        console.error(apiError.message);
        console.error('\n💡 The exec_sql RPC function may not exist.');
        console.error('Please apply the migrations manually using the Supabase SQL Editor:');
        console.error(`   ${supabaseUrl.replace('/rest/v1', '')}/project/_/sql`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ Error reading ${migration}:`, err.message);
      process.exit(1);
    }
  }
  
  console.log('✅ All production migrations applied successfully!');
  console.log('\n📊 Next step: Add the manual payment to the production queue');
  console.log('   Run: node add_manual_payment_to_queue.sql');
}

applyMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
