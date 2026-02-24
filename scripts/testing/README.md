# Testing Scripts

Scripts para testes e validação do sistema.

## Scripts Disponíveis

### Testes Gerais
- `testar-sistema.bat` - Testa sistema completo
- `verificar-sistema.bat` - Verifica status do sistema
- `verificar-status-sistema.bat` - Status detalhado

### Testes de Features
- `testar-sistema-chat.bat` - Testa sistema de chat
- `testar-sistema-grupos.bat` - Testa grupos de chat
- `testar-suporte.bat` - Testa sistema de suporte
- `testar-anexos.bat` - Testa upload de anexos
- `testar-colecoes.bat` - Testa sistema de coleções
- `testar-email-agora.bat` - Testa envio de emails

### Testes Rápidos
- `testar-agora.bat` - Teste rápido geral
- `COMANDOS_TESTE_RAPIDO.bat` - Comandos de teste rápido
- `COMANDOS_TESTE_CHAT.bat` - Comandos de teste do chat

### Verificações
- `verificar-instalacao.bat` - Verifica instalação
- `verificar-email.bat` - Verifica configuração de email
- `verificar-colecoes-simples.bat` - Verifica coleções
- `verificar-templates-dinamicos.bat` - Verifica templates

## Como Usar

### Teste Completo do Sistema
```bash
testar-sistema.bat
```

### Teste de Feature Específica
```bash
# Chat
testar-sistema-chat.bat

# Email
testar-email-agora.bat

# Coleções
testar-colecoes.bat
```

### Verificação de Instalação
```bash
verificar-instalacao.bat
```

## Testes Automatizados

Para testes automatizados, use os comandos npm:

```bash
# Todos os testes
npm run test

# Modo watch
npm run test:watch

# Performance
npm run test:performance

# E2E
npm run test:e2e
```

## Recursos

- [Guia de Testes](../../docs/development/testing.md)
- [Testes E2E](../../src/test/E2E_INTEGRATION_TESTS.md)
- [Testes de Performance](../../src/test/PERFORMANCE_TESTS.md)
