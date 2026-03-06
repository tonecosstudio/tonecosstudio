# 📝 Aplicar Migration Manualmente no Supabase

## ⚠️ Situação

O Supabase CLI não conseguiu aplicar a migration automaticamente. Vamos aplicar manualmente através do Dashboard.

---

## 🎯 Passo a Passo

### 1. Acessar Supabase Dashboard

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login se necessário
4. Selecione o projeto: **pabxpvqwtvbjaunjejud**

### 2. Abrir SQL Editor

1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New Query** (ou pressione Ctrl+N)

### 3. Copiar SQL da Migration

1. Abra o arquivo: `supabase/migrations/20260507000000_create_subscription_credit_system.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

### 4. Colar e Executar

1. Cole o SQL no editor do Supabase (Ctrl+V)
2. Clique no botão **Run** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode levar 10-30 segundos)

### 5. Verificar Sucesso

Você deve ver uma mensagem de sucesso no canto inferior direito.

Se houver erros, leia a mensagem e:
- Se disser "already exists", está tudo bem (tabela já existe)
- Se for outro erro, copie a mensagem e me envie

---

## ✅ Verificar Tabelas Criadas

### No Supabase Dashboard

1. Clique em **Table Editor** no menu lateral
2. Você deve ver 8 novas tabelas:
   - `subscription_credit_plans`
   - `subscription_credit_subscriptions`
   - `subscription_credit_user_credits`
   - `subscription_credit_transactions`
   - `subscription_credit_characters`
   - `subscription_credit_production_cycles`
   - `subscription_credit_orders`
   - `subscription_credit_order_items`

### Verificar Planos Iniciais

1. Clique na tabela `subscription_credit_plans`
2. Deve ter 2 registros:
   - **Trimestral**: price=150.00, base_credits=100, bonus_credits=20
   - **Semestral**: price=280.00, base_credits=200, bonus_credits=50

---

## 🚀 Próximos Passos

Após aplicar a migration com sucesso:

### 1. Regenerar Tipos TypeScript

```powershell
npm run generate-types
```

### 2. Reiniciar Servidor

```powershell
# Parar servidor: Ctrl+C
# Iniciar novamente:
npm run dev
```

### 3. Verificar Sistema

1. **Admin Dashboard:**
   - Acesse: http://localhost:5173/admin/creditos/dashboard
   - Deve carregar sem erro 404
   - Deve mostrar métricas zeradas

2. **Sidebar:**
   - Acesse: http://localhost:5173/admin
   - Deve mostrar seção "Sistema de Créditos"
   - Com 4 itens de menu

3. **Catálogo Usuário:**
   - Acesse: http://localhost:5173/catalogo-personagens
   - Deve carregar sem erro 404

---

## 🐛 Troubleshooting

### Erro: "relation already exists"

**Causa:** Tabela já foi criada anteriormente.

**Solução:** Está tudo bem! A tabela já existe. Continue com os próximos passos.

### Erro: "permission denied"

**Causa:** Você não tem permissão para criar tabelas.

**Solução:** 
1. Verifique se está logado com a conta correta
2. Verifique se tem permissão de admin no projeto

### Erro: "syntax error"

**Causa:** SQL foi copiado incorretamente.

**Solução:**
1. Copie novamente o arquivo completo
2. Certifique-se de copiar desde a primeira linha até a última
3. Não edite o SQL

### Tabelas não aparecem no Table Editor

**Causa:** Cache do navegador.

**Solução:**
1. Recarregue a página (F5)
2. Ou force refresh (Ctrl+Shift+R)

---

## 📋 Checklist

- [ ] Acessei Supabase Dashboard
- [ ] Abri SQL Editor
- [ ] Copiei SQL da migration
- [ ] Colei e executei
- [ ] Vi mensagem de sucesso
- [ ] Verifiquei 8 tabelas criadas
- [ ] Verifiquei 2 planos inseridos
- [ ] Executei `npm run generate-types`
- [ ] Reiniciei servidor
- [ ] Dashboard admin carrega
- [ ] Sidebar mostra "Sistema de Créditos"

---

## 💡 Dica

Se preferir, você pode executar a migration em partes:

1. **Primeiro:** Crie apenas as tabelas (até linha ~200)
2. **Depois:** Adicione as RLS policies (linhas 200-400)
3. **Por último:** Adicione triggers e seed data (linhas 400-fim)

Isso facilita identificar onde está o erro, se houver.

---

## 📞 Precisa de Ajuda?

Se encontrar problemas:

1. Copie a mensagem de erro completa
2. Tire um print da tela
3. Me envie para análise

---

**Boa sorte! A migration é simples e deve funcionar sem problemas.** ✅
