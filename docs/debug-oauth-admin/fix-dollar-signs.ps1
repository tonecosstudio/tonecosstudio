# Fix all single dollar signs in SQL migrations
Get-ChildItem -Path "supabase/migrations" -Filter "*.sql" | ForEach-Object {
    try {
        $content = Get-Content $_.FullName -Raw -ErrorAction Stop
        $original = $content
        
        # Skip if file is empty or too small
        if ([string]::IsNullOrWhiteSpace($content) -or $content.Length -lt 10) {
            return
        }
        
        # Fix corrupted DO blocks with backtick-n
        $content = $content -replace 'DO \$`n', 'DO $$`n'
        $content = $content -replace 'DO \$``n', 'DO $$`n'
        
        # Fix DO $ blocks at end of line
        $content = $content -replace '(?m)^DO \$$', 'DO $$'
        $content = $content -replace 'DO \$\r?\n', 'DO $$`n'
        
        # Fix END $ blocks
        $content = $content -replace '(?m)^END \$;$', 'END $$;'
        $content = $content -replace 'END \$;', 'END $$;'
        
        # Fix function definitions
        $content = $content -replace 'AS \$\r?\n', 'AS $$`n'
        $content = $content -replace '(?m)^\$ LANGUAGE', '$$ LANGUAGE'
        $content = $content -replace '\$ LANGUAGE', '$$ LANGUAGE'
        
        # Fix corrupted content markers
        $content = $content -replace '<file name="[^"]*" language="sql" >\s*<content>\s*n', ''
        
        if ($content -ne $original) {
            Set-Content -Path $_.FullName -Value $content -NoNewline -ErrorAction Stop
            Write-Host "Fixed: $($_.Name)"
        }
    }
    catch {
        Write-Host "Error processing $($_.Name): $_" -ForegroundColor Red
    }
}
Write-Host "Done fixing dollar signs!"
