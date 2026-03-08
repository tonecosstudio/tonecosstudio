# Script para substituir @ts-ignore por @ts-expect-error
# Correção profissional seguindo best practices

$files = Get-ChildItem -Path src,supabase -Recurse -Include *.ts,*.tsx | Where-Object { 
    $content = Get-Content $_.FullName -Raw
    $content -match "// @ts-ignore"
}

$totalFixed = 0
$totalFiles = $files.Count

Write-Host "Found $totalFiles files with @ts-ignore" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Substituir @ts-ignore por @ts-expect-error
        $newContent = $content -replace "// @ts-ignore", "// @ts-expect-error"
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Fixed: $($file.FullName)" -ForegroundColor Green
            $totalFixed++
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Total files processed: $totalFiles"
Write-Host "   Files fixed: $totalFixed"
$unchanged = $totalFiles - $totalFixed
Write-Host "   Files unchanged: $unchanged"
