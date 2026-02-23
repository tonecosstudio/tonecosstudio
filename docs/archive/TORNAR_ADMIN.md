# Tornar washingtonmsdj@gmail.com Admin

## Método 1: Via Navegador (Mais Fácil)

### Passo 1: Fazer Login
1. Acesse: http://localhost:8080/login
2. Faça login com a conta Google: **washingtonmsdj@gmail.com**

### Passo 2: Abrir Console do Navegador
1. Pressione **F12** para abrir o DevTools
2. Vá na aba **Console**

### Passo 3: Executar o Código
Cole e execute este código no console:

```javascript
// Pegar o token de autenticação
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Chamar a função bootstrap-admin
const response = await fetch('https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/bootstrap-admin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Resultado:', result);

// Se deu certo, recarregar a página
if (result.ok) {
  alert('Você agora é admin! Recarregando...');
  window.location.reload();
} else {
  alert('Erro: ' + result.error);
}
```

### Passo 4: Verificar
Após recarregar, acesse: http://localhost:8080/admin

Você deve ter acesso à área administrativa!

---

## Método 2: Via SQL (Alternativa)

Se o Método 1 não funcionar, use SQL direto no Supabase:

### Passo 1: Acessar SQL Editor
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### Passo 2: Executar SQL
```sql
-- Encontrar o ID do usuário
SELECT id, email FROM auth.users WHERE email = 'washingtonmsdj@gmail.com';

-- Copie o ID que aparecer e use no comando abaixo
-- Substitua 'SEU-USER-ID-AQUI' pelo ID copiado
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-USER-ID-AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Passo 3: Verificar
```sql
-- Verificar se foi criado
SELECT ur.*, u.email 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'washingtonmsdj@gmail.com';
```

---

## Método 3: Via cURL (Terminal)

Se você tiver o token JWT do usuário:

```bash
# Substitua SEU_TOKEN_JWT pelo token de acesso
curl -X POST \
  https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/bootstrap-admin \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"
```

Para pegar o token:
1. Faça login no app
2. Abra o DevTools (F12)
3. Console:
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log(session?.access_token);
```

---

## Verificar se Funcionou

### No App
1. Acesse: http://localhost:8080/admin
2. Você deve ver a área administrativa

### No Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
2. Abra a tabela `user_roles`
3. Deve ter uma linha com seu user_id e role = 'admin'

---

## Troubleshooting

### Erro: "Admin already exists"
Significa que já existe um admin. Use o Método 2 (SQL) para adicionar você também.

### Erro: "Unauthorized"
Você não está logado. Faça login primeiro.

### Erro: "user_roles does not exist"
A migration não foi aplicada. Execute:
```bash
supabase db push
```

### Não consigo acessar /admin
1. Verifique se você está logado
2. Verifique se está na tabela user_roles
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Faça logout e login novamente
