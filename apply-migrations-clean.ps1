#!/usr/bin/env pwsh
Write-Host "=== APLICACAO LIMPA DE MIGRATIONS ===" -ForegroundColor Cyan

# Etapa 1: Remover BOM de todos os arquivos SQL
Write-Host "`n[1/2] Removendo BOM UTF-8..." -ForegroundColor Yellow

$sqlFiles = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$cleanedCount = 0

foreach ($file in $sqlFiles) {
    $content = Get-Content $file.FullName -Raw
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
    $cleanedCount++
}

Write-Host "  OK: $cleanedCount arquivos limpos" -ForegroundColor Green

# Etapa 2: Aplicar migrations
Write-Host "`n[2/2] Aplicando migrations..." -ForegroundColor Yellow

$output = echo "y" | supabase db push --include-all 2>&1
$output | Out-File "migration-result-clean.txt"

$errors = $output | Select-String "^ERROR:"
if ($errors.Count -gt 0) {
    Write-Host "`nERROS: $($errors.Count)" -ForegroundColor Red
    $errors | Select-Object -First 5 | ForEach-Object { Write-Host $_.Line -ForegroundColor Red }
    Write-Host "`nVer migration-result-clean.txt para detalhes" -ForegroundColor Yellow
} else {
    Write-Host "`nSUCESSO! Migrations aplicadas." -ForegroundColor Green
}
