# 🧪 Como Testar as Funcionalidades Críticas do Chat

## Data: 22 de fevereiro de 2026

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

1. ✅ Botão de Atualizar Status de Pedido (já estava implementado)
2. ✅ Botão Flutuante de Chat para Cliente (implementado agora)
3. ✅ Formulário de Contato Público (já estava implementado)

---

## 🧪 TESTES PASSO A PASSO

### 1. Testar Botão de Atualizar Status de Pedido

**Objetivo:** Verificar que admin pode atualizar status de pedido e mensagem automática é enviada ao cliente

**Passos:**

1. **Fazer login como admin**
   ```
   Ir para: http://localhost:8080/login
   Usar credenciais de admin
   ```

2. **Ir para página de suporte**
   ```
   Ir para: http://localhost:8080/admin/suporte
   ```

3. **Selecionar uma conversa**
   - Clicar em qualquer conversa da lista
   - Ou usar a visualização agrupada por cliente

4. **Abrir sidebar do cliente**
   - Clicar no nome do usuário no topo do chat
   - Ou clicar no botão de sidebar (ícone de painel)

5. **Atualizar status de um pedido**
   - Na seção "Pedidos", clicar no ícone de editar (lápis)
   - Selecionar novo status (ex: "Enviado")
   - Se status = "Enviado" ou "Entregue", adicionar código de rastreamento
   - Clicar em "Atualizar Status"

6. **Verificar mensagem automática**
   - Voltar para o chat
   - Verificar que uma mensagem automática foi enviada
   - Mensagem deve conter:
     - Número do pedido
     - Novo status
     - Código de rastreamento (se aplicável)

**Resultado Esperado:**
- ✅ Modal de atualização abre corretamente
- ✅ Status é atualizado no banco
- ✅ Mensagem automática aparece no chat
- ✅ Cliente recebe notificação (se implementado email)

---

### 2. Testar Botão Flutuante de Chat para Cliente

**Objetivo:** Verificar que cliente vê botão flutuante e pode abrir chat

**Passos:**

1. **Fazer login como cliente (não admin)**
   ```
   Ir para: http://localhost:8080/login
   Usar credenciais de cliente normal
   ```

2. **Navegar para qualquer página**
   ```
   Exemplos:
   - http://localhost:8080/ (home)
   - http://localhost:8080/catalogo
   - http://localhost:8080/perfil
   - http://localhost:8080/colecoes
   ```

3. **Verificar botão flutuante**
   - Verificar que há um botão azul no canto inferior direito
   - Botão deve ter ícone de mensagem (MessageSquare)
   - Se houver mensagens não lidas, deve ter badge vermelho com número

4. **Clicar no botão**
   - Modal de chat deve abrir
   - Deve mostrar histórico de conversas (se houver)
   - Deve permitir enviar mensagens

5. **Enviar uma mensagem**
   - Digitar mensagem no campo de texto
   - Clicar em enviar ou pressionar Enter
   - Mensagem deve aparecer no chat

6. **Fechar e reabrir**
   - Fechar modal (X ou clicar fora)
   - Botão flutuante deve reaparecer
   - Reabrir e verificar que mensagem está lá

7. **Verificar contador de não lidas**
   - Pedir para admin enviar mensagem
   - Verificar que badge atualiza em tempo real
   - Abrir chat e verificar que contador zera

**Resultado Esperado:**
- ✅ Botão flutuante visível em todas as páginas
- ✅ Badge com contador de não lidas funciona
- ✅ Modal abre e fecha corretamente
- ✅ Chat funciona normalmente
- ✅ Contador atualiza em tempo real

---

### 3. Testar Formulário de Contato Público

**Objetivo:** Verificar que visitante pode entrar em contato e conversa é criada

**Passos:**

1. **Fazer logout (ou usar navegação anônima)**
   ```
   Fazer logout se estiver logado
   Ou abrir janela anônima
   ```

2. **Ir para página de contato**
   ```
   Ir para: http://localhost:8080/contato
   ```

3. **Preencher formulário**
   - Nome: "João Silva"
   - Email: "joao@example.com"
   - Mensagem: "Gostaria de saber mais sobre os produtos"

4. **Clicar em "Enviar Mensagem"**
   - Deve redirecionar para login
   - URL deve ter `?returnTo=/contato`

5. **Fazer login**
   - Fazer login com conta existente
   - Ou criar nova conta

6. **Verificar redirecionamento**
   - Após login, deve voltar para /contato
   - Ou redirecionar para /suporte se conversa foi criada

7. **Verificar conversa criada**
   - Ir para /suporte (ou já estar lá)
   - Verificar que conversa foi criada
   - Conversa deve ter:
     - Subject: "Contato: João Silva"
     - Tag: "duvida"
     - Primeira mensagem com o texto enviado

8. **Verificar no admin**
   - Fazer login como admin
   - Ir para /admin/suporte
   - Verificar que conversa aparece na lista
   - Verificar tag "duvida"

**Resultado Esperado:**
- ✅ Formulário valida campos obrigatórios
- ✅ Redireciona para login se não autenticado
- ✅ Conversa é criada após login
- ✅ Tag "duvida" é aplicada automaticamente
- ✅ Admin vê a conversa na lista

---

## 🔍 TESTES ADICIONAIS

### Teste de Realtime

**Objetivo:** Verificar que mensagens aparecem em tempo real

**Passos:**

1. Abrir 2 navegadores (ou janelas anônimas)
2. Em um, fazer login como admin
3. Em outro, fazer login como cliente
4. Abrir mesma conversa nos dois
5. Enviar mensagem de um lado
6. Verificar que aparece do outro lado em tempo real

**Resultado Esperado:**
- ✅ Mensagens aparecem instantaneamente
- ✅ Contador de não lidas atualiza
- ✅ Status da conversa atualiza

---

### Teste de Anexos

**Objetivo:** Verificar que anexos funcionam

**Passos:**

1. Abrir chat (admin ou cliente)
2. Clicar no botão de anexo
3. Selecionar imagem (JPEG ou PNG)
4. Enviar mensagem
5. Verificar que thumbnail aparece
6. Clicar no thumbnail para ver imagem completa

**Resultado Esperado:**
- ✅ Upload funciona
- ✅ Thumbnail aparece
- ✅ Imagem pode ser visualizada
- ✅ Download funciona

---

### Teste de Notas Internas

**Objetivo:** Verificar que notas internas são visíveis apenas para admin

**Passos:**

1. Fazer login como admin
2. Abrir conversa
3. Marcar checkbox "Nota Interna"
4. Enviar mensagem
5. Verificar que mensagem tem fundo amarelo
6. Fazer login como cliente
7. Abrir mesma conversa
8. Verificar que nota interna NÃO aparece

**Resultado Esperado:**
- ✅ Admin vê nota interna com fundo amarelo
- ✅ Cliente NÃO vê nota interna
- ✅ Ícone de cadeado aparece na nota

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: Botão flutuante não aparece

**Possíveis causas:**
- Usuário não está autenticado
- Erro no componente ChatButton

**Solução:**
1. Verificar se está logado
2. Abrir console do navegador (F12)
3. Verificar erros no console
4. Verificar se `useAuth()` retorna usuário

---

### Problema: Contador de não lidas não atualiza

**Possíveis causas:**
- Realtime não está funcionando
- Erro na query de mensagens

**Solução:**
1. Verificar console do navegador
2. Verificar se Realtime está habilitado no Supabase
3. Verificar se tabelas têm Realtime habilitado
4. Recarregar página

---

### Problema: Mensagem automática não é enviada

**Possíveis causas:**
- Trigger não está funcionando
- Erro no template de mensagem

**Solução:**
1. Verificar se trigger existe no banco
2. Verificar logs do Supabase
3. Verificar se tabela `order_status_templates` tem dados
4. Executar migration novamente se necessário

---

## 📊 CHECKLIST DE TESTES

### Funcionalidade 1: Atualizar Status de Pedido
- [ ] Modal abre corretamente
- [ ] Campos são preenchidos com valores atuais
- [ ] Status pode ser alterado
- [ ] Código de rastreamento pode ser adicionado
- [ ] Mensagem automática é enviada
- [ ] Mensagem contém informações corretas

### Funcionalidade 2: Botão Flutuante de Chat
- [ ] Botão aparece em todas as páginas
- [ ] Botão só aparece para usuários autenticados
- [ ] Badge com contador funciona
- [ ] Modal abre ao clicar
- [ ] Chat funciona normalmente
- [ ] Contador atualiza em tempo real
- [ ] Botão esconde quando modal está aberto

### Funcionalidade 3: Formulário de Contato
- [ ] Página /contato é acessível
- [ ] Formulário valida campos
- [ ] Redireciona para login se não autenticado
- [ ] Conversa é criada após login
- [ ] Tag "duvida" é aplicada
- [ ] Admin vê conversa na lista

---

## 🎉 CONCLUSÃO

Se todos os testes passarem, o sistema de chat está **100% funcional e operacional**!

**Próximos passos opcionais:**
1. Implementar estágios de produção interna
2. Implementar notificações por email
3. Implementar resolução automática de conversas
4. Implementar busca avançada

**Mas o MVP está pronto para produção!** 🚀
