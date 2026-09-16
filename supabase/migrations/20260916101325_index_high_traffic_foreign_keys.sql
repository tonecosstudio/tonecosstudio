-- Cover high-traffic foreign keys without changing application semantics.
-- All affected relations were small at audit time, so regular CREATE INDEX is appropriate.

CREATE INDEX IF NOT EXISTS idx_character_choices_approved_by
  ON public.character_choices (approved_by);
CREATE INDEX IF NOT EXISTS idx_character_choices_collection_id
  ON public.character_choices (collection_id);
CREATE INDEX IF NOT EXISTS idx_character_choices_previous_choice_id
  ON public.character_choices (previous_choice_id);
CREATE INDEX IF NOT EXISTS idx_character_choices_reviewed_by
  ON public.character_choices (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_character_choices_subscription_id
  ON public.character_choices (subscription_id);

CREATE INDEX IF NOT EXISTS idx_chat_group_messages_sender_id
  ON public.chat_group_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_production_photo_metadata_uploaded_by
  ON public.production_photo_metadata (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_production_queue_collection_id
  ON public.production_queue (collection_id);
CREATE INDEX IF NOT EXISTS idx_production_queue_quote_id
  ON public.production_queue (quote_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_created_by
  ON public.scheduled_messages (created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_group_id
  ON public.scheduled_messages (group_id);

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_bonus_piece_id
  ON public.subscription_deliveries (bonus_piece_id);
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_character_id
  ON public.subscription_deliveries (character_id);
