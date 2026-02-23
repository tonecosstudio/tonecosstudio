@echo off
echo ========================================
echo TESTANDO EDGE FUNCTIONS EM PRODUCAO
echo ========================================
echo.

echo [1/5] Testando classify-name...
curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/classify-name -H "Content-Type: application/json" -d "{\"name\": \"Funko Pop Batman\"}"
echo.
echo.

echo [2/5] Verificando secrets configurados...
supabase secrets list
echo.

echo [3/5] Listando Edge Functions deployadas...
supabase functions list
echo.

echo [4/5] Verificando status do projeto...
supabase status
echo.

echo [5/5] Verificando logs recentes (classify-name)...
supabase functions logs classify-name --limit 10
echo.

echo ========================================
echo TESTES CONCLUIDOS
echo ========================================
echo.
echo Proximos passos:
echo 1. Verificar se classify-name retornou JSON valido
echo 2. Confirmar que OPENAI_API_KEY esta configurado
echo 3. Verificar se nao ha erros nos logs
echo.
pause
