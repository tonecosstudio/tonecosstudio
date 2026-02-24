# 🚀 Deployment Guide - Ordax

Guia completo para fazer deploy da plataforma Ordax em produção.

---

## 📋 Pré-requisitos

- [ ] Acesso ao projeto Supabase
- [ ] Acesso ao Vercel (ou plataforma de deploy)
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations testadas localmente
- [ ] Testes passando (59/59)
- [ ] Build local bem-sucedido

---

## ⚡ Quick Deploy

```bash
# 1. Rodar testes
npm test -- --run

# 2. Build
npm run build

# 3. Deploy
vercel --prod

# 4. Aplicar migrations
supabase db push
```

---

## 📝 Checklist Completo de Deploy

### Fase 1: Pré-Deploy (30 min)

#### 1.1 Validação de Código
- [ ] Todos os testes passando
  ```bash
  npm test -- --run
  ```
- [ ] Zero erros TypeScript
  ```bash
  npx tsc --noEmit
  ```
- [ ] Lint sem erros
  ```bash
  npm run lint
  ```

#### 1.2 Backup
- [ ] Backup do banco de dados
  ```sql
  -- No Supabase Dashboard > Database > Backups
  -- Criar backup manual
  ```
- [ ] Backup das variáveis de ambiente
- [ ] Backup das Edge Functions atuais

#### 1.3 Revisão de Migrations
- [ ] Revisar todas as migrations pendentes
  ```bash
  ls supabase/migrations/
  ```
- [ ] Testar migrations em ambiente de staging
- [ ] Verificar se há rollback disponível

#### 1.4 Comunicação
- [ ] Notificar equipe sobre deploy
- [ ] Agendar horário de baixo tráfego
- [ ] Preparar mensagem de manutenção (se necessário)

---

### Fase 2: Deploy (20 min)

#### 2.1 Aplicar Migrations do Banco

```bash
# Conectar ao projeto
supabase link --project-ref pabxpvqwtvbjaunjejud

# Aplicar migrations
supabase db push

# Verificar status
supabase db diff
```

**Migrations Críticas**:
- Sistema de chat e grupos
- Sistema de pagamentos
- Sistema de assinaturas
- Otimizações de performance

#### 2.2 Deploy de Edge Functions

```bash
# Deploy todas as functions
supabase functions deploy

# Ou deploy individual
supabase functions deploy send-email
supabase functions deploy auto-sync-groups
supabase functions deploy send-group-emails-batch
```

**Functions Principais**:
- `admin-list-users` - Listar usuários
- `admin-promote` - Promover admin
- `auto-sync-groups` - Sincronizar grupos
- `send-email` - Enviar emails
- `send-group-emails-batch` - Emails em lote
- `classify-image-vision` - Classificação IA

#### 2.3 Build e Deploy Frontend

```bash
# Build de produção
npm run build

# Verificar build
npm run preview

# Deploy para Vercel
vercel --prod

# Ou deploy manual
# Upload da pasta dist/ para seu servidor
```

#### 2.4 Verificar Variáveis de Ambiente

No Vercel Dashboard:
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] `VITE_SENTRY_DSN` configurada (opcional)
- [ ] `VITE_APP_VERSION` configurada

---

### Fase 3: Validação Pós-Deploy (30 min)

#### 3.1 Testes de Fumaça (5 min)

**Área Pública**:
- [ ] Home carrega
- [ ] Catálogo carrega
- [ ] Coleções carregam
- [ ] Login funciona

**Área do Cliente**:
- [ ] Login com email/senha
- [ ] Login com Google OAuth
- [ ] Perfil carrega
- [ ] Chat funciona
- [ ] Notificações funcionam

**Área Admin**:
- [ ] Dashboard carrega
- [ ] Lista de usuários carrega
- [ ] Chat admin funciona
- [ ] Grupos funcionam
- [ ] Métricas carregam

#### 3.2 Testes de Segurança (10 min)

- [ ] RLS funcionando (usuários não veem dados de outros)
- [ ] Proteção XSS ativa
- [ ] Autenticação obrigatória em rotas protegidas
- [ ] Permissões admin funcionando

**Teste Manual XSS**:
```javascript
// Tentar injetar em campo de mensagem
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>

// Deve ser sanitizado e não executar
```

#### 3.3 Testes de Performance (10 min)

- [ ] Tempo de carregamento < 3s
- [ ] Queries otimizadas (verificar Network tab)
- [ ] Real-time funcionando
- [ ] Sem erros no console

**Métricas Esperadas**:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Queries de grupos: 1-2 (não 30+)

#### 3.4 Testes de Funcionalidades Críticas (5 min)

**Chat/Suporte**:
- [ ] Enviar mensagem
- [ ] Receber mensagem em tempo real
- [ ] Upload de anexo
- [ ] Notificações funcionam

**Pagamentos**:
- [ ] Criar assinatura
- [ ] Processar pagamento
- [ ] Receber confirmação
- [ ] Email de confirmação

**Grupos**:
- [ ] Listar grupos
- [ ] Enviar mensagem em grupo
- [ ] Adicionar membro
- [ ] Notificações de grupo

---

### Fase 4: Monitoramento (24h)

#### 4.1 Primeiras 4 Horas (Crítico)

- [ ] Monitorar logs de erro
  ```bash
  # Supabase Dashboard > Logs
  # Vercel Dashboard > Logs
  ```
- [ ] Verificar métricas de performance
- [ ] Monitorar uso de recursos
- [ ] Responder a incidentes rapidamente

#### 4.2 Primeiras 24 Horas

- [ ] Coletar feedback dos usuários
- [ ] Analisar métricas de uso
- [ ] Verificar taxa de erro
- [ ] Monitorar performance do banco

**Métricas a Monitorar**:
- Taxa de erro (< 1%)
- Tempo de resposta (< 500ms p95)
- Uso de CPU/Memória
- Conexões do banco
- Taxa de sucesso de pagamentos

---

## 🔄 Plano de Rollback

### Se Algo Crítico Falhar

#### Rollback do Frontend (5 min)

```bash
# Vercel
vercel rollback

# Ou redeploy versão anterior
git checkout <commit-anterior>
vercel --prod
```

#### Rollback do Banco (10 min)

```bash
# Restaurar backup
# Supabase Dashboard > Database > Backups > Restore

# Ou reverter migrations específicas
supabase db reset
```

#### Rollback de Edge Functions (5 min)

```bash
# Redeploy versão anterior
git checkout <commit-anterior>
supabase functions deploy
```

### Critérios para Rollback

Execute rollback se:
- Taxa de erro > 5%
- Funcionalidade crítica quebrada (pagamentos, auth)
- Performance degradada > 50%
- Perda de dados detectada
- Vulnerabilidade de segurança descoberta

---

## 📊 Métricas de Sucesso

### Deploy Bem-Sucedido

- ✅ 59/59 testes passando
- ✅ 0 erros TypeScript
- ✅ Build sem erros
- ✅ Migrations aplicadas
- ✅ Functions deployadas
- ✅ Frontend acessível
- ✅ Testes de fumaça passando
- ✅ Taxa de erro < 1%
- ✅ Performance mantida

### KPIs a Monitorar

| Métrica | Meta | Crítico |
|---------|------|---------|
| Uptime | > 99.9% | < 99% |
| Tempo de resposta | < 500ms | > 2s |
| Taxa de erro | < 1% | > 5% |
| Tempo de carregamento | < 3s | > 5s |
| Taxa de sucesso (pagamentos) | > 95% | < 90% |

---

## 🐛 Troubleshooting

### Erro: "Migration failed"

```bash
# Ver logs detalhados
supabase db push --debug

# Reverter migration específica
supabase migration repair <timestamp>

# Aplicar manualmente
# Copiar SQL e executar no Dashboard
```

### Erro: "Function deployment failed"

```bash
# Ver logs
supabase functions logs <function-name>

# Testar localmente
supabase functions serve <function-name>

# Redeploy
supabase functions deploy <function-name> --no-verify-jwt
```

### Erro: "Build failed"

```bash
# Limpar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar
rm -rf node_modules
npm install

# Build novamente
npm run build
```

### Erro: "RLS blocking queries"

```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'sua_tabela';

-- Testar como usuário específico
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid"}';
SELECT * FROM sua_tabela;
```

---

## 📝 Checklist Pós-Deploy

### Imediato (Primeiras 4h)
- [ ] Testes de fumaça completos
- [ ] Monitoramento ativo
- [ ] Equipe de plantão
- [ ] Logs sendo revisados

### Curto Prazo (24h)
- [ ] Feedback coletado
- [ ] Métricas analisadas
- [ ] Incidentes documentados
- [ ] Melhorias identificadas

### Médio Prazo (1 semana)
- [ ] Performance estável
- [ ] Usuários satisfeitos
- [ ] Zero incidentes críticos
- [ ] Documentação atualizada

---

## 🎯 Próximos Passos Após Deploy

1. **Monitorar** - Primeiras 24h são críticas
2. **Coletar Feedback** - Usuários e equipe
3. **Analisar Métricas** - Performance e uso
4. **Documentar Lições** - O que funcionou/não funcionou
5. **Planejar Melhorias** - Próxima iteração

---

## 📞 Contatos de Emergência

### Em Caso de Incidente Crítico

- **DevOps**: [contato]
- **Backend**: [contato]
- **Frontend**: [contato]
- **Supabase Support**: support@supabase.com
- **Vercel Support**: support@vercel.com

---

## 📚 Recursos Adicionais

- **[Supabase Docs](https://supabase.com/docs)** - Documentação oficial
- **[Vercel Docs](https://vercel.com/docs)** - Guias de deploy
- **[Troubleshooting](development/troubleshooting.md)** - Solução de problemas
- **[Architecture](architecture.md)** - Arquitetura do sistema

---

**Última atualização**: 2026-02-24  
**Tempo estimado**: 1h 20min  
**Nível de risco**: Médio (com rollback preparado)
