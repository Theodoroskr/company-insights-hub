CREATE OR REPLACE FUNCTION public.purchase_credit_bundle(_tier text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _pay numeric; _bonus numeric; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _tier = 'starter' THEN _pay := 250; _bonus := 12.50;
  ELSIF _tier = 'professional' THEN _pay := 500; _bonus := 50;
  ELSIF _tier = 'corporate' THEN _pay := 1000; _bonus := 150;
  ELSE RAISE EXCEPTION 'Unknown bundle'; END IF;
  INSERT INTO user_wallets(user_id, balance_eur, expires_at) VALUES (_uid, _pay + _bonus, NULL)
  ON CONFLICT (user_id) DO UPDATE SET balance_eur = user_wallets.balance_eur + _pay + _bonus,
    expires_at = NULL, updated_at = now()
  RETURNING balance_eur INTO _bal;
  INSERT INTO wallet_transactions(user_id, type, amount_eur, bonus_eur, bundle, balance_after, note)
  VALUES (_uid, 'topup', _pay + _bonus, _bonus, _tier, _bal, initcap(_tier) || ' bundle');
  RETURN _bal;
END $$;

CREATE OR REPLACE FUNCTION public.pay_order_with_wallet(_order_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _o record; _bal numeric;
BEGIN
  SELECT * INTO _o FROM orders WHERE id = _order_id FOR UPDATE;
  IF _o IS NULL OR _o.user_id IS DISTINCT FROM _uid THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status <> 'pending' THEN RAISE EXCEPTION 'Order already processed'; END IF;
  SELECT balance_eur INTO _bal FROM user_wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _o.total THEN RAISE EXCEPTION 'Insufficient credit balance'; END IF;
  UPDATE user_wallets SET balance_eur = balance_eur - _o.total, updated_at = now() WHERE user_id = _uid RETURNING balance_eur INTO _bal;
  INSERT INTO wallet_transactions(user_id, type, amount_eur, order_id, balance_after, note)
  VALUES (_uid, 'debit', -_o.total, _order_id, _bal, 'Order ' || coalesce(_o.order_ref,''));
  UPDATE orders SET status = 'paid', payment_method = 'wallet', updated_at = now() WHERE id = _order_id;
  RETURN _bal;
END $$;

UPDATE public.user_wallets SET expires_at = NULL;