# Script PowerShell para testar coleções no Supabase
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTANDO SISTEMA DE COLECOES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Verificando se as coleções existem..." -ForegroundColor Yellow
Write-Host ""

# URL e chave do Supabase
$supabaseUrl = "https://pabxpvqwtvbjaunjejud.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"

# Testar conexão
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/collections?select=id,name,slug&limit=5" `
        -Headers @{
            "apikey" = $supabaseKey
            "Content-Type" = "application/json"
        } `
        -Method Get `
        -SkipCertificateCheck

    Write-Host "✅ Conexão com Supabase OK" -ForegroundColor Green
    Write-Host ""
    
    if ($response.Count -gt 0) {
        Write-Host "Coleções encontradas:" -ForegroundColor Green
        $response | ForEach-Object {
            Write-Host "  - $($_.name) (slug: $($_.slug))" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "✅ As coleções já estão cadastradas!" -ForegroundColor Green
        Write-Host "Acesse: http://localhost:8080/colecoes/thundercats" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Nenhuma coleção encontrada no banco." -ForegroundColor Red
        Write-Host ""
        Write-Host "Solução:" -ForegroundColor Yellow
        Write-Host "1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor" -ForegroundColor White
        Write-Host "2. Cole o conteúdo do arquivo 'inserir-colecoes-simples.sql'" -ForegroundColor White
        Write-Host "3. Clique em RUN para executar" -ForegroundColor White
        Write-Host "4. Recarregue esta página (Ctrl+F5)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Erro ao conectar com Supabase:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Solução manual:" -ForegroundColor Yellow
    Write-Host "1. Abra o navegador e acesse:" -ForegroundColor White
    Write-Host "   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor" -ForegroundColor Cyan
    Write-Host "2. Execute este SQL manualmente:" -ForegroundColor White
    Write-Host ""
    Get-Content -Path "inserir-colecoes-simples.sql" | Write-Host -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUÇÕES COMPLETAS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Leia o arquivo: SOLUCAO_COLECOES_NAO_ENCONTRADAS.md" -ForegroundColor Yellow
Write-Host "   Contém o passo a passo completo para resolver." -ForegroundColor White
Write-Host ""
Write-Host "🚀 Solução rápida:" -ForegroundColor Green
Write-Host "1. Execute o SQL no Supabase Dashboard" -ForegroundColor White
Write-Host "2. Recarregue a página (Ctrl+F5)" -ForegroundColor White
Write-Host "3. Acesse: http://localhost:8080/colecoes/thundercats" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
Read-Host