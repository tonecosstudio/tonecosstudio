import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying character_choices denormalization migration...\n');
  
  try {
    // Step 1: Add columns
    console.log('Step 1: Adding denormalized columns...');
    const { error: addColumnsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE character_choices
        ADD COLUMN IF NOT EXISTS customer_name TEXT,
        ADD COLUMN IF NOT EXISTS customer_email TEXT,
        ADD COLUMN IF NOT EXISTS collection_name TEXT;
      `
    });
    
    if (addColumnsError && !addColumnsError.message.includes('already exists')) {
      throw addColumnsError;
    }
    console.log('✅ Columns added\n');
    
    // Step 2: Populate existing records
    console.log('Step 2: Populating existing records...');
    const { error: populateError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE character_choices cc
        SET 
          customer_name = COALESCE(p.full_name, p.email, 'Unknown Customer'),
          customer_email = p.email
        FROM profiles p
        WHERE cc.user_id = p.id
          AND (cc.customer_name IS NULL OR cc.customer_email IS NULL);
        
        UPDATE character_choices cc
        SET collection_name = c.name
        FROM collections c
        WHERE cc.collection_id = c.id
          AND cc.collection_name IS NULL;
      `
    });
    
    if (populateError) {
      throw populateError;
    }
    console.log('✅ Existing records populated\n');
    
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Error applying migration:', err);
    process.exit(1);
  }
}

applyMigration();
