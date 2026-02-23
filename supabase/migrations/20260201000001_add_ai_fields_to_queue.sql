-- Add AI Vision fields to images_queue table
alter table public.images_queue
add column if not exists ai_suggested_name text,
add column if not exists ai_confidence numeric(3,2),
add column if not exists ai_model_used text,
add column if not exists image_hash text;

-- Add index for finding images without AI suggestions
create index if not exists images_queue_ai_suggested_name_idx
on public.images_queue (ai_suggested_name)
where ai_suggested_name is null;

-- Add index for image hash lookups
create index if not exists images_queue_image_hash_idx
on public.images_queue (image_hash)
where image_hash is not null;

-- Add comments
comment on column public.images_queue.ai_suggested_name is 'AI-suggested model name from vision analysis';
comment on column public.images_queue.ai_confidence is 'Confidence score from AI (0.0 to 1.0)';
comment on column public.images_queue.ai_model_used is 'AI model used for classification (e.g., gpt-4o-mini)';
comment on column public.images_queue.image_hash is 'SHA-256 hash of image content for deduplication';
