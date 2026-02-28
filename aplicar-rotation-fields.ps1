# Script para aplicar migration de rotation_type
# Este script aplica a migration que adiciona os campos de rotação às coleções

Write-Host "🔄 Aplicando migration de rotation_type..." -ForegroundColor Cyan

# Ler variáveis de ambiente
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Erro: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Lendo migration..." -ForegroundColor Yellow
$migrationPath = "supabase/migrations/20260317000000_add_collection_rotation_fields.sql"

if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Erro: Migration não encontrada em $migrationPath" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $migrationPath -Raw

Write-Host "🚀 Executando migration via Supabase REST API..." -ForegroundColor Yellow

# Dividir o SQL em comandos individuais (separados por ponto-e-vírgula)
$commands = $sql -split ';' | Where-Object { $_.Trim() -ne '' }

$successCount = 0
$errorCount = 0

foreach ($command in $commands) {
    $trimmedCommand = $command.Trim()
    
    # Pular comentários e comandos vazios
    if ($trimmedCommand -eq '' -or $trimmedCommand -match '^--') {
        continue
    }
    
    # Pular blocos DO que não são comandos SQL diretos
    if ($trimmedCommand -match '^DO \$') {
        Write-Host "⏭️  Pulando bloco DO (validação)..." -ForegroundColor Gray
        continue
    }
    
    # Pular SELECT de verificação
    if ($trimmedCommand -match '^SELECT.*AS status') {
        Write-Host "⏭️  Pulando SELECT de verificação..." -ForegroundColor Gray
        continue
    }
    
    Write-Host "📝 Executando: $($trimmedCommand.Substring(0, [Math]::Min(60, $trimmedCommand.Length)))..." -ForegroundColor Gray
    
    try {
        $body = @{
            query = $trimmedCommand
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
            -Method Post `
            -Headers @{
                "apikey" = $supabaseKey
                "Authorization" = "Bearer $supabaseKey"
                "Content-Type" = "application/json"
            } `
            -Body $body `
            -ErrorAction Stop
        
        $successCount++
        Write-Host "✅ Comando executado com sucesso" -ForegroundColor Green
    }
    catch {
        # Alguns erros são esperados (como "column already exists")
        if ($_.Exception.Message -match "already exists" -or $_.Exception.Message -match "duplicate") {
            Write-Host "⚠️  Já existe (ignorando): $($_.Exception.Message)" -ForegroundColor Yellow
            $successCount++
        }
        else {
            Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Host ""
Write-Host "📊 Resumo:" -ForegroundColor Cyan
Write-Host "   ✅ Sucesso: $successCount comandos" -ForegroundColor Green
Write-Host "   ❌ Erros: $errorCount comandos" -ForegroundColor Red

if ($errorCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 Migration aplicada com sucesso!" -ForegroundColor Green
    Write-Host "   Agora você pode usar os campos rotation_type nas coleções" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⚠️  Migration aplicada com alguns erros" -ForegroundColor Yellow
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
}
