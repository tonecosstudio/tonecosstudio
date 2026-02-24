@echo off
echo ====================================
echo     DEPLOY PARA PRODUCAO
echo ====================================
echo.

REM Verificar se esta na branch correta
echo [1/7] Verificando branch...
git branch --show-current
echo.

REM Executar testes
echo [2/7] Executando testes...
call npm test -- xss-protection.test.ts error-boundary.test.tsx --run
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Testes falharam! Deploy cancelado.
    pause
    exit /b 1
)
echo.

REM Verificar TypeScript
echo [3/7] Verificando TypeScript...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Erros TypeScript encontrados! Deploy cancelado.
    pause
    exit /b 1
)
echo.

REM Build
echo [4/7] Criando build de producao...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Build falhou! Deploy cancelado.
    pause
    exit /b 1
)
echo.

REM Criar tag de backup
echo [5/7] Criando tag de backup...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_TAG=v1.0.0-pre-deploy-%datetime:~0,8%-%datetime:~8,6%
git tag -a %BACKUP_TAG% -m "Backup antes do deploy"
git push origin %BACKUP_TAG%
echo Tag criada: %BACKUP_TAG%
echo.

REM Aplicar migrations (manual)
echo [6/7] Aplicar migrations do Supabase
echo.
echo IMPORTANTE: Execute manualmente:
echo   supabase link --project-ref [seu-project-ref]
echo   supabase db push
echo.
echo Pressione qualquer tecla apos aplicar as migrations...
pause > nul
echo.

REM Deploy
echo [7/7] Fazendo deploy...
echo.
echo Escolha o metodo de deploy:
echo   1. Vercel
echo   2. Netlify
echo   3. Outro (manual)
echo.
set /p DEPLOY_METHOD="Digite o numero (1-3): "

if "%DEPLOY_METHOD%"=="1" (
    echo.
    echo Executando: vercel --prod
    call vercel --prod
) else if "%DEPLOY_METHOD%"=="2" (
    echo.
    echo Executando: netlify deploy --prod
    call netlify deploy --prod
) else (
    echo.
    echo Execute seu comando de deploy manualmente.
    echo Build esta pronto em: dist/
    pause
)

echo.
echo ====================================
echo     DEPLOY CONCLUIDO!
echo ====================================
echo.
echo Proximos passos:
echo   1. Abrir aplicacao em producao
echo   2. Executar testes de validacao (ver DEPLOY_CHECKLIST.md)
echo   3. Monitorar logs por 24h
echo   4. Coletar feedback
echo.
echo Tag de backup criada: %BACKUP_TAG%
echo Para rollback: vercel rollback
echo.
pause
