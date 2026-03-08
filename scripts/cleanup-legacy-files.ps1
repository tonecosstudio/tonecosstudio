# Limpeza de Arquivos Legados
# Remove arquivos SQL, scripts e documentos obsoletos da raiz

Write-Host "Iniciando limpeza de arquivos legados..." -ForegroundColor Cyan
Write-Host ""

# Arquivos SQL legados
$sqlFiles = @(
    "apply-product-line.sql",
    "apply-theme-category.sql",
    "COIN_SYSTEM_EXAMPLES.sql",
    "create-system-settings-function.sql",
    "diagnose-postgrest-issue.sql",
    "FIX_CYCLES_PRAZOS_OFICIAIS.sql",
    "FIX_CYCLES_USE_SSOT_SAFE.sql",
    "FIX_CYCLES_USE_SSOT.sql",
    "FIX_DELIVERY_MONTHS_SAFE.sql",
    "FIX_DELIVERY_MONTHS.sql",
    "FIX_EXISTING_DELIVERY_MONTHS.sql",
    "FIX_PRAZOS_OFICIAIS.sql",
    "FIX_TRIGGER_COINS.sql",
    "fix-system-settings-view.sql",
    "test-coin-prices.sql",
    "test-get-collection-price.sql",
    "UPDATE_HARDCODED_DEADLINES.sql",
    "validate-coin-system.sql"
)

# Scripts legados
$scriptFiles = @(
    "analise-completa-cotacao.mjs",
    "apply-coin-migrations.ps1",
    "apply-coin-migrations.sh",
    "apply-coin-price-adjustment.ps1",
    "apply-coin-price-adjustment.sh",
    "apply-cycles-fix.mjs",
    "apply-cycles-ssot.mjs",
    "apply-prazos-fix.mjs",
    "apply-prazos-fix.ps1",
    "check-system-settings.mjs",
    "verify-cycle-dates.mjs"
)

# Documentos legados
$docFiles = @(
    "PLANO_SINCRONIA_COMPLETO.md"
)

$removed = 0
$notFound = 0

# Remover arquivos SQL
Write-Host "Removendo arquivos SQL legados..." -ForegroundColor Yellow
foreach ($file in $sqlFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removido: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "  Nao encontrado: $file" -ForegroundColor DarkGray
        $notFound++
    }
}

Write-Host ""

# Remover scripts
Write-Host "Removendo scripts legados..." -ForegroundColor Yellow
foreach ($file in $scriptFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removido: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "  Nao encontrado: $file" -ForegroundColor DarkGray
        $notFound++
    }
}

Write-Host ""

# Remover documentos
Write-Host "Removendo documentos legados..." -ForegroundColor Yellow
foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removido: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "  Nao encontrado: $file" -ForegroundColor DarkGray
        $notFound++
    }
}

Write-Host ""
Write-Host "Limpeza concluida!" -ForegroundColor Green
Write-Host "Arquivos removidos: $removed" -ForegroundColor White
Write-Host "Arquivos nao encontrados: $notFound" -ForegroundColor DarkGray
Write-Host ""
