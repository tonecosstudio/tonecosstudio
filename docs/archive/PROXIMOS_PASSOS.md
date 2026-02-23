# 🚀 Próximos Passos - Ordax

## 📊 Status Atual

✅ **Área Admin:** 100% completa (7 páginas)  
✅ **Banco de Dados:** Migrations aplicadas  
✅ **Edge Functions:** 6 functions deployadas  
✅ **Frontend:** Todas as páginas implementadas  
✅ **Autenticação:** Google OAuth configurado  

---

## 🎯 Próximos Passos Recomendados

### 1️⃣ **TESTAR O SISTEMA** (Prioridade Alta)

#### A. Iniciar o Servidor
```bash
npm run dev
```

#### B. Testar Login
1. Acesse: http://localhost:5173/login
2. Clique em "Continuar com Google"
3. Faça login com sua conta Google
4. Verifique se foi redirecionado de volta

#### C. Tornar-se Admin
Após fazer login, você precisa se promover a admin:

**Opção 1: Via Interface (Recomendado)**
1. Acesse qualquer página admin (ex: http://localhost:5173/admin)
2. Clique no botão "Tornar-me admin inicial"
3. Pronto! Você é admin agora

**Opção 2: Via SQL**
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
2. Execute:
```sql
-- Pegue seu user_id primeiro
SELECT id, email FROM auth.users;

-- Depois insira a role (substitua 'SEU-USER-ID')
INSERT INTO user_roles (user_id, role)
VALUES ('SEU-USER-ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

#### D. Testar Funcionalidades Admin
Acesse: http://localhost:5173/admin

Teste cada página:
- [ ] Upload massivo de imagens
- [ ] Modo esteira (classificação)
- [ ] Gerenciar modelos
- [ ] Gerenciar franquias
- [ ] Gerenciar usuários
- [ ] Ver orçamentos

---

### 2️⃣ **POPULAR O CATÁLOGO** (Prioridade Alta)

#### A. Fazer Upload de Imagens
1. Acesse: http://localhost:5173/admin/upload
2. Selecione até 2000 imagens (ou uma pasta)
3. Clique em "Enviar"
4. Aguarde o processamento

#### B. Classificar Imagens
1. Acesse: http://localhost:5173/admin/esteira
2. Para cada imagem:
   - Digite o nome do modelo
   - A IA sugere franquia/categoria/tags
   - Pressione ENTER para confirmar
   - Ou SHIFT+ENTER para pular
   - Ou ESC para revisar depois

#### C. Verificar Catálogo
1. Acesse: http://localhost:5173/
2. Veja os modelos no catálogo
3. Teste a busca
4. Teste solicitar orçamento

---

### 3️⃣ **CONFIGURAR FRANQUIAS** (Prioridade Média)

#### A. Adicionar Franquias Comuns
Acesse: http://localhost:5173/admin/franquias

Adicione franquias populares:
- Marvel
- DC Comics
- Star Wars
- Harry Potter
- Dragon Ball
- Naruto
- One Piece
- Pokemon
- etc.

#### B. Criar Regras Automáticas
Crie regras para classificação automática:

Exemplos:
- Padrão: "batman" → Franquia: "DC Comics"
- Padrão: "homem aranha" → Franquia: "Marvel"
- Padrão: "naruto" → Franquia: "Naruto"
- Padrão: "goku" → Franquia: "Dragon Ball"

Isso acelera muito a classificação no modo esteira!

---

### 4️⃣ **TESTAR FLUXO COMPLETO** (Prioridade Média)

#### A. Como Cliente
1. Faça logout
2. Faça login com outra conta Google
3. Navegue pelo catálogo
4. Adicione modelos ao carrinho
5. Solicite um orçamento
6. Preencha prazo e observações
7. Envie o pedido

#### B. Como Admin
1. Faça login com sua conta admin
2. Acesse: http://localhost:5173/admin/orcamentos
3. Veja o pedido que você criou
4. Altere o status para "reviewing"
5. Depois para "answered"

---

### 5️⃣ **OTIMIZAÇÕES E MELHORIAS** (Prioridade Baixa)

#### A. Performance
- [ ] Adicionar índices adicionais no banco
- [ ] Implementar cache de imagens
- [ ] Otimizar queries pesadas
- [ ] Lazy loading de componentes

#### B. SEO
- [ ] Adicionar sitemap.xml dinâmico
- [ ] Melhorar meta tags
- [ ] Adicionar structured data (JSON-LD)
- [ ] Otimizar imagens para web

#### C. UX
- [ ] Adicionar loading skeletons
- [ ] Melhorar feedback visual
- [ ] Adicionar animações suaves
- [ ] Implementar infinite scroll

#### D. Funcionalidades Extras
- [ ] Sistema de notificações
- [ ] Email automático para novos pedidos
- [ ] Dashboard com analytics
- [ ] Exportar pedidos para CSV
- [ ] Sistema de comentários nos pedidos
- [ ] Histórico de ações admin

---

### 6️⃣ **DEPLOY EM PRODUÇÃO** (Quando estiver pronto)

#### A. Preparar para Deploy
```bash
# Build do projeto
npm run build

# Testar build localmente
npm run preview
```

#### B. Deploy no Vercel (Recomendado)
1. Crie conta no Vercel: https://vercel.com
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático!

#### C. Configurar Domínio
1. Adicione seu domínio no Vercel
2. Configure DNS
3. Atualize redirect URIs no Google OAuth:
   - Adicione: `https://seu-dominio.com`
   - Adicione: `https://pabxpvqwtvbjaunjejud.supabase.co/auth/v1/callback`

#### D. Testar em Produção
- [ ] Login funciona
- [ ] Admin funciona
- [ ] Upload funciona
- [ ] Catálogo carrega
- [ ] Orçamentos funcionam

---

## 🐛 Troubleshooting

### Problema: Login com Google não funciona
**Solução:**
1. Verifique se o Google OAuth está ativado no Supabase
2. Verifique se a redirect URI está correta no Google Cloud Console
3. Limpe o cache do navegador
4. Tente em modo anônimo

### Problema: Não consigo me tornar admin
**Solução:**
1. Use a opção SQL no dashboard do Supabase
2. Ou use a Edge Function `bootstrap-admin`
3. Verifique se a tabela `user_roles` existe

### Problema: Upload não funciona
**Solução:**
1. Verifique se você é admin
2. Verifique se o bucket `product-images` existe
3. Verifique as políticas de storage
4. Veja os logs no console do navegador

### Problema: IA não classifica
**Solução:**
1. Verifique se a OpenAI API Key está configurada
2. Veja os logs da Edge Function: `supabase functions logs classify-name`
3. Verifique se tem créditos na OpenAI
4. Teste a function diretamente via curl

---

## 📚 Documentação Útil

### Supabase
- Dashboard: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
- Docs: https://supabase.com/docs

### Google OAuth
- Console: https://console.cloud.google.com/apis/credentials
- Docs: https://developers.google.com/identity/protocols/oauth2

### OpenAI
- Dashboard: https://platform.openai.com
- Usage: https://platform.openai.com/usage
- Docs: https://platform.openai.com/docs

---

## ✅ Checklist Rápido

### Antes de Usar:
- [ ] Servidor rodando (`npm run dev`)
- [ ] Login com Google funcionando
- [ ] Você é admin
- [ ] Pelo menos 1 franquia cadastrada

### Para Popular:
- [ ] Upload de imagens feito
- [ ] Imagens classificadas no modo esteira
- [ ] Modelos aparecem no catálogo

### Para Testar:
- [ ] Fluxo de cliente testado
- [ ] Fluxo de admin testado
- [ ] Orçamentos funcionando

### Para Produção:
- [ ] Build funcionando
- [ ] Deploy feito
- [ ] Domínio configurado
- [ ] Tudo testado em produção

---

## 🎯 Recomendação

**Comece por aqui:**

1. ✅ Inicie o servidor: `npm run dev`
2. ✅ Faça login com Google
3. ✅ Torne-se admin
4. ✅ Adicione 3-5 franquias comuns
5. ✅ Faça upload de 10-20 imagens de teste
6. ✅ Classifique no modo esteira
7. ✅ Veja o catálogo funcionando
8. ✅ Teste solicitar um orçamento

Depois disso, você terá uma visão completa do sistema funcionando! 🚀

---

**Dúvidas?** Me chame que eu te ajudo! 😊
