# Execute SQL test script
$sql = Get-Content "scripts/diagnostics/teste-trigger-simples.sql" -Raw
$projectId = "pabxpvqwtvbjaunjejud"
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $serviceKey) {
    $serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"
}

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://$projectId.supabase.co/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body

Write-Output $response
