# Script para corrigir delimitadores SQL em migrations
$files = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql" -Recurse

$fixedCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $originalContent = $content
    
    # Substituir padrões problemáticos
    $content = $content -replace 'DO \$\\n', 'DO $$' + [Environment]::NewLine
    $content = $content -replace 'AS \$\\n', 'AS $$' + [Environment]::NewLine
    $content = $content -replace 'DO \$`n', 'DO $$' + [Environment]::NewLine
    $content = $content -replace 'AS \$`n', 'AS $$' + [Environment]::NewLine
    $content = $content -replace '([^$])END;\r?\n\$ LANGUAGE', '$1END;' + [Environment]::NewLine + '$$ LANGUAGE'
    $content = $content -replace '([^$])END;\r?\n\$;', '$1END;' + [Environment]::NewLine + '$$;'
    
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Output "Fixed: $($file.Name)"
        $fixedCount++
    }
}

Write-Output "`nTotal files fixed: $fixedCount"
