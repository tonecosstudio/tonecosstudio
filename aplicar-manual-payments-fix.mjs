import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ler .env manualmente
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    // Remove aspas duplas
    const value = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 Aplicando fix de manual_payments...\n');
  
  // SQL para aplicar
  const sql = `
    -- Tornar payment_method_id opcional
    ALTER TABLE manual_payments ALTER COLUMN payment_method_id DROP NOT NULL;
    
    -- Atualizar constraint de payment_type
    ALTER TABLE manual_payments DROP CONSTRAINT IF EXISTS manual_payments_payment_type_check;
    ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_payment_type_check 
      CHECK (payment_type IN ('one_time', 'recurring', 'subscription'));
    
    -- Adicionar comentários
    COMMENT ON COLUMN manual_payments.payment_method_id IS 'Método de pagamento configurado pelo admin. Opcional - pode ser definido posteriormente.';
    COMMENT ON COLUMN manual_payments.payment_type IS 'one_time: pagamento único (quote) | recurring: pagamento recorrente | subscription: assinatura';
  `;
  
  try {
    // Tentar via RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Erro ao aplicar via RPC:', error.message);
      console.log('\n📋 Aplique manualmente via Dashboard:');
      console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
      console.log(sql);
      process.exit(1);
    }
    
    console.log('✅ Migration aplicada com sucesso!\n');
    
    // Verificar
    const { data: verify, error: verifyError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT column_name, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'manual_payments' 
          AND column_name = 'payment_method_id'
        `
      });
    
    if (verify) {
      console.log('✅ Verificação:', verify);
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('\n📋 Aplique manualmente via Dashboard:');
    console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
    console.log(sql);
  }
}

applyFix();
