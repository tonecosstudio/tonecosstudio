# Troubleshooting Guide

Problemas comuns e soluções para o projeto Ordax.

## Problemas de Configuração

### Erro: Variáveis de ambiente não carregadas

**Sintomas:**
- Erro "VITE_SUPABASE_URL is not defined"
- Aplicação não conecta ao Supabase

**Solução:**
1. Verificar se `.env` existe na raiz do projeto
2. Copiar de `.env.example` se necessário:
   ```bash
   cp .env.example .env
   ```
3. Preencher com valores corretos do Supabase
4. Reiniciar servidor de desenvolvimento

### Erro: Módulos não encontrados

**Sintomas:**
- "Cannot find module '@/components/...'"
- Imports com @ não funcionam

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Problemas de Banco de Dados

### Erro 406: Not Acceptable

**Sintomas:**
- Requisições retornam erro 406
- Console mostra "Not Acceptable"

**Causa:**
Políticas RLS (Row Level Security) bloqueando acesso.

**Solução:**
```sql
-- Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'sua_tabela';

-- Criar política temporária para desenvolvimento
CREATE POLICY "Allow authenticated users"
ON sua_tabela
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

### Erro 500: Internal Server Error

**Sintomas:**
- Edge Functions retornam erro 500
- Logs mostram "Internal Server Error"

**Causa:**
Variáveis de ambiente não configuradas ou erro no código da function.

**Solução:**
1. Verificar secrets no Supabase:
   ```bash
   supabase secrets list
   ```

2. Configurar secrets necessários:
   ```bash
   supabase secrets set EMAIL_API_KEY=your_key
   ```

3. Ver logs detalhados:
   - Supabase Dashboard > Edge Functions > Logs
   - Procurar por stack traces

### Erro: Database connection failed

**Sintomas:**
- "Failed to connect to database"
- Timeout em queries

**Solução:**
1. Verificar URL do Supabase no `.env`
2. Verificar se projeto está ativo no Supabase Dashboard
3. Verificar conexão de internet
4. Testar conexão:
   ```typescript
   const { data, error } = await supabase.from('users').select('count');
   console.log({ data, error });
   ```

## Problemas de Autenticação

### Usuário não consegue fazer login

**Sintomas:**
- Login falha silenciosamente
- Redirect não acontece

**Solução:**
1. Verificar se email está confirmado
2. Verificar políticas RLS da tabela `profiles`
3. Verificar se trigger de criação de profile existe:
   ```sql
   -- Ver triggers
   SELECT * FROM pg_trigger WHERE tgname LIKE '%profile%';
   ```

### Session expira rapidamente

**Sintomas:**
- Usuário é deslogado frequentemente
- "Session expired" aparece

**Solução:**
1. Verificar configuração de JWT no Supabase
2. Implementar refresh token:
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'TOKEN_REFRESHED') {
       console.log('Token refreshed');
     }
   });
   ```

## Problemas de UI

### Modal abre vazio

**Sintomas:**
- Modal/Dialog abre mas não mostra conteúdo
- Tela branca dentro do modal

**Causa:**
Componente não está recebendo props corretamente ou tem erro de renderização.

**Solução:**
1. Verificar console do navegador para erros
2. Verificar se props estão sendo passadas:
   ```typescript
   console.log('Modal props:', { userId, conversationId });
   ```
3. Adicionar error boundary:
   ```typescript
   <ErrorBoundary fallback={<div>Erro ao carregar</div>}>
     <ModalContent />
   </ErrorBoundary>
   ```

### Scroll não funciona

**Sintomas:**
- Lista não tem barra de rolagem
- Conteúdo cortado

**Causa:**
Hierarquia de flexbox incorreta ou falta de `overflow` properties.

**Solução:**
```css
/* Container pai */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* ou altura fixa */
}

/* Área com scroll */
.scrollable {
  flex: 1;
  min-height: 0; /* Importante! */
  overflow-y: auto;
}

/* Elementos fixos */
.header, .footer {
  flex-shrink: 0;
}
```

### Componente não re-renderiza

**Sintomas:**
- Dados mudam mas UI não atualiza
- Estado parece "travado"

**Solução:**
1. Verificar se está mutando estado diretamente:
   ```typescript
   // ❌ Errado
   state.items.push(newItem);
   
   // ✅ Correto
   setState({ ...state, items: [...state.items, newItem] });
   ```

2. Verificar dependências do useEffect:
   ```typescript
   useEffect(() => {
     loadData();
   }, [dependency]); // Adicionar todas as dependências
   ```

## Problemas de Performance

### Aplicação lenta

**Sintomas:**
- Interface travando
- Renderizações lentas

**Solução:**
1. Usar React DevTools Profiler
2. Identificar re-renders desnecessários
3. Aplicar otimizações:
   ```typescript
   // Memoizar componentes pesados
   const MemoizedComponent = React.memo(HeavyComponent);
   
   // Memoizar valores calculados
   const expensiveValue = useMemo(() => {
     return calculateExpensiveValue(data);
   }, [data]);
   
   // Memoizar callbacks
   const handleClick = useCallback(() => {
     doSomething(id);
   }, [id]);
   ```

### Queries lentas

**Sintomas:**
- Dashboard demora para carregar
- Timeout em requisições

**Solução:**
1. Adicionar índices no banco:
   ```sql
   CREATE INDEX idx_payments_status ON manual_payments(status);
   CREATE INDEX idx_payments_user ON manual_payments(user_id);
   ```

2. Otimizar queries:
   ```typescript
   // ❌ Buscar tudo
   const { data } = await supabase.from('payments').select('*');
   
   // ✅ Buscar apenas necessário
   const { data } = await supabase
     .from('payments')
     .select('id, status, created_at')
     .eq('status', 'pending')
     .limit(25);
   ```

3. Implementar paginação
4. Usar React Query para cache

## Problemas de Build

### Build falha com erro de TypeScript

**Sintomas:**
- `npm run build` falha
- Erros de tipo no console

**Solução:**
1. Verificar erros específicos:
   ```bash
   npm run build 2>&1 | grep "error TS"
   ```

2. Corrigir tipos:
   ```typescript
   // Adicionar tipos faltantes
   interface MissingType {
     id: string;
     name: string;
   }
   
   // Usar type assertion se necessário
   const data = response as ExpectedType;
   ```

3. Verificar tsconfig.json está correto

### Build muito lento

**Sintomas:**
- Build demora mais de 5 minutos
- CPU em 100%

**Solução:**
1. Limpar cache:
   ```bash
   rm -rf node_modules/.vite
   npm run build
   ```

2. Verificar imports circulares
3. Otimizar imports:
   ```typescript
   // ❌ Import inteiro
   import * as Icons from 'lucide-react';
   
   // ✅ Import específico
   import { User, Settings } from 'lucide-react';
   ```

## Problemas de Deploy

### Deploy falha no Vercel/Netlify

**Sintomas:**
- Build passa localmente mas falha no deploy
- Erro "Command failed"

**Solução:**
1. Verificar variáveis de ambiente no painel
2. Verificar Node version:
   ```json
   // package.json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

3. Verificar build command:
   ```json
   "scripts": {
     "build": "vite build"
   }
   ```

### Aplicação deployada não funciona

**Sintomas:**
- Build sucesso mas app não carrega
- Tela branca em produção

**Solução:**
1. Verificar console do navegador
2. Verificar variáveis de ambiente
3. Verificar CORS no Supabase:
   - Dashboard > Settings > API
   - Adicionar domínio em "Allowed Origins"

## Problemas de Email

### Emails não são enviados

**Sintomas:**
- Edge Function retorna sucesso mas email não chega
- Sem erros no console

**Solução:**
1. Verificar secrets configurados:
   ```bash
   supabase secrets list
   ```

2. Verificar provider (Resend):
   - API key válida
   - Domínio verificado
   - Limites não excedidos

3. Verificar logs da Edge Function
4. Testar envio direto:
   ```typescript
   const { data, error } = await supabase.functions.invoke('send-email', {
     body: {
       to: 'test@example.com',
       subject: 'Test',
       html: '<p>Test email</p>',
     },
   });
   ```

### Emails vão para spam

**Sintomas:**
- Emails enviados mas chegam em spam
- Taxa de entrega baixa

**Solução:**
1. Configurar SPF, DKIM, DMARC no domínio
2. Usar domínio verificado no provider
3. Melhorar conteúdo do email:
   - Evitar palavras spam
   - Incluir link de unsubscribe
   - Usar texto plano além de HTML

## Problemas de Chat

### Mensagens não aparecem em tempo real

**Sintomas:**
- Precisa recarregar para ver novas mensagens
- Realtime não funciona

**Solução:**
1. Verificar subscription:
   ```typescript
   const channel = supabase
     .channel('messages')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'support_messages',
     }, (payload) => {
       console.log('New message:', payload);
     })
     .subscribe();
   ```

2. Verificar Realtime habilitado no Supabase:
   - Dashboard > Database > Replication
   - Habilitar tabelas necessárias

3. Verificar políticas RLS permitem SELECT

### Anexos não fazem upload

**Sintomas:**
- Upload falha silenciosamente
- Erro "Failed to upload"

**Solução:**
1. Verificar bucket existe:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'chat-attachments';
   ```

2. Verificar políticas do bucket:
   ```sql
   -- Permitir upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'chat-attachments');
   ```

3. Verificar tamanho do arquivo (limite: 5MB)
4. Verificar tipo de arquivo permitido

## Ferramentas de Debug

### Console do Navegador

```javascript
// Ver estado do Supabase
console.log(supabase.auth.getSession());

// Ver queries React Query
window.reactQueryDevtools = true;

// Ver re-renders
console.log('Component rendered');
```

### Supabase Dashboard

- SQL Editor: Testar queries
- Table Editor: Ver dados
- Logs: Ver erros de Edge Functions
- Auth: Ver usuários e sessões
- Storage: Ver arquivos

### React DevTools

- Components: Ver props e state
- Profiler: Identificar performance issues
- Network: Ver requisições

## Quando Pedir Ajuda

Se após tentar as soluções acima o problema persistir:

1. Coletar informações:
   - Mensagem de erro completa
   - Steps para reproduzir
   - Screenshots/vídeos
   - Logs relevantes

2. Verificar documentação:
   - [Supabase Docs](https://supabase.com/docs)
   - [React Docs](https://react.dev)
   - [Vite Docs](https://vitejs.dev)

3. Buscar issues similares:
   - GitHub Issues do projeto
   - Stack Overflow
   - Supabase Discord

4. Abrir issue com template completo
