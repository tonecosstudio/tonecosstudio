#!/usr/bin/env pwsh

Write-Host "🚀 SETUP COMPLETO DO SISTEMA ORDAX" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Criando coleções..." -ForegroundColor Yellow
node scripts/seed-collections-with-type.mjs

Write-Host ""
Write-Host "2️⃣ Criando personagens..." -ForegroundColor Yellow
node scripts/seed-characters.mjs

Write-Host ""
Write-Host "3️⃣ Criando assinaturas mock..." -ForegroundColor Yellow
node scripts/create-mock-subscriptions.mjs

Write-Host ""
Write-Host "4️⃣ Criando deliveries..." -ForegroundColor Yellow
node scripts/populate-production-queue-v2.mjs

Write-Host ""
Write-Host "5️⃣ Populando fila de produção..." -ForegroundColor Yellow
node scripts/populate-production-queue-final.mjs

Write-Host ""
Write-Host "6️⃣ Validando sistema..." -ForegroundColor Yellow
node scripts/validate-system.mjs

Write-Host ""
Write-Host "7️⃣ Status final..." -ForegroundColor Yellow
node scripts/system-status.mjs

Write-Host ""
Write-Host "✅ SETUP COMPLETO!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Acesse:" -ForegroundColor Cyan
Write-Host "   • Dashboard: http://localhost:8080/admin"
Write-Host "   • Fila de Produção: http://localhost:8080/admin/fila-producao"
Write-Host "   • Assinaturas: http://localhost:8080/admin/assinaturas-gerenciar"
Write-Host ""
