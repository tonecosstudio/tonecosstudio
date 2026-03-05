# Cleanup Plan - Legacy Files and Documentation

**Date**: 2026-03-05
**Purpose**: Clean up temporary files, legacy documentation, and maintain professional codebase

## 🎯 Cleanup Strategy

Following the principle from Premium Club spec Requirement 17: "Limpeza de Código Legado e Manutenção da Qualidade"

### Categories of Files to Clean

#### 1. Temporary Migration Scripts (DELETE)
Scripts used during development that are no longer needed:
- `aplicar-*.mjs` (20+ files)
- `aplicar-*.ps1` (10+ files)
- `apply-*.mjs` (30+ files)
- `apply-*.ps1` (5+ files)
- `apply-*.cjs` (5+ files)
- `apply-*.js` (2+ files)
- `apply-*.sh` (2+ files)
- `apply-*.sql` (5+ files)

#### 2. Temporary Test/Debug Scripts (DELETE)
- `test-*.mjs` (5+ files)
- `testar-*.mjs` (5+ files)
- `verificar-*.mjs` (10+ files)
- `verify-*.mjs` (5+ files)
- `verify-*.cjs` (2+ files)
- `check-*.cjs` (2+ files)
- `debug-*.mjs` (2+ files)
- `criar-*.mjs` (2+ files)
- `list-*.mjs` (1 file)
- `run-*.cjs` (1 file)

#### 3. Temporary Log Files (DELETE)
- `migration-*.txt` (15+ files)
- `final-*.txt` (3+ files)
- `trigger-*.txt` (1 file)

#### 4. Legacy Documentation (ARCHIVE or DELETE)
Status/progress files that are outdated:
- `ANALISE_*.md` (4 files)
- `APLICAR_*.md` (7 files)
- `CORRECAO_*.md` (15+ files)
- `ERRO_*.md` (3 files)
- `RESUMO_*.md` (10+ files)
- `SISTEMA_*.md` (10+ files)
- `SOLUCAO_*.md` (5+ files)
- `STATUS_*.md` (2 files)
- `SUCESSO_*.md` (2 files)
- Various other temporary docs

#### 5. Keep (IMPORTANT)
Files that should be kept:
- `SPECS_STATUS_SUMMARY.md` - Current status overview
- `RESUMO_FINAL_CONTEXTUAL_PRICING.md` - Final delivery doc
- `ENTREGA_SISTEMA_PRECOS_CONTEXTUAIS.md` - Delivery doc
- `PROGRESSO_CONTEXTUAL_PRICING.md` - Progress tracking
- `TASK_11_TIPOS_TYPESCRIPT.md` - Types documentation
- `.kiro/specs/` - All spec files
- `README.md` - If exists
- `CHANGELOG.md` - If exists

## 📋 Cleanup Actions

### Phase 1: Archive Important Documentation
Move important legacy docs to archive folder:
```
.kiro/docs-archive/legacy/
```

### Phase 2: Delete Temporary Files
Remove all temporary scripts, logs, and outdated documentation.

### Phase 3: Organize Remaining Documentation
Create clear structure:
```
docs/
  features/          - Feature documentation
  api/              - API documentation
  development/      - Development guides
CHANGELOG.md        - Version history
README.md           - Main documentation
```

## 🚀 Execution Plan

1. Create archive directory
2. Move important legacy docs to archive
3. Delete temporary files in batches
4. Verify no broken references
5. Update .gitignore if needed
6. Commit cleanup

## ⚠️ Safety Checks

Before deleting:
- ✅ Verify no active references in code
- ✅ Ensure migrations are in supabase/migrations/
- ✅ Confirm specs are in .kiro/specs/
- ✅ Check that important docs are archived

## 📊 Expected Results

- **Before**: 150+ files in root directory
- **After**: ~20 essential files in root directory
- **Archived**: ~50 important legacy docs
- **Deleted**: ~100+ temporary files

---

**Status**: Ready for execution
**Risk Level**: Low (temporary files only)
**Estimated Time**: 10 minutes

