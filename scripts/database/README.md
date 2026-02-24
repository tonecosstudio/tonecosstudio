# Database Scripts

Scripts SQL organizados por categoria.

## Estrutura

```
database/
├── migrations/        # Migrations e alterações de schema
├── seeds/            # Dados de teste e exemplos
├── utilities/        # Scripts utilitários e diagnóstico
└── fixes/            # Correções específicas (temporário)
```

## Como Usar

### Migrations
Scripts que alteram o schema do banco de dados.
```bash
# Aplicar via Supabase CLI
supabase db push

# Ou via SQL Editor no Dashboard
```

### Seeds
Scripts para popular o banco com dados de teste.
```bash
# Executar no SQL Editor do Supabase
```

### Utilities
Scripts para diagnóstico, verificação e manutenção.
```bash
# Executar conforme necessário
```

### Fixes
Correções temporárias. Após aplicadas e validadas, devem ser convertidas em migrations.

## Boas Práticas

1. **Sempre testar em ambiente de desenvolvimento primeiro**
2. **Fazer backup antes de executar scripts destrutivos**
3. **Documentar o que cada script faz**
4. **Converter fixes em migrations após validação**
5. **Não executar scripts de teste em produção**
