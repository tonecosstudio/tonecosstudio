# Configuração do Prisma e PostgreSQL

Este documento descreve como configurar o banco de dados PostgreSQL com Prisma para o sistema de assinaturas com créditos.

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 14+ instalado e rodando
- npm ou yarn instalado

## Estrutura do Banco de Dados

O sistema utiliza 9 tabelas principais:

1. **users** - Usuários do sistema
2. **subscription_plans** - Planos de assinatura (Trimestral e Semestral)
3. **subscriptions** - Assinaturas ativas/inativas dos usuários
4. **user_credits** - Saldo de créditos por usuário
5. **credit_transactions** - Histórico de transações de créditos
6. **characters** - Catálogo de personagens
7. **production_cycles** - Ciclos de produção com capacidade limitada
8. **orders** - Pedidos de personagens
9. **order_items** - Itens individuais de cada pedido
10. **cycle_limits** - Limites de personagens por usuário por ciclo

## Passo a Passo de Configuração

### 1. Instalar Dependências

```bash
cd subscription-api
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure a URL do banco de dados:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/subscription_credit_system?schema=public"
```

**Importante:** Substitua `usuario`, `senha` e o nome do banco conforme sua configuração local.

### 3. Criar o Banco de Dados

Conecte-se ao PostgreSQL e crie o banco de dados:

```sql
CREATE DATABASE subscription_credit_system;
```

Ou via linha de comando:

```bash
createdb subscription_credit_system
```

### 4. Gerar o Prisma Client

```bash
npx prisma generate
```

Este comando gera o cliente TypeScript do Prisma baseado no schema.

### 5. Executar as Migrations

```bash
npx prisma migrate dev --name init
```

Este comando:
- Cria as tabelas no banco de dados
- Aplica todos os índices e constraints
- Gera uma migration inicial

### 6. Popular o Banco com Dados Iniciais (Seed)

```bash
npx prisma db seed
```

Este comando popula o banco com:
- 2 planos de assinatura (Trimestral e Semestral)
- 5 personagens de exemplo (3 da coleção padrão, 1 regular, 1 exclusivo)
- 1 ciclo de produção inicial
- Limites de personagens por ciclo

## Comandos Úteis do Prisma

### Visualizar o Banco de Dados (Prisma Studio)

```bash
npx prisma studio
```

Abre uma interface web em `http://localhost:5555` para visualizar e editar dados.

### Resetar o Banco de Dados

```bash
npx prisma migrate reset
```

**Atenção:** Este comando apaga todos os dados e recria o banco do zero.

### Criar uma Nova Migration

Após alterar o `schema.prisma`:

```bash
npx prisma migrate dev --name nome_da_migration
```

### Aplicar Migrations em Produção

```bash
npx prisma migrate deploy
```

### Validar o Schema

```bash
npx prisma validate
```

### Formatar o Schema

```bash
npx prisma format
```

## Estrutura de Arquivos

```
subscription-api/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   ├── seed.ts            # Script de seed
│   └── migrations/        # Histórico de migrations (gerado automaticamente)
├── .env                   # Variáveis de ambiente (não commitado)
├── .env.example           # Exemplo de variáveis de ambiente
└── PRISMA_SETUP.md        # Este arquivo
```

## Dados Iniciais (Seed)

### Planos de Assinatura

| Plano | Duração | Preço | Créditos Base | Bônus | Total |
|-------|---------|-------|---------------|-------|-------|
| Trimestral | 3 meses | R$ 99,90 | 600 | 0 | 600 |
| Semestral | 6 meses | R$ 189,90 | 1200 | 200 | 1400 |

### Personagens de Exemplo

1. **Personagem Padrão 1, 2, 3** - Coleção padrão (150 créditos cada)
2. **Personagem Regular** - Compra individual (200 créditos)
3. **Personagem Exclusivo Semestral** - Apenas plano semestral (250 créditos)

### Ciclo de Produção

- Nome: Ciclo YYYY-MM (mês atual)
- Capacidade: 10.000 personagens
- Fecha em: 30 dias a partir da criação
- Status: Aberto

### Limites por Ciclo

- Limite global: 10 personagens por usuário
- Limite semestral: 15 personagens por usuário

## Troubleshooting

### Erro: "Can't reach database server"

Verifique se:
1. PostgreSQL está rodando: `pg_isready`
2. As credenciais no `.env` estão corretas
3. O banco de dados existe: `psql -l`

### Erro: "Database does not exist"

Crie o banco de dados:
```bash
createdb subscription_credit_system
```

### Erro: "Migration failed"

Resete o banco e tente novamente:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### Erro ao executar seed

Verifique se o Prisma Client foi gerado:
```bash
npx prisma generate
```

## Próximos Passos

Após configurar o Prisma:

1. ✅ Banco de dados configurado
2. ⏭️ Implementar serviços de créditos (Task 3.1)
3. ⏭️ Implementar serviços de assinaturas (Task 4.1)
4. ⏭️ Criar APIs REST (Task 8.1)

## Referências

- [Documentação do Prisma](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
