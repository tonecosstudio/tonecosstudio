# ⚡ Comandos Rápidos - Sistema de Créditos

## 🚀 Instalação Rápida

```powershell
# 1. Aplicar migration
.\aplicar-migration-creditos.ps1

# 2. Regenerar tipos
npm run generate-types

# 3. Reiniciar servidor (se estiver rodando)
# Ctrl+C e depois:
npm run dev
```

---

## 🔍 Verificação Rápida

```powershell
# Verificar se migration foi aplicada
supabase db diff

# Listar tabelas criadas
supabase db list

# Ver status do projeto
supabase status
```

---

## 🌐 URLs Importantes

### Admin
```
http://localhost:5173/admin/creditos/dashboard
http://localhost:5173/admin/creditos/assinaturas
http://localhost:5173/admin/creditos/personagens
http://localhost:5173/admin/creditos/ciclos
```

### Usuário
```
http://localhost:5173/painel-creditos
http://localhost:5173/catalogo-personagens
```

---

## 🐛 Troubleshooting Rápido

### Erro: "Supabase CLI não encontrado"
```powershell
npm install -g supabase
```

### Erro: "Não está logado"
```powershell
supabase login
```

### Erro: "Projeto não linkado"
```powershell
supabase link --project-ref SEU_PROJECT_REF
```

### Erro: "Tipos desatualizados"
```powershell
npm run generate-types
```

### Erro: "Página 404"
```powershell
# Limpar cache e reiniciar
Ctrl+Shift+R no navegador
```

---

## 📊 Queries SQL Úteis

### Ver planos criados
```sql
SELECT * FROM subscription_credit_plans;
```

### Ver assinaturas ativas
```sql
SELECT * FROM subscription_credit_subscriptions WHERE status = 'active';
```

### Ver saldo de créditos
```sql
SELECT * FROM subscription_credit_user_credits;
```

### Ver personagens ativos
```sql
SELECT * FROM subscription_credit_characters WHERE is_active = true;
```

### Ver ciclos abertos
```sql
SELECT * FROM subscription_credit_production_cycles WHERE status = 'open';
```

---

## 🎯 Testes Rápidos

### 1. Testar Dashboard Admin
```
1. Acesse: http://localhost:5173/admin/creditos/dashboard
2. Deve mostrar métricas (zeradas inicialmente)
3. Sem erros no console
```

### 2. Testar Catálogo
```
1. Acesse: http://localhost:5173/catalogo-personagens
2. Deve carregar (vazio inicialmente)
3. Sem erros no console
```

### 3. Testar Sidebar
```
1. Acesse: http://localhost:5173/admin
2. Procure seção "Sistema de Créditos"
3. Deve ter 4 itens de menu
```

---

## 📝 Criar Dados de Teste

### Criar Personagem (via SQL)
```sql
INSERT INTO subscription_credit_characters (
  name, 
  description, 
  price_cash, 
  price_credits, 
  is_active
) VALUES (
  'Personagem Teste',
  'Descrição do personagem',
  50.00,
  30,
  true
);
```

### Criar Ciclo (via SQL)
```sql
INSERT INTO subscription_credit_production_cycles (
  name,
  capacity_limit,
  close_date,
  status
) VALUES (
  'Ciclo Teste Janeiro 2026',
  100,
  '2026-01-31 23:59:59',
  'open'
);
```

---

## 🔄 Rollback (se necessário)

### Reverter migration
```powershell
# Listar migrations aplicadas
supabase migration list

# Reverter última migration
supabase db reset
```

**⚠️ ATENÇÃO:** Isso apaga TODOS os dados!

---

## 📚 Documentação Completa

- `RESUMO_EXECUTIVO_CREDITOS.md` - Visão geral
- `SISTEMA_CREDITOS_INSTRUCOES.md` - Instruções detalhadas
- `ANALISE_SISTEMA_CREDITOS.md` - Análise técnica
- `CORRECOES_APLICADAS.md` - Changelog

---

## ✅ Checklist Rápido

- [ ] Migration aplicada
- [ ] Tipos regenerados
- [ ] Servidor reiniciado
- [ ] Dashboard carrega
- [ ] Sidebar atualizada
- [ ] Catálogo carrega
- [ ] Sem erros no console

---

## 🎯 Comando Único (Tudo de Uma Vez)

```powershell
# Execute tudo de uma vez
.\aplicar-migration-creditos.ps1; npm run generate-types; Write-Host "✅ Sistema pronto!" -ForegroundColor Green
```

---

**Pronto para usar!** 🚀
