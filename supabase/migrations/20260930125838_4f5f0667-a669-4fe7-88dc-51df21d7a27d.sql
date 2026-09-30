DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'poll_cron_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'poll_cron_secret');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_cron_secret(_s text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(_s,'') <> '' AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'poll_cron_secret' AND decrypted_secret = _s)
$$;
REVOKE EXECUTE ON FUNCTION public.check_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_cron_secret(text) TO service_role;