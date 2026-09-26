ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS vat_no text,
  ADD COLUMN IF NOT EXISTS company_details jsonb;