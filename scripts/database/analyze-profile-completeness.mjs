#!/usr/bin/env node

/**
 * Script: Analyze Profile Completeness
 * 
 * Analisa quais usuários podem fazer pedidos e quais campos estão faltando
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('='.repeat(60));
  console.log('📋 Análise: Completude de Perfis para Pedidos');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Buscar todos os perfis
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, cpf, phone, whatsapp, delivery_address');

    if (error) throw error;

    let canOrder = 0;
    let cannotOrder = 0;
    const missingFieldsStats = {};

    console.log('📊 Analisando perfis...');
    console.log('');

    profiles?.forEach(profile => {
      const missing = [];

      // Nome completo
      if (!profile.full_name || profile.full_name.trim() === '') {
        missing.push('Nome completo');
      }

      // CPF
      if (!profile.cpf || profile.cpf.trim() === '') {
        missing.push('CPF');
      }

      // Telefone OU WhatsApp
      if ((!profile.phone || profile.phone.trim() === '') && 
          (!profile.whatsapp || profile.whatsapp.trim() === '')) {
        missing.push('Telefone ou WhatsApp');
      }

      // Email
      if (!profile.email || profile.email.trim() === '') {
        missing.push('Email');
      }

      // Endereço
      const address = profile.delivery_address;
      if (!address || 
          !address.street || 
          !address.number || 
          !address.neighborhood || 
          !address.city || 
          !address.state || 
          !address.zipCode) {
        missing.push('Endereço de entrega');
      }

      if (missing.length === 0) {
        canOrder++;
      } else {
        cannotOrder++;
        
        // Estatísticas de campos faltantes
        missing.forEach(field => {
          missingFieldsStats[field] = (missingFieldsStats[field] || 0) + 1;
        });

        console.log(`❌ ${profile.full_name || profile.email || 'Sem nome'}`);
        console.log(`   Email: ${profile.email || 'N/A'}`);
        console.log(`   Faltando: ${missing.join(', ')}`);
        console.log('');
      }
    });

    console.log('='.repeat(60));
    console.log('📊 RESUMO GERAL');
    console.log('='.repeat(60));
    console.log('');
    console.log(`✅ Podem fazer pedidos: ${canOrder}`);
    console.log(`❌ Não podem fazer pedidos: ${cannotOrder}`);
    console.log(`📈 Total de usuários: ${profiles?.length || 0}`);
    console.log('');

    if (Object.keys(missingFieldsStats).length > 0) {
      console.log('📋 Campos mais faltantes:');
      console.log('');
      Object.entries(missingFieldsStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([field, count]) => {
          const percentage = ((count / cannotOrder) * 100).toFixed(1);
          console.log(`   ${field}: ${count} usuários (${percentage}%)`);
        });
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('🔧 RECOMENDAÇÕES');
    console.log('='.repeat(60));
    console.log('');
    
    if (cannotOrder > 0) {
      console.log('1. Adicionar modal de boas-vindas solicitando dados');
      console.log('2. Exibir alerta no perfil para campos faltantes');
      console.log('3. Bloquear checkout até completar perfil');
      console.log('4. Enviar email lembrando de completar cadastro');
      console.log('');
      console.log('💡 Execute a migration para ativar validações:');
      console.log('   scripts/database/APPLY_REQUIRED_FIELDS.sql');
    } else {
      console.log('🎉 Todos os usuários podem fazer pedidos!');
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
