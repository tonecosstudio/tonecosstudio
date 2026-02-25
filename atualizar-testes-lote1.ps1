# Script para atualizar testes do Lote 1 (QueryClient)

$testFiles = @(
    "src/components/customer/PaymentInitiationFlow.test.tsx",
    "src/components/groups/CreateGroupModal.test.tsx",
    "src/components/groups/GroupList.test.tsx",
    "src/components/customer/CustomerChat.test.tsx",
    "src/components/groups/GroupMembersList.test.tsx"
)

foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Write-Host "Atualizando $file..." -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw
        
        # Substituir render por renderWithProviders
        $content = $content -replace '\brender\(', 'renderWithProviders('
        
        # Salvar arquivo
        Set-Content $file $content -NoNewline
        
        Write-Host "OK $file atualizado" -ForegroundColor Green
    } else {
        Write-Host "ERRO $file nao encontrado" -ForegroundColor Red
    }
}

Write-Host "Atualizacao concluida!" -ForegroundColor Green
