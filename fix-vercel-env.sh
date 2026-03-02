#!/bin/bash

# Script para corrigir variáveis de ambiente na Vercel
# Remove aspas e adiciona as variáveis corretamente

echo "🔧 Corrigindo variáveis de ambiente na Vercel..."

# Remover variáveis antigas (se existirem)
echo "📝 Removendo variáveis antigas..."
vercel env rm VITE_SUPABASE_URL production --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_PUBLISHABLE_KEY production --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_PROJECT_ID production --yes 2>/dev/null || true

# Adicionar variáveis SEM aspas
echo "✅ Adicionando VITE_SUPABASE_URL..."
echo "https://pabxpvqwtvbjaunjejud.supabase.co" | vercel env add VITE_SUPABASE_URL production

echo "✅ Adicionando VITE_SUPABASE_PUBLISHABLE_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

echo "✅ Adicionando VITE_SUPABASE_PROJECT_ID..."
echo "pabxpvqwtvbjaunjejud" | vercel env add VITE_SUPABASE_PROJECT_ID production

echo ""
echo "🎉 Variáveis configuradas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse https://vercel.com/jogo-brasils-projects/ordax/deployments"
echo "2. Clique no último deployment"
echo "3. Clique em '...' > 'Redeploy'"
echo "4. Marque 'Clear cache and redeploy'"
echo "5. Aguarde 1-2 minutos"
echo ""
