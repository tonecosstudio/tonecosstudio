@echo off
echo ========================================
echo ORDAX - Aplicar Sistema de Limite de Producao
echo ========================================
echo.
echo Esta migration adiciona:
echo - Tabela system_settings (configuracoes globais)
echo - Tabela monthly_production (controle mensal)
echo - Campos cycle_year e release_order em collections
echo - Campos release_month, release_date, is_revealed em collection_characters
echo - Funcoes para controlar limite de producao
echo.
echo Pressione qualquer tecla para continuar...
pause > nul

echo.
echo Aplicando migration...
supabase db push

echo.
echo ========================================
echo Migration aplicada com sucesso!
echo ========================================
echo.
echo Proximos passos:
echo 1. Verificar no Supabase Dashboard
echo 2. Testar funcoes: SELECT * FROM get_current_production_limit();
echo 3. Implementar frontend para contador de vagas
echo.
pause
