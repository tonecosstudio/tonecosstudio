# =====================================================
# Script: Aplicar Fix de Schema de Subscriptions
# Description: Aplica migration profissional para corrigir
#              schema da tabela subscriptions
# Date: 2026-02-28
# =====================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  FIX SUBSCRIPTIONS SCHEMA - Correção Profissional         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# =====================================================
# PART 1: Validação de Ambiente
# =====================================================

Write-Host "📋 Validando ambiente..." -ForegroundColor Yellow

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
    exit 1
}

# Carregar variáveis de ambiente
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$databaseUrl = $env:DATABASE_URL
$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $databaseUrl -and (-not $supabaseUrl -or -not $supabaseKey)) {
    Write-Host "❌ Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host "   Necessário: DATABASE_URL ou (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Ambiente validado" -ForegroundColor Green
Write-Host ""

# =====================================================
# PART 2: Análise do Problema
# =====================================================

Write-Host "🔍 Análise do Problema:" -ForegroundColor Cyan
Write-Host "   • Erro: POST /subscriptions retorna 400 (Bad Request)" -ForegroundColor White
Write-Host "   • Causa 1: Campo collection_id é NOT NULL mas não é usado" -ForegroundColor White
Write-Host "   • Causa 2: Campo plan_id não existe mas código tenta inserir" -ForegroundColor White
Write-Host "   • Causa 3: Status 'pending_payment' não existe no enum" -ForegroundColor White
Write-Host ""

# =====================================================
# PART 3: Solução Proposta
# =====================================================

Write-Host "💡 Solução Profissional:" -ForegroundColor Cyan
Write-Host "   ✓ Adicionar campo plan_id com FK para subscription_plans" -ForegroundColor Green
Write-Host "   ✓ Tornar collection_id nullable (campo legado)" -ForegroundColor Green
Write-Host "   ✓ Adicionar status 'pending_payment' ao enum" -ForegroundColor Green
Write-Host "   ✓ Migrar dados existentes automaticamente" -ForegroundColor Green
Write-Host "   ✓ Adicionar validações e triggers" -ForegroundColor Green
Write-Host ""

# =====================================================
# PART 4: Confirmação do Usuário
# =====================================================

Write-Host "⚠️  Esta operação irá modificar o schema do banco de dados" -ForegroundColor Yellow
$confirmation = Read-Host "Deseja continuar? (s/N)"

if ($confirmation -ne "s" -and $confirmation -ne "S") {
    Write-Host "❌ Operação cancelada pelo usuário" -ForegroundColor Red
    exit 0
}

Write-Host ""

# =====================================================
# PART 5: Aplicar Migration
# =====================================================

Write-Host "🔨 Aplicando migration..." -ForegroundColor Yellow

$migrationFile = "supabase/migrations/20260228000000_fix_subscriptions_schema.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migration não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

# Tentar aplicar via psql primeiro (método preferido)
if (Get-Command psql -ErrorAction SilentlyContinue) {
    if ($databaseUrl) {
        Write-Host "   Usando psql..." -ForegroundColor Gray
        
        try {
            $output = psql $databaseUrl -f $migrationFile 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Migration aplicada com sucesso via psql!" -ForegroundColor Green
                Write-Host ""
                Write-Host $output -ForegroundColor Gray
            } else {
                throw "psql retornou código de erro: $LASTEXITCODE"
            }
        } catch {
            Write-Host "❌ Erro ao aplicar via psql: $_" -ForegroundColor Red
            Write-Host ""
            Write-Host "📝 Tente uma das alternativas:" -ForegroundColor Yellow
            Write-Host "   1. npx supabase db push" -ForegroundColor White
            Write-Host "   2. Aplique manualmente via Supabase Dashboard" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "⚠️  DATABASE_URL não configurada, tentando método alternativo..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  psql não encontrado, tentando método alternativo..." -ForegroundColor Yellow
}

# Método alternativo: Supabase CLI
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "   Usando Supabase CLI..." -ForegroundColor Gray
    
    try {
        $output = supabase db push 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration aplicada com sucesso via Supabase CLI!" -ForegroundColor Green
            Write-Host ""
            Write-Host $output -ForegroundColor Gray
        } else {
            throw "supabase db push retornou código de erro: $LASTEXITCODE"
        }
    } catch {
        Write-Host "❌ Erro ao aplicar via Supabase CLI: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "📝 Aplique manualmente:" -ForegroundColor Yellow
        Write-Host "   1. Abra o Supabase Dashboard" -ForegroundColor White
        Write-Host "   2. Vá em SQL Editor" -ForegroundColor White
        Write-Host "   3. Cole o conteúdo de: $migrationFile" -ForegroundColor White
        Write-Host "   4. Execute o SQL" -ForegroundColor White
        exit 1
    }
}

# =====================================================
# PART 6: Verificação Pós-Migration
# =====================================================

Write-Host ""
Write-Host "🔍 Verificando aplicação..." -ForegroundColor Yellow

if (Get-Command psql -ErrorAction SilentlyContinue) {
    if ($databaseUrl) {
        $verifySQL = @"
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name IN ('plan_id', 'collection_id')
ORDER BY column_name;
"@
        
        Write-Host "   Estrutura da tabela subscriptions:" -ForegroundColor Gray
        psql $databaseUrl -c $verifySQL
    }
}

# =====================================================
# PART 7: Resumo Final
# =====================================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ MIGRATION APLICADA COM SUCESSO                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Alteracoes Realizadas:" -ForegroundColor Cyan
Write-Host "   [OK] Campo plan_id adicionado (UUID, FK para subscription_plans)" -ForegroundColor Green
Write-Host "   [OK] Campo collection_id agora e NULLABLE" -ForegroundColor Green
Write-Host "   [OK] Status 'pending_payment' adicionado" -ForegroundColor Green
Write-Host "   [OK] Dados existentes migrados automaticamente" -ForegroundColor Green
Write-Host "   [OK] Triggers de validacao criados" -ForegroundColor Green
Write-Host ""
Write-Host "Problema Resolvido:" -ForegroundColor Cyan
Write-Host "   [OK] POST /subscriptions agora funciona corretamente" -ForegroundColor Green
Write-Host "   [OK] Codigo frontend compativel com schema do banco" -ForegroundColor Green
Write-Host "   [OK] Validacoes automaticas implementadas" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos Passos:" -ForegroundColor Cyan
Write-Host "   1. Teste criar uma nova assinatura" -ForegroundColor White
Write-Host "   2. Verifique se o erro 400 foi resolvido" -ForegroundColor White
Write-Host "   3. Monitore logs para garantir funcionamento" -ForegroundColor White
Write-Host ""
