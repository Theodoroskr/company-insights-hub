CREATE OR REPLACE FUNCTION public.create_investigation_company(_name text, _reg_no text, _country text)
RETURNS TABLE(id uuid, icg_code text, slug text, name text, reg_no text, country_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _cc text := upper(left(trim(coalesce(_country,'')),3)); _n text := left(trim(coalesce(_name,'')),200);
  _r text := nullif(left(regexp_replace(trim(coalesce(_reg_no,'')),'[^A-Za-z0-9./ -]','','g'),50),''); _code text; _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF length(_n) < 2 OR _cc !~ '^[A-Z]{2,3}$' THEN RAISE EXCEPTION 'Company name and country are required'; END IF;
  _code := 'INV:' || _cc || ':' || upper(coalesce(_r, regexp_replace(_n,'[^A-Za-z0-9]','','g')));
  INSERT INTO companies(icg_code, country_code, name, reg_no, slug, status, cached_at)
  VALUES (_code, _cc, _n, _r, lower(regexp_replace(_n,'[^A-Za-z0-9]+','-','g')) || '-inv-' || substr(md5(_code),1,8), 'Investigation requested', now())
  ON CONFLICT (icg_code) DO UPDATE SET name = companies.name
  RETURNING companies.id INTO _id;
  RETURN QUERY SELECT c.id, c.icg_code, c.slug, c.name, c.reg_no, c.country_code FROM companies c WHERE c.id = _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_investigation_company(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_investigation_company(text,text,text) TO authenticated;