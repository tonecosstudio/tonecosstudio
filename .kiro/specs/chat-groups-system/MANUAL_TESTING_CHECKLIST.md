# Checklist de Testes Manuais - Sistema de Grupos

## Pré-requisitos

- [ ] Migrações aplicadas (`npx supabase db push`)
- [ ] Tipos TypeScript regenerados
- [ ] Edge Functions deployadas
- [ ] Servidor de desenvolvimento rodando (`npm run dev`)
- [ ] Usuário admin criado no sistema
- [ ] Pelo menos 2 usuários não-admin para testes

## Fase 1: Testes Automatizados

### 1.1 Executar Script SQL de Teste
- [ ] Abrir SQL Editor no Supabase Dashboard
- [ ] Executar `.kiro/specs/chat-groups-system/test-groups-system.sql`
- [ ] Verificar que todos os testes passaram
- [ ] Confirmar que 3 grupos de teste foram criados

### 1.2 Executar Testes Unitários
```bash
npm test -- src/lib/validations/groupValidations.test.ts --run
npm test -- src/lib/permissions/groupPermissions.test.ts --run
```
- [ ] Todos os 21 testes de validação passaram
- [ ] Todos os testes de permissão passaram

## Fase 2: Testes de Interface Admin

### 2.1 Acessar Página de Grupos
- [ ] Acessar `http://localhost:5173/admin/grupos`
- [ ] Página carrega sem erros
- [ ] Lista de grupos aparece
- [ ] Botão "Novo Grupo" está visível

### 2.2 Criar Grupo Manual
- [ ] Clicar em "Novo Grupo"
- [ ] Modal abre corretamente
- [ ] Preencher nome: "Teste Manual UI"
- [ ] Selecionar tipo: "Manual"
- [ ] Clicar em "Criar Grupo"
- [ ] Grupo aparece na lista
- [ ] Sem erros no console

### 2.3 Criar Grupo de Assinantes
- [ ] Clicar em "Novo Grupo"
- [ ] Preencher nome: "Teste Assinantes UI"
- [ ] Selecionar tipo: "Assinantes"
- [ ] Campos condicionais aparecem
- [ ] Deixar filtros opcionais vazios
- [ ] Criar grupo com sucesso

### 2.4 Criar Grupo de Coleção
- [ ] Clicar em "Novo Grupo"
- [ ] Preencher nome: "Teste Coleção UI"
- [ ] Selecionar tipo: "Coleção"
- [ ] Campo de coleção aparece
- [ ] Selecionar uma coleção existente
- [ ] Criar grupo com sucesso

### 2.5 Validações de Criação
- [ ] Tentar criar grupo com nome vazio (deve falhar)
- [ ] Tentar criar grupo com nome de 2 caracteres (deve falhar)
- [ ] Tentar criar grupo sem selecionar tipo (deve falhar)
- [ ] Tentar criar grupo de coleção sem selecionar coleção (deve falhar)

## Fase 3: Testes de Gerenciamento de Membros

### 3.1 Acessar Detalhes do Grupo Manual
- [ ] Clicar no grupo "Teste Manual UI"
- [ ] Página de detalhes carrega
- [ ] Métricas aparecem (membros, mensagens, taxa)
- [ ] Lista de membros aparece
- [ ] Botão "Adicionar Membro" está visível

### 3.2 Adicionar Membro
- [ ] Clicar em "Adicionar Membro"
- [ ] Modal abre
- [ ] Inserir ID de um usuário válido
- [ ] Clicar em "Adicionar"
- [ ] Membro aparece na lista
- [ ] Contador de membros atualiza

### 3.3 Remover Membro
- [ ] Clicar no ícone de lixeira ao lado de um membro
- [ ] Membro é removido da lista
- [ ] Contador de membros atualiza
- [ ] Sem erros no console

### 3.4 Validações de Membros
- [ ] Tentar adicionar membro com ID inválido (deve falhar)
- [ ] Tentar adicionar mesmo membro duas vezes (deve falhar)
- [ ] Verificar que botão "Adicionar Membro" só aparece em grupos manuais

## Fase 4: Testes de Mensagens

### 4.1 Enviar Mensagem
- [ ] No grupo "Teste Manual UI"
- [ ] Digitar mensagem: "Esta é uma mensagem de teste!"
- [ ] Contador de caracteres funciona (X/5000)
- [ ] Clicar em "Enviar Mensagem"
- [ ] Mensagem aparece na lista
- [ ] Contador de mensagens atualiza

### 4.2 Enviar Mensagem Longa
- [ ] Digitar mensagem com ~1000 caracteres
- [ ] Contador atualiza corretamente
- [ ] Mensagem é enviada com sucesso
- [ ] Mensagem aparece completa na lista

### 4.3 Validações de Mensagem
- [ ] Tentar enviar mensagem vazia (botão desabilitado)
- [ ] Tentar enviar mensagem com 5001 caracteres (deve falhar)
- [ ] Verificar que apenas admins podem enviar

### 4.4 Visualizar Mensagens
- [ ] Lista de mensagens mostra todas as mensagens
- [ ] Mensagens ordenadas por data (mais recente embaixo)
- [ ] Nome do remetente aparece
- [ ] Data/hora relativa aparece ("há 2 minutos")
- [ ] Scroll funciona corretamente

## Fase 5: Testes de Métricas

### 5.1 Verificar Métricas do Grupo
- [ ] Total de membros está correto
- [ ] Total de mensagens está correto
- [ ] Taxa de visualização aparece (pode ser 0%)
- [ ] Métricas atualizam após adicionar membro
- [ ] Métricas atualizam após enviar mensagem

## Fase 6: Testes de Interface de Membro

### 6.1 Fazer Login como Membro
- [ ] Logout do admin
- [ ] Login com usuário que é membro de um grupo
- [ ] Acessar `http://localhost:5173/grupos`
- [ ] Página carrega sem erros

### 6.2 Visualizar Lista de Grupos
- [ ] Grupos do usuário aparecem
- [ ] Nome do grupo está correto
- [ ] Última mensagem aparece (se houver)
- [ ] Contador de não lidas aparece (se houver)
- [ ] Data da última mensagem aparece

### 6.3 Visualizar Mensagens do Grupo
- [ ] Clicar em um grupo
- [ ] Página de mensagens carrega
- [ ] Todas as mensagens aparecem
- [ ] Nome do remetente aparece
- [ ] Avatar do remetente aparece (se houver)
- [ ] Data/hora relativa aparece

### 6.4 Verificar Contador de Não Lidas
- [ ] Admin envia nova mensagem no grupo
- [ ] Voltar para lista de grupos (como membro)
- [ ] Contador de não lidas atualiza
- [ ] Entrar no grupo
- [ ] Contador zera após visualizar

### 6.5 Verificar Realtime
- [ ] Abrir grupo em duas abas (admin e membro)
- [ ] Admin envia mensagem
- [ ] Mensagem aparece em tempo real na aba do membro
- [ ] Sem necessidade de refresh

## Fase 7: Testes de Segurança

### 7.1 Permissões de Admin
- [ ] Usuário não-admin não consegue acessar `/admin/grupos`
- [ ] Usuário não-admin não consegue criar grupos
- [ ] Usuário não-admin não consegue enviar mensagens

### 7.2 Permissões de Membro
- [ ] Membro só vê grupos que participa
- [ ] Membro não consegue acessar grupos que não participa
- [ ] Membro não consegue adicionar/remover membros
- [ ] Membro não consegue deletar grupos

### 7.3 RLS Policies
- [ ] Tentar acessar grupo via API sem ser membro (deve falhar)
- [ ] Tentar enviar mensagem via API sem ser admin (deve falhar)
- [ ] Verificar que dados são filtrados corretamente

## Fase 8: Testes de Background Jobs

### 8.1 Verificar Auto-Sync (se configurado)
- [ ] Criar grupo de assinantes
- [ ] Aguardar 15 minutos (ou executar manualmente)
- [ ] Verificar que membros foram adicionados automaticamente
- [ ] Verificar logs: `npx supabase functions logs auto-sync-groups`

### 8.2 Verificar Email Batch (se configurado)
- [ ] Enviar mensagem em grupo
- [ ] Aguardar 2 minutos (ou executar manualmente)
- [ ] Verificar que emails foram enviados
- [ ] Verificar logs: `npx supabase functions logs send-group-emails-batch`

## Fase 9: Testes de Edge Cases

### 9.1 Grupo Vazio
- [ ] Criar grupo manual sem membros
- [ ] Enviar mensagem
- [ ] Verificar que não há erros
- [ ] Mensagem é armazenada corretamente

### 9.2 Grupo com Muitos Membros
- [ ] Adicionar 10+ membros em um grupo
- [ ] Enviar mensagem
- [ ] Verificar performance
- [ ] Paginação funciona (se houver)

### 9.3 Mensagens com Caracteres Especiais
- [ ] Enviar mensagem com emojis: "Olá! 👋 🎉"
- [ ] Enviar mensagem com quebras de linha
- [ ] Enviar mensagem com caracteres especiais: `<>&"'`
- [ ] Todas renderizam corretamente

### 9.4 Soft Delete
- [ ] Deletar um grupo (se implementado)
- [ ] Grupo não aparece mais na lista
- [ ] Dados históricos preservados no banco
- [ ] Membros não conseguem mais acessar

## Fase 10: Testes de Performance

### 10.1 Tempo de Carregamento
- [ ] Página de grupos carrega em < 2 segundos
- [ ] Lista de mensagens carrega em < 2 segundos
- [ ] Envio de mensagem responde em < 1 segundo

### 10.2 Responsividade
- [ ] Interface funciona em mobile (< 768px)
- [ ] Interface funciona em tablet (768px - 1024px)
- [ ] Interface funciona em desktop (> 1024px)

## Fase 11: Testes de Console

### 11.1 Verificar Erros no Console
- [ ] Nenhum erro no console durante navegação
- [ ] Nenhum warning crítico
- [ ] Requests HTTP retornam 200/201

### 11.2 Verificar Network
- [ ] Requests são eficientes (não há duplicatas)
- [ ] Realtime conecta corretamente
- [ ] Queries são otimizadas

## Resumo Final

### Estatísticas
- Total de testes: ~100
- Testes passados: ___
- Testes falhados: ___
- Bugs encontrados: ___

### Bugs Críticos Encontrados
1. 
2. 
3. 

### Melhorias Sugeridas
1. 
2. 
3. 

### Status Geral
- [ ] Sistema pronto para produção
- [ ] Sistema precisa de ajustes
- [ ] Sistema precisa de correções críticas

### Assinatura
- Testado por: _______________
- Data: _______________
- Versão: 1.0.0
