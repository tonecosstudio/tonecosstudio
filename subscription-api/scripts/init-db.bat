@echo off
REM Script para inicializar o banco de dados do sistema de assinaturas (Windows)

echo 🚀 Iniciando configuração do banco de dados...
echo.

REM Verificar se o arquivo .env existe
if not exist .env (
    echo ⚠️  Arquivo .env não encontrado!
    echo 📝 Copiando .env.example para .env...
    copy .env.example .env
    echo ✅ Arquivo .env criado
    echo ⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar
    echo.
    pause
)

REM Verificar se o PostgreSQL está rodando
echo 🔍 Verificando se o PostgreSQL está rodando...
pg_isready >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL não está rodando!
    echo    Inicie o PostgreSQL e tente novamente
    pause
    exit /b 1
)
echo ✅ PostgreSQL está rodando
echo.

REM Extrair nome do banco do .env
for /f "tokens=2 delims=/" %%a in ('findstr DATABASE_URL .env') do set DB_PATH=%%a
for /f "tokens=1 delims=?" %%a in ("%DB_PATH%") do set DB_NAME=%%a
echo 📦 Nome do banco de dados: %DB_NAME%
echo.

REM Gerar Prisma Client
echo ⚙️  Gerando Prisma Client...
call npx prisma generate
echo ✅ Prisma Client gerado
echo.

REM Executar migrations
echo 🔄 Executando migrations...
call npx prisma migrate dev --name init
echo ✅ Migrations aplicadas
echo.

REM Executar seed
echo 🌱 Populando banco com dados iniciais...
call npx prisma db seed
echo ✅ Seed executado
echo.

echo ✨ Configuração concluída com sucesso!
echo.
echo 📊 Próximos passos:
echo    1. Execute 'npm run dev' para iniciar o servidor
echo    2. Acesse http://localhost:3000/health para verificar o status
echo    3. Execute 'npx prisma studio' para visualizar os dados
echo.
pause
