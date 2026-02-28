# Aplicação Prática das Implementações - ORDAX
**Data:** 28 de Fevereiro de 2026  
**Status:** ✅ Em Progresso

---

## 📋 SUMÁRIO

Este documento detalha a aplicação prática das implementações de segurança e performance no código existente do projeto ORDAX.

---

## 🎯 HOOKS CUSTOMIZADOS CRIADOS

### 1. `useSanitizedInput` - Input Sanitization Hook

**Arquivo:** `src/hooks/useSanitizedInput.ts`

**Funcionalidade:**
- Sanitiza automaticamente inputs de usuário
- Suporta diferentes tipos de sanitização (text, html, email)
- Integra perfeitamente com React Hook Form

**Uso:**
```typescript
import { useSanitizedInput, useSanitizedForm } from '@/hooks/useSanitizedInput';

// Para um único input
const [rawValue, setValue, sanitizedValue] = useSanitizedInput('', 'text');

// Para um formulário completo
const {
  formData,
  setValue,
  getSanitizedData
} = useSanitizedForm(
  { name: '', email: '', bio: '' },
  { name: 'text', email: 'email', bio: 'html' }
);
```

---

### 2. `usePaginatedQuery` - Pagination Hook

**Arquivo:** `src/hooks/usePaginatedQuery.ts`

**Funcionalidade:**
- Simplifica paginação com React Query
- Suporta paginação offset-based e cursor-based
- Controles de navegação integrados

**Uso:**
```typescript
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';

const {
  data,
  pagination,
  isLoading,
  page,
  nextPage,
  previousPage,
  goToPage
} = usePaginatedQuery({
  queryKey: ['users'],
  queryFn: (params) => fetchUsers(params),
  pageSize: 20,
  cacheConfig: 'adminList'
});
```

---

### 3. `useSecureFileUpload` - Secure Upload Hook

**Arquivo:** `src/hooks/useSecureFileUpload.ts`

**Funcionalidade:**
- Valida arquivos antes do upload
- Detecta malware básico
- Processa imagens (remove EXIF, comprime)
- Rate limiting integrado
- Feedback de progresso

**Uso:**
```typescript
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload';

const {
  isUploading,
  progress,
  processedFiles,
  uploadFiles,
  reset
} = useSecureFileUpload({
  userId: user.id,
  maxFiles: 10,
  onSuccess: (files) => {
    // Upload para Supabase
  }
});

// No input file
<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  }}
/>
```

---

## 🎨 COMPONENTES UI CRIADOS

### 1. `PaginationControls` - Controles de Paginação

**Arquivo:** `src/components/ui/pagination-controls.tsx`

**Componentes:**
- `PaginationControls` - Botões de navegação
- `PaginationInfo` - Informações de range
- `Pagination` - Componente completo

**Uso:**
```typescript
import { Pagination } from '@/components/ui/pagination-controls';

<Pagination
  currentPage={page}
  totalPages={totalPages}
  pageSize={20}
  totalItems={totalItems}
  onPageChange={setPage}
  showInfo={true}
  showFirstLast={true}
/>
```

---

### 2. `SecureUserForm` - Formulário Seguro

**Arquivo:** `src/components/admin/SecureUserForm.tsx`

**Funcionalidades:**
- Sanitização automática de inputs
- Validação com Zod
- Rate limiting integrado
- Feedback de erros

**Uso:**
```typescript
import { SecureUserForm } from '@/components/admin/SecureUserForm';

<SecureUserForm
  userId={user.id}
  initialData={userData}
  onSubmit={async (data) => {
    await updateUser(data);
  }}
  onCancel={() => setEditing(false)}
/>
```

---

## 📝 EXEMPLOS DE APLICAÇÃO

### Exemplo 1: Lista Admin com Paginação

```typescript
// src/pages/admin/AdminUsersList.tsx
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Pagination } from '@/components/ui/pagination-controls';
import { paginateQuery } from '@/lib/performance/pagination';
import { supabase } from '@/integrations/supabase/client';

export function AdminUsersList() {
  const {
    data: users,
    pagination,
    isLoading,
    page,
    goToPage
  } = usePaginatedQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (params) => {
      return paginateQuery(
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        params
      );
    },
    pageSize: 20,
    cacheConfig: 'adminList'
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <UserTable users={users} />
      
      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}
```

---

### Exemplo 2: Formulário com Sanitização

```typescript
// src/components/ContactForm.tsx
import { useSanitizedForm } from '@/hooks/useSanitizedInput';
import { sanitizeEmail } from '@/lib/security/input-sanitizer';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';

export function ContactForm() {
  const {
    formData,
    setValue,
    getSanitizedData
  } = useSanitizedForm(
    { name: '', email: '', message: '' },
    { name: 'text', email: 'email', message: 'html' }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    const rateLimit = checkRateLimit('contact-form', RATE_LIMITS.email);
    if (!rateLimit.allowed) {
      toast.error(`Aguarde ${rateLimit.retryAfter}s`);
      return;
    }

    // Get sanitized data
    const sanitized = getSanitizedData();
    
    // Additional validation
    const email = sanitizeEmail(sanitized.email);

    // Submit
    await sendContactEmail({ ...sanitized, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={formData.name}
        onChange={(e) => setValue('name', e.target.value)}
        placeholder="Nome"
      />
      <Input
        type="email"
        value={formData.email}
        onChange={(e) => setValue('email', e.target.value)}
        placeholder="Email"
      />
      <Textarea
        value={formData.message}
        onChange={(e) => setValue('message', e.target.value)}
        placeholder="Mensagem"
      />
      <Button type="submit">Enviar</Button>
    </form>
  );
}
```

---

### Exemplo 3: Upload Seguro de Imagens

```typescript
// src/components/ImageUploader.tsx
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload';
import { supabase } from '@/integrations/supabase/client';

export function ImageUploader({ userId }: { userId: string }) {
  const {
    isUploading,
    progress,
    processedFiles,
    uploadFiles
  } = useSecureFileUpload({
    userId,
    maxFiles: 5,
    processingOptions: {
      maxWidth: 2048,
      quality: 85,
      format: 'webp'
    },
    onSuccess: async (files) => {
      // Upload para Supabase Storage
      for (const file of files) {
        const { error } = await supabase.storage
          .from('images')
          .upload(`${userId}/${file.name}`, file);

        if (error) {
          console.error('Upload error:', error);
        }
      }
    }
  });

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(e.target.files);
          }
        }}
        disabled={isUploading}
      />

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center mt-2">{progress}%</p>
        </div>
      )}

      {processedFiles.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">
            {processedFiles.length} arquivo(s) processado(s)
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 MIGRAÇÃO DE CÓDIGO EXISTENTE

### Passo 1: Identificar Componentes

**Componentes que precisam de sanitização:**
- ✅ Todos os formulários com inputs de texto
- ✅ Campos de email
- ✅ Textareas
- ✅ Rich text editors

**Componentes que precisam de paginação:**
- ✅ AdminUsers
- ✅ AdminModels
- ✅ AdminCollections
- ✅ AdminSubscriptions
- ✅ AdminPayments
- ✅ Todas as listas admin

---

### Passo 2: Aplicar Sanitização

**Antes:**
```typescript
const [name, setName] = useState('');

<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// No submit
await saveData({ name }); // ❌ Não sanitizado
```

**Depois:**
```typescript
const [name, setName, sanitizedName] = useSanitizedInput('', 'text');

<Input
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// No submit
await saveData({ name: sanitizedName }); // ✅ Sanitizado
```

---

### Passo 3: Aplicar Paginação

**Antes:**
```typescript
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: async () => {
    const { data } = await supabase
      .from('users')
      .select('*'); // ❌ Sem paginação
    return data;
  }
});

// Renderiza todos os usuários de uma vez
{users?.map(user => <UserCard key={user.id} user={user} />)}
```

**Depois:**
```typescript
const {
  data: users,
  pagination,
  page,
  goToPage
} = usePaginatedQuery({
  queryKey: ['users'],
  queryFn: (params) => paginateQuery(
    supabase.from('users').select('*'),
    params
  ),
  pageSize: 20
});

// Renderiza apenas a página atual
{users.map(user => <UserCard key={user.id} user={user} />)}

<Pagination
  currentPage={pagination.page}
  totalPages={pagination.totalPages}
  pageSize={pagination.pageSize}
  totalItems={pagination.totalItems}
  onPageChange={goToPage}
/>
```

---

## ✅ CHECKLIST DE APLICAÇÃO

### Segurança

- [x] Hooks de sanitização criados
- [x] Componente de formulário seguro criado
- [x] Hook de upload seguro criado
- [ ] Aplicar sanitização em Login.tsx
- [ ] Aplicar sanitização em Profile.tsx
- [ ] Aplicar sanitização em Contact.tsx
- [ ] Aplicar sanitização em todos os formulários admin
- [ ] Aplicar upload seguro em componentes de upload
- [ ] Testar sanitização em produção

### Performance

- [x] Hooks de paginação criados
- [x] Componentes de paginação criados
- [ ] Aplicar paginação em AdminUsers
- [ ] Aplicar paginação em AdminModels
- [ ] Aplicar paginação em AdminCollections
- [ ] Aplicar paginação em AdminSubscriptions
- [ ] Aplicar paginação em AdminPayments
- [ ] Aplicar lazy loading em rotas admin
- [ ] Otimizar imagens existentes
- [ ] Medir impacto de performance

---

## 📊 PRÓXIMOS PASSOS

### Imediato (Hoje)
1. ✅ Criar hooks customizados
2. ✅ Criar componentes UI
3. ⏳ Aplicar em 3-5 páginas principais
4. ⏳ Testar funcionalidade

### Curto Prazo (Esta Semana)
1. Aplicar sanitização em todos os formulários
2. Aplicar paginação em todas as listas admin
3. Implementar lazy loading de rotas
4. Otimizar imagens críticas

### Médio Prazo (Próximas 2 Semanas)
1. Migrar todos os componentes
2. Adicionar testes automatizados
3. Medir métricas de performance
4. Documentar padrões de uso

---

## 🎯 MÉTRICAS DE SUCESSO

### Segurança
- [ ] 100% dos inputs sanitizados
- [ ] 100% dos uploads validados
- [ ] Rate limiting em 100% dos endpoints críticos
- [ ] Zero vulnerabilidades XSS

### Performance
- [ ] 100% das listas paginadas
- [ ] Bundle size <1MB
- [ ] First Load <3s
- [ ] Lighthouse score >90

---

**Status:** ✅ Hooks e Componentes Criados  
**Próximo:** Aplicar em Páginas Existentes  
**Data:** 28 de Fevereiro de 2026
