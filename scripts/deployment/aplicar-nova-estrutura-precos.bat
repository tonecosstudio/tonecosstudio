@echo off
echo ============================================
echo APLICAR NOVA ESTRUTURA DE PRECOS
echo ============================================
echo.
echo Esta migration vai:
echo - Desativar plano anual (mantem no banco)
echo - Atualizar Trimestral: R$ 1.350 (3 pecas)
echo - Atualizar Semestral: R$ 2.700 (7 pecas)
echo.
pause

supabase db push

echo.
echo ============================================
echo MIGRATION APLICADA!
echo ============================================
echo.
echo Proximos passos:
echo 1. Verificar no Supabase Dashboard
echo 2. Testar pagina /planos
echo 3. Testar pagina /colecoes
echo.
pause
