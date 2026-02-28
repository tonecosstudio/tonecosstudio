#!/usr/bin/env python3
"""
Script para aplicar migration de rotation_type via API do Supabase
"""

import os
import requests
import json

# Ler .env
env = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            env[key.strip()] = value.strip().strip('"').strip("'")

supabase_url = env.get('VITE_SUPABASE_URL')
supabase_key = env.get('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print('❌ Erro: Variáveis não encontradas')
    exit(1)

print('🔄 Aplicando migration de rotation_type...\n')

# Comandos SQL
commands = [
    ("Adicionar coluna rotation_type", 
     "ALTER TABLE collections ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'))"),
    ("Adicionar coluna character_revelation_date",
     "ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ"),
    ("Adicionar coluna revealed",
     "ALTER TABLE collections ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false"),
    ("Adicionar coluna character_name",
     "ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_name TEXT"),
    ("Adicionar coluna character_image_url",
     "ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_image_url TEXT"),
    ("Criar índice rotation_type",
     "CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type)"),
    ("Criar índice character_revelation_date",
     "CREATE INDEX IF NOT EXISTS idx_collections_revelation ON collections(character_revelation_date) WHERE revealed = false AND character_revelation_date IS NOT NULL"),
    ("Atualizar rotation_type",
     "UPDATE collections SET rotation_type = 'fixed' WHERE rotation_type IS NULL"),
    ("Atualizar revealed",
     "UPDATE collections SET revealed = false WHERE revealed IS NULL"),
]

success = 0
errors = 0

# Tentar executar via SQL direto (usando a API de management)
headers = {
    'apikey': supabase_key,
    'Authorization': f'Bearer {supabase_key}',
    'Content-Type': 'application/json'
}

for name, sql in commands:
    print(f'📝 {name}...')
    
    # Tentar via query direto
    try:
        # Usar a API do PostgREST para executar queries
        response = requests.post(
            f'{supabase_url}/rest/v1/rpc/query',
            headers=headers,
            json={'query': sql},
            timeout=30
        )
        
        if response.status_code == 200:
            print(f'✅ Sucesso\n')
            success += 1
        elif 'already exists' in response.text or 'duplicate' in response.text:
            print(f'⚠️  Já existe (ignorando)\n')
            success += 1
        else:
            print(f'❌ Erro: {response.status_code} - {response.text[:100]}\n')
            errors += 1
    except Exception as e:
        print(f'❌ Erro: {str(e)}\n')
        errors += 1

print('\n📊 Resumo:')
print(f'   ✅ Sucesso: {success} comandos')
print(f'   ❌ Erros: {errors} comandos')

if errors == 0:
    print('\n🎉 Migration aplicada com sucesso!')
else:
    print('\n⚠️  Alguns erros ocorreram')
    print('\n💡 Solução alternativa:')
    print('   1. Acesse https://app.supabase.com')
    print('   2. Vá em SQL Editor')
    print('   3. Execute o arquivo temp_apply_rotation.sql')

exit(0 if errors == 0 else 1)
