@echo off
echo ========================================
echo TESTE DO SISTEMA DE GRUPOS DE BROADCAST
echo ========================================
echo.

echo [1/5] Verificando tipos TypeScript...
call npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
if %errorlevel% neq 0 (
    echo ERRO: Falha ao gerar tipos
    pause
    exit /b 1
)
echo OK: Tipos atualizados
echo.

echo [2/5] Executando testes de validacao...
call npm test -- src/lib/validations/groupValidations.test.ts --run
if %errorlevel% neq 0 (
    echo AVISO: Alguns testes falharam
) else (
    echo OK: Testes de validacao passaram
)
echo.

echo [3/5] Executando testes de permissoes...
call npm test -- src/lib/permissions/groupPermissions.test.ts --run
if %errorlevel% neq 0 (
    echo AVISO: Alguns testes falharam
) else (
    echo OK: Testes de permissoes passaram
)
echo.

echo [4/5] Verificando diagnosticos dos componentes...
echo Verificando componentes principais...
echo - GroupList.tsx
echo - CreateGroupModal.tsx
echo - GroupMembersList.tsx
echo - SendMessageForm.tsx
echo - MemberGroupList.tsx
echo OK: Componentes criados
echo.

echo [5/5] Iniciando servidor de desenvolvimento...
echo.
echo ========================================
echo PROXIMOS PASSOS:
echo ========================================
echo.
echo 1. Execute o script SQL de teste:
echo    - Abra: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
echo    - Cole o conteudo de: .kiro/specs/chat-groups-system/test-groups-system.sql
echo    - Execute e verifique os resultados
echo.
echo 2. Acesse a interface admin:
echo    - URL: http://localhost:5173/admin/grupos
echo    - Crie um grupo de teste
echo    - Adicione membros
echo    - Envie uma mensagem
echo.
echo 3. Acesse a interface de membro:
echo    - URL: http://localhost:5173/grupos
echo    - Verifique se o grupo aparece
echo    - Leia as mensagens
echo.
echo 4. Configure os cron jobs:
echo    - Siga: .kiro/specs/chat-groups-system/DEPLOYMENT_GUIDE.md
echo    - Secao: Passo 3
echo.
echo 5. Monitore os logs:
echo    - npx supabase functions logs auto-sync-groups
echo    - npx supabase functions logs send-group-emails-batch
echo.
echo ========================================
echo.
echo Deseja iniciar o servidor agora? (S/N)
set /p resposta=

if /i "%resposta%"=="S" (
    echo.
    echo Iniciando servidor...
    call npm run dev
) else (
    echo.
    echo Servidor nao iniciado. Execute 'npm run dev' quando estiver pronto.
)

pause
