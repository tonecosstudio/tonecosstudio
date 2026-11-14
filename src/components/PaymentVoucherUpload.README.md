# PaymentVoucherUpload

`PaymentVoucherUpload` envia comprovantes de pagamento para o bucket privado
`payment-vouchers` do Supabase Storage.

## Contrato de segurança

- o bucket **deve permanecer privado** (`public = false`);
- somente usuários autenticados podem enviar arquivos;
- o objeto fica em `subscriptions/<user-id>/<arquivo>` ou, para uma pré-venda do catálogo, `quotes/<user-id>/<quote-id>/<arquivo>`;
- a policy de `storage.objects` deve conferir que o `<user-id>` do caminho é o
  mesmo `auth.uid()` e, no caso de `quotes`, que a solicitação é uma pré-venda
  pertencente à conta atual;
- administradores podem ler comprovantes conforme a policy do bucket;
- o componente retorna apenas o **object path** privado, nunca `getPublicUrl()`;
- URLs públicas ou signed URLs de longa duração não devem ser persistidas nas
  tabelas de assinatura/pagamento;
- tamanho máximo: 5 MB;
- MIME types aceitos: JPEG, PNG e PDF.

A configuração canônica do bucket e das policies está em:

`supabase/migrations/20260915205645_secure_payment_voucher_storage.sql` and the
quote extension `supabase/migrations/20261114140837_tonart_preorder_quote_payment_flow.sql`.

Não recrie o bucket manualmente como público e não adicione policy de leitura
para `public` ou `anon`.

## Uso

```tsx
<PaymentVoucherUpload
  userId={user.id}
  pathPrefix="subscriptions"
  onUploadSuccess={(path) => setVoucherPath(path)}
  onUploadError={(message) => reportUploadError(message)}
/>
```

`pathPrefix` usa `subscriptions` por padrão. Para uma pré-venda use
`quotes:<quote-id>`; o serviço valida o UUID e monta o caminho com o usuário
autenticado. Outros destinos continuam rejeitados.

## Estrutura do objeto

```text
payment-vouchers/
└── subscriptions/
    └── <auth.uid()>/
        └── <timestamp>-<random-token>.<ext>

payment-vouchers/
└── quotes/
    └── <auth.uid()>/
        └── <quote-id>/
            └── <timestamp>-<random-token>.<ext>
```

Exemplo:

```text
subscriptions/11111111-1111-4111-8111-111111111111/1788130800000-a1b2c3d4e5f60708.jpg
quotes/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/1788130800000-a1b2c3d4e5f60708.jpg
```

O caminho salvo no banco não inclui URL, host ou token temporário.

## Validação

A validação acontece em camadas:

1. frontend rejeita tamanho, MIME e extensão incompatíveis;
2. o serviço exige sessão autenticada e vincula o caminho ao usuário atual;
3. o bucket limita tamanho e MIME types;
4. RLS de `storage.objects` valida propriedade do caminho;
5. o RPC de checkout valida novamente o formato e o `auth.uid()` antes de salvar.

A validação do navegador melhora UX; as fronteiras de segurança continuam no
Storage e no banco.

## Props principais

| Prop | Tipo | Obrigatório | Padrão | Uso |
| --- | --- | --- | --- | --- |
| `onUploadSuccess` | `(path: string, file: File) => void` | sim | — | recebe o object path privado |
| `onUploadError` | `(error: string) => void` | não | — | recebe falhas de validação/upload |
| `userId` | `string` | não | sessão atual | quando informado, deve ser o usuário autenticado |
| `pathPrefix` | `string` | não | `subscriptions` | namespace permitido pelo contrato atual |
| `disabled` | `boolean` | não | `false` | bloqueia seleção e drop |
| `showPreview` | `boolean` | não | `true` | usa apenas `blob:` local para preview |

## Testes

```bash
npm test -- src/components/__tests__/PaymentVoucherUpload.test.tsx
```

Os testes devem garantir, no mínimo, autenticação obrigatória, caminho privado
por usuário, ausência de URL pública, validação de arquivo e tratamento de RLS.
