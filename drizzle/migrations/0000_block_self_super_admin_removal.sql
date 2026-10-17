CREATE OR REPLACE FUNCTION public.prevent_self_super_admin_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.role = 'super_admin' AND auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own super admin role';
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.prevent_self_super_admin_removal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_self_super_admin_removal ON public.user_roles;
CREATE TRIGGER prevent_self_super_admin_removal BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_super_admin_removal();