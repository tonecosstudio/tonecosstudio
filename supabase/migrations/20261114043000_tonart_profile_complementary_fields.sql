-- TONART: extend the one Auth-owned customer profile. No parallel identity,
-- personal-data table, quote migration or external notification dispatch.
alter table public.profiles
  add column whatsapp text,
  add column delivery_address jsonb,
  add column preferred_contact_channel text,
  add column quote_updates boolean not null default false,
  add column production_updates boolean not null default false,
  add column marketing_emails boolean not null default false;

alter table public.profiles
  add constraint tonart_profile_whatsapp_shape
    check (whatsapp is null or whatsapp ~ '^(55)?[1-9][0-9]{9,10}$'),
  add constraint tonart_profile_contact_channel
    check (preferred_contact_channel is null or
      preferred_contact_channel in ('email', 'whatsapp', 'phone')),
  add constraint tonart_profile_delivery_address_shape
    check (
      delivery_address is null or coalesce((
        jsonb_typeof(delivery_address) = 'object'
        and (delivery_address - 'street' - 'number' - 'complement'
          - 'neighborhood' - 'city' - 'state' - 'zipCode'
          - 'country') = '{}'::jsonb
        and jsonb_typeof(delivery_address->'street') = 'string'
        and length(delivery_address->>'street') between 1 and 160
        and jsonb_typeof(delivery_address->'number') = 'string'
        and length(delivery_address->>'number') between 1 and 20
        and (not delivery_address ? 'complement' or (
          jsonb_typeof(delivery_address->'complement') = 'string'
          and length(delivery_address->>'complement') <= 160
        ))
        and jsonb_typeof(delivery_address->'neighborhood') = 'string'
        and length(delivery_address->>'neighborhood') between 1 and 100
        and jsonb_typeof(delivery_address->'city') = 'string'
        and length(delivery_address->>'city') between 1 and 100
        and jsonb_typeof(delivery_address->'state') = 'string'
        and (delivery_address->>'state') in
          ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT',
           'MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR',
           'SC','SP','SE','TO')
        and jsonb_typeof(delivery_address->'zipCode') = 'string'
        and (delivery_address->>'zipCode') ~ '^[0-9]{8}$'
        and jsonb_typeof(delivery_address->'country') = 'string'
        and delivery_address->>'country' = 'BR'
      ),false)
    );

-- Preserve the existing authenticated, own-id UPDATE + SELECT RLS policies.
-- Columns such as identity/email/created_at remain unmodifiable by the client.
grant update (
  whatsapp, delivery_address, preferred_contact_channel,
  quote_updates, production_updates, marketing_emails
) on public.profiles to authenticated;

comment on column public.profiles.whatsapp is
  'Optional persistent contact of the customer; not the WhatsApp stored on a quote.';
comment on column public.profiles.delivery_address is
  'Canonical optional customer delivery address; a quote CEP is not a saved address.';
comment on column public.profiles.preferred_contact_channel is
  'Customer contact preference, not permission to contact via unconfigured channels.';
comment on column public.profiles.quote_updates is
  'Opt-in preference only: no email, SMS, or WhatsApp dispatch is implied.';
comment on column public.profiles.production_updates is
  'Opt-in preference only: a quote does not imply an active production order.';
comment on column public.profiles.marketing_emails is
  'Explicit opt-in for campaigns; defaults false and does not trigger a subscription.';
notify pgrst, 'reload schema';
