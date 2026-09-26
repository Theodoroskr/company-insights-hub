-- Lock down SECURITY DEFINER functions that must never be called from the API.
-- admin_set_user_password: invoked only server-side with the service role.
-- handle_new_user: trigger function on auth.users; never called directly.
REVOKE EXECUTE ON FUNCTION public.admin_set_user_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;