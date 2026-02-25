# ✅ Checklist de Deploy - Sistema de Configurações Dinâmicas

## 📋 Pré-Deploy

### Desenvolvimento

- [x] Migration criada
- [x] Hook implementado
- [x] Interface admin criada
- [x] Integrações feitas
- [x] Documentação completa
- [ ] Testes locais executados
- [ ] Code review realizado
- [ ] Sem erros no console
- [ ] Sem warnings críticos

### Banco de Dados

- [ ] Migration testada localmente
- [ ] Backup do banco atual
- [ ] Rollback plan preparado
- [ ] Índices verificados
- [ ] Permissões configuradas

## 🚀 Deploy - Passo a Passo

### Passo 1: Backup

```bash
# Fazer backup do banco
supabase db dump > backup_pre_config_$(date +%Y%m%d).sql

# Fazer backup das configurações atuais
psql -c "COPY system_settings TO '/tmp/system_settings_backup.csv' CSV HEADER;"
```

- [ ] Backup do banco completo
- [ ] Backup das configurações
- [ ] Backups armazenados com segurança

### Passo 2: Aplicar Migration

```bash
# Aplicar migration
supabase db push

# Verificar se foi aplicada
supabase db pull

# Verificar tabela
psql -c "SELECT COUNT(*) FROM system_settings;"
```

- [ ] Migration aplicada com sucesso
- [ ] Tabela `system_settings` existe
- [ ] View `system_settings_grouped` existe
- [ ] Triggers criados
- [ ] Validações funcionando

### Passo 3: Verificar Dados

```bash
# Verificar configurações
psql -c "SELECT key, value FROM system_settings WHERE key LIKE '%email%';"

# Verificar view
psql -c "SELECT * FROM system_settings_grouped;"
```

- [ ] Configurações padrão inseridas
- [ ] View retorna dados
- [ ] Valores corretos

### Passo 4: Deploy do Código

```bash
# Build do projeto
npm run build

# Verificar build
ls -la dist/

# Deploy (exemplo Vercel)
vercel --prod
```

- [ ] Build sem erros
- [ ] Deploy realizado
- [ ] URL de produção ativa

### Passo 5: Verificações Pós-Deploy

```bash
# Verificar se site está no ar
curl -I https://seu-site.com

# Verificar se admin funciona
curl -I https://seu-site.com/admin/configuracoes
```

- [ ] Site principal funcionando
- [ ] Admin acessível
- [ ] Sem erros 500

## 🧪 Testes em Produção

### Teste 1: Acessar Interface

- [ ] Login como admin
- [ ] Acessar `/admin/configuracoes`
- [ ] Interface carrega corretamente
- [ ] Todas as abas visíveis
- [ ] Campos preenchidos

### Teste 2: Editar Configuração

- [ ] Alterar um email
- [ ] Salvar mudança
- [ ] Toast de sucesso aparece
- [ ] Mudança persiste após refresh

### Teste 3: Verificar Integração

- [ ] Abrir página pública (ex: footer)
- [ ] Verificar se mudança aparece
- [ ] Testar em múltiplas páginas
- [ ] Cache funcionando

### Teste 4: Performance

- [ ] Tempo de carregamento < 2s
- [ ] Cache ativo
- [ ] Sem requisições desnecessárias
- [ ] Lighthouse score > 90

### Teste 5: Segurança

- [ ] Apenas admin acessa interface
- [ ] Validações funcionando
- [ ] Sem SQL injection
- [ ] Sem XSS

## 🔍 Monitoramento

### Métricas para Acompanhar

- [ ] Tempo de resposta da API
- [ ] Taxa de erro (deve ser 0%)
- [ ] Uso de cache (deve ser > 80%)
- [ ] Número de mudanças por dia

### Logs para Monitorar

```sql
-- Mudanças recentes
SELECT key, value, updated_at
FROM system_settings
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- Configurações mais alteradas
SELECT key, COUNT(*) as changes
FROM system_settings_audit -- se tiver audit log
GROUP BY key
ORDER BY changes DESC;
```

### Alertas Configurar

- [ ] Erro ao salvar configuração
- [ ] Tempo de resposta > 5s
- [ ] Taxa de erro > 1%
- [ ] Mudanças em configurações críticas

## 🚨 Rollback Plan

### Se algo der errado:

#### Opção 1: Rollback do Código

```bash
# Voltar para versão anterior
git revert HEAD
git push

# Ou fazer deploy da versão anterior
vercel rollback
```

#### Opção 2: Rollback do Banco

```bash
# Restaurar backup
psql < backup_pre_config_YYYYMMDD.sql

# Ou reverter migration
supabase migration down
```

#### Opção 3: Desabilitar Feature

```typescript
// Em constants.ts, adicionar flag
export const FEATURES = {
  USE_DYNAMIC_SETTINGS: false, // Desabilitar temporariamente
};

// No hook
if (!FEATURES.USE_DYNAMIC_SETTINGS) {
  return DEFAULT_SETTINGS; // Usar valores padrão
}
```

## 📊 Checklist de Sucesso

### Funcionalidade

- [ ] Interface admin funciona
- [ ] Mudanças são salvas
- [ ] Mudanças aparecem no site
- [ ] Validações funcionam
- [ ] Cache funciona
- [ ] Fallback funciona

### Performance

- [ ] Tempo de carregamento OK
- [ ] Cache hit rate > 80%
- [ ] Sem requisições lentas
- [ ] Lighthouse score mantido

### Segurança

- [ ] Apenas admin acessa
- [ ] Validações ativas
- [ ] Sem vulnerabilidades
- [ ] Logs de auditoria (se implementado)

### Documentação

- [ ] README atualizado
- [ ] Guias disponíveis
- [ ] Equipe treinada
- [ ] Runbook criado

## 👥 Comunicação

### Antes do Deploy

- [ ] Notificar equipe técnica
- [ ] Notificar admins
- [ ] Agendar horário (baixo tráfego)
- [ ] Preparar comunicado

### Durante o Deploy

- [ ] Status updates a cada 15 min
- [ ] Canal de comunicação aberto
- [ ] Equipe de plantão disponível

### Após o Deploy

- [ ] Comunicar sucesso
- [ ] Compartilhar guias
- [ ] Agendar treinamento
- [ ] Coletar feedback

## 📝 Documentação Pós-Deploy

### Atualizar

- [ ] README.md com novas features
- [ ] CHANGELOG.md com versão
- [ ] Documentação técnica
- [ ] Guias de usuário

### Criar

- [ ] Runbook de operação
- [ ] FAQ para admins
- [ ] Troubleshooting guide
- [ ] Video tutorial (opcional)

## 🎓 Treinamento

### Admin

- [ ] Como acessar interface
- [ ] Como editar configurações
- [ ] O que cada campo faz
- [ ] Quando usar cada configuração
- [ ] O que NÃO fazer

### Desenvolvedores

- [ ] Como usar o hook
- [ ] Como adicionar novas configurações
- [ ] Como testar localmente
- [ ] Como fazer rollback

## ✅ Aprovação Final

### Checklist Técnico

- [ ] Todos os testes passaram
- [ ] Performance aceitável
- [ ] Segurança verificada
- [ ] Monitoramento ativo
- [ ] Rollback plan testado

### Checklist Negócio

- [ ] Admin consegue usar
- [ ] Mudanças funcionam
- [ ] Economia de tempo confirmada
- [ ] ROI positivo
- [ ] Stakeholders satisfeitos

### Assinaturas

**Tech Lead:** ********\_******** Data: **_/_**/**\_  
**Product Owner:** ******\_\_\_******** Data: **_/_**/**\_  
**Admin:** ******\_\_\_******** Data: **_/_**/\_\_\_

## 🎉 Deploy Completo!

Quando todos os itens estiverem marcados:

- ✅ Sistema em produção
- ✅ Funcionando perfeitamente
- ✅ Equipe treinada
- ✅ Monitoramento ativo
- ✅ Documentação completa

**Status:** 🚀 LIVE IN PRODUCTION

---

## 📞 Contatos de Emergência

**Tech Lead:** [nome] - [email] - [telefone]  
**DevOps:** [nome] - [email] - [telefone]  
**Product Owner:** [nome] - [email] - [telefone]

## 🔗 Links Úteis

- **Produção:** https://seu-site.com/admin/configuracoes
- **Staging:** https://staging.seu-site.com/admin/configuracoes
- **Docs:** [link para documentação]
- **Monitoring:** [link para dashboard]
- **Logs:** [link para logs]

---

**Última Atualização:** 28 de Fevereiro de 2026  
**Versão:** 1.0.0  
**Próxima Revisão:** [data]
