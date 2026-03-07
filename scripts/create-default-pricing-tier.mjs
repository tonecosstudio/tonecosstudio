#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Criando pricing tier padrão...');
console.log('');

async function createDefaultTier() {
  try {
    // Verificar se já existe um tier padrão
    const { data: existing } = await supabase
      .from('pricing_tiers')
      .select('id, name, is_default')
      .eq('is_default', true)
      .single();

    if (existing) {
      console.log(`✅ Tier padrão já existe: ${existing.name}`);
      return;
    }

    // Criar tier padrão
    const defaultTier = {
      name: 'Padrão',
      description: 'Nível de preço padrão para coleções',
      price_full: 150.00,
      price_pix: 142.50,  // 5% desconto
      deposit_amount: 50.00,
      is_default: true,
      is_active: true,
      display_order: 1
    };

    console.log('⚙️ Criando tier padrão...');
    const { data, error } = await supabase
      .from('pricing_tiers')
      .insert(defaultTier)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro:', error.message);
      return;
    }

    console.log(`✅ Tier padrão criado: ${data.id}`);
    console.log('');
    console.log('Agora posso criar coleções normalmente!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

createDefaultTier();
