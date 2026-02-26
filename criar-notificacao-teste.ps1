# Script para criar notificação de teste via Supabase
# Data: 2026-02-28

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Criar Notificação de Teste" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações do Supabase
$supabaseUrl = "https://pabxpvqwtvbjaunjejud.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"

Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# SQL para criar notificação de teste
$createNotificationSql = @"
SELECT create_user_notification(
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  'system_announcement'::user_notification_type,
  'Sistema de Notificações Ativado! 🎉',
  'O novo sistema de notificações está funcionando perfeitamente. Você receberá atualizações em tempo real!',
  'high'::notification_priority,
  NULL,
  NULL,
  '/notificacoes',
  'Ver Notificações',
  'Megaphone',
  '{}'::jsonb
);
"@

Write-Host "Executando SQL..." -ForegroundColor Cyan

# Headers para a requisição
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Tentar executar via RPC
try {
    Write-Host "Método 1: Tentando via SQL direto..." -ForegroundColor Gray
    
    $body = @{
        query = $createNotificationSql
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "Sucesso!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "Método 1 falhou. Tentando método alternativo..." -ForegroundColor Yellow
    Write-Host ""
    
    # Método 2: Buscar usuários e criar notificação via REST API
    try {
        Write-Host "Método 2: Buscando usuários..." -ForegroundColor Gray
        
        # Buscar primeiro usuário
        $usersResponse = Invoke-RestMethod `
            -Uri "$supabaseUrl/auth/v1/admin/users?page=1&per_page=1" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        
        if ($usersResponse.users -and $usersResponse.users.Count -gt 0) {
            $userId = $usersResponse.users[0].id
            $userEmail = $usersResponse.users[0].email
            
            Write-Host "Usuário encontrado: $userEmail" -ForegroundColor Green
            Write-Host "Criando notificação..." -ForegroundColor Cyan
            
            # Criar notificação diretamente na tabela
            $notificationBody = @{
                user_id = $userId
                type = "system_announcement"
                priority = "high"
                title = "Sistema de Notificações Ativado! 🎉"
                message = "O novo sistema de notificações está funcionando perfeitamente. Você receberá atualizações em tempo real!"
                icon = "Megaphone"
                action_url = "/notificacoes"
                action_label = "Ver Notificações"
                is_read = $false
                metadata = @{}
            } | ConvertTo-Json
            
            $notificationResponse = Invoke-RestMethod `
                -Uri "$supabaseUrl/rest/v1/user_notifications" `
                -Method Post `
                -Headers $headers `
                -Body $notificationBody `
                -ErrorAction Stop
            
            Write-Host ""
            Write-Host "Notificação criada com sucesso!" -ForegroundColor Green
            Write-Host "ID: $($notificationResponse.id)" -ForegroundColor Cyan
            Write-Host "Usuário: $userEmail" -ForegroundColor Cyan
            
        } else {
            Write-Host "Nenhum usuário encontrado!" -ForegroundColor Red
            Write-Host "Faça login na aplicação primeiro para criar um usuário." -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Método 2 também falhou!" -ForegroundColor Red
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "SOLUÇÃO MANUAL" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Execute este SQL no Supabase Dashboard:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $createNotificationSql -ForegroundColor Gray
        Write-Host ""
        Write-Host "1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql" -ForegroundColor Cyan
        Write-Host "2. Cole o SQL acima" -ForegroundColor Cyan
        Write-Host "3. Clique em Run" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "Processo concluído!" -ForegroundColor Green
