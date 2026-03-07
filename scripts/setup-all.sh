#!/bin/bash

echo "🚀 SETUP COMPLETO DO SISTEMA ORDAX"
echo "===================================="
echo ""

echo "1️⃣ Criando coleções..."
node scripts/seed-collections-with-type.mjs

echo ""
echo "2️⃣ Criando personagens..."
node scripts/seed-characters.mjs

echo ""
echo "3️⃣ Criando assinaturas mock..."
node scripts/create-mock-subscriptions.mjs

echo ""
echo "4️⃣ Criando deliveries..."
node scripts/populate-production-queue-v2.mjs

echo ""
echo "5️⃣ Populando fila de produção..."
node scripts/populate-production-queue-final.mjs

echo ""
echo "6️⃣ Validando sistema..."
node scripts/validate-system.mjs

echo ""
echo "7️⃣ Status final..."
node scripts/system-status.mjs

echo ""
echo "✅ SETUP COMPLETO!"
echo ""
echo "📍 Acesse:"
echo "   • Dashboard: http://localhost:8080/admin"
echo "   • Fila de Produção: http://localhost:8080/admin/fila-producao"
echo "   • Assinaturas: http://localhost:8080/admin/assinaturas-gerenciar"
echo ""
