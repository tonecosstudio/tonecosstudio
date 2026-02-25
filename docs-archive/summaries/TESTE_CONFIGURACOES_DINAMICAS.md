# 🧪 Guia de Testes - Configurações Dinâmicas

## 🎯 Objetivo

Testar completamente o sistema de configurações dinâmicas para garantir que tudo funciona perfeitamente.

## 📋 Pré-requisitos

- [ ] Migration aplicada no banco
- [ ] Servidor de desenvolvimento rodando
- [ ] Acesso admin configurado

## 🔧 Preparação

### 1. Aplicar Migration

```bash
# Aplicar migration
supabase db push

# Verificar se foi aplicada
supabase db pull

# Verificar tabela
psql -h localhost -U postgres -d postgres -c "SELECT * FROM system_settings LIMIT 5;"
```

### 2. Iniciar Servidor

```bash
npm run dev
# ou
yarn dev
```

### 3. Login como Admin

```
URL: http://localhost:5173/login
Usar credenciais de admin
```

## ✅ Testes Funcionais

### Teste 1: Acessar Interface Admin

**Objetivo:** Verificar se a interface carrega corretamente

**Passos:**

1. Acessar `http://localhost:5173/admin/configuracoes`
2. Verificar se as 6 abas aparecem
3. Verificar se os campos estão preenchidos com valores padrão

**Resultado Esperado:**

- ✅ Interface carrega sem erros
- ✅ 6 abas visíveis (Empresa, Contato, Website, Preços, Prazos, Interface)
- ✅ Campos preenchidos com valores do banco

**Status:** [ ] Passou [ ] Falhou

---

### Teste 2: Editar Email de Contato

**Objetivo:** Verificar se mudanças são salvas e aplicadas

**Passos:**

1. Ir para aba "Contato"
2. Alterar "Email de Contato" para `teste@ordax.com.br`
3. Clicar em "Salvar Alterações"
4. Aguardar confirmação
5. Abrir o footer do site em nova aba
6. Verificar se o email mudou

**Resultado Esperado:**

- ✅ Toast de sucesso aparece
- ✅ Email no footer é `teste@ordax.com.br`
- ✅ Mudança persiste após refresh

**Status:** [ ] Passou [ ] Falhou

---

### Teste 3: Editar Preços

**Objetivo:** Verificar se preços são atualizados em tempo real

**Passos:**

1. Ir para aba "Preços"
2. Alterar "Preço Padrão Cartão" para `600`
3. Alterar "Preço Padrão PIX" para `570`
4. Clicar em "Salvar Alterações"
5. Abrir `/planos` em nova aba
6. Verificar se os preços mudaram

**Resultado Esperado:**

- ✅ Toast de sucesso aparece
- ✅ Preços na página de planos são R$ 600 e R$ 570
- ✅ Cálculos de parcelamento atualizados

**Status:** [ ] Passou [ ] Falhou

---

### Teste 4: Validação de Email

**Objetivo:** Verificar se validações funcionam

**Passos:**

1. Ir para aba "Contato"
2. Alterar "Email de Contato" para `email-invalido`
3. Tentar salvar

**Resultado Esperado:**

- ✅ Erro de validação aparece
- ✅ Não permite salvar
- ✅ Mensagem clara de erro

**Status:** [ ] Passou [ ] Falhou

---

### Teste 5: Validação de URL

**Objetivo:** Verificar validação de URLs

**Passos:**

1. Ir para aba "Website"
2. Alterar "URL do Site" para `ordax.com.br` (sem https://)
3. Tentar salvar

**Resultado Esperado:**

- ✅ Erro de validação aparece
- ✅ Não permite salvar
- ✅ Mensagem indica que URL deve começar com http:// ou https://

**Status:** [ ] Passou [ ] Falhou

---

### Teste 6: Validação de Valores Numéricos

**Objetivo:** Verificar validação de números

**Passos:**

1. Ir para aba "Preços"
2. Alterar "Preço Padrão Cartão" para `-100`
3. Tentar salvar

**Resultado Esperado:**

- ✅ Erro de validação aparece
- ✅ Não permite salvar
- ✅ Mensagem indica que valor deve ser positivo

**Status:** [ ] Passou [ ] Falhou

---

### Teste 7: Descartar Alterações

**Objetivo:** Verificar se descartar funciona

**Passos:**

1. Ir para aba "Empresa"
2. Alterar "Nome da Empresa" para `Teste`
3. Clicar em "Descartar"
4. Verificar se o valor volta ao original

**Resultado Esperado:**

- ✅ Toast de confirmação aparece
- ✅ Valor volta ao original
- ✅ Botão "Salvar" desaparece

**Status:** [ ] Passou [ ] Falhou

---

### Teste 8: Múltiplas Alterações

**Objetivo:** Verificar se múltiplas mudanças são salvas juntas

**Passos:**

1. Ir para aba "Empresa"
2. Alterar "Nome da Empresa"
3. Ir para aba "Contato"
4. Alterar "Email de Contato"
5. Ir para aba "Preços"
6. Alterar "Preço Padrão Cartão"
7. Clicar em "Salvar Alterações"

**Resultado Esperado:**

- ✅ Toast indica "3 configuração(ões) modificada(s)"
- ✅ Todas as 3 mudanças são salvas
- ✅ Mudanças aparecem no site

**Status:** [ ] Passou [ ] Falhou

---

### Teste 9: Cache e Performance

**Objetivo:** Verificar se cache funciona

**Passos:**

1. Abrir DevTools → Network
2. Acessar `/planos`
3. Verificar requisição para `system_settings_grouped`
4. Fazer refresh da página
5. Verificar se usa cache (304 ou cache hit)

**Resultado Esperado:**

- ✅ Primeira requisição busca do banco
- ✅ Segunda requisição usa cache
- ✅ Página carrega rápido

**Status:** [ ] Passou [ ] Falhou

---

### Teste 10: Fallback para Valores Padrão

**Objetivo:** Verificar se fallback funciona quando banco falha

**Passos:**

1. Parar o Supabase temporariamente
2. Acessar `/planos`
3. Verificar se usa valores padrão do `constants.ts`

**Resultado Esperado:**

- ✅ Página carrega normalmente
- ✅ Usa valores padrão (500, 475, etc)
- ✅ Console mostra warning sobre fallback

**Status:** [ ] Passou [ ] Falhou

---

## 🔍 Testes de Integração

### Teste 11: Privacy Page

**Objetivo:** Verificar se emails dinâmicos aparecem

**Passos:**

1. Alterar emails na aba "Contato"
2. Salvar
3. Acessar `/privacidade`
4. Verificar se emails atualizados aparecem

**Resultado Esperado:**

- ✅ Email de privacidade correto
- ✅ Email do DPO correto
- ✅ Mudanças instantâneas

**Status:** [ ] Passou [ ] Falhou

---

### Teste 12: Terms Page

**Objetivo:** Verificar se dados da empresa aparecem

**Passos:**

1. Alterar "Nome da Empresa" e "Email de Contato"
2. Salvar
3. Acessar `/termos`
4. Verificar se dados atualizados aparecem

**Resultado Esperado:**

- ✅ Nome da empresa correto
- ✅ Email de contato correto
- ✅ Copyright com nome correto

**Status:** [ ] Passou [ ] Falhou

---

### Teste 13: Plans Page

**Objetivo:** Verificar se preços e parcelamento funcionam

**Passos:**

1. Alterar preços e parcelamento
2. Salvar
3. Acessar `/planos`
4. Verificar se valores estão corretos

**Resultado Esperado:**

- ✅ Preços atualizados
- ✅ Parcelamento correto (ex: "6x sem juros")
- ✅ Cálculos corretos

**Status:** [ ] Passou [ ] Falhou

---

### Teste 14: Footer

**Objetivo:** Verificar se email no footer é dinâmico

**Passos:**

1. Alterar "Email de Contato"
2. Salvar
3. Verificar footer em qualquer página

**Resultado Esperado:**

- ✅ Email atualizado no footer
- ✅ Link mailto correto
- ✅ Mudança em todas as páginas

**Status:** [ ] Passou [ ] Falhou

---

## 🚨 Testes de Segurança

### Teste 15: Acesso Não-Admin

**Objetivo:** Verificar se apenas admin pode acessar

**Passos:**

1. Fazer logout
2. Login como usuário normal (não-admin)
3. Tentar acessar `/admin/configuracoes`

**Resultado Esperado:**

- ✅ Redirecionado para login ou home
- ✅ Mensagem de acesso negado
- ✅ Não consegue ver interface

**Status:** [ ] Passou [ ] Falhou

---

### Teste 16: SQL Injection

**Objetivo:** Verificar proteção contra SQL injection

**Passos:**

1. Tentar inserir `'; DROP TABLE system_settings; --` em um campo
2. Salvar

**Resultado Esperado:**

- ✅ Valor é escapado corretamente
- ✅ Tabela não é afetada
- ✅ Validação bloqueia caracteres perigosos

**Status:** [ ] Passou [ ] Falhou

---

### Teste 17: XSS Protection

**Objetivo:** Verificar proteção contra XSS

**Passos:**

1. Tentar inserir `<script>alert('XSS')</script>` em um campo
2. Salvar
3. Verificar se script é executado

**Resultado Esperado:**

- ✅ Script não é executado
- ✅ Valor é escapado/sanitizado
- ✅ Página segura

**Status:** [ ] Passou [ ] Falhou

---

## 📊 Resumo dos Testes

### Funcionalidade

- [ ] Teste 1: Acessar Interface
- [ ] Teste 2: Editar Email
- [ ] Teste 3: Editar Preços
- [ ] Teste 4: Validação Email
- [ ] Teste 5: Validação URL
- [ ] Teste 6: Validação Números
- [ ] Teste 7: Descartar Alterações
- [ ] Teste 8: Múltiplas Alterações
- [ ] Teste 9: Cache
- [ ] Teste 10: Fallback

### Integração

- [ ] Teste 11: Privacy Page
- [ ] Teste 12: Terms Page
- [ ] Teste 13: Plans Page
- [ ] Teste 14: Footer

### Segurança

- [ ] Teste 15: Acesso Não-Admin
- [ ] Teste 16: SQL Injection
- [ ] Teste 17: XSS Protection

### Resultado Final

- **Total de Testes:** 17
- **Passou:** \_\_\_
- **Falhou:** \_\_\_
- **Taxa de Sucesso:** \_\_\_%

## 🐛 Bugs Encontrados

### Bug #1

**Descrição:**  
**Severidade:** [ ] Crítico [ ] Alto [ ] Médio [ ] Baixo  
**Passos para Reproduzir:**  
**Resultado Esperado:**  
**Resultado Atual:**  
**Status:** [ ] Aberto [ ] Em Progresso [ ] Resolvido

### Bug #2

**Descrição:**  
**Severidade:** [ ] Crítico [ ] Alto [ ] Médio [ ] Baixo  
**Passos para Reproduzir:**  
**Resultado Esperado:**  
**Resultado Atual:**  
**Status:** [ ] Aberto [ ] Em Progresso [ ] Resolvido

## ✅ Checklist Final

Antes de considerar pronto para produção:

- [ ] Todos os testes funcionais passaram
- [ ] Todos os testes de integração passaram
- [ ] Todos os testes de segurança passaram
- [ ] Sem bugs críticos ou altos
- [ ] Performance aceitável (< 2s para carregar)
- [ ] Cache funcionando corretamente
- [ ] Validações funcionando
- [ ] Fallback funcionando
- [ ] Documentação completa
- [ ] Equipe treinada

## 🚀 Aprovação para Produção

**Testado por:** ******\_\_\_******  
**Data:** **_/_**/**\_\_**  
**Aprovado:** [ ] Sim [ ] Não  
**Observações:**

---

**Próximo Passo:** Aplicar migration em produção e monitorar
