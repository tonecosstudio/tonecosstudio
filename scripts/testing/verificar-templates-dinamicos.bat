@echo off
echo ========================================
echo Verificando Templates Dinamicos
echo ========================================
echo.

supabase db push

echo.
echo ========================================
echo Templates aplicados com sucesso!
echo ========================================
echo.
echo Acesse o Supabase Dashboard para verificar:
echo https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
echo.
echo Ou teste diretamente no admin:
echo http://localhost:8080/admin/suporte
echo.
pause
