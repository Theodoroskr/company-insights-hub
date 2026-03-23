CREATE TABLE IF NOT EXISTS public.api4all_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  expires_at   timestamptz NOT NULL,
  project_code text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.api4all_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.api4all_tokens
  USING (false);