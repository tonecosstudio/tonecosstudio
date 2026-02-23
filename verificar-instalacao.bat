@echo off
echo ========================================
echo   VERIFICAR INSTALACAO
echo ========================================
echo.

set ERRORS=0

echo [1/8] Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker nao encontrado
    set /a ERRORS+=1
) else (
    docker --version
    echo OK
)
echo.

echo [2/8] Verificando Docker Desktop rodando...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker Desktop nao esta rodando
    set /a ERRORS+=1
) else (
    echo OK: Docker Desktop rodando
)
echo.

echo [3/8] Verificando Supabase CLI...
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Supabase CLI nao encontrado
    set /a ERRORS+=1
) else (
    supabase --version
    echo OK
)
echo.

echo [4/8] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado
    set /a ERRORS+=1
) else (
    node --version
    echo OK
)
echo.

echo [5/8] Verificando NPM...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: NPM nao encontrado
    set /a ERRORS+=1
) else (
    npm --version
    echo OK
)
echo.

echo [6/8] Verificando Supabase Status...
supabase status >nul 2>&1
if errorlevel 1 (
    echo AVISO: Supabase nao esta rodando
    echo Execute: supabase start
) else (
    echo OK: Supabase rodando
    echo.
    supabase status
)
echo.

echo [7/8] Verificando node_modules...
if exist "node_modules\" (
    echo OK: node_modules existe
) else (
    echo AVISO: node_modules nao encontrado
    echo Execute: npm install
    set /a ERRORS+=1
)
echo.

echo [8/8] Verificando migrations...
if exist "supabase\migrations\" (
    echo OK: Pasta migrations existe
    echo.
    echo Migrations encontradas:
    dir /b supabase\migrations\*.sql
) else (
    echo ERRO: Pasta migrations nao encontrada
    set /a ERRORS+=1
)
echo.

echo ========================================
if %ERRORS% EQU 0 (
    echo   TUDO OK! Sistema pronto para uso
) else (
    echo   ENCONTRADOS %ERRORS% PROBLEMAS
    echo   Corrija os erros acima
)
echo ========================================
echo.

if %ERRORS% EQU 0 (
    echo Proximos passos:
    echo   1. Execute: aplicar-migrations.bat
    echo   2. Execute: npm run dev
    echo   3. Acesse: http://localhost:8080
) else (
    echo Corrija os problemas e execute novamente
)
echo.
pause
