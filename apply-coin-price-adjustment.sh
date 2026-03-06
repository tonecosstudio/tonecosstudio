#!/bin/bash

# ============================================================================
# Script: Aplicar Ajuste de Preços de Coins
# Descrição: Aplica migration para ajustar preços de 800-1800 para 200-450
# Data: 2026-03-06
# ============================================================================

echo "========================================="
echo "AJUSTE DE PREÇOS DO SISTEMA DE COINS"
echo "========================================="
echo ""
echo "Este script irá:"
echo "1. Atualizar preços base de 1000/1400/1800 para 250/300/450"
echo "2. Criar tabela collection_pricing_by_context"
echo "3. Atualizar função get_collection_price()"
echo "4. Validar novos cálculos"
echo ""
echo "Valores ANTIGOS → NOVOS:"
echo "- Coleção Ativa: 800 → 200 coins"
echo "- Coleção Secundária: 1200 → 240 coins"
echo "- Catálogo Geral: 1400 → 300 coins"
echo "- Premium: 1800 → 450 coins"
echo ""
read -p "Deseja continuar? (s/n): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Operação cancelada."
    exit 0
fi

echo ""
echo "Aplicando migration..."
echo ""

# Aplicar migration via Supabase CLI
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ MIGRATION APLICADA COM SUCESSO!"
    echo "========================================="
    echo ""
    echo "Próximos passos:"
    echo "1. Acesse /admin/coins para verificar os novos valores"
    echo "2. Teste compras com coins"
    echo "3. Valide cálculos em diferentes contextos"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ ERRO AO APLICAR MIGRATION"
    echo "========================================="
    echo ""
    echo "Verifique os logs acima para mais detalhes."
    exit 1
fi
