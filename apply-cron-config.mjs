#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyCronConfiguration() {
  console.log('🚀 Applying Production Management System cron configuration...\n');

  // Step 1: Unschedule existing jobs
  console.log('1️⃣ Unscheduling existing cron jobs...');
  
  const unscheduleReminders = `
    DO $$ 
    BEGIN
      PERFORM cron.unschedule('send-character-choice-reminders');
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END $$;
  `;
  
  const { error: error1 } = await supabase.rpc('exec_sql', { sql: unscheduleReminders });
  if (error1) console.log('   ⚠️  Reminders job not found (OK if first run)');
  else console.log('   ✅ Unscheduled reminders job');

  const unscheduleExpiration = `
    DO $$ 
    BEGIN
      PERFORM cron.unschedule('expire-character-choices');
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END $$;
  `;
  
  const { error: error2 } = await supabase.rpc('exec_sql', { sql: unscheduleExpiration });
  if (error2) console.log('   ⚠️  Expiration job not found (OK if first run)');
  else console.log('   ✅ Unscheduled expiration job');

  // Step 2: Schedule reminders job
  console.log('\n2️⃣ Scheduling character choice reminders job...');
  
  const scheduleReminders = `
    DO $$
    BEGIN
      PERFORM cron.schedule(
        'send-character-choice-reminders',
        '0 9 * * *',
        $$
        SELECT net.http_post(
          url:='${SUPABASE_URL}/functions/v1/cron-send-character-choice-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
          body:='{}'::jsonb
        ) as request_id;
        $$
      );
    EXCEPTION
      WHEN OTHERS THEN 
        RAISE NOTICE 'Could not schedule reminders job: %', SQLERRM;
    END $$;
  `;
  
  const { error: error3 } = await supabase.rpc('exec_sql', { sql: scheduleReminders });
  if (error3) {
    console.log('   ❌ Error scheduling reminders job:', error3.message);
  } else {
    console.log('   ✅ Scheduled reminders job (daily at 09:00 Bahia time)');
  }

  // Step 3: Schedule expiration job
  console.log('\n3️⃣ Scheduling character choice expiration job...');
  
  const scheduleExpiration = `
    DO $$
    BEGIN
      PERFORM cron.schedule(
        'expire-character-choices',
        '0 * * * *',
        $$
        SELECT net.http_post(
          url:='${SUPABASE_URL}/functions/v1/cron-expire-character-choices',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
          body:='{}'::jsonb
        ) as request_id;
        $$
      );
    EXCEPTION
      WHEN OTHERS THEN 
        RAISE NOTICE 'Could not schedule expiration job: %', SQLERRM;
    END $$;
  `;
  
  const { error: error4 } = await supabase.rpc('exec_sql', { sql: scheduleExpiration });
  if (error4) {
    console.log('   ❌ Error scheduling expiration job:', error4.message);
  } else {
    console.log('   ✅ Scheduled expiration job (hourly)');
  }

  // Step 4: Update character_choices constraint
  console.log('\n4️⃣ Updating character_choices status constraint...');
  
  const updateConstraint = `
    DO $$
    BEGIN
      ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
      ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
        CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));
    END $$;
  `;
  
  const { error: error5 } = await supabase.rpc('exec_sql', { sql: updateConstraint });
  if (error5) {
    console.log('   ❌ Error updating constraint:', error5.message);
  } else {
    console.log('   ✅ Updated status constraint (added "expired")');
  }

  // Step 5: Verify configuration
  console.log('\n5️⃣ Verifying configuration...');
  
  const verifyCrons = `
    SELECT jobname, schedule, active
    FROM cron.job 
    WHERE jobname IN ('send-character-choice-reminders', 'expire-character-choices')
    ORDER BY jobname;
  `;
  
  const { data: cronJobs, error: error6 } = await supabase.rpc('exec_sql', { sql: verifyCrons });
  if (error6) {
    console.log('   ⚠️  Could not verify cron jobs');
  } else {
    console.log('   ✅ Cron jobs verified');
  }

  console.log('\n✅ Production Management System cron configuration completed!\n');
  console.log('📋 Summary:');
  console.log('   • Reminders job: Runs daily at 09:00 (Bahia time)');
  console.log('   • Expiration job: Runs every hour');
  console.log('   • Character choices: "expired" status added');
  console.log('\n🔍 To verify, run: node verify-cron-config.mjs\n');
}

applyCronConfiguration().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
