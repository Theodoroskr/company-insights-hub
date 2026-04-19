-- Saved companies (bookmarks) per user
CREATE TABLE public.saved_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX idx_saved_companies_user ON public.saved_companies(user_id, created_at DESC);

ALTER TABLE public.saved_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved companies"
ON public.saved_companies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved companies"
ON public.saved_companies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved companies"
ON public.saved_companies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved companies"
ON public.saved_companies FOR DELETE
USING (auth.uid() = user_id);