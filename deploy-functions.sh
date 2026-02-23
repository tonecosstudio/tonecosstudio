#!/bin/bash

# Script para fazer deploy das Edge Functions corrigidas
# Execute: bash deploy-functions.sh

echo "🚀 Iniciando deploy das Edge Functions..."
echo ""

# Verificar se está logado
echo "1️⃣ Verificando login..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Não está logado. Execute: supabase login"
    exit 1
fi
echo "✅ Logado no Supabase"
echo ""

# Verificar se o projeto está linkado
echo "2️⃣ Verificando link do projeto..."
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️ Projeto não linkado. Linkando agora..."
    supabase link --project-ref pabxpvqwtvbjaunjejud
fi
echo "✅ Projeto linkado"
echo ""

# Deploy das funções corrigidas
echo "3️⃣ Fazendo deploy das funções corrigidas..."
echo ""

echo "📦 Deploying classify-image-vision..."
supabase functions deploy classify-image-vision
echo ""

echo "📦 Deploying process-queue-batch..."
supabase functions deploy process-queue-batch
echo ""

echo "✅ Deploy concluído!"
echo ""
echo "🎉 Próximos passos:"
echo "   1. Recarregue o frontend (Ctrl+R)"
echo "   2. Teste a funcionalidade de análise de imagem"
echo "   3. Verifique o console - erro 500 deve ter sumido"
echo ""
echo "📊 Para ver logs:"
echo "   supabase functions logs classify-image-vision"
echo ""
