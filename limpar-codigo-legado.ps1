# Script de Limpeza de Código Legado
# Data: 25/02/2026

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  LIMPEZA DE CODIGO LEGADO - FASE 2" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

$removedCount = 0

function Remove-LegacyFile {
    param($path, $reason)
    if (Test-Path $path) {
        Remove-Item -Path $path -Force
        $script:removedCount++
        Write-Host "✅ Removido: $path" -ForegroundColor Gray
        Write-Host "   Razao: $reason" -ForegroundColor DarkGray
    } else {
        Write-Host "⚠️  Nao encontrado: $path" -ForegroundColor Yellow
    }
}

# 1. VERSOES ANTIGAS DE ABOUT
Write-Host "`nRemovendo versoes antigas de About..." -ForegroundColor Cyan
Remove-LegacyFile "src/pages/About-v2.tsx" "Versao antiga, usar About.tsx"
Remove-LegacyFile "src/pages/About-new.tsx" "Versao antiga, usar About.tsx"
Remove-LegacyFile "src/pages/About-final.tsx" "Versao antiga, usar About.tsx"

# 2. VERSOES ANTIGAS DE TYPES
Write-Host "`nRemovendo versoes antigas de types..." -ForegroundColor Cyan
Remove-LegacyFile "src/integrations/supabase/types-old.ts" "Versao antiga, usar types.ts"
Remove-LegacyFile "src/integrations/supabase/types-new.ts" "Versao antiga, usar types.ts"
Remove-LegacyFile "src/integrations/supabase/types-updated.ts" "Versao antiga, usar types.ts"

# 3. COMPONENTES ADMIN ANTIGOS
Write-Host "`nRemovendo componentes admin antigos..." -ForegroundColor Cyan
Remove-LegacyFile "src/pages/admin/AdminCollections-old.tsx" "Versao antiga, usar AdminCollections.tsx"

# 4. SCRIPTS TEMPORARIOS
Write-Host "`nRemovendo scripts temporarios..." -ForegroundColor Cyan
Remove-LegacyFile "reorganizar-docs.ps1" "Script temporario de reorganizacao"
Remove-LegacyFile "reorganizar-docs-parte2.ps1" "Script temporario de reorganizacao"
Remove-LegacyFile "mover-scripts.ps1" "Script temporario de reorganizacao"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  LIMPEZA CONCLUIDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nTotal de arquivos removidos: $removedCount" -ForegroundColor Yellow
Write-Host "`nProximo passo: git add . && git commit" -ForegroundColor Cyan
