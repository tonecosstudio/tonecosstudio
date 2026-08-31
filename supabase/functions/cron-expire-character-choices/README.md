# cron-expire-character-choices

Expira solicitações de escolha de personagem cujo prazo persistido terminou.

## Autoridade de estado

Antes de o cliente escolher um personagem, a autoridade é `production_queue`.

A função processa somente itens com:

- `current_stage = 'awaiting_choice'`;
- `choice_status = 'pending'`;
- `choice_deadline < now()`;
- identidade de pedido, usuário e coleção válida.

O prazo inicial é criado pelo backend a partir de `system_settings.character_choice_days`. A função
não conhece nem assume uma duração fixa.

## Expiração

Para cada solicitação vencida, a função:

1. muda `production_queue.choice_status` para `expired`;
2. adiciona `choice_expired` a `internal_flags`;
3. tenta sincronizar eventual linha legada `character_choices` ainda em `pending`;
4. tenta notificar o administrador usando os dados reais do perfil, coleção e prazo persistido;
5. registra o resultado no log do cron.

A mudança de estado ocorre antes do envio do e-mail. Assim, uma falha de notificação não mantém o
pedido artificialmente pendente nem provoca reprocessamento infinito da mesma expiração.

## Segurança e tempo

A função exige o segredo compartilhado e rate-limited do cron. Comparações de `timestamptz` usam o
instante UTC real (`new Date().toISOString()`). `America/Bahia` é usado somente para apresentação ao
usuário, não para deslocar artificialmente o instante armazenado.

## Operação administrativa

Depois de uma expiração, o pedido deve ser revisado no painel de produção. Atribuição manual de
personagem precisa respeitar a coleção e a disponibilidade real; a função não escolhe personagem
automaticamente.

## Deploy e prova

Este README descreve somente o código versionado. Deploy da Edge Function, agendamento real,
permissões e envio de e-mail precisam ser comprovados no projeto Supabase ativo antes de lançamento.
