# Script para mover arquivos SQL e JS para scripts/database
Write-Host "Movendo scripts SQL e JS..." -ForegroundColor Green

$movedCount = 0

function Move-ScriptFile {
    param($source, $destination)
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $destination -Force
        $script:movedCount++
        Write-Host "Movido: $source" -ForegroundColor Gray
    }
}

# SQL Files
Move-ScriptFile "APLICAR_AGORA.sql" "scripts/database/"
Move-ScriptFile "APLICAR_MIGRATION_TEMPLATES.sql" "scripts/database/"
Move-ScriptFile "FIX_RLS_TEMPLATES.sql" "scripts/database/"
Move-ScriptFile "apply-migration-step-by-step.sql" "scripts/database/"

# JS/MJS Files
Move-ScriptFile "apply-migration.mjs" "scripts/database/"
Move-ScriptFile "apply-migration-direct.mjs" "scripts/database/"
Move-ScriptFile "apply-migration-final.mjs" "scripts/database/"
Move-ScriptFile "apply-migration-pg.mjs" "scripts/database/"
Move-ScriptFile "apply-notifications-migration.js" "scripts/database/"
Move-ScriptFile "atualizar-planos.js" "scripts/database/"
Move-ScriptFile "atualizar-precos-finais.js" "scripts/database/"
Move-ScriptFile "criar-colecoes-browser.js" "scripts/database/"
Move-ScriptFile "criar-colecoes-via-api.js" "scripts/database/"
Move-ScriptFile "verificar-e-criar-colecoes-teste.js" "scripts/database/"
Move-ScriptFile "verificar-sistema.js" "scripts/development/"

# CJS Test Files
Move-ScriptFile "analise-ciclo2.cjs" "src/test/"
Move-ScriptFile "test-batch-calculator-v2.cjs" "src/test/"
Move-ScriptFile "test-cycle-shipping.cjs" "src/test/"

# PowerShell Scripts
Move-ScriptFile "testar-colecoes.ps1" "scripts/development/"

# HTML Files
Move-ScriptFile "verificar-headers.html" "scripts/development/"

Write-Host "`nTotal de scripts movidos: $movedCount" -ForegroundColor Yellow
Write-Host "Concluido!" -ForegroundColor Green
