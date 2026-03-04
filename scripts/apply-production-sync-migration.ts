/**
 * Script to apply the production status sync migration to the remote database
 * This script reads the migration file and executes it using the Supabase service role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(process.cwd(), 'supabase/migrations/20260429000003_sync_production_status_to_orders.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to remote database...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not found, trying direct execution...');
      
      // Split the migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('SELECT') && statement.includes('migration_file')) {
          // Skip the summary SELECT statement
          continue;
        }
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: execError } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('  - Created function: sync_production_status_to_orders()');
    console.log('  - Created trigger: trigger_sync_production_status_to_orders');
    console.log('\n🎯 What this does:');
    console.log('  - When production_queue.current_stage changes to "shipped", updates order status to "shipped"');
    console.log('  - When production_queue.production_status becomes "completed", updates order status to "delivered"');
    console.log('  - Syncs tracking_code from production_queue.production_notes to orders');
    console.log('  - Syncs expected_delivery_date from production_queue.estimated_completion_date to orders');
    console.log('  - Works for both subscription_deliveries and standalone_purchases');

  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  }
}

applyMigration();
