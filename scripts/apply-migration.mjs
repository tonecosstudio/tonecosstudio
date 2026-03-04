/**
 * Simple script to apply SQL migration to Supabase
 * Usage: node scripts/apply-migration.mjs <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node scripts/apply-migration.mjs <migration-file>');
  console.error('   Example: node scripts/apply-migration.mjs supabase/migrations/20260429000003_sync_production_status_to_orders.sql');
  process.exit(1);
}

console.log('📦 Reading migration file:', migrationFile);
const sql = readFileSync(migrationFile, 'utf-8');

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Executing migration...\n');

// Split SQL into statements and execute them
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => {
    // Filter out empty statements and comments
    if (!s) return false;
    if (s.startsWith('--')) return false;
    // Keep DO blocks and other multi-line statements
    return true;
  });

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Skip summary SELECT statements
  if (statement.includes('migration_file') && statement.includes('AS migration_file')) {
    console.log('⏭️  Skipping summary statement');
    continue;
  }
  
  // Skip empty or comment-only statements
  if (!statement || statement.trim().length === 0) {
    continue;
  }
  
  try {
    console.log(`[${i + 1}/${statements.length}] Executing...`);
    
    // Execute the statement
    const { data, error } = await supabase.rpc('exec', {
      sql: statement + ';'
    });
    
    if (error) {
      // Try alternative method - direct query
      const { error: queryError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(0); // Just to test connection
      
      if (queryError) {
        throw error;
      }
      
      // If we can't use RPC, we need to use the SQL editor
      console.log('⚠️  Cannot execute via RPC. Please use Supabase SQL Editor.');
      console.log('   1. Go to: ' + supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/') + '/sql');
      console.log('   2. Copy the contents of: ' + migrationFile);
      console.log('   3. Paste and run in the SQL Editor');
      process.exit(1);
    }
    
    successCount++;
    console.log('✅ Success\n');
    
  } catch (error) {
    errorCount++;
    console.error('❌ Error:', error.message);
    console.error('   Statement:', statement.substring(0, 100) + '...\n');
  }
}

console.log('\n📊 Migration Summary:');
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ❌ Failed: ${errorCount}`);

if (errorCount > 0) {
  console.log('\n⚠️  Some statements failed. Please review the errors above.');
  console.log('   You may need to apply the migration manually using the Supabase SQL Editor.');
  process.exit(1);
} else {
  console.log('\n🎉 Migration completed successfully!');
}
