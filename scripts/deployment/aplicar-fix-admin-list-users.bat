@echo off
echo Aplicando correcao na funcao admin_list_users...
supabase db execute < supabase/migrations/20260203000000_create_admin_list_users_function.sql
echo.
echo Concluido!
pause
