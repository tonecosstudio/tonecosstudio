# Script to organize SQL files in the project
# Moves old/temporary files to archive folder
# SAFE: Only moves files, does not delete anything

Write-Host "Organizing SQL files in the project..." -ForegroundColor Cyan
Write-Host ""

# Create folder structure
Write-Host "Creating folder structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "../../scripts/archive/fixes-406" | Out-Null
New-Item -ItemType Directory -Force -Path "../../scripts/archive/temp-fixes" | Out-Null
New-Item -ItemType Directory -Force -Path "../../scripts/archive/old-utilities" | Out-Null
New-Item -ItemType Directory -Force -Path "../../scripts/archive/old-seeds" | Out-Null

# Archive 406 error fixes
Write-Host ""
Write-Host "Archiving old 406 error fixes..." -ForegroundColor Yellow

if (Test-Path "../../scripts/database/fixes") {
    Get-ChildItem "../../scripts/database/fixes/fix-406-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/fixes-406/" -Force
    Get-ChildItem "../../scripts/database/fixes/fix_406_*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/fixes-406/" -Force
    Get-ChildItem "../../scripts/database/fixes/solucao-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/fixes-406/" -Force
    Get-ChildItem "../../scripts/database/fixes/fix-nuclear-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/fixes-406/" -Force
    Get-ChildItem "../../scripts/database/fixes/fix-complete-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/fixes-406/" -Force
    
    Write-Host "   OK: 406 fixes archived" -ForegroundColor Green
} else {
    Write-Host "   WARNING: scripts/database/fixes not found" -ForegroundColor Yellow
}

# Archive temporary files from root
Write-Host ""
Write-Host "Archiving temporary files from root..." -ForegroundColor Yellow

$tempFiles = @(
    "../../add_manual_payment_to_queue.sql",
    "../../temp_fix_relationships.sql",
    "../../FIX_NOW.sql",
    "../../FIX_STANDALONE_PURCHASES.sql",
    "../../FIX_ENUM_PAYMENT_TYPES.sql",
    "../../populate_production_queue_manually.sql",
    "../../seed_production_test_data.sql",
    "../../reload_schema.sql",
    "../../check_and_fix_rls.sql",
    "../../CHECK_ENUM.sql",
    "../../check_manual_payments_fk.sql",
    "../../check_production_objects.sql",
    "../../test_production_objects.sql",
    "../../diagnostico_subscription.sql"
)

$movedCount = 0
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Move-Item $file "../../scripts/archive/temp-fixes/" -Force
        $fileName = Split-Path $file -Leaf
        Write-Host "   OK: Moved $fileName" -ForegroundColor Green
        $movedCount++
    }
}

if ($movedCount -eq 0) {
    Write-Host "   INFO: No temporary files found in root" -ForegroundColor Cyan
}

# Archive redundant verification scripts
Write-Host ""
Write-Host "Archiving redundant verification scripts..." -ForegroundColor Yellow

if (Test-Path "../../scripts/database/utilities") {
    Get-ChildItem "../../scripts/database/utilities/verificar-fix-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/old-utilities/" -Force
    Get-ChildItem "../../scripts/database/utilities/diagnostico-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/old-utilities/" -Force
    Get-ChildItem "../../scripts/database/utilities/test-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/old-utilities/" -Force
    Get-ChildItem "../../scripts/database/utilities/testar-*.sql" -ErrorAction SilentlyContinue | Move-Item -Destination "../../scripts/archive/old-utilities/" -Force
    
    Write-Host "   OK: Verification scripts archived" -ForegroundColor Green
}

# Archive old seeds
Write-Host ""
Write-Host "Archiving old seeds..." -ForegroundColor Yellow

if (Test-Path "../../scripts/database/seeds") {
    if (Test-Path "../../scripts/database/seeds/adicionar-datas-teste.sql") {
        Move-Item "../../scripts/database/seeds/adicionar-datas-teste.sql" "../../scripts/archive/old-seeds/" -Force
    }
    if (Test-Path "../../scripts/database/seeds/popular_dados_teste_grupos.sql") {
        Move-Item "../../scripts/database/seeds/popular_dados_teste_grupos.sql" "../../scripts/archive/old-seeds/" -Force
    }
    if (Test-Path "../../scripts/database/seeds/seed-chat-data.sql") {
        Move-Item "../../scripts/database/seeds/seed-chat-data.sql" "../../scripts/archive/old-seeds/" -Force
    }
    
    Write-Host "   OK: Old seeds archived" -ForegroundColor Green
}

# Archive old analysis documents
Write-Host ""
Write-Host "Archiving old analysis documents..." -ForegroundColor Yellow

if (Test-Path "../../docs/archive") {
    Get-ChildItem "../../ANALISE_*.md" -ErrorAction SilentlyContinue | Move-Item -Destination "../../docs/archive/" -Force
    Get-ChildItem "../../APLICACAO_*.md" -ErrorAction SilentlyContinue | Move-Item -Destination "../../docs/archive/" -Force
    Get-ChildItem "../../APLICAR_*.md" -ErrorAction SilentlyContinue | Move-Item -Destination "../../docs/archive/" -Force
}

# Create README in archive
Write-Host ""
Write-Host "Creating README in archive..." -ForegroundColor Yellow

$readmeLines = @(
    "# Archived Files",
    "",
    "This folder contains old SQL files that were moved to keep the project organized.",
    "",
    "## Structure",
    "",
    "* fixes-406/ - Multiple attempts to fix RLS 406 error",
    "* temp-fixes/ - Temporary fixes that were applied",
    "* old-utilities/ - Old verification and diagnostic scripts",
    "* old-seeds/ - Old test seeds",
    "",
    "## Important",
    "",
    "These files were archived, not deleted. If you need any:",
    "1. Review the content",
    "2. Copy to the appropriate folder",
    "3. Update as needed",
    "",
    "## Cleanup Policy",
    "",
    "Files older than 6 months can be permanently deleted."
)

$readmeContent = $readmeLines -join "`n"
Set-Content -Path "../../scripts/archive/README.md" -Value $readmeContent -Encoding UTF8

# Final report
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Organization completed!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "   - 406 fixes archived in: scripts/archive/fixes-406/"
Write-Host "   - Temporary files in: scripts/archive/temp-fixes/"
Write-Host "   - Old utilities in: scripts/archive/old-utilities/"
Write-Host "   - Old seeds in: scripts/archive/old-seeds/"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review archived files"
Write-Host "   2. Delete what is no longer needed"
Write-Host "   3. Commit the changes"
Write-Host ""
