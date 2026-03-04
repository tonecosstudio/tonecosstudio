#!/usr/bin/env node

import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response;
}

async function applyCronConfiguration() {
  console.log('🚀 Applying Production Management System cron configuration...\n');

  const sql = readFileSync('deploy-production-management-migrations.sql', 'utf8');
  
  console.log('📝 Executing SQL script...');
  
  try {
    await executeSQL(sql);
    console.log('✅ SQL executed successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try alternative approach: execute statements individually
    console.log('\n🔄 Trying alternative approach...\n');
    
    const statements = [
      {
        name: 'Unschedule reminders job',
        sql: `SELECT cron.unschedule('send-character-choice-reminders');`
      },
      {
        name: 'Unschedule expiration job',
        sql: `SELECT cron.unschedule('expire-character-choices');`
      },
      {
        name: 'Schedule reminders job',
        sql: `SELECT cron.schedule(
          'send-character-choice-reminders',
          '0 9 * * *',
          $$SELECT net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cron-send-character-choice-reminders',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${ANON_KEY}"}'::jsonb,
            body:='{}'::jsonb
          ) as request_id;$$
        );`
      },
      {
        name: 'Schedule expiration job',
        sql: `SELECT cron.schedule(
          'expire-character-choices',
          '0 * * * *',
          $$SELECT net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cron-expire-character-choices',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${ANON_KEY}"}'::jsonb,
            body:='{}'::jsonb
          ) as request_id;$$
        );`
      },
      {
        name: 'Update character_choices constraint',
        sql: `ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
              ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
                CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));`
      }
    ];

    for (const stmt of statements) {
      try {
        console.log(`   Executing: ${stmt.name}...`);
        await executeSQL(stmt.sql);
        console.log(`   ✅ ${stmt.name}`);
      } catch (err) {
        console.log(`   ⚠️  ${stmt.name}: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Configuration process completed!\n');
  console.log('📋 Next steps:');
  console.log('   1. Verify cron jobs in Supabase Dashboard');
  console.log('   2. Check Edge Functions are deployed');
  console.log('   3. Test the system with a sample order\n');
}

applyCronConfiguration().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
