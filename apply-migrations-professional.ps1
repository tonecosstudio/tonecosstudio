#!/usr/bin/env pwsh
Write-Host "=== APLICAÇÃO PROFISSIONAL DE MIGRATIONS ===" -ForegroundColor Cyan

# Etapa 1: Corrigir delimitadores
Write-Host "`n[1/2] Corrigindo delimitadores SQL..." -ForegroundColor Yellow

$sqlFiles = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql"
$fixedCount = 0

foreach ($file in $sqlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Correções
    $content = $content.Replace('$\n', '$$\n')
    $content = $content.Replace('\n$', '\n$$')
    $content = $content -replace 'DO \$\s+BEGIN', 'DO $$\nBEGIN'
    $content = $content -replace 'END \$;', 'END $$;'
    $content = $content -replace 'AS \$\s+DECLARE', 'AS $$\nDECLARE'
    $content = $content -replace 'AS \$\s+BEGIN', 'AS $$\nBEGIN'
    $content = $content -replace '\$ LANGUAGE', '$$ LANGUAGE'
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $fixedCount++
    }
}

Write-Host "  OK: $fixedCount arquivos corrigidos" -ForegroundColor Green

# Etapa 2: Aplicar migrations
Write-Host "`n[2/2] Aplicando migrations..." -ForegroundColor Yellow

$output = echo "y" | supabase db push --include-all 2>&1
$output | Out-File "migration-result.txt"

$errors = $output | Select-String "^ERROR:"
if ($errors.Count -gt 0) {
    Write-Host "`nERROS: $($errors.Count)" -ForegroundColor Red
    $errors | Select-Object -First 3 | ForEach-Object { Write-Host $_.Line -ForegroundColor Red }
} else {
    Write-Host "`nSUCESSO! Migrations aplicadas." -ForegroundColor Green
}
