# Instruções para Testar o Sistema de Chat

## 🚀 Pré-requisitos

1. **Servidor rodando:** `npm run dev`
2. **Migrações aplicadas:** `supabase db push --include-all`
3. **Dados de teste:** Executar `seed-chat-data.sql`

## 🔧 Passos para Testar

### 1. Limpar Cache do Navegador
```
Ctrl + Shift + Delete → Desde o início → Imagens e arquivos em cache → Limpar dados
```

### 2. Acessar Interface Admin
```
http://localhost:8080/admin/support
```

### 3. Testar Funcionalidades

#### Dashboard de Métricas
- [ ] Total de conversas abertas
- [ ] Conversas aguardando admin
- [ ] Conversas aguardando cliente
- [ ] Conversas resolvidas hoje
- [ ] SLA: Tempo médio de primeira resposta
- [ ] SLA: Conversas com mais de 24h sem resposta

#### Lista de Conversas
- [ ] 5 conversas de teste aparecem
- [ ] Ordenadas por última mensagem
- [ ] Badges de status (waiting_admin, waiting_customer, resolved)
- [ ] Tags coloridas
- [ ] Contador de mensagens não lidas

#### Chat
- [ ] Clicar em uma conversa abre o chat
- [ ] Mensagens são carregadas
- [ ] Mensagens de cliente (esquerda, cinza)
- [ ] Mensagens de admin (direita, azul)
- [ ] Notas internas (fundo amarelo, ícone cadeado)
- [ ] Auto-scroll para última mensagem

#### Envio de Mensagens
- [ ] Campo de texto funciona
- [ ] Enter envia mensagem
- [ ] Shift+Enter quebra linha
- [ ] Mensagem vazia não pode ser enviada
- [ ] Mensagem aparece imediatamente

#### Notas Internas
- [ ] Toggle "Nota interna" funciona
- [ ] Nota interna com fundo amarelo
- [ ] Ícone de cadeado
- [ ] Botão de editar (dentro de 5 minutos)
- [ ] Botão de deletar funciona

#### Quick Replies
- [ ] Botão abre selector
- [ ] Respostas rápidas por categoria
- [ ] Clicar insere texto no campo
- [ ] Texto pode ser editado

#### CustomerSidebar
- [ ] Botão de toggle funciona
- [ ] Seção "Pedidos" carrega dados
- [ ] Seção "Orçamentos" carrega dados
- [ ] Seção "Assinatura" carrega dados
- [ ] Seção "Pagamentos" carrega dados

### 4. Testar Interface Cliente

#### Chat Flutuante
```
http://localhost:8080
```
- [ ] Ícone de chat no canto inferior direito
- [ ] Badge de unread_count (se houver)
- [ ] Clicar abre chat
- [ ] Conversas do usuário aparecem

#### Formulário de Contato
```
http://localhost:8080/contato
```
- [ ] Formulário aparece
- [ ] Campos obrigatórios validados
- [ ] Submeter cria conversa
- [ ] Tag 'duvida' aplicada automaticamente
- [ ] Redirecionamento para chat

### 5. Testar Realtime

#### Duas Abas
1. Aba 1: Admin em `/admin/support`
2. Aba 2: Cliente em `/`
3. Selecionar mesma conversa em ambas
4. Enviar mensagem da aba 1
5. Mensagem aparece na aba 2 em tempo real
6. Enviar mensagem da aba 2
7. Mensagem aparece na aba 1 em tempo real

#### Reconexão
1. Abrir chat
2. Desconectar internet
3. Indicador "desconectado" aparece
4. Reconectar internet
5. Reconexão automática funciona
6. Mensagens são sincronizadas

## 🐛 Problemas Comuns e Soluções

### 1. Erro de Query com auth.users
**Solução:** Limpar cache do navegador e recarregar página

### 2. Chat vazio
**Solução:** Executar `seed-chat-data.sql` no Supabase Dashboard

### 3. Erro de markAsRead
**Solução:** Já corrigido no código atual

### 4. Interface não carrega
**Solução:** Verificar se servidor está rodando e migrações aplicadas

## 📊 Checklist de Testes

Executar todos os ~150 testes do `CHECKLIST_TESTES_CHAT.md`

## ✅ Critérios de Aprovação

- [ ] Todos os testes críticos passaram
- [ ] Bugs críticos corrigidos
- [ ] Sistema estável e responsivo
- [ ] Realtime funcionando
- [ ] Segurança validada

## 🚀 Próximos Passos após Testes

1. **Deploy em staging**
2. **Testes de carga**
3. **Deploy em produção**
4. **Monitoramento**

---

**Data:** 2026-02-21
**Status:** ✅ Pronto para testes
**Responsável:** _______________