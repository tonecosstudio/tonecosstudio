@echo off
echo ========================================
echo Aplicando Correcoes Supabase
echo ========================================
echo.

echo AVISO: Esta operacao vai:
echo 1. Limpar todas as politicas RLS existentes
echo 2. Criar politicas corretas e seguras
echo 3. Adicionar indices de performance
echo.
echo Pressione Ctrl+C para cancelar ou
pause

echo.
echo Aplicando migrations...
npx supabase db push

echo.
echo ========================================
echo Verificando resultado...
echo ========================================
echo.

echo Testando acesso as tabelas...
npx supabase db execute "SELECT COUNT(*) FROM chat_groups;"
npx supabase db execute "SELECT COUNT(*) FROM chat_group_members;"
npx supabase db execute "SELECT COUNT(*) FROM chat_group_messages;"

echo.
echo ========================================
echo Correcoes aplicadas com sucesso!
echo ========================================
echo.
echo Proximos passos:
echo 1. Testar login como admin
echo 2. Testar login como usuario comum
echo 3. Verificar que grupos funcionam
echo 4. Verificar que mensagens funcionam
echo.
pause
