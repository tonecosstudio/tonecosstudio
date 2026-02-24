@echo off
echo ========================================
echo   APLICAR MIGRATIONS - SUPABASE
echo ========================================
echo.

echo [1/6] Verificando Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker Desktop nao esta rodando!
    echo.
    echo Por favor:
    echo 1. Abra o Docker Desktop
    echo 2. Aguarde ate o icone ficar verde
    echo 3. Execute este script novamente
    echo.
    pause
    exit /b 1
)
echo OK: Docker esta rodando
echo.

echo [2/6] Parando Supabase...
call supabase stop
if errorlevel 1 (
    echo AVISO: Supabase ja estava parado
)
echo.

echo [3/6] Iniciando Supabase...
call supabase start
if errorlevel 1 (
    echo ERRO: Falha ao iniciar Supabase
    echo.
    echo Tente manualmente:
    echo   supabase start
    echo.
    pause
    exit /b 1
)
echo OK: Supabase iniciado
echo.

echo [4/6] Aplicando migrations...
call supabase db reset
if errorlevel 1 (
    echo ERRO: Falha ao aplicar migrations
    echo.
    echo Verifique os logs acima
    echo.
    pause
    exit /b 1
)
echo OK: Migrations aplicadas
echo.

echo [5/6] Gerando tipos TypeScript...
call supabase gen types typescript --local > src\integrations\supabase\types.ts
if errorlevel 1 (
    echo ERRO: Falha ao gerar tipos
    echo.
    pause
    exit /b 1
)
echo OK: Tipos gerados
echo.

echo [6/6] Verificando tabelas...
echo.
echo Abrindo Supabase Studio...
echo URL: http://localhost:54323
echo.
echo Verifique se as tabelas foram criadas:
echo   - subscription_collections
echo   - subscription_plans
echo.

start http://localhost:54323

echo ========================================
echo   SUCESSO!
echo ========================================
echo.
echo Proximos passos:
echo   1. Verificar tabelas no Studio
echo   2. Executar: npm run dev
echo   3. Acessar: http://localhost:8080/admin/planos
echo.
pause
