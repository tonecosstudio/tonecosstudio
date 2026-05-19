# Script de Analise Arquitetural - FASE 1 Hardening
# Uso: powershell -ExecutionPolicy Bypass -File scripts/analyze-architecture.ps1

$ErrorActionPreference = "Stop"

function Get-RelativeSrcPath {
    param([string]$FullName)
    return ($FullName -replace '.*\\src\\', 'src/').Replace('\', '/')
}

Write-Host "ANALISE ARQUITETURAL - FASE 1" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$tsFiles = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx
$totalFiles = $tsFiles.Count

Write-Host "1. ESTATISTICAS GERAIS" -ForegroundColor Yellow
Write-Host "   Total de arquivos TS/TSX: $totalFiles"

Write-Host ""
Write-Host "2. ARQUIVOS GRANDES (>500 linhas)" -ForegroundColor Yellow
$largeFiles = $tsFiles | ForEach-Object {
    $lineCount = (Get-Content $_.FullName | Measure-Object -Line).Lines
    if ($lineCount -gt 500) {
        [PSCustomObject]@{
            File = Get-RelativeSrcPath $_.FullName
            Lines = $lineCount
        }
    }
} | Sort-Object Lines -Descending

Write-Host "   Total: $($largeFiles.Count) arquivos"
$largeFiles | Select-Object -First 10 | ForEach-Object {
    Write-Host "   - $($_.File): $($_.Lines) linhas" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. ARQUIVOS COM MUITOS IMPORTS (>15)" -ForegroundColor Yellow
$manyImports = $tsFiles | ForEach-Object {
    $importCount = (Get-Content $_.FullName | Select-String -Pattern "^import" | Measure-Object).Count
    if ($importCount -gt 15) {
        [PSCustomObject]@{
            File = Get-RelativeSrcPath $_.FullName
            Imports = $importCount
        }
    }
} | Sort-Object Imports -Descending

Write-Host "   Total: $($manyImports.Count) arquivos"
$manyImports | Select-Object -First 10 | ForEach-Object {
    Write-Host "   - $($_.File): $($_.Imports) imports" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. TIPOS POTENCIALMENTE DUPLICADOS" -ForegroundColor Yellow
$typeFiles = Get-ChildItem -Path src\types -Recurse -Include *.ts
Write-Host "   Total de arquivos em src/types: $($typeFiles.Count)"

Write-Host ""
Write-Host "5. ESTRUTURA DE MODULOS" -ForegroundColor Yellow
$modules = @("components", "services", "hooks", "lib", "pages", "types")
foreach ($module in $modules) {
    $path = "src\$module"
    if (Test-Path $path) {
        $count = (Get-ChildItem -Path $path -Recurse -Include *.ts,*.tsx).Count
        Write-Host "   - $module/: $count arquivos"
    }
}

Write-Host ""
Write-Host "6. IMPORTS RELATIVOS PROFUNDOS (../../..)" -ForegroundColor Yellow
$deepImports = $tsFiles | Where-Object {
    (Get-Content $_.FullName | Select-String -Pattern 'from [''"]\.\.\/\.\.\/\.\.').Count -gt 0
}
Write-Host "   Total: $($deepImports.Count) arquivos com imports profundos"
$deepImports | Select-Object -First 5 | ForEach-Object {
    Write-Host "   - $(Get-RelativeSrcPath $_.FullName)" -ForegroundColor Red
}

Write-Host ""
Write-Host "7. CONSOLE DIRETO EM CODIGO DE PRODUCAO" -ForegroundColor Yellow
$consoleMatches = $tsFiles | Where-Object {
    $_.FullName -notmatch '\\test\\|\.test\.|\.spec\.|README|Example'
} | ForEach-Object {
    $file = $_
    Get-Content $file.FullName | Select-String -Pattern 'console\.' | ForEach-Object {
        [PSCustomObject]@{
            File = Get-RelativeSrcPath $file.FullName
            Line = $_.LineNumber
            Text = $_.Line.Trim()
        }
    }
}
Write-Host "   Total: $($consoleMatches.Count) ocorrencias"
$consoleMatches | Group-Object File | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "   - $($_.Name): $($_.Count) ocorrencias" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "8. TODOs E FIXMEs NO CODIGO" -ForegroundColor Yellow
$todos = $tsFiles | ForEach-Object {
    $file = $_
    Get-Content $file.FullName | Select-String -Pattern "TODO|FIXME" | ForEach-Object {
        [PSCustomObject]@{
            File = Get-RelativeSrcPath $file.FullName
            Line = $_.LineNumber
            Text = $_.Line.Trim()
        }
    }
}
Write-Host "   Total: $($todos.Count) TODOs/FIXMEs encontrados"
$todos | Group-Object File | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host "   - $($_.Name): $($_.Count) itens" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "RESUMO DA ANALISE" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "   Arquivos TS/TSX: $totalFiles"
Write-Host "   Arquivos grandes (>500 linhas): $($largeFiles.Count)"
Write-Host "   Arquivos com muitos imports (>15): $($manyImports.Count)"
Write-Host "   Imports relativos profundos: $($deepImports.Count)"
Write-Host "   Console direto em producao: $($consoleMatches.Count)"
Write-Host "   TODOs/FIXMEs: $($todos.Count)"
Write-Host ""
Write-Host "Analise concluida." -ForegroundColor Green
