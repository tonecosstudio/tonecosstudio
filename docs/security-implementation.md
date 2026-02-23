# Implementação de Segurança

## Requisitos: 14.1-14.15
## Tarefa: 28.1 Implementar medidas de segurança

Este documento descreve as medidas de segurança implementadas no sistema de pagamento manual.

## 1. Validação de Tipo de Arquivo Server-Side

### Implementação

A validação de tipo de arquivo é feita em múltiplas camadas:

#### Cliente (FileUploadComponent)
```typescript
// Validação inicial no cliente
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];

function validateFile(file: File): boolean {
  // Verificar tipo MIME
  if (!ALLOWED_TYPES.includes(file.type)) {
    return false;
  }
  
  // Verificar extensão
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  return true;
}
```

#### Servidor (FileUploadService)
```typescript
// Validação no servidor - NÃO CONFIAR NO CLIENTE
async validateFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];

  // 1. Validar tipo MIME
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('Tipo de arquivo não suportado');
  }

  // 2. Validar extensão
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push('Extensão de arquivo não suportada');
  }

  // 3. Validar correspondência MIME/extensão
  if (!this.validateMimeTypeExtension(file.type, extension)) {
    errors.push('Tipo de arquivo não corresponde à extensão');
  }

  // 4. Rejeitar executáveis
  const executableExtensions = ['exe', 'sh', 'bat', 'cmd', 'com', 'app', 'dmg'];
  if (extension && executableExtensions.includes(extension)) {
    errors.push('Arquivos executáveis não são permitidos');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### Supabase Storage (Políticas RLS)
```sql
-- Política para upload de arquivos
CREATE POLICY "Users can upload payment proof files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
  -- Validar extensão no servidor
  AND (
    name LIKE '%.jpg' OR
    name LIKE '%.jpeg' OR
    name LIKE '%.png' OR
    name LIKE '%.pdf'
  )
);
```

## 2. Varredura de Malware

### Recomendação: ClamAV

O sistema está preparado para integração com ClamAV para varredura de malware.

#### Instalação do ClamAV

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install clamav clamav-daemon

# Atualizar definições de vírus
sudo freshclam

# Iniciar daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

#### Integração (Exemplo)

```typescript
// src/lib/malware-scanner.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function scanFile(filePath: string): Promise<boolean> {
  try {
    // Executar ClamAV scan
    const { stdout } = await execAsync(`clamscan --no-summary ${filePath}`);
    
    // Verificar resultado
    if (stdout.includes('FOUND')) {
      console.error(`Malware detected in file: ${filePath}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Malware scan failed:', error);
    // Em caso de erro, rejeitar por segurança
    return false;
  }
}

// Uso no FileUploadService
async upload(paymentId: string, file: File): Promise<PaymentFile> {
  // ... validações anteriores ...
  
  // Scan for malware (se ClamAV estiver disponível)
  if (process.env.ENABLE_MALWARE_SCAN === 'true') {
    const isSafe = await scanFile(tempFilePath);
    if (!isSafe) {
      throw new FileUploadError(
        'MALWARE_DETECTED',
        'Arquivo rejeitado: possível malware detectado',
        400
      );
    }
  }
  
  // ... continuar upload ...
}
```

#### Configuração

```env
# .env
ENABLE_MALWARE_SCAN=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

### Alternativas ao ClamAV

1. **VirusTotal API** - Serviço cloud
2. **MetaDefender** - Serviço cloud
3. **AWS GuardDuty** - Se hospedado na AWS
4. **Azure Defender** - Se hospedado no Azure

## 3. Remoção de Dados EXIF

### Implementação

```typescript
// src/lib/exif-remover.ts
import piexif from 'piexifjs';

/**
 * Remove EXIF data from image
 * Requirements: 14.3
 */
export async function removeExifData(file: File): Promise<File> {
  // Only process images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result as string;
        
        // Remove EXIF data
        const cleanedDataUrl = piexif.remove(dataUrl);
        
        // Convert back to File
        fetch(cleanedDataUrl)
          .then(res => res.blob())
          .then(blob => {
            const cleanedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(cleanedFile);
          })
          .catch(reject);
      } catch (error) {
        console.error('Failed to remove EXIF data:', error);
        // Return original file if EXIF removal fails
        resolve(file);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Integração no FileUploadService
async upload(paymentId: string, file: File): Promise<PaymentFile> {
  // ... validações anteriores ...
  
  // Remove EXIF data from images
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    fileToUpload = await removeExifData(file);
  }
  
  // ... continuar upload ...
}
```

### Instalação

```bash
npm install piexifjs
npm install --save-dev @types/piexifjs
```

## 4. Nomes de Arquivo Únicos

### Implementação

```typescript
// Já implementado no FileUploadService
private generateUniqueFileName(paymentId: string, originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '');
  const uniqueId = crypto.randomUUID();
  
  // Formato: {paymentId}/{uuid}.{extension}
  return `${paymentId}/${uniqueId}.${safeExtension}`;
}
```

### Benefícios

- Previne sobrescritas acidentais
- Dificulta ataques de path traversal
- Organiza arquivos por pagamento
- Mantém extensão original (sanitizada)

## 5. Limite de Taxa em Uploads

### Implementação

```typescript
// Já implementado no FileUploadService
const RATE_LIMIT_WINDOW = 3600000; // 1 hora
const RATE_LIMIT_MAX_UPLOADS = 10;

private checkRateLimit(userId: string): void {
  const now = Date.now();
  const userUploads = uploadTimestamps.get(userId) || [];

  // Remove timestamps older than 1 hour
  const recentUploads = userUploads.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Check if limit exceeded
  if (recentUploads.length >= RATE_LIMIT_MAX_UPLOADS) {
    const oldestUpload = Math.min(...recentUploads);
    const minutesRemaining = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - oldestUpload)) / 60000
    );
    
    throw new FileUploadError(
      'RATE_LIMIT_EXCEEDED',
      `Upload limit exceeded. Try again in ${minutesRemaining} minutes.`,
      429
    );
  }

  // Add current timestamp
  recentUploads.push(now);
  uploadTimestamps.set(userId, recentUploads);
}
```

### Melhorias Futuras

Para produção, considere usar Redis para rate limiting:

```typescript
// src/lib/rate-limiter.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowMs: number = 3600000
): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count recent requests
  const count = await redis.zcard(key);

  if (count >= maxRequests) {
    return false;
  }

  // Add current request
  await redis.zadd(key, now, `${now}`);
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return true;
}
```

## 6. Proteção CSRF

### Implementação com Supabase

Supabase já fornece proteção CSRF através de:

1. **JWT Tokens** - Tokens assinados que não podem ser forjados
2. **SameSite Cookies** - Cookies com atributo SameSite=Lax
3. **Origin Validation** - Validação de origem das requisições

### Configuração Adicional

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // Proof Key for Code Exchange
    },
    global: {
      headers: {
        'X-Client-Info': 'manual-payment-system',
      },
    },
  }
);
```

### Headers de Segurança

```typescript
// next.config.js ou middleware
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];
```

## 7. Sanitização de Entrada (XSS)

### Implementação com DOMPurify

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
// src/lib/sanitizer.ts
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 * Requirements: 14.14
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize text (remove all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Uso em componentes
import { sanitizeHtml } from '@/lib/sanitizer';

function PaymentNote({ note }: { note: string }) {
  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: sanitizeHtml(note) 
      }} 
    />
  );
}
```

### Validação de Entrada

```typescript
// src/lib/validators.ts
import { z } from 'zod';

// Schema para criação de pagamento
export const createPaymentSchema = z.object({
  payment_method_id: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  currency: z.string().length(3).default('BRL'),
  payment_type: z.enum(['one_time', 'recurring']),
  quote_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
}).refine(
  (data) => !!(data.quote_id || data.subscription_id),
  'Must have either quote_id or subscription_id'
).refine(
  (data) => !(data.quote_id && data.subscription_id),
  'Cannot have both quote_id and subscription_id'
);

// Schema para rejeição de pagamento
export const rejectPaymentSchema = z.object({
  reason: z.string().min(10).max(500),
});

// Schema para solicitação de informações
export const requestInfoSchema = z.object({
  message: z.string().min(10).max(1000),
});

// Uso
import { createPaymentSchema } from '@/lib/validators';

async function createPayment(input: unknown) {
  // Validar e sanitizar entrada
  const validated = createPaymentSchema.parse(input);
  
  // Continuar com dados validados
  // ...
}
```

## 8. Políticas RLS (Row Level Security)

### Implementação no Supabase

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas para manual_payments
CREATE POLICY "Users can view their own payments"
ON manual_payments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payments"
ON manual_payments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
ON manual_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update payments"
ON manual_payments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Políticas para payment_files
CREATE POLICY "Users can view files for their payments"
ON payment_files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM manual_payments
    WHERE id = payment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files for their payments"
ON payment_files FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM manual_payments
    WHERE id = payment_id AND user_id = auth.uid()
  )
);

-- Políticas para Storage
CREATE POLICY "Users can upload to their payment folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their payment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);
```

## Checklist de Segurança

- [x] Validação de tipo de arquivo server-side
- [ ] Varredura de malware (ClamAV recomendado)
- [ ] Remoção de dados EXIF (piexifjs)
- [x] Nomes de arquivo únicos
- [x] Limite de taxa em uploads
- [x] Proteção CSRF (via Supabase)
- [ ] Sanitização de entrada (DOMPurify)
- [x] Políticas RLS
- [ ] Headers de segurança
- [ ] Validação de entrada (Zod)

## Próximos Passos

1. Instalar e configurar ClamAV para varredura de malware
2. Implementar remoção de EXIF com piexifjs
3. Adicionar DOMPurify para sanitização
4. Configurar headers de segurança
5. Implementar validação com Zod
6. Realizar auditoria de segurança completa
7. Testes de penetração

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [ClamAV Documentation](https://www.clamav.net/documents)
- [DOMPurify](https://github.com/cure53/DOMPurify)
