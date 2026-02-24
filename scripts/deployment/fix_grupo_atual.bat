@echo off
echo Adicionando usuario ao grupo...
type adicionar_membro_grupo_atual.sql | npx supabase db execute
pause
