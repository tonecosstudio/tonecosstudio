# Script para aplicar SQL via psql no Windows
# Requer que você tenha o psql instalado e a connection string do Supabase

Write-Host "🔧 Aplicando SQL via psql..." -ForegroundColor Cyan
Write-Host ""

# Verificar se psql está instalado
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ psql não está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar no Windows:"
    Write-Host "  1. Baixe o PostgreSQL: https://www.postgresql.org/download/windows/"
    Write-Host "  2. Instale apenas o 'Command Line Tools'"
    Write-Host "  3. Adicione ao PATH: C:\Program Files\PostgreSQL\<version>\bin"
    Write-Host ""
    exit 1
}

Write-Host "⚠️  Você precisa fornecer a connection string do Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para obter:"
Write-Host "1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database"
Write-Host "2. Copie a 'Connection string' (URI format)"
Write-Host "3. Substitua [YOUR-PASSWORD] pela senha do banco"
Write-Host ""
Write-Host "Exemplo: postgresql://postgres:SUA_SENHA@db.pabxpvqwtvbjaunjejud.supabase.co:5432/postgres"
Write-Host ""

$connectionString = Read-Host "Cole a connection string aqui"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "❌ Connection string não fornecida" -ForegroundColor Red
    exit 1
}

# Executar o SQL
Write-Host ""
Write-Host "📄 Executando SQL..." -ForegroundColor Cyan

try {
    & psql $connectionString -f FIX_TRIGGER_COINS.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SQL executado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Trigger corrigido!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos passos:"
        Write-Host "  1. Recarregue a página do admin"
        Write-Host "  2. Verifique que João Trimestral mostra 400 coins"
        Write-Host "  3. Verifique que as 3 escolhas aparecem corretamente"
    } else {
        throw "Erro ao executar SQL"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao executar SQL: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente aplicar manualmente:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new"
}
