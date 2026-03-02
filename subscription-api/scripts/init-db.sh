#!/bin/bash

# Script para inicializar o banco de dados do sistema de assinaturas

set -e

echo "🚀 Iniciando configuração do banco de dados..."
echo ""

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Copiando .env.example para .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado"
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar"
    echo ""
    read -p "Pressione ENTER após configurar o .env..."
fi

# Verificar se o PostgreSQL está rodando
echo "🔍 Verificando se o PostgreSQL está rodando..."
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL não está rodando!"
    echo "   Inicie o PostgreSQL e tente novamente"
    exit 1
fi
echo "✅ PostgreSQL está rodando"
echo ""

# Extrair nome do banco do .env
DB_NAME=$(grep DATABASE_URL .env | cut -d'/' -f4 | cut -d'?' -f1)
echo "📦 Nome do banco de dados: $DB_NAME"
echo ""

# Verificar se o banco existe
echo "🔍 Verificando se o banco de dados existe..."
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Banco de dados '$DB_NAME' já existe"
    read -p "Deseja recriar o banco? (isso apagará todos os dados) [s/N]: " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🗑️  Apagando banco de dados existente..."
        dropdb "$DB_NAME" || true
        echo "📦 Criando novo banco de dados..."
        createdb "$DB_NAME"
        echo "✅ Banco de dados recriado"
    else
        echo "ℹ️  Mantendo banco de dados existente"
    fi
else
    echo "📦 Criando banco de dados..."
    createdb "$DB_NAME"
    echo "✅ Banco de dados criado"
fi
echo ""

# Gerar Prisma Client
echo "⚙️  Gerando Prisma Client..."
npx prisma generate
echo "✅ Prisma Client gerado"
echo ""

# Executar migrations
echo "🔄 Executando migrations..."
npx prisma migrate dev --name init
echo "✅ Migrations aplicadas"
echo ""

# Executar seed
echo "🌱 Populando banco com dados iniciais..."
npx prisma db seed
echo "✅ Seed executado"
echo ""

echo "✨ Configuração concluída com sucesso!"
echo ""
echo "📊 Próximos passos:"
echo "   1. Execute 'npm run dev' para iniciar o servidor"
echo "   2. Acesse http://localhost:3000/health para verificar o status"
echo "   3. Execute 'npx prisma studio' para visualizar os dados"
echo ""
