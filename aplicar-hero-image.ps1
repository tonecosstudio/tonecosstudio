#!/usr/bin/env pwsh
# Script para aplicar migration de hero_image_url no Supabase

Write-Host "=== Aplicando Migration: Hero Image URL ===" -ForegroundColor Cyan
Write-Host ""

# Carregar variáveis de ambiente
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SERVICE_KEY) {
    Write-Host "ERRO: Variáveis de ambiente não encontradas!" -ForegroundColor Red
    exit 1
}

Write-Host "Supabase URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host ""

# SQL da migration
$sql = "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;"

Write-Host "Executando SQL..." -ForegroundColor Yellow
Write-Host $sql -ForegroundColor Gray
Write-Host ""

# Aplicar via API REST
try {
    $headers = @{
        "apikey" = $SERVICE_KEY
        "Authorization" = "Bearer $SERVICE_KEY"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        query = $sql
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host ""
    Write-Host "=== Migration Aplicada com Sucesso! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Cyan
    Write-Host "1. Acesse Admin > Configuracoes do Sistema" -ForegroundColor White
    Write-Host "2. Va para a tab Interface" -ForegroundColor White
    Write-Host "3. Cole a URL da imagem do guerreiro no campo Imagem do Hero" -ForegroundColor White
    Write-Host "4. Clique em Salvar Alteracoes" -ForegroundColor White
    Write-Host ""
    Write-Host "Recomendacao de imagem: proporcao 3:4 ou 2:3 (vertical), ex: 600x800px" -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao aplicar migration via API!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, aplique manualmente no Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host "SQL: $sql" -ForegroundColor White
    Write-Host ""
    exit 1
}
