
ALTER TABLE public.companies
ADD COLUMN directors_json jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.companies.directors_json IS 'Array of {name, role} objects for directors/secretaries from API4ALL information endpoint';
