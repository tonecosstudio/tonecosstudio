# Carregar variáveis
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim().Trim('"')
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$url = $env:VITE_SUPABASE_URL
$key = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "Aplicando migration..." -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Gray

# SQL statements
$sqls = @(
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);",
    "CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);",
    "ALTER TABLE subscriptions ALTER COLUMN collection_id DROP NOT NULL;",
    "ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;",
    "ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'paused', 'cancelled', 'completed', 'pending_payment'));",
    "UPDATE subscriptions s SET plan_id = (SELECT sp.id FROM subscription_plans sp WHERE sp.plan_type = s.plan_type AND sp.is_active = true LIMIT 1) WHERE plan_id IS NULL AND plan_type IS NOT NULL;"
)

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$success = 0
$errors = 0

foreach ($sql in $sqls) {
    Write-Host "`nExecutando: $($sql.Substring(0, [Math]::Min(60, $sql.Length)))..." -ForegroundColor Yellow
    
    try {
        $body = @{ query = $sql } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$url/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "  OK" -ForegroundColor Green
        $success++
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*already exists*" -or $errorMsg -like "*duplicate*") {
            Write-Host "  OK (ja existe)" -ForegroundColor Green
            $success++
        } else {
            Write-Host "  ERRO: $errorMsg" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Sucesso: $success | Erros: $errors" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

if ($success -ge 3) {
    Write-Host "`nMigration aplicada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`nAlguns erros ocorreram." -ForegroundColor Yellow
}
