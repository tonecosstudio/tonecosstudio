#!/usr/bin/env node

import postgres from 'postgres';
import { config } from 'dotenv';

config();

const connectionString = `postgresql://postgres.pabxpvqwtvbjaunjejud:${process.env.SUPABASE_DB_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

const sql = postgres(connectionString);

console.log('🚀 Applying Production Management System cron configuration...\n');

try {
  // Step 1: Add expired status
  console.log('1️⃣ Adding "expired" status to character_choices...');
  await sql`
    ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
  `;
  await sql`
    ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
      CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));
  `;
  console.log('   ✅ Added "expired" status');

  // Step 2: Schedule reminders job
  console.log('\n2️⃣ Scheduling character choice reminders job...');
  try {
    await sql`SELECT cron.unschedule('send-character-choice-reminders')`;
  } catch (e) {
    // Job doesn't exist, that's OK
  }
  
  await sql`
    SELECT cron.schedule(
      'send-character-choice-reminders',
      '0 9 * * *',
      $$
      SELECT net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
      $$
    )
  `;
  console.log('   ✅ Scheduled reminders job (daily at 09:00)');

  // Step 3: Schedule expiration job
  console.log('\n3️⃣ Scheduling character choice expiration job...');
  try {
    await sql`SELECT cron.unschedule('expire-character-choices')`;
  } catch (e) {
    // Job doesn't exist, that's OK
  }
  
  await sql`
    SELECT cron.schedule(
      'expire-character-choices',
      '0 * * * *',
      $$
      SELECT net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
      $$
    )
  `;
  console.log('   ✅ Scheduled expiration job (hourly)');

  console.log('\n✅ Production Management System deployed successfully!\n');
  console.log('📋 Summary:');
  console.log('   • Reminders job: Runs daily at 09:00 (Bahia time)');
  console.log('   • Expiration job: Runs every hour');
  console.log('   • Character choices: "expired" status added\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
