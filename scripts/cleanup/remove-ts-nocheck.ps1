# Script para remover @ts-nocheck de todos os arquivos TypeScript
# Correção profissional na raiz do problema

$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { 
    $content = Get-Content $_.FullName -Raw
    $content -match "^// @ts-nocheck"
}

$totalFixed = 0
$totalFiles = $files.Count

Write-Host "Found $totalFiles files with @ts-nocheck" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Remover @ts-nocheck no início do arquivo (com ou sem linha em branco depois)
        $newContent = $content -replace "^// @ts-nocheck\r?\n+", ""
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "✅ Fixed: $($file.FullName)" -ForegroundColor Green
            $totalFixed++
        }
    }
    catch {
        Write-Host "❌ Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Total files processed: $totalFiles"
Write-Host "   Files fixed: $totalFixed"
$unchanged = $totalFiles - $totalFixed
Write-Host "   Files unchanged: $unchanged"
