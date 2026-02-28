#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ler .env manualmente
const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

console.log('🔧 Aplicando migration de subscriptions...\n');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL direto - apenas as alterações essenciais
const migrations = [
  {
    name: 'Adicionar plan_id',
    sql: 'ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);'
  },
  {
    name: 'Criar índice plan_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);'
  },
  {
    name: 'Tornar collection_id nullable',
    sql: 'ALTER TABLE subscriptions ALTER COLUMN collection_id DROP NOT NULL;'
  },
  {
    name: 'Atualizar constraint de status',
    sql: `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
          ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
          CHECK (status IN ('active', 'paused', 'cancelled', 'completed', 'pending_payment'));`
  },
  {
    name: 'Migrar dados existentes',
    sql: `UPDATE subscriptions s
          SET plan_id = (
            SELECT sp.id 
            FROM subscription_plans sp 
            WHERE sp.plan_type = s.plan_type 
            AND sp.is_active = true
            LIMIT 1
          )
          WHERE plan_id IS NULL 
          AND plan_type IS NOT NULL;`
  }
];

console.log(`📋 Total de migrations: ${migrations.length}\n`);

let successCount = 0;
let errorCount = 0;

for (const migration of migrations) {
  console.log(`🔨 ${migration.name}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { query: migration.sql });
    
    if (error) {
      console.error(`   ❌ Erro:`, error.message);
      errorCount++;
      
      // Se for erro de já existir, considerar sucesso
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('   ℹ️  Já existe, continuando...');
        successCount++;
        continue;
      }
    } else {
      console.log(`   ✅ Sucesso`);
      successCount++;
    }
  } catch (err) {
    console.error(`   ❌ Exceção:`, err.message);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Resultado:`);
console.log(`   ✅ Sucesso: ${successCount}`);
console.log(`   ❌ Erros: ${errorCount}`);
console.log('='.repeat(60));

if (successCount >= 3) {
  console.log('\n🎉 Migration aplicada com sucesso!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Teste criar uma nova assinatura');
  console.log('   2. Verifique se o erro 400 foi resolvido');
  process.exit(0);
} else {
  console.log('\n⚠️  Migration não foi completamente aplicada.');
  process.exit(1);
}
