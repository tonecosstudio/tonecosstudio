# Dependências do Projeto

## Dependências Instaladas

### Core
```json
{
  "dependencies": {
    "browser-image-compression": "^2.0.2",
    "@tanstack/react-virtual": "^3.0.0"
  }
}
```

### Instalação
```bash
npm install browser-image-compression @tanstack/react-virtual
```

## Dependências Recomendadas (Opcional)

### Segurança

#### piexifjs - Remoção de EXIF
```bash
npm install piexifjs
npm install --save-dev @types/piexifjs
```

**Uso**: Remover metadados EXIF de imagens antes do upload
**Requisito**: 14.3
**Prioridade**: Alta

#### DOMPurify - Sanitização XSS
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Uso**: Sanitizar HTML e prevenir ataques XSS
**Requisito**: 14.14
**Prioridade**: Alta

#### Zod - Validação de Schema
```bash
npm install zod
```

**Uso**: Validação de entrada de dados
**Requisito**: 19.1-19.15
**Prioridade**: Média

### Performance

#### ioredis - Rate Limiting em Produção
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

**Uso**: Rate limiting distribuído com Redis
**Requisito**: 14.5
**Prioridade**: Média (para produção)

### Testes

#### @testing-library/react - Testes de Componentes
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**Uso**: Testes de componentes React
**Prioridade**: Alta

#### @testing-library/user-event - Simulação de Eventos
```bash
npm install --save-dev @testing-library/user-event
```

**Uso**: Simular interações de usuário em testes
**Prioridade**: Alta

#### fast-check - Property-Based Testing
```bash
npm install --save-dev fast-check
```

**Uso**: Testes baseados em propriedades
**Prioridade**: Média

### Acessibilidade

#### @axe-core/react - Testes de Acessibilidade
```bash
npm install --save-dev @axe-core/react
```

**Uso**: Detectar problemas de acessibilidade automaticamente
**Prioridade**: Alta

## Dependências do Sistema (Server-Side)

### ClamAV - Varredura de Malware

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

#### macOS
```bash
brew install clamav
freshclam
clamd
```

#### Docker
```bash
docker pull clamav/clamav:latest
docker run -d -p 3310:3310 clamav/clamav:latest
```

**Uso**: Varredura de malware em arquivos enviados
**Requisito**: 14.4
**Prioridade**: Alta (para produção)

### Redis - Cache e Rate Limiting

#### Ubuntu/Debian
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Docker
```bash
docker pull redis:alpine
docker run -d -p 6379:6379 redis:alpine
```

**Uso**: Cache distribuído e rate limiting
**Prioridade**: Média (para produção)

## Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Segurança
ENABLE_MALWARE_SCAN=false
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Rate Limiting
REDIS_URL=redis://localhost:6379
ENABLE_REDIS_RATE_LIMIT=false

# Performance
ENABLE_IMAGE_COMPRESSION=true
MAX_IMAGE_SIZE_MB=1
THUMBNAIL_SIZE=300

# Acessibilidade
ENABLE_SCREEN_READER_ANNOUNCEMENTS=true

# Debug
DEBUG_FILE_UPLOAD=false
DEBUG_RATE_LIMIT=false
```

## Scripts NPM Recomendados

Adicione ao `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:a11y": "jest --testPathPattern=a11y",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "security:audit": "npm audit",
    "security:fix": "npm audit fix"
  }
}
```

## Instalação Completa

### Desenvolvimento
```bash
# Instalar dependências core
npm install

# Instalar dependências de desenvolvimento
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event fast-check @axe-core/react

# Instalar dependências de segurança
npm install piexifjs dompurify zod
npm install --save-dev @types/piexifjs @types/dompurify
```

### Produção
```bash
# Instalar dependências core
npm install --production

# Configurar ClamAV
sudo apt-get install clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon

# Configurar Redis
sudo apt-get install redis-server
sudo systemctl start redis

# Instalar dependências de produção
npm install ioredis
```

## Verificação de Instalação

```bash
# Verificar versões
npm list browser-image-compression
npm list @tanstack/react-virtual

# Verificar ClamAV
clamscan --version

# Verificar Redis
redis-cli ping
# Deve retornar: PONG

# Verificar tipos TypeScript
npm run type-check
```

## Troubleshooting

### browser-image-compression não funciona
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### ClamAV não inicia
```bash
# Verificar logs
sudo journalctl -u clamav-daemon -f

# Atualizar definições
sudo freshclam

# Reiniciar serviço
sudo systemctl restart clamav-daemon
```

### Redis não conecta
```bash
# Verificar se está rodando
sudo systemctl status redis

# Testar conexão
redis-cli ping

# Verificar porta
sudo netstat -tlnp | grep 6379
```

## Atualizações

### Verificar atualizações disponíveis
```bash
npm outdated
```

### Atualizar dependências
```bash
# Atualizar todas (cuidado!)
npm update

# Atualizar específica
npm update browser-image-compression

# Atualizar para latest
npm install browser-image-compression@latest
```

## Licenças

Todas as dependências usam licenças compatíveis com uso comercial:

- **browser-image-compression**: MIT
- **@tanstack/react-virtual**: MIT
- **piexifjs**: MIT
- **dompurify**: Apache-2.0 / MPL-2.0
- **zod**: MIT
- **ioredis**: MIT
- **ClamAV**: GPL-2.0
- **Redis**: BSD-3-Clause

## Suporte

Para problemas com dependências:

1. Verificar documentação oficial
2. Buscar issues no GitHub
3. Consultar Stack Overflow
4. Abrir issue no repositório

## Referências

- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
- [piexifjs](https://github.com/hMatoba/piexifjs)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Zod](https://zod.dev/)
- [ioredis](https://github.com/luin/ioredis)
- [ClamAV](https://www.clamav.net/)
- [Redis](https://redis.io/)
