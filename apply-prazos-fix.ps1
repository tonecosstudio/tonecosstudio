# Script PowerShell para aplicar correções de prazos
# Copia o SQL para clipboard e abre o SQL Editor

Write-Host "🔧 Aplicando correções de prazos no Supabase..." -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo SQL
$sql = Get-Content -Path "FIX_PRAZOS_OFICIAIS.sql" -Raw

# Copiar para clipboard
Set-Clipboard -Value $sql
Write-Host "✅ SQL copiado para área de transferência!" -ForegroundColor Green
Write-Host ""

# Abrir SQL Editor no navegador
$url = "https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new"
Write-Host "🌐 Abrindo SQL Editor do Supabase..." -ForegroundColor Cyan
Start-Process $url

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Cole o SQL (Ctrl+V) no editor que abriu"
Write-Host "   2. Clique em 'Run' para executar"
Write-Host "   3. Verifique os resultados das queries de validação"
Write-Host ""
Write-Host "✨ Pronto! O SQL está na sua área de transferência." -ForegroundColor Green
