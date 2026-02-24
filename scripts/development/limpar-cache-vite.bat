@echo off
echo Limpando cache do Vite...

REM Deletar cache do Vite
if exist "node_modules\.vite" (
    echo Removendo node_modules\.vite...
    rmdir /s /q "node_modules\.vite"
    echo Cache removido!
) else (
    echo Cache nao encontrado.
)

echo.
echo Cache limpo! Agora reinicie o servidor de desenvolvimento.
echo Execute: npm run dev
pause
