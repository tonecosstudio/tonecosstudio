#!/usr/bin/env pwsh
# Script profissional para corrigir TODOS os delimitadores SQL
Write-Host "Corrigindo delimitadores SQL..." -ForegroundColor Cyan

$migrationsPath = "supabase/migrations"
$sqlFiles = Get-ChildItem -Path $migrationsPath -Filter "*.sql" -Recurse
$fixedCount = 0

foreach ($file in $sqlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Corrigir DO $ -> DO $$
    $content = $content -replace 'DO \$\s+BEGIN', 'DO $$\nBEGIN'
    
    # Corrigir END $; -> END $$;
    $content = $content -replace 'END \$;', 'END $$;'
    
    # Corrigir AS $ -> AS $$
    $content = $content -replace 'AS \$\s+DECLARE', 'AS $$\nDECLARE'
    $content = $content -replace 'AS \$\s+BEGIN', 'AS $$\nBEGIN'
    
    # Corrigir $ LANGUAGE -> $$ LANGUAGE
    $content = $content -replace '\$ LANGUAGE', '$$ LANGUAGE'
    
    # Corrigir delimitadores em cron.schedule
    # Trocar $ isolado por $body$ quando está entre aspas e SELECT
    $content = $content -replace "',\s+\`$\s+SELECT", "',`n    `$body`$`n    SELECT"
    $content = $content -replace ";\s+\`$\s+\)", ";`n    `$body`$`n  )"
    
    # Trocar $$ por $body$ dentro de cron.schedule (linha isolada)
    $lines = $content -split "`n"
    $newLines = @()
    $inSchedule = $false
    
    foreach ($line in $lines) {
        if ($line -match 'cron\.schedule') {
            $inSchedule = $true
        }
        
        if ($inSchedule -and $line -match '^\s*\$\$\s*$') {
            $newLines += $line -replace '\$\$', '$body$'
        } else {
            $newLines += $line
        }
        
        if ($inSchedule -and $line -match '\);') {
            $inSchedule = $false
        }
    }
    $content = $newLines -join "`n"
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "  OK $($file.Name)" -ForegroundColor Green
        $fixedCount++
    }
}

Write-Host "`nTotal corrigido: $fixedCount arquivos" -ForegroundColor Green
Write-Host "Execute: supabase db push --include-all" -ForegroundColor Yellow
