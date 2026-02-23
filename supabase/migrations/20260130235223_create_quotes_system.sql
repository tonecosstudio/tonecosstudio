-- Create quotes system tables

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  deadline text,
  notes text
);

-- Quote items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  scale text NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_model_id ON public.quote_items(model_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_quotes_updated_at ON public.quotes;
CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
-- Users can read their own quotes
DROP POLICY IF EXISTS "users_select_own_quotes" ON public.quotes;
CREATE POLICY "users_select_own_quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own quotes
DROP POLICY IF EXISTS "users_insert_own_quotes" ON public.quotes;
CREATE POLICY "users_insert_own_quotes"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own quotes
DROP POLICY IF EXISTS "users_update_own_quotes" ON public.quotes;
CREATE POLICY "users_update_own_quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can read all quotes
DROP POLICY IF EXISTS "admins_select_quotes" ON public.quotes;
CREATE POLICY "admins_select_quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all quotes (for status changes)
DROP POLICY IF EXISTS "admins_update_quotes" ON public.quotes;
CREATE POLICY "admins_update_quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quote_items
-- Users can read items from their own quotes
DROP POLICY IF EXISTS "users_select_own_quote_items" ON public.quote_items;
CREATE POLICY "users_select_own_quote_items"
ON public.quote_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  )
);

-- Users can insert items to their own quotes
DROP POLICY IF EXISTS "users_insert_own_quote_items" ON public.quote_items;
CREATE POLICY "users_insert_own_quote_items"
ON public.quote_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  )
);

-- Users can delete items from their own quotes
DROP POLICY IF EXISTS "users_delete_own_quote_items" ON public.quote_items;
CREATE POLICY "users_delete_own_quote_items"
ON public.quote_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  )
);

-- Admins can read all quote items
DROP POLICY IF EXISTS "admins_select_quote_items" ON public.quote_items;
CREATE POLICY "admins_select_quote_items"
ON public.quote_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
