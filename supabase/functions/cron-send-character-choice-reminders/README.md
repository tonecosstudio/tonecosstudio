# cron-send-character-choice-reminders

Envia lembretes para pedidos que **ainda aguardam a escolha de personagem**.

## Autoridade de estado

O estado anterior à escolha pertence a `production_queue`, não a `character_choices`.

Um pedido elegível precisa ter:

- `current_stage = 'awaiting_choice'`;
- `choice_status = 'pending'`;
- `choice_deadline` persistido;
- `user_id`, `order_id`, `order_type` e `collection_id` válidos.

A janela é aberta pelo trigger versionado em
`20260831061000_canonical_character_choice_window.sql`, usando exclusivamente
`system_settings.character_choice_days`. Ausência ou valor inválido bloqueia a abertura; não há
fallback de sete dias no cron ou no navegador.

## Lembretes

A função procura pedidos cujo `choice_deadline` esteja a 5, 2 ou 1 dia, considerando o dia civil de
`America/Bahia`. O instante armazenado continua sendo comparado como `timestamptz` real.

O envio é auditado em:

- `production_queue.choice_reminders_sent`;
- `production_queue.choice_last_reminder_at`.

Um pedido não recebe mais de um lembrete no mesmo dia civil de Bahia.

## Segurança

A função exige o segredo compartilhado e rate-limited do cron. Credenciais de serviço e de e-mail
são server-only e não devem aparecer em variáveis `VITE_*`.

## Falhas

Falha de consulta, perfil, coleção, envio ou persistência do audit trail é registrada. A função não
fabrica deadline, usuário, coleção ou endereço de e-mail quando a fonte oficial está ausente.

## Deploy e prova

Este arquivo descreve o código versionado. Deploy da Edge Function, agendamento real e entrega de
e-mail precisam ser comprovados no projeto Supabase ativo antes de lançamento.
