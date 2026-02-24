@echo off
echo ========================================
echo TESTANDO SISTEMA DE COLECOES
echo ========================================
echo.

echo 1. Testando busca de colecoes (publico)...
echo.
curl -s "https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/collections?select=id,name,slug,price_bimonthly,price_yearly,total_characters" ^
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNzI4NzksImV4cCI6MjA1Mzc0ODg3OX0.Qs-Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0" ^
  -H "Content-Type: application/json"
echo.
echo.

echo 2. Testando busca de personagens (publico)...
echo.
curl -s "https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/collection_characters?select=id,name,collection_id,release_order&limit=5" ^
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNzI4NzksImV4cCI6MjA1Mzc0ODg3OX0.Qs-Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0Qs0" ^
  -H "Content-Type: application/json"
echo.
echo.

echo ========================================
echo TESTES CONCLUIDOS
echo ========================================
echo.
echo Para testar as Edge Functions, voce precisa:
echo 1. Fazer login no site
echo 2. Pegar o token de autenticacao
echo 3. Executar os comandos em APLICAR_COLECOES_AGORA.md
echo.
pause
