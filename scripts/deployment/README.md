# Deployment Scripts

Scripts para deploy e configuração do ambiente.

## Scripts Disponíveis

### Deploy Principal
- `deploy.bat` - Deploy completo da aplicação
- `deploy-functions.bat` - Deploy apenas das Edge Functions

### Migrations
- `aplicar-migrations.bat` - Aplica todas as migrations pendentes
- `verificar-e-aplicar-migrations.bat` - Verifica e aplica migrations

### Configuração
- `aplicar-correcoes-supabase.bat` - Aplica correções no Supabase
- `regenerar-tipos-supabase.bat` - Regenera tipos TypeScript do Supabase

## Como Usar

### Deploy Completo
```bash
# Windows
deploy.bat

# Ou manualmente
npm run build
# Upload para hosting
```

### Deploy de Edge Functions
```bash
deploy-functions.bat

# Ou via CLI
supabase functions deploy
```

### Aplicar Migrations
```bash
aplicar-migrations.bat

# Ou via CLI
supabase db push
```

## Checklist de Deploy

1. [ ] Testar em desenvolvimento
2. [ ] Executar testes
3. [ ] Build de produção
4. [ ] Aplicar migrations
5. [ ] Deploy de Edge Functions
6. [ ] Verificar variáveis de ambiente
7. [ ] Testar em produção
8. [ ] Monitorar logs

## Rollback

Se algo der errado:
1. Reverter deploy no hosting
2. Reverter migrations se necessário
3. Verificar logs de erro
4. Aplicar correções
5. Fazer novo deploy

## Recursos

- [Guia de Deploy](../../docs/deployment.md)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
