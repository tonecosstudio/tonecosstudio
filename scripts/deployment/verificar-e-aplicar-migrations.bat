@echo off
echo ========================================
echo VERIFICAR E APLICAR MIGRATIONS
echo ========================================
echo.

echo Passo 1: Verificando status das migrations...
echo.
supabase db diff --linked

echo.
echo ========================================
echo Passo 2: Aplicando migrations pendentes...
echo ========================================
echo.
supabase db push

echo.
echo ========================================
echo Passo 3: Verificando se as tabelas existem...
echo ========================================
echo.
echo Execute este SQL no Supabase SQL Editor:
echo.
echo SELECT table_name FROM information_schema.tables 
echo WHERE table_schema = 'public' 
echo AND table_name IN ('subscriptions', 'collection_characters', 'collections')
echo ORDER BY table_name;
echo.
echo ========================================
echo CONCLUIDO!
echo ========================================
echo.
echo Se as migrations foram aplicadas com sucesso,
echo recarregue a pagina do admin no navegador.
echo.
pause
