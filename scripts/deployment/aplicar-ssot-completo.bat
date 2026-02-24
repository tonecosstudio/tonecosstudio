@echo off
echo ========================================
echo Aplicando Sistema SSOT Completo
echo ========================================
echo.
echo Este script aplica:
echo - Templates dinamicos
echo - Configuracoes de conteudo
echo - Configuracoes de precos
echo.

npx supabase db push

echo.
echo ========================================
echo Concluido!
echo ========================================
echo.
echo Proximos passos:
echo 1. Reiniciar o servidor de desenvolvimento
echo 2. Testar as paginas atualizadas
echo 3. Verificar console sem erros
echo.
pause
