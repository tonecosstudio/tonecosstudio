#!/usr/bin/env pwsh
# Script para adicionar IF NOT EXISTS em CREATE INDEX e CREATE TABLE

Write-Host "=== CORRIGINDO CREATE STATEMENTS ===" -ForegroundColor Cyan

$sqlFiles = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql"
$fixedCount = 0

foreach ($file in $sqlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # Adicionar IF NOT EXISTS em CREATE INDEX (se ainda nao tiver)
    $content = $content -replace 'CREATE INDEX ([^I])', 'CREATE INDEX IF NOT EXISTS $1'
    $content = $content -replace 'CREATE UNIQUE INDEX ([^I])', 'CREATE UNIQUE INDEX IF NOT EXISTS $1'
    
    # Adicionar IF NOT EXISTS em CREATE TABLE (se ainda nao tiver)
    $content = $content -replace 'CREATE TABLE ([^I])', 'CREATE TABLE IF NOT EXISTS $1'
    
    if ($content -ne $original) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $fixedCount++
        Write-Host "  OK $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nArquivos corrigidos: $fixedCount" -ForegroundColor Yellow
