# Script simples para corrigir delimitadores SQL
$files = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql" -Recurse

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Substituições simples
    $content = $content.Replace('DO $\nBEGIN', 'DO $$' + "`n" + 'BEGIN')
    $content = $content.Replace('AS $' + "`n" + 'DECLARE', 'AS $$' + "`n" + 'DECLARE')
    $content = $content.Replace('AS $' + "`n" + 'BEGIN', 'AS $$' + "`n" + 'BEGIN')
    $content = $content.Replace("`n" + '$ LANGUAGE', "`n" + '$$ LANGUAGE')
    $content = $content.Replace("`n" + '$;', "`n" + '$$;')
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Output "Fixed: $($file.Name)"
    }
}
