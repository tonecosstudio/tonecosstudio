# Script para aplicar migrations do Sprint 2 - Gestao de Ciclos
# Data: 2026-03-01
# Sprint: Premium Club v2.0 - Sprint 2

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aplicar Sprint 2 - Gestao de Ciclos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se os arquivos de migration existem
$migrations = @(
    "supabase/migrations/20260301000001_create_cycle_functions.sql",
    "supabase/migrations/20260301000002_create_cycle_cron_jobs.sql"
)

$allFilesExist = $true
foreach ($migration in $migrations) {
    if (-not (Test-Path $migration)) {
        Write-Host "Erro: Arquivo nao encontrado - $migration" -ForegroundColor Red
        $allFilesExist = $false
    } else {
        Write-Host "OK $migration" -ForegroundColor Green
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "Alguns arquivos de migration nao foram encontrados!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Todos os arquivos de migration encontrados" -ForegroundColor Green
Write-Host ""

# Combinar conteudo das migrations
$combinedContent = ""
foreach ($migration in $migrations) {
    $content = Get-Content $migration -Raw
    $combinedContent += "-- ================================================`n"
    $combinedContent += "-- Migration: $migration`n"
    $combinedContent += "-- ================================================`n`n"
    $combinedContent += $content
    $combinedContent += "`n`n"
}

Write-Host "Conteudo combinado:" -ForegroundColor Cyan
Write-Host "Tamanho: $($combinedContent.Length) caracteres" -ForegroundColor Gray
Write-Host "Migrations: $($migrations.Count)" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Opcoes de Aplicacao" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Via Supabase Dashboard (Recomendado)" -ForegroundColor Yellow
Write-Host "2. Via Supabase CLI" -ForegroundColor Yellow
Write-Host "3. Copiar SQL para Clipboard" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Escolha uma opcao (1, 2, 3) ou q para sair"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Abrindo Supabase Dashboard..." -ForegroundColor Cyan
        Start-Process "https://supabase.com/dashboard"
        Write-Host ""
        Write-Host "Dashboard aberto no navegador" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pressione qualquer tecla para copiar o SQL..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Set-Clipboard -Value $combinedContent
        Write-Host "SQL copiado para clipboard!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Instrucoes:" -ForegroundColor Cyan
        Write-Host "1. Va para SQL Editor no Dashboard" -ForegroundColor Yellow
        Write-Host "2. Cole o SQL (Ctrl+V)" -ForegroundColor Yellow
        Write-Host "3. Execute (Run)" -ForegroundColor Yellow
    }
    "2" {
        Write-Host ""
        Write-Host "Configurando link com Supabase..." -ForegroundColor Cyan
        Write-Host ""
        $projectRef = Read-Host "Digite o Project Ref do Supabase"
        
        if ([string]::IsNullOrWhiteSpace($projectRef)) {
            Write-Host "Project Ref nao pode ser vazio" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Executando: supabase link --project-ref $projectRef" -ForegroundColor Gray
        supabase link --project-ref $projectRef
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Link configurado com sucesso" -ForegroundColor Green
            Write-Host ""
            Write-Host "Aplicando migrations..." -ForegroundColor Cyan
            supabase db push
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Migrations aplicadas com sucesso!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "Erro ao aplicar migrations" -ForegroundColor Red
            }
        } else {
            Write-Host ""
            Write-Host "Erro ao configurar link" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Copiando SQL para clipboard..." -ForegroundColor Cyan
        Set-Clipboard -Value $combinedContent
        Write-Host "SQL copiado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Cole no Supabase SQL Editor e execute." -ForegroundColor Yellow
    }
    "q" {
        Write-Host ""
        Write-Host "Saindo..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "Opcao invalida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Proximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Atualizar tipos TypeScript:" -ForegroundColor Yellow
Write-Host "   npm run update-types" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Executar testes:" -ForegroundColor Yellow
Write-Host "   npm test" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar componentes admin:" -ForegroundColor Yellow
Write-Host "   - AdminCycleManager" -ForegroundColor Gray
Write-Host "   - AdminHolidayManager" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verificar pg_cron jobs no Dashboard:" -ForegroundColor Yellow
Write-Host "   SELECT * FROM cron.job;" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Apos validacao, retorne e diga continue para Sprint 3" -ForegroundColor Yellow
Write-Host ""
Write-Host "Processo concluido!" -ForegroundColor Green
Write-Host ""
