CREATE OR REPLACE FUNCTION public.prevent_self_super_admin_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.role = 'super_admin' AND auth.uid() IS NOT NULL AND OLD.user_id = auth.uid()
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM OLD.role OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'You cannot remove your own super admin role';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;