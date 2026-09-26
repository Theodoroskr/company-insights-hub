CREATE TABLE public.pricing_settings (
  id text PRIMARY KEY DEFAULT 'global',
  bundle_tiers jsonb NOT NULL DEFAULT '[{"tier":"starter","pay":250,"bonus_pct":5},{"tier":"professional","pay":500,"bonus_pct":10},{"tier":"corporate","pay":1000,"bonus_pct":15}]'::jsonb,
  screening_addon_eur numeric NOT NULL DEFAULT 45,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_settings TO anon, authenticated;
GRANT UPDATE ON public.pricing_settings TO authenticated;
GRANT ALL ON public.pricing_settings TO service_role;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing settings" ON public.pricing_settings FOR SELECT USING (true);
CREATE POLICY "Product editors can update pricing" ON public.pricing_settings FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(),'products',true)) WITH CHECK (public.has_permission(auth.uid(),'products',true));
CREATE TRIGGER pricing_settings_updated BEFORE UPDATE ON public.pricing_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.pricing_settings(id) VALUES ('global') ON CONFLICT DO NOTHING;

CREATE POLICY "Staff can view wallets" ON public.user_wallets FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'customers',false));
CREATE POLICY "Staff can view wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'customers',false));

CREATE OR REPLACE FUNCTION public.admin_adjust_user_wallet(_user_id uuid, _amount numeric, _reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _bal numeric;
BEGIN
  IF NOT public.has_permission(auth.uid(),'customers',true) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'Amount must be non-zero'; END IF;
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  INSERT INTO user_wallets(user_id, balance_eur) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_eur INTO _bal FROM user_wallets WHERE user_id = _user_id FOR UPDATE;
  IF _bal + _amount < 0 THEN RAISE EXCEPTION 'Balance cannot go below zero'; END IF;
  UPDATE user_wallets SET balance_eur = balance_eur + _amount, updated_at = now() WHERE user_id = _user_id RETURNING balance_eur INTO _bal;
  INSERT INTO wallet_transactions(user_id, type, amount_eur, balance_after, note)
  VALUES (_user_id, 'adjustment', _amount, _bal, left(trim(_reason),500));
  INSERT INTO audit_logs(user_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), 'wallet_adjust', 'user_wallet', _user_id::text, jsonb_build_object('amount',_amount,'reason',_reason,'balance_after',_bal));
  RETURN _bal;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_user_wallet(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_wallet(uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_credit_bundle(_tier text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _pay numeric; _bonus numeric; _bal numeric; _t jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT t INTO _t FROM pricing_settings p, jsonb_array_elements(p.bundle_tiers) t WHERE p.id='global' AND t->>'tier' = _tier;
  IF _t IS NULL THEN RAISE EXCEPTION 'Unknown bundle'; END IF;
  _pay := (_t->>'pay')::numeric; _bonus := round(_pay * (_t->>'bonus_pct')::numeric / 100, 2);
  INSERT INTO user_wallets(user_id, balance_eur, expires_at) VALUES (_uid, _pay + _bonus, NULL)
  ON CONFLICT (user_id) DO UPDATE SET balance_eur = user_wallets.balance_eur + _pay + _bonus, expires_at = NULL, updated_at = now()
  RETURNING balance_eur INTO _bal;
  INSERT INTO wallet_transactions(user_id, type, amount_eur, bonus_eur, bundle, balance_after, note)
  VALUES (_uid, 'topup', _pay + _bonus, _bonus, _tier, _bal, initcap(_tier) || ' bundle');
  RETURN _bal;
END $$;