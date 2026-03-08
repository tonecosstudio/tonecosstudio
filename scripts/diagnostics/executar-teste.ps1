# Script para executar testes SQL via Supabase API
param(
    [string]$SqlFile
)

$projectId = "pabxpvqwtvbjaunjejud"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"

# Ler o arquivo SQL
$sql = Get-Content $SqlFile -Raw

# Preparar headers
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Executar via REST API usando rpc
$body = @{
    query = $sql
} | ConvertTo-Json

try {
    # Usar a API do PostgREST para executar SQL
    $url = "https://$projectId.supabase.co/rest/v1/rpc/exec_sql"
    
    Write-Host "Executando SQL..." -ForegroundColor Yellow
    Write-Host "Arquivo: $SqlFile" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ""
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Erro ao executar SQL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}
