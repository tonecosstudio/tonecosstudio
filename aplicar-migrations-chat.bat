@echo off
echo Aplicando migrations do sistema de chat...
echo.

REM Carregar variáveis de ambiente
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="SUPABASE_URL" set SUPABASE_URL=%%b
        if "%%a"=="SUPABASE_SERVICE_ROLE_KEY" set SUPABASE_SERVICE_ROLE_KEY=%%b
    )
)

echo Aplicando migration 20260221000004_update_support_conversations.sql...
psql "%SUPABASE_URL%" -f supabase/migrations/20260221000004_update_support_conversations.sql

echo Aplicando migration 20260221000005_update_support_messages.sql...
psql "%SUPABASE_URL%" -f supabase/migrations/20260221000005_update_support_messages.sql

echo Aplicando migration 20260221000006_create_support_attachments.sql...
psql "%SUPABASE_URL%" -f supabase/migrations/20260221000006_create_support_attachments.sql

echo Aplicando migration 20260221000007_create_order_production_stages.sql...
psql "%SUPABASE_URL%" -f supabase/migrations/20260221000007_create_order_production_stages.sql

echo Aplicando migration 20260221000008_create_conversation_triggers.sql...
psql "%SUPABASE_URL%" -f supabase/migrations/20260221000008_create_conversation_triggers.sql

echo.
echo Migrations aplicadas com sucesso!
pause
