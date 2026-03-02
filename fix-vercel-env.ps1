# Script para corrigir variáveis de ambiente na Vercel
# Remove aspas e adiciona as variáveis corretamente

Write-Host "Corrigindo variaveis de ambiente na Vercel..." -ForegroundColor Cyan

# Remover variáveis antigas (se existirem)
Write-Host ""
Write-Host "Removendo variaveis antigas..." -ForegroundColor Yellow
vercel env rm VITE_SUPABASE_URL production --yes 2>$null
vercel env rm VITE_SUPABASE_PUBLISHABLE_KEY production --yes 2>$null
vercel env rm VITE_SUPABASE_PROJECT_ID production --yes 2>$null

# Adicionar variáveis SEM aspas
Write-Host ""
Write-Host "Adicionando VITE_SUPABASE_URL..." -ForegroundColor Green
"https://pabxpvqwtvbjaunjejud.supabase.co" | vercel env add VITE_SUPABASE_URL production

Write-Host ""
Write-Host "Adicionando VITE_SUPABASE_PUBLISHABLE_KEY..." -ForegroundColor Green
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4" | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

Write-Host ""
Write-Host "Adicionando VITE_SUPABASE_PROJECT_ID..." -ForegroundColor Green
"pabxpvqwtvbjaunjejud" | vercel env add VITE_SUPABASE_PROJECT_ID production

Write-Host ""
Write-Host "Variaveis configuradas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Acesse https://vercel.com/jogo-brasils-projects/ordax/deployments"
Write-Host "2. Clique no ultimo deployment"
Write-Host "3. Clique em ... > Redeploy"
Write-Host "4. Marque Clear cache and redeploy"
Write-Host "5. Aguarde 1-2 minutos"
Write-Host ""
