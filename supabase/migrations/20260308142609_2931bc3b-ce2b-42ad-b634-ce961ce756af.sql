
-- 9. QUOTE_ITEMS
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES public.collection_characters(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quote items" ON public.quote_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid()));
CREATE POLICY "Admins can manage quote items" ON public.quote_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 11. USER_NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own user_notifications" ON public.user_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own user_notifications" ON public.user_notifications FOR UPDATE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification settings" ON public.user_notification_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own notification settings" ON public.user_notification_settings FOR ALL USING (user_id = auth.uid());

-- 12. SUPPORT_CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'normal',
  assigned_to uuid,
  last_message_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.support_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create conversations" ON public.support_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage conversations" ON public.support_conversations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 13. SUPPORT_MESSAGES
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in own conversations" ON public.support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.support_conversations sc WHERE sc.id = support_messages.conversation_id AND (sc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))) AND (is_internal = false OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users can send messages" ON public.support_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admins can manage messages" ON public.support_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 14. SUPPORT_ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT 'application/octet-stream',
  thumbnail_path text,
  uploaded_by uuid NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view attachments in own conversations" ON public.support_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM public.support_messages sm JOIN public.support_conversations sc ON sc.id = sm.conversation_id WHERE sm.id = support_attachments.message_id AND (sc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admins can manage attachments" ON public.support_attachments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
