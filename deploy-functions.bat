@echo off
REM Script para fazer deploy das Edge Functions corrigidas (Windows)
REM Execute: deploy-functions.bat

echo 🚀 Iniciando deploy das Edge Functions...
echo.

REM Verificar se está logado
echo 1️⃣ Verificando login...
supabase projects list >nul 2>&1
if errorlevel 1 (
    echo ❌ Não está logado. Execute: supabase login
    exit /b 1
)
echo ✅ Logado no Supabase
echo.

REM Verificar se o projeto está linkado
echo 2️⃣ Verificando link do projeto...
if not exist ".supabase\config.toml" (
    echo ⚠️ Projeto não linkado. Linkando agora...
    supabase link --project-ref pabxpvqwtvbjaunjejud
)
echo ✅ Projeto linkado
echo.

REM Deploy das funções corrigidas
echo 3️⃣ Fazendo deploy das funções corrigidas...
echo.

echo 📦 Deploying classify-image-vision...
supabase functions deploy classify-image-vision
echo.

echo 📦 Deploying process-queue-batch...
supabase functions deploy process-queue-batch
echo.

echo ✅ Deploy concluído!
echo.
echo 🎉 Próximos passos:
echo    1. Recarregue o frontend (Ctrl+R)
echo    2. Teste a funcionalidade de análise de imagem
echo    3. Verifique o console - erro 500 deve ter sumido
echo.
echo 📊 Para ver logs:
echo    supabase functions logs classify-image-vision
echo.

pause
