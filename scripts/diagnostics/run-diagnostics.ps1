# Script para executar diagnosticos do banco

Write-Host "Executando diagnosticos..." -ForegroundColor Cyan
Write-Host ""

# Teste 1: Verificar se tabela existe e tem dados
Write-Host "1. Verificando tabela subscription_deliveries..." -ForegroundColor Yellow
$query1 = "SELECT 'TABELA_EXISTE' as teste, COUNT(*) as total FROM subscription_deliveries;"
Write-Host "Query: $query1"
$result1 = $query1 | supabase db execute
Write-Host $result1
Write-Host ""

# Teste 2: Verificar assinaturas
Write-Host "2. Verificando assinaturas..." -ForegroundColor Yellow
$query2 = "SELECT 'ASSINATURAS' as teste, COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as ativas FROM subscriptions;"
Write-Host "Query: $query2"
$result2 = $query2 | supabase db execute
Write-Host $result2
Write-Host ""

# Teste 3: Verificar compras avulsas
Write-Host "3. Verificando compras avulsas..." -ForegroundColor Yellow
$query3 = "SELECT 'COMPRAS_AVULSAS' as teste, COUNT(*) as total FROM standalone_purchases;"
Write-Host "Query: $query3"
$result3 = $query3 | supabase db execute
Write-Host $result3
Write-Host ""

# Teste 4: Verificar pagamentos manuais
Write-Host "4. Verificando pagamentos manuais..." -ForegroundColor Yellow
$query4 = "SELECT 'PAGAMENTOS_MANUAIS' as teste, COUNT(*) as total FROM manual_payments;"
Write-Host "Query: $query4"
$result4 = $query4 | supabase db execute
Write-Host $result4
Write-Host ""

Write-Host "Diagnostico concluido!" -ForegroundColor Green
