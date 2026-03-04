# Script para limpar cache e reiniciar servidor
# Execute: .\fix-and-restart.ps1

Write-Host "🔧 Iniciando processo de limpeza e reinicialização..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se há processo do servidor rodando
Write-Host "1️⃣ Verificando processos do servidor..." -ForegroundColor Yellow
$viteProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }

if ($viteProcess) {
    Write-Host "   ⚠️  Servidor detectado rodando. Parando..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Servidor parado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Nenhum servidor rodando" -ForegroundColor Gray
}

Write-Host ""

# 2. Limpar cache do Vite
Write-Host "2️⃣ Limpando cache do Vite..." -ForegroundColor Yellow

if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "   ✅ Cache do Vite removido" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Cache do Vite não encontrado (já limpo)" -ForegroundColor Gray
}

Write-Host ""

# 3. Limpar cache do npm (opcional)
Write-Host "3️⃣ Limpando cache do npm..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "   ✅ Cache do npm limpo" -ForegroundColor Green

Write-Host ""

# 4. Reiniciar servidor
Write-Host "4️⃣ Reiniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   🚀 Iniciando 'npm run dev'..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "   📝 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Aguarde o servidor iniciar" -ForegroundColor White
Write-Host "   2. Abra o navegador" -ForegroundColor White
Write-Host "   3. Pressione Ctrl + Shift + R (hard refresh)" -ForegroundColor White
Write-Host "   4. Verifique se o erro 406 desapareceu" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor
npm run dev
