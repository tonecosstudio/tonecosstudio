@echo off
REM =====================================================
REM DEPLOYMENT SCRIPT - Manual Payment System (Windows)
REM =====================================================
REM Este script prepara e executa o deployment do sistema de pagamento manual
REM Uso: scripts\deploy-manual-payment-system.bat [environment]
REM Exemplo: scripts\deploy-manual-payment-system.bat production

setlocal enabledelayedexpansion

REM Definir ambiente
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

echo [INFO] Deployment environment: %ENVIRONMENT%
echo.

REM =====================================================
REM 1. PRE-REQUISITOS
REM =====================================================

echo [INFO] Verificando pre-requisitos...

REM Verificar se Supabase CLI esta instalado
where supabase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Supabase CLI nao encontrado. Instale com: npm install -g supabase
    exit /b 1
)

REM Verificar se esta logado no Supabase
supabase projects list >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Nao esta logado no Supabase. Execute: supabase login
    exit /b 1
)

echo [SUCCESS] Pre-requisitos verificados
echo.

REM =====================================================
REM 2. BACKUP DO BANCO DE DADOS
REM =====================================================

echo [INFO] Criando backup do banco de dados...

set BACKUP_FILE=backup_pre_manual_payment_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

supabase db dump -f "%BACKUP_FILE%" 2>nul
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Backup criado: %BACKUP_FILE%
) else (
    echo [WARNING] Nao foi possivel criar backup automatico. Continue manualmente se necessario.
)
echo.

REM =====================================================
REM 3. EXECUTAR MIGRACOES
REM =====================================================

echo [INFO] Executando migracoes do banco de dados...

REM Verificar se a migracao existe
set MIGRATION_FILE=supabase\migrations\20260216000000_create_manual_payment_system.sql

if not exist "%MIGRATION_FILE%" (
    echo [ERROR] Arquivo de migracao nao encontrado: %MIGRATION_FILE%
    exit /b 1
)

REM Executar migracao
supabase db push
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Migracoes executadas com sucesso
) else (
    echo [ERROR] Falha ao executar migracoes
    exit /b 1
)
echo.

REM =====================================================
REM 4. CRIAR SCRIPTS DE VERIFICACAO
REM =====================================================

echo [INFO] Criando scripts de verificacao...

REM Script para verificar tabelas
echo -- Verificar tabelas > verify_tables.sql
echo SELECT >> verify_tables.sql
echo     CASE >> verify_tables.sql
echo         WHEN COUNT(*) = 4 THEN 'OK' >> verify_tables.sql
echo         ELSE 'ERRO: ' ^|^| (4 - COUNT(*))::text ^|^| ' tabelas faltando' >> verify_tables.sql
echo     END as status, >> verify_tables.sql
echo     array_agg(table_name) as tables_found >> verify_tables.sql
echo FROM information_schema.tables >> verify_tables.sql
echo WHERE table_schema = 'public' >> verify_tables.sql
echo AND table_name IN ( >> verify_tables.sql
echo     'admin_payment_methods', >> verify_tables.sql
echo     'manual_payments', >> verify_tables.sql
echo     'payment_files', >> verify_tables.sql
echo     'payment_audit_log' >> verify_tables.sql
echo ); >> verify_tables.sql

REM Script para seed de dados
echo -- Inserir metodos de pagamento padrao > seed_data.sql
echo INSERT INTO admin_payment_methods (name, type, instructions, pix_key, is_active, is_default, display_order) >> seed_data.sql
echo VALUES >> seed_data.sql
echo   ( >> seed_data.sql
echo     'PIX', >> seed_data.sql
echo     'pix', >> seed_data.sql
echo     'Faca o pagamento via PIX usando a chave abaixo. Apos o pagamento, envie o comprovante.', >> seed_data.sql
echo     'contato@ordax.com.br', >> seed_data.sql
echo     true, >> seed_data.sql
echo     true, >> seed_data.sql
echo     1 >> seed_data.sql
echo   ), >> seed_data.sql
echo   ( >> seed_data.sql
echo     'Transferencia Bancaria', >> seed_data.sql
echo     'bank_transfer', >> seed_data.sql
echo     'Faca uma transferencia bancaria para os dados abaixo e envie o comprovante.', >> seed_data.sql
echo     null, >> seed_data.sql
echo     true, >> seed_data.sql
echo     false, >> seed_data.sql
echo     2 >> seed_data.sql
echo   ) >> seed_data.sql
echo ON CONFLICT DO NOTHING; >> seed_data.sql

REM Script para politicas de storage
echo -- Politicas RLS do bucket payment-proofs > storage_policies.sql
echo CREATE POLICY "Users can upload payment proofs" >> storage_policies.sql
echo ON storage.objects FOR INSERT >> storage_policies.sql
echo TO authenticated >> storage_policies.sql
echo WITH CHECK ( >> storage_policies.sql
echo   bucket_id = 'payment-proofs' >> storage_policies.sql
echo   AND (storage.foldername(name))[1] IN ( >> storage_policies.sql
echo     SELECT id::text FROM manual_payments WHERE user_id = auth.uid() >> storage_policies.sql
echo   ) >> storage_policies.sql
echo ); >> storage_policies.sql

echo [SUCCESS] Scripts de verificacao criados
echo.

REM =====================================================
REM 5. INSTRUCOES MANUAIS
REM =====================================================

echo.
echo ==========================================
echo ACOES MANUAIS NECESSARIAS
echo ==========================================
echo.
echo 1. CRIAR BUCKET DE STORAGE
echo    - Acesse o Supabase Dashboard
echo    - Va para Storage ^> Buckets
echo    - Crie um bucket chamado 'payment-proofs' com:
echo      * Public: false
echo      * File size limit: 5242880 (5MB)
echo      * Allowed MIME types: image/jpeg, image/png, application/pdf
echo.
echo 2. CONFIGURAR POLITICAS RLS DO BUCKET
echo    - Execute o arquivo storage_policies.sql no SQL Editor
echo.
echo 3. INSERIR DADOS INICIAIS
echo    - Execute o arquivo seed_data.sql no SQL Editor
echo    - Ou ajuste os metodos de pagamento conforme necessario
echo.
echo 4. CONFIGURAR TEMPLATES DE EMAIL
echo    - Acesse Authentication ^> Email Templates no Supabase Dashboard
echo    - Configure os templates para:
echo      * Payment Created
echo      * Payment Under Review
echo      * Payment Approved
echo      * Payment Rejected
echo      * Payment Requires Info
echo.
echo 5. CONFIGURAR MONITORAMENTO
echo    - Configure Sentry (se usando)
echo    - Configure Google Analytics (se usando)
echo    - Configure alertas de erro
echo.
echo 6. VERIFICAR VARIAVEIS DE AMBIENTE
echo    - VITE_SUPABASE_URL
echo    - VITE_SUPABASE_PUBLISHABLE_KEY
echo    - Veja: docs\manual-payment-environment-variables.md
echo.
echo ==========================================
echo PROXIMOS PASSOS
echo ==========================================
echo.
echo 1. Execute os testes: npm run test
echo 2. Verifique a documentacao: docs\manual-payment-deployment.md
echo 3. Configure o monitoramento
echo 4. Execute testes de fumaca
echo.
echo [SUCCESS] Deployment preparado com sucesso!
echo.
echo Arquivos criados:
echo - verify_tables.sql (verificacao de tabelas)
echo - seed_data.sql (dados iniciais)
echo - storage_policies.sql (politicas de storage)
echo.

pause
