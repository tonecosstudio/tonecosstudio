@echo off
echo ========================================
echo CRIANDO COLECOES DE TESTE
echo ========================================
echo.

echo Executando script SQL...
npx supabase db execute --file INSERIR_COLECOES_BYPASS_RLS.sql --local

echo.
echo ========================================
echo VERIFICANDO RESULTADO
echo ========================================
echo.

npx supabase db execute --file VERIFICAR_COLECOES.sql --local

echo.
echo ========================================
echo CONCLUIDO!
echo ========================================
echo.
echo Teste as paginas:
echo - http://localhost:8080/colecoes/batman-6
echo - http://localhost:8080/colecoes/star-wars-12
echo - http://localhost:8080/colecoes/marvel-heroes-12
echo.
pause
