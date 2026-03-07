#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStructure() {
  console.log('\n🔍 Verificando estrutura da tabela collection_characters...\n');

  try {
    // Buscar uma linha para ver as colunas
    const { data, error } = await supabase
      .from('collection_characters')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      console.log('📋 Colunas disponíveis:');
      console.log(Object.keys(data[0]).join(', '));
      console.log('');
      console.log('📄 Exemplo de registro:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  Nenhum registro encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkStructure();
