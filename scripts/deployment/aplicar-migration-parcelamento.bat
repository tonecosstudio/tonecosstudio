@echo off
echo Aplicando migration de parcelamento...
echo.

supabase db push

echo.
echo Migration aplicada com sucesso!
echo Agora voce pode configurar o parcelamento no Admin.
pause
