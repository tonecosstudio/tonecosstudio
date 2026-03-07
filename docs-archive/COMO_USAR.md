# Como Usar o Sistema Ordax

## 🚀 Início Rápido

### 1. Verificar Status do Sistema
```bash
node scripts/system-status.mjs
```

Mostra um resumo completo do sistema:
- Coleções disponíveis
- Personagens por status
- Assinaturas ativas
- Deliveries por status
- Fila de produção
- Total de coins

### 2. Validar Integridade
```bash
node scripts/validate-system.mjs
```

Valida que:
- Todas as referências estão corretas
- Não há dados órfãos
- Integridade referencial está OK

### 3. Auditar Sistema
```bash
node scripts/audit-database-state.mjs
```

Auditoria detalhada mostrando:
- Coleções e personagens
- Assinaturas com coleções
- Transações de coins
- Personagens adquiridos
- Fila de produção

## 📊 Páginas Administrativas

### Dashboard Principal
```
http://localhost:8080/admin
```

### Fila de Produção
```
http://localhost:8080/admin/fila-producao
```

Mostra:
- Itens em produção
- Status de cada pedido
- Prioridades
- Filtros por status

### Gerenciamento de Assinaturas
```
http://localhost:8080/admin/assinaturas-gerenciar
```

Mostra:
- Lista de assinaturas
- Coleções ativas
- Saldo de coins
- Status de cada assinatura

## 🔑 Credenciais de Teste

Todos os usuários têm senha: `Senha123!`

| Email | Nome | Plano | Coins | Coleção |
|-------|------|-------|-------|---------|
| trimestral@ordax.com.br | João Trimestral | Trimestral | 600 | One Piece |
| semestral@ordax.com.br | Maria Semestral | Semestral | 1.300 | Dragon Ball Z |
| anual@ordax.com.br | Pedro Anual | Anual | 2.800 | Naruto |
| legacy@ordax.com.br | Ana Legacy | Legacy | 0 | Attack on Titan |

## 🛠️ Scripts Disponíveis

### Setup Completo
```bash
# Windows
.\scripts\setup-all.ps1

# Linux/Mac
bash scripts/setup-all.sh
```

Executa todos os passos:
1. Cria coleções
2. Cria personagens
3. Cria assinaturas
4. Cria deliveries
5. Popula fila de produção
6. Valida sistema
7. Mostra status

### Scripts Individuais

#### Criar Coleções
```bash
node scripts/seed-collections-with-type.mjs
```

#### Criar Personagens
```bash
node scripts/seed-characters.mjs
```

#### Criar Assinaturas
```bash
node scripts/create-mock-subscriptions.mjs
```

#### Criar Deliveries
```bash
node scripts/populate-production-queue-v2.mjs
```

#### Popular Fila de Produção
```bash
node scripts/populate-production-queue-final.mjs
```

#### Testar Query da Fila
```bash
node scripts/test-production-queue-query.mjs
```

## 📦 Estrutura de Dados

### Coleções (4)
- One Piece - Tripulação Mugiwara
- Dragon Ball Z - Guerreiros Z
- Naruto - Akatsuki
- Attack on Titan - Survey Corps

### Personagens (20)
- 5 por coleção
- 3 revelados + 2 upcoming por coleção

### Assinaturas (4)
- 1 Trimestral (600 coins)
- 1 Semestral (1.300 coins)
- 1 Anual (2.800 coins)
- 1 Legacy (0 coins)

### Deliveries (12)
- 3 por assinatura
- Status: delivered, in_production, scheduled

### Fila de Produção (12)
- 4 completed (entregues)
- 4 in_production (em produção)
- 4 awaiting_choice (aguardando escolha)

## 🔍 Troubleshooting

### Página vazia?
1. Verifique se o Supabase local está rodando:
   ```bash
   npx supabase status
   ```

2. Verifique se há dados:
   ```bash
   node scripts/system-status.mjs
   ```

3. Valide a integridade:
   ```bash
   node scripts/validate-system.mjs
   ```

### Dados inconsistentes?
Execute o setup completo novamente:
```bash
.\scripts\setup-all.ps1  # Windows
bash scripts/setup-all.sh  # Linux/Mac
```

### Erro de conexão?
Verifique as variáveis de ambiente:
- `VITE_SUPABASE_URL` deve ser `http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY` deve estar configurada

## 📝 Notas Importantes

1. **Ambiente Local**: Todos os dados estão no Supabase local
2. **Dados Mock**: Os usuários são apenas para teste
3. **Integridade**: Sistema validado 100% sem referências órfãs
4. **Profissional**: Sem gambiarras ou paliativos

## 🎯 Próximos Passos

1. Testar fluxo completo de assinatura
2. Testar escolha de personagens
3. Testar atualização de status na fila
4. Fazer push das migrations para produção quando estiver pronto

## 📚 Documentação Adicional

- `SISTEMA_CORRIGIDO.md` - Detalhes do que foi corrigido
- `scripts/` - Todos os scripts com comentários
- `supabase/migrations/` - Migrations do banco de dados
