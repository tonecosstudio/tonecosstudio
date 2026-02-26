# Script de Deploy - Premium Club v2.0
# Aplica todas as migrations e faz deploy das Edge Functions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Premium Club v2.0 - Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host "Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Verificar se projeto está linkado
Write-Host "Verificando link do projeto..." -ForegroundColor Yellow
$projectStatus = supabase status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Projeto não está linkado!" -ForegroundColor Yellow
    Write-Host "Execute: supabase link --project-ref <seu-project-ref>" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Projeto linkado com sucesso!" -ForegroundColor Green
}
Write-Host ""

# Confirmar deploy
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ATENÇÃO: Deploy para Produção" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script irá:" -ForegroundColor White
Write-Host "  1. Aplicar 6 migrations de banco de dados" -ForegroundColor White
Write-Host "  2. Fazer deploy de 2 Edge Functions" -ForegroundColor White
Write-Host "  3. Criar ciclos iniciais" -ForegroundColor White
Write-Host "  4. Marcar assinaturas legado" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Red
Write-Host "  - Faça backup do banco de dados antes!" -ForegroundColor Red
Write-Host "  - Teste em staging primeiro!" -ForegroundColor Red
Write-Host "  - Tenha um plano de rollback!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Tem certeza que deseja continuar? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Deploy cancelado." -ForegroundColor Red
    exit 0
}
Write-Host ""

# Passo 1: Aplicar Migrations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passo 1: Aplicando Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Aplicando migrations..." -ForegroundColor Yellow
supabase db push --include-all

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao aplicar migrations!" -ForegroundColor Red
    Write-Host "Verifique os logs acima e corrija os erros." -ForegroundColor Yellow
    exit 1
}

Write-Host "Migrations aplicadas com sucesso!" -ForegroundColor Green
Write-Host ""

# Passo 2: Verificar Migrations
Write-Host "Verificando migrations aplicadas..." -ForegroundColor Yellow
supabase db remote commit

Write-Host ""

# Passo 3: Deploy Edge Functions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passo 2: Deploy Edge Functions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fazendo deploy de create-subscription-v2..." -ForegroundColor Yellow
supabase functions deploy create-subscription-v2

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no deploy de create-subscription-v2!" -ForegroundColor Red
    exit 1
}

Write-Host "create-subscription-v2 deployed!" -ForegroundColor Green
Write-Host ""

Write-Host "Fazendo deploy de schedule-deliveries..." -ForegroundColor Yellow
supabase functions deploy schedule-deliveries

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no deploy de schedule-deliveries!" -ForegroundColor Red
    exit 1
}

Write-Host "schedule-deliveries deployed!" -ForegroundColor Green
Write-Host ""

# Passo 4: Verificar Edge Functions
Write-Host "Verificando Edge Functions..." -ForegroundColor Yellow
supabase functions list

Write-Host ""

# Passo 5: Executar Testes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passo 3: Executando Testes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Executando testes..." -ForegroundColor Yellow
npm test -- --run src/lib/services/__tests__/

if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Alguns testes falharam!" -ForegroundColor Yellow
    Write-Host "Verifique os testes antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    $continueTests = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continueTests -ne "s" -and $continueTests -ne "S") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Todos os testes passaram!" -ForegroundColor Green
}

Write-Host ""

# Resumo Final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Concluído com Sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Próximos passos:" -ForegroundColor White
Write-Host "  1. Verificar logs no Supabase Dashboard" -ForegroundColor White
Write-Host "  2. Testar criação de assinatura" -ForegroundColor White
Write-Host "  3. Verificar ciclos criados" -ForegroundColor White
Write-Host "  4. Ativar feature flags no código" -ForegroundColor White
Write-Host "  5. Fazer deploy do frontend" -ForegroundColor White
Write-Host "  6. Monitorar por 24h" -ForegroundColor White
Write-Host ""

Write-Host "Documentação:" -ForegroundColor White
Write-Host "  - DEPLOY_CHECKLIST.md" -ForegroundColor White
Write-Host "  - MIGRATION.md" -ForegroundColor White
Write-Host "  - PROJETO_COMPLETO.md" -ForegroundColor White
Write-Host ""

Write-Host "Comandos úteis:" -ForegroundColor White
Write-Host "  supabase functions logs create-subscription-v2" -ForegroundColor Cyan
Write-Host "  supabase functions logs schedule-deliveries" -ForegroundColor Cyan
Write-Host "  supabase db remote commit" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Premium Club v2.0 está no ar! 🚀" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
