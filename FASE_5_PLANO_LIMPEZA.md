# Fase 5: Plano de Limpeza de Documentos

**Data**: 2026-02-24  
**Status**: ⏳ EM ANDAMENTO

## Objetivo

Limpar ~180 documentos .md obsoletos da raiz do projeto, mantendo apenas documentos essenciais e movendo documentos históricos para `docs/archive/`.

## Categorias de Documentos

### 1. Documentos a MANTER na Raiz
- `README.md` - Documento principal do projeto
- `CHANGELOG.md` - Histórico de mudanças
- `PLANO_REORGANIZACAO_DOCS.md` - Plano desta reorganização
- `REORGANIZACAO_DOCS_COMPLETA.md` - Status da reorganização
- `FASE_4_SCRIPTS_REORGANIZADOS.md` - Resumo da Fase 4
- `FASE_5_PLANO_LIMPEZA.md` - Este documento

### 2. Documentos a MOVER para docs/archive/
Documentos históricos que podem ser úteis para referência:
- `GUIA_NAVEGACAO_DOCS.md` → `docs/archive/`
- `RESUMO_REORGANIZACAO_FINAL.md` → `docs/archive/`
- Documentos de análise (ANALISE_*.md)
- Documentos de status (STATUS_*.md)
- Documentos de implementação (IMPLEMENTACAO_*.md)
- Documentos de resumo (RESUMO_*.md)

### 3. Documentos a DELETAR
Documentos temporários, obsoletos ou redundantes:
- Correções aplicadas (CORRECAO_*.md)
- Fixes aplicados (FIX_*.md)
- Diagnósticos resolvidos (DIAGNOSTICO_*.md)
- Instruções temporárias (INSTRUCOES_*.md)
- Executar agora (EXECUTAR_*.md)
- Aplicar agora (APLICAR_*.md)
- Testar agora (TESTAR_*.md)
- Documentos duplicados
- Documentos de debug temporário

## Estratégia de Limpeza

### Passo 1: Identificar Documentos
- Listar todos os .md na raiz
- Categorizar por tipo
- Identificar duplicatas

### Passo 2: Mover Históricos
- Criar `docs/archive/` se não existir
- Mover documentos de análise
- Mover documentos de status
- Mover documentos de implementação

### Passo 3: Deletar Obsoletos
- Deletar correções aplicadas
- Deletar fixes aplicados
- Deletar diagnósticos resolvidos
- Deletar instruções temporárias

### Passo 4: Validação
- Verificar links quebrados
- Atualizar referências
- Testar navegação
- Revisar README principal

## Padrões de Nomenclatura para Identificação

### Mover para Archive
- `ANALISE_*.md`
- `STATUS_*.md`
- `IMPLEMENTACAO_*.md`
- `RESUMO_*.md` (exceto os de reorganização)
- `DOCUMENTACAO_*.md`
- `ESTADO_*.md`
- `CRONOGRAMA_*.md`

### Deletar
- `CORRECAO_*.md`
- `FIX_*.md`
- `DIAGNOSTICO_*.md`
- `INSTRUCOES_*.md`
- `EXECUTAR_*.md`
- `APLICAR_*.md`
- `TESTAR_*.md`
- `PROBLEMA_*.md`
- `DEBUG_*.md`
- `TEMP_*.md`

## Estimativa

- **Documentos na raiz**: ~180
- **Manter**: ~6
- **Mover para archive**: ~50
- **Deletar**: ~124

## Checklist

### Preparação
- [ ] Criar `docs/archive/`
- [ ] Listar todos os .md
- [ ] Categorizar documentos

### Execução
- [ ] Mover documentos históricos
- [ ] Deletar documentos obsoletos
- [ ] Atualizar referências

### Validação
- [ ] Verificar links
- [ ] Testar navegação
- [ ] Revisar README
- [ ] Commit final

## Resultado Esperado

### Antes
```
ordax/
├── ANALISE_*.md (30 arquivos)
├── CORRECAO_*.md (20 arquivos)
├── FIX_*.md (15 arquivos)
├── RESUMO_*.md (25 arquivos)
├── IMPLEMENTACAO_*.md (20 arquivos)
├── ... (90+ outros .md)
└── README.md
```

### Depois
```
ordax/
├── README.md
├── CHANGELOG.md
├── PLANO_REORGANIZACAO_DOCS.md
├── REORGANIZACAO_DOCS_COMPLETA.md
├── docs/
│   ├── archive/
│   │   ├── ANALISE_*.md
│   │   ├── STATUS_*.md
│   │   └── ... (documentos históricos)
│   └── ... (documentação organizada)
└── scripts/
    └── ... (scripts organizados)
```

## Próximos Passos

1. Executar limpeza
2. Validar resultado
3. Atualizar README principal
4. Commit final da reorganização
