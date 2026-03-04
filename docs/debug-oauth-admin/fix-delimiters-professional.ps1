#!/usr/bin/env pwsh
# Script Profissional de Correcao de Delimitadores SQL
# Corrige TODOS os padroes problematicos de delimitadores em migrations

Write-Host "=== CORRECAO PROFISSIONAL DE DELIMITADORES SQL ===" -ForegroundColor Cyan

$sqlFiles = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql"
$fixedCount = 0
$totalFixes = 0

foreach ($file in $sqlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    $fileFixes = 0
    
    # Padrao 1: Literal $\n (mais comum e problematico)
    if ($content -match '\$\\n') {
        $content = $content -replace '\$\\n', '$$'
        $fileFixes++
    }
    
    # Padrao 2: Literal \n$ (fechamento incorreto)
    if ($content -match '\\n\$') {
        $content = $content -replace '\\n\$', '$$'
        $fileFixes++
    }
    
    # Padrao 3: DO $ BEGIN (espaco entre $ e BEGIN)
    if ($content -match 'DO \$\s+BEGIN') {
        $content = $content -replace 'DO \$\s+BEGIN', 'DO $$`nBEGIN'
        $fileFixes++
    }
    
    # Padrao 4: END $; ($ sozinho no END)
    if ($content -match 'END \$;') {
        $content = $content -replace 'END \$;', 'END $$;'
        $fileFixes++
    }
    
    # Padrao 5: AS $ DECLARE (espaco entre $ e DECLARE)
    if ($content -match 'AS \$\s+DECLARE') {
        $content = $content -replace 'AS \$\s+DECLARE', 'AS $$`nDECLARE'
        $fileFixes++
    }
    
    # Padrao 6: AS $ BEGIN (espaco entre $ e BEGIN)
    if ($content -match 'AS \$\s+BEGIN') {
        $content = $content -replace 'AS \$\s+BEGIN', 'AS $$`nBEGIN'
        $fileFixes++
    }
    
    # Padrao 7: $ LANGUAGE (espaco antes de LANGUAGE)
    if ($content -match '\$ LANGUAGE') {
        $content = $content -replace '\$ LANGUAGE', '$$ LANGUAGE'
        $fileFixes++
    }
    
    # Padrao 8: DO $ sem BEGIN logo apos ($ sozinho)
    if ($content -match 'DO \$\r?\n(?!BEGIN)') {
        $content = $content -replace 'DO \$\r?\n', 'DO $$`n'
        $fileFixes++
    }
    
    # Padrao 9: END $ sem ponto e virgula
    if ($content -match 'END \$\r?\n') {
        $content = $content -replace 'END \$\r?\n', 'END $$;`n'
        $fileFixes++
    }
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $fixedCount++
        $totalFixes += $fileFixes
        Write-Host "  OK $($file.Name) - $fileFixes correcoes" -ForegroundColor Green
    }
}

Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Yellow
Write-Host "Total de correcoes: $totalFixes" -ForegroundColor Yellow

if ($fixedCount -gt 0) {
    Write-Host "`nDelimitadores corrigidos!" -ForegroundColor Green
} else {
    Write-Host "`nNenhuma correcao necessaria" -ForegroundColor Green
}
