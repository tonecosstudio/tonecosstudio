const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  const migrationPath = path.join('supabase', 'migrations', '20260506000000_add_denormalized_fields_to_character_choices.sql');
  console.log('Applying character_choices denormalization migration...\n');
  
  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.includes('DO $')) {
        // Handle DO blocks specially
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (error) {
          console.error('Error executing DO block:', error);
          throw error;
        }
      } else {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (error && !error.message.includes('already exists')) {
          console.error('Error executing statement:', error);
          throw error;
        }
      }
    }
    
    console.log('✅ Successfully applied migration!\n');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
