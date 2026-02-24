@echo off
echo ========================================
echo Aplicando dados de teste do Chat
echo ========================================
echo.
echo IMPORTANTE: Execute estes scripts no SQL Editor do Supabase Dashboard
echo.
echo 1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql/new
echo.
echo 2. Execute primeiro: listar-usuarios-criar-conversas.sql
echo    - Este script lista todos os usuarios cadastrados
echo    - Mostra estatisticas do sistema
echo.
echo 3. Depois execute: seed-chat-data.sql
echo    - Este script cria 5 conversas de exemplo
echo    - Cria mensagens para cada conversa
echo.
echo ========================================
echo Arquivos disponiveis:
echo ========================================
dir /b listar-usuarios-criar-conversas.sql seed-chat-data.sql
echo.
echo Pressione qualquer tecla para abrir os arquivos...
pause > nul
notepad listar-usuarios-criar-conversas.sql
notepad seed-chat-data.sql
