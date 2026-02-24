# 🧭 Guia Rápido de Navegação - Documentação Ordax

**Última atualização**: 2026-02-24

---

## 🎯 Encontre o que Precisa em 30 Segundos

### "Sou novo no projeto"
→ **[docs/getting-started.md](docs/getting-started.md)** (15 min)

### "Preciso fazer deploy"
→ **[docs/deployment.md](docs/deployment.md)** (1h 20min)

### "Como funciona o sistema de chat?"
→ **[docs/features/chat-system.md](docs/features/chat-system.md)**

### "Como funcionam os pagamentos?"
→ **[docs/features/payment-system.md](docs/features/payment-system.md)**

### "Como funcionam as assinaturas?"
→ **[docs/features/subscription-system.md](docs/features/subscription-system.md)**

### "Como funciona o sistema de coleções?"
→ **[docs/features/collections-system.md](docs/features/collections-system.md)**

### "Quais funcionalidades tem o admin?"
→ **[docs/features/admin-panel.md](docs/features/admin-panel.md)**

### "Qual a arquitetura do sistema?"
→ **[docs/architecture.md](docs/architecture.md)** (20 min)

### "O que mudou no projeto?"
→ **[CHANGELOG.md](CHANGELOG.md)**

### "Onde está tudo?"
→ **[docs/README.md](docs/README.md)** (índice completo)

---

## 📚 Documentação por Persona

### 👨‍💻 Desenvolvedor Novo

**Dia 1** (1h):
1. [docs/getting-started.md](docs/getting-started.md) - Setup
2. [docs/architecture.md](docs/architecture.md) - Entender sistema
3. Explorar código

**Semana 1** (conforme necessidade):
- [docs/features/](docs/features/) - Funcionalidades
- [CHANGELOG.md](CHANGELOG.md) - Histórico
- Código-fonte

### 🚀 DevOps / Deploy

**Antes do Deploy**:
1. [docs/deployment.md](docs/deployment.md) - Checklist completo
2. [docs/architecture.md](docs/architecture.md) - Entender infraestrutura

**Durante Deploy**:
- Seguir [docs/deployment.md](docs/deployment.md) passo a passo

**Após Deploy**:
- Validação em [docs/deployment.md](docs/deployment.md)

### 👨‍💼 Product Owner / Gestor

**Visão Geral**:
1. [README.md](README.md) - Status do projeto
2. [CHANGELOG.md](CHANGELOG.md) - O que foi feito
3. [docs/features/](docs/features/) - Funcionalidades

**Planejamento**:
- [docs/architecture.md](docs/architecture.md) - Capacidades técnicas
- [docs/features/](docs/features/) - Features disponíveis

### 🧪 QA / Tester

**Testes**:
1. [docs/features/](docs/features/) - Como cada sistema funciona
2. [docs/deployment.md](docs/deployment.md) - Validação pós-deploy

---

## 🗂️ Estrutura Completa

```
📁 Raiz
├── 📄 README.md ⭐ Comece aqui
├── 📄 CHANGELOG.md - Histórico
├── 📄 GUIA_NAVEGACAO_DOCS.md - Este arquivo
├── 📄 PLANO_REORGANIZACAO_DOCS.md - Plano
├── 📄 REORGANIZACAO_DOCS_COMPLETA.md - Progresso
└── 📄 RESUMO_REORGANIZACAO_FINAL.md - Resumo

📁 docs/
├── 📄 README.md ⭐ Índice completo
├── 📄 getting-started.md ⭐ Quick start
├── 📄 architecture.md ⭐ Arquitetura
├── 📄 deployment.md ⭐ Deploy
│
├── 📁 features/ ⭐ Funcionalidades
│   ├── 📄 chat-system.md
│   ├── 📄 payment-system.md
│   ├── 📄 subscription-system.md
│   ├── 📄 collections-system.md
│   └── 📄 admin-panel.md
│
├── 📁 api/ (em breve)
│   ├── 📄 edge-functions.md
│   ├── 📄 database-schema.md
│   └── 📄 realtime.md
│
├── 📁 development/ (em breve)
│   ├── 📄 setup.md
│   ├── 📄 testing.md
│   ├── 📄 code-style.md
│   └── 📄 troubleshooting.md
│
├── 📁 tecnico/ (mantido)
└── 📁 historico/ (mantido)
```

---

## ⏱️ Tempo de Leitura

| Documento | Tempo | Quando Ler |
|-----------|-------|------------|
| README.md | 5 min | Primeiro contato |
| docs/README.md | 5 min | Navegar docs |
| getting-started.md | 15 min | Setup inicial |
| architecture.md | 20 min | Entender sistema |
| deployment.md | 1h 20min | Antes de deploy |
| chat-system.md | 30 min | Trabalhar com chat |
| payment-system.md | 30 min | Trabalhar com pagamentos |
| subscription-system.md | 20 min | Trabalhar com assinaturas |
| collections-system.md | 20 min | Trabalhar com coleções |
| admin-panel.md | 30 min | Usar painel admin |
| CHANGELOG.md | 10 min | Ver histórico |

**Total para ler tudo**: ~4 horas

---

## 🔍 Busca Rápida por Tópico

### Autenticação
- [docs/architecture.md](docs/architecture.md) - Seção "Segurança"
- [docs/getting-started.md](docs/getting-started.md) - Seção "Criar Usuário Admin"

### Chat / Suporte
- [docs/features/chat-system.md](docs/features/chat-system.md) - Completo

### Pagamentos
- [docs/features/payment-system.md](docs/features/payment-system.md) - Completo

### Assinaturas
- [docs/features/subscription-system.md](docs/features/subscription-system.md) - Completo

### Coleções
- [docs/features/collections-system.md](docs/features/collections-system.md) - Completo

### Admin
- [docs/features/admin-panel.md](docs/features/admin-panel.md) - Completo

### Deploy
- [docs/deployment.md](docs/deployment.md) - Completo

### Banco de Dados
- [docs/architecture.md](docs/architecture.md) - Seção "Modelo de Dados"
- [docs/api/database-schema.md](docs/api/database-schema.md) - Em breve

### Real-time
- [docs/architecture.md](docs/architecture.md) - Seção "Real-time"
- [docs/features/chat-system.md](docs/features/chat-system.md) - Seção "Real-time"
- [docs/api/realtime.md](docs/api/realtime.md) - Em breve

### Edge Functions
- [docs/architecture.md](docs/architecture.md) - Seção "Backend Modules"
- [docs/api/edge-functions.md](docs/api/edge-functions.md) - Em breve

### Testes
- [docs/architecture.md](docs/architecture.md) - Seção "Testes"
- [docs/development/testing.md](docs/development/testing.md) - Em breve

### Performance
- [docs/architecture.md](docs/architecture.md) - Seção "Performance"

### Segurança
- [docs/architecture.md](docs/architecture.md) - Seção "Segurança"

---

## 💡 Dicas de Navegação

### Use o Índice
Sempre comece por [docs/README.md](docs/README.md) para ver o índice completo.

### Siga os Links
Os documentos têm links internos. Clique para navegar entre seções relacionadas.

### Busque no Arquivo
Use `Ctrl+F` (ou `Cmd+F` no Mac) para buscar dentro de um documento.

### Leia Sequencialmente
Para onboarding completo:
1. README.md
2. getting-started.md
3. architecture.md
4. features/ (conforme necessidade)

### Consulte Quando Necessário
Não precisa ler tudo de uma vez. Consulte conforme necessidade.

---

## 🆘 Não Encontrou?

### Documentação em Breve
Alguns documentos ainda serão criados:
- docs/api/ (Fase 2)
- docs/development/ (Fase 3)

### Documentação Antiga
Documentos antigos ainda estão na raiz (serão organizados na Fase 5).

### Código-Fonte
Se não encontrar na documentação, consulte o código:
- `src/` - Frontend
- `supabase/` - Backend

### Pergunte
Se ainda tiver dúvidas, pergunte à equipe!

---

## 📝 Contribuindo

### Encontrou Erro?
1. Anote o documento e seção
2. Descreva o erro
3. Sugira correção
4. Crie issue ou PR

### Quer Adicionar?
1. Identifique o gap
2. Escreva o conteúdo
3. Siga o padrão dos docs existentes
4. Crie PR

### Quer Melhorar?
1. Identifique o que pode melhorar
2. Sugira a melhoria
3. Implemente se possível
4. Crie PR

---

## 🎯 Próximas Adições

### Em Breve (Fase 2)
- docs/api/edge-functions.md
- docs/api/database-schema.md
- docs/api/realtime.md

### Depois (Fase 3)
- docs/development/setup.md
- docs/development/testing.md
- docs/development/code-style.md
- docs/development/troubleshooting.md

---

**Boa navegação! 🚀**

Se tiver dúvidas, comece por [docs/README.md](docs/README.md)
