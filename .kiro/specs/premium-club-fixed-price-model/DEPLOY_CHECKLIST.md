# Checklist de Deploy - Premium Club v2.0

## Pré-Deploy

### Ambiente de Desenvolvimento
- [x] Todos os testes passando (223 testes)
- [x] Migrations criadas e testadas
- [x] Edge Functions implementadas
- [x] Frontend refatorado
- [x] Documentação atualizada

### Validações de Código
- [x] Sem erros de TypeScript
- [x] Sem warnings críticos
- [x] Código revisado
- [x] Testes de integração passando
- [x] Testes de performance validados
- [x] Auditoria de segurança completa

### Banco de Dados
- [ ] Backup do banco de dados criado
- [ ] Migrations testadas em ambiente local
- [ ] Políticas RLS validadas
- [ ] Índices criados
- [ ] Funções SQL testadas

## Deploy para Staging

### 1. Preparação
```bash
# Criar branch de release
git checkout -b release/premium-club-v2.0

# Verificar status
git status

# Commit final
git add .
git commit -m "feat: Premium Club v2.0 - Sistema completo"
```

### 2. Aplicar Migrations em Staging
```bash
# Linkar projeto staging
supabase link --project-ref <staging-project-ref>

# Aplicar migrations
supabase db push --include-all

# Verificar aplicação
supabase db remote commit
```

### 3. Deploy de Edge Functions em Staging
```bash
# Deploy create-subscription-v2
supabase functions deploy create-subscription-v2

# Deploy schedule-deliveries
supabase functions deploy schedule-deliveries

# Verificar logs
supabase functions logs create-subscription-v2
supabase functions logs schedule-deliveries
```

### 4. Deploy de Frontend em Staging
```bash
# Build
npm run build

# Verificar build
ls -la dist/

# Deploy (ajustar conforme seu provider)
# Vercel: vercel --prod
# Netlify: netlify deploy --prod
```

### 5. Testes em Staging
- [ ] Criar assinatura Trimestral
- [ ] Criar assinatura Semestral
- [ ] Verificar agendamento de entregas
- [ ] Testar mudança de personagem
- [ ] Verificar cálculo de ciclos
- [ ] Testar capacidade de ciclo
- [ ] Verificar transições de status
- [ ] Testar painel admin

### 6. Validações em Staging
- [ ] Performance aceitável (< 2s carregamento)
- [ ] Sem erros no console
- [ ] Sem erros nos logs do Supabase
- [ ] Edge Functions respondendo
- [ ] Cron jobs funcionando
- [ ] Notificações sendo enviadas

## Deploy para Produção

### 1. Preparação Final
```bash
# Merge para main
git checkout main
git merge release/premium-club-v2.0

# Tag de versão
git tag -a v2.0.0 -m "Premium Club v2.0 - Modelo de Preço Fixo"
git push origin main --tags
```

### 2. Backup de Produção
```bash
# Backup via Supabase Dashboard
# Settings > Database > Backups > Create Backup

# Ou via CLI (se disponível)
supabase db dump > backup-pre-v2.0-$(date +%Y%m%d).sql
```

### 3. Aplicar Migrations em Produção
```bash
# Linkar projeto produção
supabase link --project-ref <production-project-ref>

# Aplicar migrations
supabase db push --include-all

# Verificar
supabase db remote commit
```

### 4. Deploy de Edge Functions em Produção
```bash
# Deploy functions
supabase functions deploy create-subscription-v2
supabase functions deploy schedule-deliveries

# Verificar status
supabase functions list
```

### 5. Deploy de Frontend em Produção
```bash
# Build produção
npm run build

# Deploy
# (comando específico do seu provider)
```

### 6. Ativar Feature Flags
```typescript
// src/config/featureFlags.ts
export const featureFlags = {
  premiumClubV2: true, // ✅ ATIVAR
  useCycleSystem: true, // ✅ ATIVAR
  allowCharacterChange: true, // ✅ ATIVAR
  showBonusPieces: true, // ✅ ATIVAR
};
```

### 7. Configurar Cron Jobs
```sql
-- Verificar se os cron jobs estão ativos
SELECT * FROM cron.job WHERE jobname LIKE 'cycle_%';

-- Se necessário, recriar
-- (já criado na migration 20260301000002_create_cycle_cron_jobs.sql)
```

## Monitoramento Pós-Deploy (Primeiras 24h)

### Métricas Críticas
- [ ] Taxa de erro < 1%
- [ ] Tempo de resposta < 2s
- [ ] Uptime > 99.9%
- [ ] Sem erros 500
- [ ] Edge Functions respondendo

### Logs a Monitorar
```bash
# Logs do Supabase
# Dashboard > Logs > Database
# Dashboard > Logs > Edge Functions

# Logs de erros
# Dashboard > Logs > Errors

# Métricas
# Dashboard > Reports
```

### Alertas Configurados
- [ ] Erro em Edge Function
- [ ] Falha em transição de ciclo
- [ ] Capacidade de ciclo > 80%
- [ ] Tempo de resposta > 5s
- [ ] Taxa de erro > 5%

### Verificações Manuais (A cada 2h nas primeiras 24h)
- [ ] Criar assinatura teste
- [ ] Verificar ciclos ativos
- [ ] Checar logs de erro
- [ ] Validar métricas
- [ ] Testar mudança de personagem

## Rollback (Se Necessário)

### Critérios para Rollback
- Taxa de erro > 10%
- Funcionalidade crítica quebrada
- Perda de dados
- Performance inaceitável (> 10s)

### Procedimento de Rollback

#### 1. Desativar Feature Flags
```typescript
export const featureFlags = {
  premiumClubV2: false, // ❌ DESATIVAR
  useCycleSystem: false,
  allowCharacterChange: false,
  showBonusPieces: false,
};
```

#### 2. Reverter Frontend
```bash
# Deploy versão anterior
git checkout v1.x.x
npm run build
# Deploy
```

#### 3. Reverter Migrations (Se Necessário)
```sql
-- Executar rollback SQL
-- (ver MIGRATION.md para comandos)
```

#### 4. Restaurar Backup
```bash
# Via Supabase Dashboard
# Settings > Database > Backups > Restore

# Ou via SQL
psql -h <host> -U postgres -d postgres < backup-pre-v2.0-YYYYMMDD.sql
```

## Pós-Deploy

### Comunicação
- [ ] Notificar equipe do deploy bem-sucedido
- [ ] Atualizar status page (se houver)
- [ ] Comunicar clientes sobre novas funcionalidades
- [ ] Atualizar documentação pública

### Documentação
- [ ] Atualizar CHANGELOG.md
- [ ] Atualizar README.md
- [ ] Atualizar docs/
- [ ] Criar release notes

### Limpeza
- [ ] Remover feature flags antigas
- [ ] Remover código comentado
- [ ] Remover logs de debug
- [ ] Arquivar documentos temporários

## Contatos de Emergência

### Equipe Técnica
- Desenvolvedor Principal: [contato]
- DevOps: [contato]
- DBA: [contato]

### Suporte
- Supabase Support: support@supabase.io
- Documentação: https://supabase.com/docs

## Notas Finais

- Manter comunicação constante durante deploy
- Documentar qualquer problema encontrado
- Atualizar este checklist com aprendizados
- Celebrar o sucesso! 🎉
