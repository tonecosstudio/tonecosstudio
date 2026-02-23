
-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Chat Group Members table (BEFORE chat_groups policies that reference it)
CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 4. Chat Groups table
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'manual',
  membership_criteria JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Now add FK on chat_group_members
ALTER TABLE public.chat_group_members
  ADD CONSTRAINT fk_chat_group_members_group
  FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with groups" ON public.chat_groups
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their groups" ON public.chat_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE chat_group_members.group_id = chat_groups.id
      AND chat_group_members.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_chat_groups_updated_at
  BEFORE UPDATE ON public.chat_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for chat_group_members
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage members" ON public.chat_group_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own memberships" ON public.chat_group_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own last_viewed_at" ON public.chat_group_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Chat Group Messages table
CREATE TABLE public.chat_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage messages" ON public.chat_group_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view group messages" ON public.chat_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_chat_group_messages_updated_at
  BEFORE UPDATE ON public.chat_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Chat Group Attachments table
CREATE TABLE public.chat_group_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_group_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_group_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attachments" ON public.chat_group_attachments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view group attachments" ON public.chat_group_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_messages m
      JOIN public.chat_group_members mem ON mem.group_id = m.group_id
      WHERE m.id = chat_group_attachments.message_id
      AND mem.user_id = auth.uid()
    )
  );

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_messages;
