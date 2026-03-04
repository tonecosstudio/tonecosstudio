# Script para corrigir delimitadores em arquivos de cron
$cronFiles = Get-ChildItem -Path "supabase/migrations" -Filter "*cron*.sql"

foreach ($file in $cronFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Padrão 1: Substituir delimitadores simples por duplos no bloco DO
    $content = $content -replace 'DO \$\s+BEGIN', 'DO $$\nBEGIN'
    $content = $content -replace 'END \$;', 'END $$;'
    
    # Padrão 2: Substituir delimitadores dentro de cron.schedule()
    # Procurar por padrão: '...',  $  SELECT
    $content = $content -replace "',\s+\`$\s+SELECT", "',`n    `$`$`n    SELECT"
    
    # Procurar por padrão: ;  $  )
    $content = $content -replace ";\s+\`$\s+\)", ";`n    `$`$`n  )"
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Output "Fixed: $($file.Name)"
    }
}

Write-Output "Done!"
