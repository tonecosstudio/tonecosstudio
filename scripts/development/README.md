# Development Scripts

Scripts para auxiliar no desenvolvimento.

## Scripts Disponíveis

### Servidor de Desenvolvimento
- `reiniciar-dev.bat` - Reinicia servidor de desenvolvimento
- `abrir-chat-admin.bat` - Abre interface admin do chat
- `abrir-chat-cliente.bat` - Abre interface cliente do chat

### Cache e Limpeza
- `limpar-cache.bat` - Limpa cache geral
- `limpar-cache-completo.bat` - Limpeza completa de cache
- `limpar-cache-vite.bat` - Limpa cache do Vite
- `limpar-cache-navegador.bat` - Instruções para limpar cache do navegador

### Reload e Refresh
- `recarregar-navegador.bat` - Recarrega navegador
- `forcar-recarregamento.bat` - Força recarregamento completo
- `hard-reload-chat.bat` - Hard reload do chat

### Regeneração
- `regenerar-tipos-supabase.bat` - Regenera tipos TypeScript
- `regenerar-com-token.bat` - Regenera com token de autenticação

### Diagnóstico
- `diagnosticar-email.bat` - Diagnostica problemas de email
- `verificar-sistema.bat` - Verifica sistema completo

## Como Usar

### Iniciar Desenvolvimento
```bash
npm run dev
```

### Limpar Cache
```bash
# Cache do Vite
limpar-cache-vite.bat

# Cache completo
limpar-cache-completo.bat
```

### Regenerar Tipos
```bash
regenerar-tipos-supabase.bat

# Ou via CLI
supabase gen types typescript --local > src/types/supabase.ts
```

### Abrir Interfaces
```bash
# Admin
abrir-chat-admin.bat

# Cliente
abrir-chat-cliente.bat
```

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar linter
npm run lint

# Build de desenvolvimento
npm run build:dev

# Preview de build
npm run preview
```

## Troubleshooting

Se encontrar problemas:

1. Limpar cache: `limpar-cache-completo.bat`
2. Reinstalar dependências: `rm -rf node_modules && npm install`
3. Verificar sistema: `verificar-sistema.bat`
4. Ver logs de erro no console

## Recursos

- [Setup Guide](../../docs/development/setup.md)
- [Troubleshooting](../../docs/development/troubleshooting.md)
- [Code Style](../../docs/development/code-style.md)
