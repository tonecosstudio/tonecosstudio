#!/usr/bin/env node
/**
 * Script para verificar e corrigir delivery_month das escolhas mensais
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Verificando delivery_month das escolhas mensais...\n');

// Buscar escolhas do João Trimestral
const { data: selections, error } = await supabase
  .from('subscription_monthly_selections')
  .select(`
    id,
    delivery_month,
    status,
    updated_at,
    character_id,
    collection_characters!inner(name)
  `)
  .eq('user_id', '19554ce7-161b-4f3b-ba17-e165ad56b3c0')
  .order('delivery_month');

if (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
}

console.log('📊 Escolhas encontradas:\n');
console.table(selections.map(s => ({
  personagem: s.collection_characters.name,
  delivery_month: s.delivery_month,
  status: s.status,
  updated_at: new Date(s.updated_at).toLocaleDateString('pt-BR')
})));

console.log('\n🔍 ANÁLISE:\n');

// Analisar cada escolha
selections.forEach((s, index) => {
  const updatedDate = new Date(s.updated_at);
  const deliveryMonth = s.delivery_month;
  
  console.log(`${index + 1}. ${s.collection_characters.name}`);
  console.log(`   Atualizado em: ${updatedDate.toLocaleDateString('pt-BR')}`);
  console.log(`   delivery_month atual: ${deliveryMonth}`);
  console.log(`   Status: ${s.status}`);
  
  // Calcular delivery_month correto baseado no fluxo oficial
  // delivery_month já está no formato YYYY-MM, então vamos apenas validar
  const [year, month] = deliveryMonth.split('-');
  const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  
  console.log(`   Mês de entrega: ${deliveryDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
  console.log('');
});

console.log('\n💡 PROBLEMA IDENTIFICADO:\n');
console.log('O delivery_month está no formato YYYY-MM (ex: 2026-03)');
console.log('Mas deveria representar o MÊS DE ENTREGA, não o mês de criação!');
console.log('\nFluxo correto:');
console.log('  Escolha em MARÇO (2026-03) → Entrega em MAIO (2026-05)');
console.log('  Escolha em ABRIL (2026-04) → Entrega em JUNHO (2026-06)');
console.log('\nO campo delivery_month precisa ser corrigido no banco de dados.');

