# Requirements Document - Sistema de Broadcast para E-commerce

## Introduction

Este documento especifica os requisitos para um sistema MINIMALISTA de broadcast de mensagens para e-commerce de action figures. O foco é comunicação segmentada admin→clientes, NÃO uma plataforma de chat completa. O sistema permite que administradores enviem mensagens para grupos automáticos de clientes baseados em assinaturas, coleções e pedidos. Membros APENAS RECEBEM mensagens (sem resposta na V1).

## Glossary

- **Broadcast_System**: Sistema de broadcast de mensagens para grupos de clientes
- **Group**: Entidade que representa um grupo de broadcast com membros
- **Group_Member**: Relação entre um usuário e um grupo (apenas recebe mensagens)
- **Group_Message**: Mensagem broadcast enviada pelo admin
- **Admin**: Usuário que pode criar grupos e enviar mensagens broadcast
- **Member**: Usuário que recebe mensagens broadcast (sem permissão de resposta na V1)
- **Membership_Criteria**: Regras que determinam quais usuários pertencem a um grupo automático
- **Auto_Sync_Job**: Job assíncrono que sincroniza membros baseado em critérios
- **Group_Type**: Tipo de grupo (manual, assinantes, coleção, lançamentos, pedidos)
- **Last_Viewed_At**: Timestamp da última visualização do grupo pelo membro (para calcular não lidas)
- **Realtime_Channel**: Canal Supabase Realtime por grupo (não por membro)
- **Email_Batch_Job**: Job assíncrono que envia emails em lote
- **Taxa_Abertura_Estimada**: % membros que abriram grupo após última mensagem
- **Soft_Delete**: Deleção lógica que preserva dados mas torna invisível
- **Existing_Chat_System**: Sistema de chat 1-para-1 já implementado
- **Attachment_System**: Sistema de anexos já implementado
- **Notification_System**: Sistema de notificações por email já implementado
- **Realtime_System**: Sistema Supabase Realtime já implementado

## Requirements

### Requirement 1: Criar Grupos Manualmente

**User Story:** Como admin, eu quero criar grupos manualmente, para que eu possa enviar mensagens para grupos customizados de clientes.

#### Acceptance Criteria

1. WHEN o Admin solicita criar um grupo manual, THE Broadcast_System SHALL criar um Group com nome e tipo "manual"
2. THE Broadcast_System SHALL validar que o nome do grupo tem entre 3 e 100 caracteres
3. THE Broadcast_System SHALL registrar o Admin como criador do Group
4. THE Broadcast_System SHALL retornar erro descritivo se a validação falhar

### Requirement 2: Adicionar Membros Manualmente

**User Story:** Como admin, eu quero adicionar membros manualmente a um grupo, para que eu possa incluir clientes específicos em broadcasts.

#### Acceptance Criteria

1. WHEN o Admin adiciona um usuário a um grupo manual, THE Broadcast_System SHALL criar um Group_Member vinculando o usuário ao Group
2. THE Broadcast_System SHALL validar que o usuário existe no sistema antes de adicionar
3. THE Broadcast_System SHALL prevenir duplicação de membros no mesmo grupo
4. IF o usuário já é membro, THEN THE Broadcast_System SHALL retornar mensagem informativa sem erro

### Requirement 3: Remover Membros Manualmente

**User Story:** Como admin, eu quero remover membros de um grupo, para que eu possa gerenciar a composição dos grupos.

#### Acceptance Criteria

1. WHEN o Admin remove um membro de um grupo, THE Broadcast_System SHALL deletar o Group_Member correspondente
2. THE Broadcast_System SHALL preservar o histórico de mensagens do grupo
3. THE Broadcast_System SHALL impedir que o membro removido receba novas mensagens do grupo

### Requirement 4: Criar Grupos de Assinantes

**User Story:** Como admin, eu quero criar grupos automáticos de assinantes, para que eu possa comunicar com clientes com assinaturas ativas.

#### Acceptance Criteria

1. WHEN o Admin cria um grupo tipo "assinantes", THE Broadcast_System SHALL criar um Group com Membership_Criteria baseado em assinaturas ativas
2. WHERE filtros opcionais são especificados (coleção, plano), THE Broadcast_System SHALL aplicar os filtros aos Membership_Criteria
3. THE Broadcast_System SHALL adicionar automaticamente todos os usuários com assinaturas ativas que atendem aos critérios

### Requirement 5: Criar Grupos de Coleção Específica

**User Story:** Como admin, eu quero criar grupos para assinantes de uma coleção específica, para que eu possa enviar comunicações relevantes sobre aquela coleção.

#### Acceptance Criteria

1. WHEN o Admin cria um grupo tipo "coleção", THE Broadcast_System SHALL criar um Group com Membership_Criteria vinculado a uma coleção específica
2. THE Broadcast_System SHALL validar que a coleção existe antes de criar o grupo
3. THE Broadcast_System SHALL adicionar automaticamente todos os assinantes da coleção especificada

### Requirement 6: Criar Grupos de Lançamentos

**User Story:** Como admin, eu quero criar grupos de lançamentos, para que eu possa notificar clientes sobre novos produtos e pré-vendas.

#### Acceptance Criteria

1. WHEN o Admin cria um grupo tipo "lançamentos", THE Broadcast_System SHALL criar um Group com Membership_Criteria configurável
2. WHERE critério "todos usuários" é selecionado, THE Broadcast_System SHALL adicionar todos os usuários registrados
3. WHERE critério "compradores anteriores" é selecionado, THE Broadcast_System SHALL adicionar apenas usuários com pedidos concluídos

### Requirement 7: Criar Grupos Baseados em Pedidos

**User Story:** Como admin, eu quero criar grupos baseados em status ou período de pedidos, para que eu possa comunicar com clientes sobre seus pedidos específicos.

#### Acceptance Criteria

1. WHEN o Admin cria um grupo tipo "pedidos", THE Broadcast_System SHALL criar um Group com Membership_Criteria baseado em status e/ou período de pedidos
2. THE Broadcast_System SHALL permitir filtros por status de pedido (pendente, processando, enviado, entregue)
3. THE Broadcast_System SHALL permitir filtros por período de data dos pedidos
4. THE Broadcast_System SHALL adicionar automaticamente usuários com pedidos que atendem aos critérios

### Requirement 8: Enviar Mensagens Broadcast

**User Story:** Como admin, eu quero enviar mensagens para todos os membros de um grupo, para que eu possa comunicar informações importantes de forma eficiente.

#### Acceptance Criteria

1. WHEN o Admin envia uma mensagem em um grupo, THE Broadcast_System SHALL criar um Group_Message vinculado ao Group
2. THE Broadcast_System SHALL validar que a mensagem tem entre 1 e 5000 caracteres
3. THE Broadcast_System SHALL registrar o Admin como remetente da mensagem
4. THE Broadcast_System SHALL persistir a mensagem UMA VEZ na tabela group_messages
5. THE Broadcast_System SHALL entregar a mensagem via Realtime_Channel do grupo (não por membro individual)
6. THE Broadcast_System SHALL agendar envio de emails em Email_Batch_Job assíncrono para membros offline

### Requirement 9: Anexar Arquivos em Mensagens de Grupo

**User Story:** Como admin, eu quero anexar arquivos às mensagens de grupo, para que eu possa compartilhar imagens e documentos com os membros.

#### Acceptance Criteria

1. WHEN o Admin anexa um arquivo a uma mensagem de grupo, THE Broadcast_System SHALL reutilizar o Attachment_System existente
2. THE Broadcast_System SHALL vincular o anexo ao Group_Message correspondente
3. THE Broadcast_System SHALL validar tipo e tamanho do arquivo conforme regras do Attachment_System
4. THE Broadcast_System SHALL gerar URL de acesso ao anexo para todos os membros do grupo

### Requirement 10: Receber Mensagens em Tempo Real

**User Story:** Como membro, eu quero receber mensagens de grupo em tempo real, para que eu possa acompanhar as comunicações imediatamente.

#### Acceptance Criteria

1. WHEN uma Group_Message é criada, THE Broadcast_System SHALL utilizar o Realtime_System para notificar todos os Group_Members
2. THE Broadcast_System SHALL entregar a mensagem apenas para membros ativos do grupo
3. THE Broadcast_System SHALL incluir informações do remetente, conteúdo e timestamp na notificação
4. WHERE a mensagem contém anexos, THE Broadcast_System SHALL incluir URLs dos anexos na notificação

### Requirement 11: Notificações por Email

**User Story:** Como membro, eu quero receber notificações por email de mensagens de grupo quando estou offline, para que eu não perca comunicações importantes.

#### Acceptance Criteria

1. WHEN uma Group_Message é criada, THE Broadcast_System SHALL utilizar o Notification_System para enviar email aos Group_Members offline
2. THE Broadcast_System SHALL incluir nome do grupo, remetente e preview da mensagem no email
3. THE Broadcast_System SHALL incluir link direto para visualizar a mensagem completa no sistema
4. WHERE o Member tem preferências de notificação desabilitadas, THE Broadcast_System SHALL respeitar as preferências

### Requirement 12: Contador de Mensagens Não Lidas

**User Story:** Como membro, eu quero ver quantas mensagens não lidas tenho em cada grupo, para que eu possa priorizar quais grupos verificar.

#### Acceptance Criteria

1. THE Broadcast_System SHALL armazenar Last_Viewed_At para cada Member em cada Group
2. THE Broadcast_System SHALL calcular mensagens não lidas como COUNT(mensagens criadas após Last_Viewed_At)
3. WHEN um Member visualiza um grupo, THE Broadcast_System SHALL atualizar Last_Viewed_At para o timestamp atual
4. THE Broadcast_System SHALL exibir o contador de não lidas na lista de grupos do Member

### Requirement 13: Listar Grupos do Membro

**User Story:** Como membro, eu quero ver todos os grupos dos quais faço parte, para que eu possa acessar as comunicações relevantes.

#### Acceptance Criteria

1. WHEN um Member solicita sua lista de grupos, THE Broadcast_System SHALL retornar todos os Groups onde ele é Group_Member ativo
2. THE Broadcast_System SHALL incluir nome e contador de não lidas de cada grupo
3. THE Broadcast_System SHALL incluir a última mensagem de cada grupo com timestamp
4. THE Broadcast_System SHALL ordenar os grupos por timestamp da última mensagem (mais recente primeiro)

### Requirement 14: Visualizar Histórico de Mensagens

**User Story:** Como membro, eu quero visualizar o histórico completo de mensagens de um grupo, para que eu possa revisar comunicações anteriores.

#### Acceptance Criteria

1. WHEN um Member acessa um Group, THE Broadcast_System SHALL retornar todas as Group_Messages do grupo em ordem cronológica
2. THE Broadcast_System SHALL incluir informações do remetente (nome, avatar) em cada mensagem
3. THE Broadcast_System SHALL incluir anexos vinculados a cada mensagem
4. THE Broadcast_System SHALL implementar paginação para grupos com muitas mensagens (50 mensagens por página)

### Requirement 15: Deletar Grupos (Soft Delete)

**User Story:** Como admin, eu quero deletar grupos, para que eu possa remover grupos criados por engano ou que não são mais necessários, preservando histórico para auditoria.

#### Acceptance Criteria

1. WHEN o Admin deleta um Group, THE Broadcast_System SHALL marcar o Group como deletado (soft delete) com deleted_at timestamp
2. THE Broadcast_System SHALL registrar o Admin responsável pela deleção em deleted_by
3. THE Broadcast_System SHALL tornar o Group invisível para todos os usuários (admin e membros)
4. THE Broadcast_System SHALL preservar todos os Group_Members e Group_Messages para histórico e auditoria
5. THE Broadcast_System SHALL solicitar confirmação antes de executar a deleção

### Requirement 16: Métricas Básicas de Grupos

**User Story:** Como admin, eu quero visualizar métricas básicas dos grupos, para que eu possa avaliar o alcance das comunicações.

#### Acceptance Criteria

1. THE Broadcast_System SHALL calcular total de membros ativos para cada Group
2. THE Broadcast_System SHALL calcular total de mensagens enviadas em cada Group
3. THE Broadcast_System SHALL calcular Taxa_Abertura_Estimada como percentual de membros que abriram o grupo após a última mensagem
4. THE Broadcast_System SHALL basear Taxa_Abertura_Estimada em Last_Viewed_At dos membros (não garante leitura completa do conteúdo)

### Requirement 17: Sincronização Automática de Membros via Job

**User Story:** Como admin, eu quero que o sistema sincronize automaticamente os membros de grupos automáticos, para que eu não precise gerenciar manualmente as mudanças.

#### Acceptance Criteria

1. THE Broadcast_System SHALL executar Auto_Sync_Job a cada 10-15 minutos (configurável)
2. THE Auto_Sync_Job SHALL avaliar Membership_Criteria de cada grupo automático não deletado
3. THE Auto_Sync_Job SHALL adicionar novos membros que atendem aos Membership_Criteria
4. THE Auto_Sync_Job SHALL remover membros que não atendem mais aos Membership_Criteria
5. THE Broadcast_System SHALL refletir mudanças em assinaturas/pedidos no grupo em até 15 minutos (não é sincronização em tempo real)

### Requirement 18: Validar Permissões de Acesso

**User Story:** Como sistema, eu quero validar permissões antes de permitir ações, para que apenas usuários autorizados possam executar operações sensíveis.

#### Acceptance Criteria

1. THE Broadcast_System SHALL validar que apenas Admins podem criar, editar e deletar grupos
2. THE Broadcast_System SHALL validar que apenas Admins podem enviar mensagens em grupos
3. THE Broadcast_System SHALL validar que apenas Group_Members ativos podem visualizar mensagens do grupo
4. THE Broadcast_System SHALL retornar erro 403 (Forbidden) para tentativas de acesso não autorizado

## Correctness Properties

### Property 1: Membership Consistency (Invariant)
FOR ALL Groups g, FOR ALL Group_Members m in g:
- IF g.type = "manual" THEN m foi adicionado explicitamente por Admin
- IF g.type = "assinantes" THEN m tem assinatura ativa que atende aos Membership_Criteria
- IF g.type = "coleção" THEN m tem assinatura ativa da coleção especificada
- IF g.type = "lançamentos" THEN m atende aos critérios configurados
- IF g.type = "pedidos" THEN m tem pedidos que atendem aos Membership_Criteria

### Property 2: Message Delivery Scalability (Invariant)
FOR ALL Group_Messages msg in Group g:
- msg é persistida UMA VEZ na tabela group_messages
- msg é entregue via Realtime_Channel do grupo (não por membro individual)
- Emails são enviados em batch assíncrono via Email_Batch_Job para membros offline
- NÃO há criação de delivery rows por membro (evita explosão de tabela)
- NÃO há garantia de entrega síncrona perfeita (trade-off de escalabilidade)

### Property 3: Unread Counter Accuracy (Metamorphic Property)
FOR ALL Group_Members m in Group g:
- Unread_Counter(m, g) = COUNT(mensagens em g criadas após Last_Viewed_At de m)
- WHEN m visualiza o grupo, Unread_Counter(m, g) = 0
- Unread_Counter(m, g) >= 0

### Property 4: Auto-Sync Idempotence
FOR ALL Groups g com Membership_Criteria:
- Executar Auto_Sync_Job(g) múltiplas vezes sem mudanças nos dados = executar uma vez
- Auto_Sync_Job(Auto_Sync_Job(g)) = Auto_Sync_Job(g)

### Property 5: Broadcast-Only Enforcement (Invariant)
FOR ALL Group_Messages msg in Group g:
- msg.sender é sempre Admin (membros não podem enviar mensagens na V1)

### Property 6: Chronological Ordering (Invariant)
FOR ALL Group_Messages msg1, msg2 in Group g:
- IF msg1.created_at < msg2.created_at THEN msg1 aparece antes de msg2 no histórico
- Ordem de mensagens é consistente para todos os Group_Members

### Property 7: Notification Delivery (Invariant)
FOR ALL Group_Messages msg in Group g:
- Cada Group_Member ativo recebe notificação via Realtime_System
- Cada Group_Member offline com preferências habilitadas recebe notificação via email
- WHERE Member tem preferências de notificação desabilitadas, email não é enviado

### Property 8: Soft Deletion Completeness (Invariant)
WHEN Group g é deletado (soft delete):
- g.deleted_at é definido com timestamp atual
- g.deleted_by é definido com ID do Admin responsável
- g torna-se invisível para todos os usuários (admin e membros)
- Todos os Group_Members e Group_Messages são preservados para auditoria
- g pode ser restaurado no futuro (funcionalidade futura)

### Property 9: Access Control Enforcement (Invariant)
FOR ALL operações op em Group g:
- IF op = {criar, editar, deletar, enviar mensagem} THEN usuário é Admin
- IF op = {visualizar mensagens} THEN usuário é Group_Member ativo de g
- Violações retornam erro 403

---

## Technical Notes

### Scalability Considerations

1. **Message Delivery:**
   - Messages stored once in `group_messages` table
   - Realtime delivery via Supabase channel per group (not per member)
   - Email notifications sent in async batches (not synchronous)
   - No per-member delivery tracking to avoid table explosion

2. **Auto-Sync Timing:**
   - Job runs every 10-15 minutes (configurable)
   - Changes in subscriptions/orders reflect in groups within 15 minutes
   - Not real-time synchronization to reduce database load

3. **View Tracking:**
   - Only `last_viewed_at` timestamp per member
   - "Open Rate" = % members who opened group after last message
   - Does NOT guarantee message was read completely
   - Avoids millions of read_receipt rows

4. **Soft Delete:**
   - Groups marked as deleted (`deleted_at` timestamp)
   - Historical data preserved for audit/analytics
   - Invisible to users but recoverable if needed

### Database Schema Simplification

Minimal tables:
- `chat_groups` (id, name, type, criteria, deleted_at, deleted_by)
- `chat_group_members` (group_id, user_id, last_viewed_at)
- `chat_group_messages` (id, group_id, sender_id, message, created_at)
- `chat_group_attachments` (reuses existing attachment system)

NO tables for:
- read_receipts (use last_viewed_at instead)
- delivery_tracking (use Realtime channels)
- message_status (not needed for broadcast-only)

---

## Notes

Este documento define os requisitos para um MVP ENXUTO de broadcast de mensagens para e-commerce de action figures. O foco é comunicação admin→clientes, NÃO uma plataforma de chat completa.

Simplificações da V1:
- Membros APENAS RECEBEM mensagens (sem resposta)
- Sincronização via JOB ASSÍNCRONO (não trigger em tempo real)
- Contador de não lidas SIMPLES (Last_Viewed_At, não read receipts por mensagem)
- Notificações CONDICIONAIS (realtime sempre, email se offline + preferências)
- Métricas BÁSICAS (total membros, total mensagens, % visualização estimado)
- SEM busca full-text
- SEM editar/arquivar grupos (apenas criar/deletar)
- SEM dashboard complexo
- SEM notificação ao ser adicionado

Reutilização de infraestrutura existente:
- Attachment_System para anexos
- Notification_System para emails
- Realtime_System para mensagens em tempo real
- Componentes de UI do chat 1-para-1

Estimativa: 3-4 dias de desenvolvimento (vs 7-12 dias do spec original)
