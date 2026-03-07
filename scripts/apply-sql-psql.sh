#!/bin/bash

# Script para aplicar SQL via psql
# Requer que você tenha o psql instalado e a connection string do Supabase

echo "🔧 Aplicando SQL via psql..."
echo ""

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ psql não está instalado"
    echo ""
    echo "Para instalar:"
    echo "  • Windows: https://www.postgresql.org/download/windows/"
    echo "  • Mac: brew install postgresql"
    echo "  • Linux: sudo apt-get install postgresql-client"
    echo ""
    exit 1
fi

# Connection string
# Você precisa obter isso do Supabase Dashboard > Project Settings > Database > Connection String
# Formato: postgresql://postgres:[YOUR-PASSWORD]@db.pabxpvqwtvbjaunjejud.supabase.co:5432/postgres

echo "⚠️  Você precisa fornecer a connection string do Supabase"
echo ""
echo "Para obter:"
echo "1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database"
echo "2. Copie a 'Connection string' (URI format)"
echo "3. Substitua [YOUR-PASSWORD] pela senha do banco"
echo ""
read -p "Cole a connection string aqui: " CONNECTION_STRING

if [ -z "$CONNECTION_STRING" ]; then
    echo "❌ Connection string não fornecida"
    exit 1
fi

# Executar o SQL
echo ""
echo "📄 Executando SQL..."
psql "$CONNECTION_STRING" -f FIX_TRIGGER_COINS.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SQL executado com sucesso!"
    echo ""
    echo "🎉 Trigger corrigido!"
    echo ""
    echo "📋 Próximos passos:"
    echo "  1. Recarregue a página do admin"
    echo "  2. Verifique que João Trimestral mostra 400 coins"
else
    echo ""
    echo "❌ Erro ao executar SQL"
    echo ""
    echo "Tente aplicar manualmente:"
    echo "https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new"
fi
