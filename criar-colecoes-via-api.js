import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4';

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function login() {
  console.log('\n=== LOGIN ADMIN ===\n');
  console.log('Para criar coleções, você precisa fazer login como admin.\n');
  
  const email = await question('Email do admin: ');
  const password = await question('Senha: ');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });
  
  if (error) {
    console.error('\n✗ Erro ao fazer login:', error.message);
    return false;
  }
  
  console.log('\n✓ Login realizado com sucesso!');
  console.log(`  Usuário: ${data.user.email}`);
  return true;
}

async function criarColecoes() {
  console.log('\n=== CRIANDO COLEÇÕES DE TESTE ===\n');
  
  const colecoes = [
    {
      name: 'Batman - 6 Personagens',
      slug: 'batman-6',
      description: 'Coleção teste com 6 personagens do universo Batman',
      is_active: true,
      personagens: [
        { name: 'Batman', description: 'O Cavaleiro das Trevas', release_order: 1, status: 'released' },
        { name: 'Robin', description: 'O Menino Prodígio', release_order: 2, status: 'released' },
        { name: 'Batgirl', description: 'A Heroína de Gotham', release_order: 3, status: 'revealed' },
        { name: 'Coringa', description: 'O Palhaço do Crime', release_order: 4, status: 'upcoming' },
        { name: 'Mulher-Gato', description: 'A Ladra de Gotham', release_order: 5, status: 'upcoming' },
        { name: 'Pinguim', description: 'O Cavalheiro do Crime', release_order: 6, status: 'upcoming' }
      ]
    },
    {
      name: 'Star Wars - 12 Personagens',
      slug: 'star-wars-12',
      description: 'Coleção teste com 12 personagens do universo Star Wars',
      is_active: true,
      personagens: [
        { name: 'Luke Skywalker', description: 'O último Jedi', release_order: 1, status: 'released' },
        { name: 'Leia Organa', description: 'Princesa de Alderaan', release_order: 2, status: 'released' },
        { name: 'Han Solo', description: 'O contrabandista', release_order: 3, status: 'released' },
        { name: 'Darth Vader', description: 'O Lorde Sith', release_order: 4, status: 'revealed' },
        { name: 'Yoda', description: 'Mestre Jedi', release_order: 5, status: 'upcoming' },
        { name: 'Obi-Wan Kenobi', description: 'Mestre Jedi', release_order: 6, status: 'upcoming' },
        { name: 'Chewbacca', description: 'O Wookiee', release_order: 7, status: 'upcoming' },
        { name: 'R2-D2', description: 'Droide astromecânico', release_order: 8, status: 'upcoming' },
        { name: 'C-3PO', description: 'Droide de protocolo', release_order: 9, status: 'upcoming' },
        { name: 'Boba Fett', description: 'Caçador de recompensas', release_order: 10, status: 'upcoming' },
        { name: 'Stormtrooper', description: 'Soldado Imperial', release_order: 11, status: 'upcoming' },
        { name: 'Imperador Palpatine', description: 'Lorde Sith', release_order: 12, status: 'upcoming' }
      ]
    },
    {
      name: 'Marvel Heroes - 12 Personagens',
      slug: 'marvel-heroes-12',
      description: 'Coleção teste com 12 personagens da Marvel',
      is_active: true,
      personagens: [
        { name: 'Homem de Ferro', description: 'Tony Stark', release_order: 1, status: 'released' },
        { name: 'Capitão América', description: 'Steve Rogers', release_order: 2, status: 'released' },
        { name: 'Thor', description: 'Deus do Trovão', release_order: 3, status: 'revealed' },
        { name: 'Hulk', description: 'Bruce Banner', release_order: 4, status: 'upcoming' },
        { name: 'Viúva Negra', description: 'Natasha Romanoff', release_order: 5, status: 'upcoming' },
        { name: 'Gavião Arqueiro', description: 'Clint Barton', release_order: 6, status: 'upcoming' },
        { name: 'Homem-Aranha', description: 'Peter Parker', release_order: 7, status: 'upcoming' },
        { name: 'Pantera Negra', description: 'T\'Challa', release_order: 8, status: 'upcoming' },
        { name: 'Doutor Estranho', description: 'Stephen Strange', release_order: 9, status: 'upcoming' },
        { name: 'Feiticeira Escarlate', description: 'Wanda Maximoff', release_order: 10, status: 'upcoming' },
        { name: 'Visão', description: 'Androide sintético', release_order: 11, status: 'upcoming' },
        { name: 'Falcão', description: 'Sam Wilson', release_order: 12, status: 'upcoming' }
      ]
    }
  ];
  
  for (const colecao of colecoes) {
    console.log(`\nProcessando: ${colecao.name}...`);
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', colecao.slug)
      .maybeSingle();
    
    let collectionId;
    
    if (existing) {
      console.log(`  ✓ Coleção já existe (ID: ${existing.id})`);
      collectionId = existing.id;
    } else {
      // Criar coleção
      const { data, error } = await supabase
        .from('collections')
        .insert({
          name: colecao.name,
          slug: colecao.slug,
          description: colecao.description,
          is_active: colecao.is_active
        })
        .select()
        .single();
      
      if (error) {
        console.error(`  ✗ Erro ao criar coleção: ${error.message}`);
        continue;
      }
      
      console.log(`  ✓ Coleção criada (ID: ${data.id})`);
      collectionId = data.id;
    }
    
    // Criar personagens
    console.log(`  Criando ${colecao.personagens.length} personagens...`);
    
    for (const char of colecao.personagens) {
      const { data: existingChar } = await supabase
        .from('collection_characters')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('name', char.name)
        .maybeSingle();
      
      if (existingChar) {
        console.log(`    ✓ ${char.name} já existe`);
        continue;
      }
      
      const { error } = await supabase
        .from('collection_characters')
        .insert({
          collection_id: collectionId,
          name: char.name,
          description: char.description,
          release_order: char.release_order,
          status: char.status
        });
      
      if (error) {
        console.log(`    ✗ Erro ao criar ${char.name}: ${error.message}`);
      } else {
        console.log(`    ✓ ${char.name} criado`);
      }
    }
  }
}

async function verificar() {
  console.log('\n=== VERIFICAÇÃO FINAL ===\n');
  
  const { data, error } = await supabase
    .from('collections')
    .select(`
      name,
      slug,
      collection_characters(count)
    `)
    .in('slug', ['batman-6', 'star-wars-12', 'marvel-heroes-12']);
  
  if (error) {
    console.error('Erro ao verificar:', error);
    return;
  }
  
  console.log('Coleções criadas:\n');
  data.forEach(col => {
    const count = col.collection_characters[0]?.count || 0;
    console.log(`  ${col.name}`);
    console.log(`    Slug: ${col.slug}`);
    console.log(`    Personagens: ${count}`);
    console.log(`    URL: http://localhost:5173/colecoes/${col.slug}\n`);
  });
}

async function main() {
  const loggedIn = await login();
  
  if (!loggedIn) {
    console.log('\n❌ Não foi possível fazer login. Abortando.\n');
    rl.close();
    return;
  }
  
  await criarColecoes();
  await verificar();
  
  console.log('\n✅ Processo concluído!\n');
  console.log('Teste as páginas no navegador:\n');
  console.log('  - http://localhost:5173/colecoes/batman-6');
  console.log('  - http://localhost:5173/colecoes/star-wars-12');
  console.log('  - http://localhost:5173/colecoes/marvel-heroes-12\n');
  
  rl.close();
}

main().catch(error => {
  console.error('\n❌ Erro:', error);
  rl.close();
});
