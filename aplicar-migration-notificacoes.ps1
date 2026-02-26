# Script para aplicar migration de notificações no Supabase
# Data: 2026-02-28

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aplicar Migration de Notificações" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo de migration existe
$migrationFile = "supabase/migrations/20260228200000_create_user_notifications_system.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Erro: Arquivo de migration não encontrado!" -ForegroundColor Red
    Write-Host "Esperado: $migrationFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "Arquivo de migration encontrado" -ForegroundColor Green
Write-Host ""

# Ler o conteúdo da migration
$migrationContent = Get-Content $migrationFile -Raw

Write-Host "Conteúdo da migration:" -ForegroundColor Cyan
Write-Host "Tamanho: $($migrationContent.Length) caracteres" -ForegroundColor Gray
Write-Host "Linhas: $(($migrationContent -split "`n").Count)" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Opções de Aplicação" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Via Supabase Dashboard (Recomendado)" -ForegroundColor Yellow
Write-Host "2. Via Supabase CLI" -ForegroundColor Yellow
Write-Host "3. Copiar SQL para Clipboard" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Escolha uma opção (1, 2, 3) ou q para sair"

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
        Set-Clipboard -Value $migrationContent
        Write-Host "SQL copiado para clipboard!" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "Configurando link com Supabase..." -ForegroundColor Cyan
        Write-Host ""
        $projectRef = Read-Host "Digite o Project Ref do Supabase"
        
        if ([string]::IsNullOrWhiteSpace($projectRef)) {
            Write-Host "Project Ref não pode ser vazio" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Executando: supabase link --project-ref $projectRef" -ForegroundColor Gray
        supabase link --project-ref $projectRef
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Link configurado com sucesso" -ForegroundColor Green
            Write-Host ""
            Write-Host "Aplicando migration..." -ForegroundColor Cyan
            supabase db push
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Migration aplicada com sucesso!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "Erro ao aplicar migration" -ForegroundColor Red
            }
        } else {
            Write-Host ""
            Write-Host "Erro ao configurar link" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Copiando SQL para clipboard..." -ForegroundColor Cyan
        Set-Clipboard -Value $migrationContent
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
        Write-Host "Opção inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Próximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verificar tabelas criadas no SQL Editor" -ForegroundColor Yellow
Write-Host "2. Criar notificação de teste" -ForegroundColor Yellow
Write-Host "3. Testar na aplicação: npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Processo concluído!" -ForegroundColor Green
Write-Host ""
