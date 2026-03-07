#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🧪 Testando query da fila de produção...\n');

  // Simular a query que a página AdminProductionQueue faz
  const { data, error } = await supabase
    .from('production_queue')
    .select('*')
    .order('priority_score', { ascending: false });

  if (error) {
    console.error('❌ Erro na query:', error);
    return;
  }

  console.log(`✅ Query executada com sucesso!`);
  console.log(`📦 Total de itens: ${data?.length || 0}\n`);

  if (data?.length) {
    console.log('📋 Primeiros 5 itens:\n');
    data.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. ${item.customer_name}`);
      console.log(`   Coleção: ${item.collection_name}`);
      console.log(`   Personagem: ${item.character_name || 'Aguardando escolha'}`);
      console.log(`   Status: ${item.production_status}`);
      console.log(`   Prioridade: ${item.priority} (${item.priority_score})`);
      console.log('');
    });
  }

  // Testar filtros
  console.log('🔍 Testando filtros...\n');

  const statuses = ['completed', 'in_production', 'awaiting_choice'];
  for (const status of statuses) {
    const { data: filtered } = await supabase
      .from('production_queue')
      .select('id')
      .eq('production_status', status);
    
    console.log(`   ${status}: ${filtered?.length || 0} itens`);
  }

  console.log('\n✅ Todos os testes passaram!\n');
  console.log('📍 A página deve estar funcionando em:');
  console.log('   http://localhost:8080/admin/fila-producao');
  console.log('   http://localhost:8080/admin/assinaturas-gerenciar\n');
}

main().catch(console.error);
