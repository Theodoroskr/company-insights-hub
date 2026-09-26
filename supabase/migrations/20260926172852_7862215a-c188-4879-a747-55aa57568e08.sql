ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS po_reference text,
  ADD COLUMN IF NOT EXISTS monthly_invoice_id uuid;

CREATE TABLE public.user_wallets (
  user_id uuid PRIMARY KEY,
  balance_eur numeric NOT NULL DEFAULT 0 CHECK (balance_eur >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet" ON public.user_wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'customers',false));

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount_eur numeric NOT NULL,
  bonus_eur numeric NOT NULL DEFAULT 0,
  bundle text,
  order_id uuid REFERENCES public.orders(id),
  note text,
  balance_after numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet tx" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'customers',false));

CREATE TABLE public.billing_accounts (
  user_id uuid PRIMARY KEY,
  company_name text NOT NULL,
  vat_number text,
  expected_monthly_spend numeric,
  status text NOT NULL DEFAULT 'pending',
  monthly_limit_eur numeric NOT NULL DEFAULT 0,
  payment_terms_days integer NOT NULL DEFAULT 30,
  po_required boolean NOT NULL DEFAULT false,
  admin_notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.billing_accounts TO authenticated;
GRANT ALL ON public.billing_accounts TO service_role;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view billing account" ON public.billing_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'customers',false));
CREATE POLICY "staff edit billing account" ON public.billing_accounts FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'customers',true)) WITH CHECK (public.has_permission(auth.uid(),'customers',true));
CREATE TRIGGER billing_accounts_updated BEFORE UPDATE ON public.billing_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.monthly_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_ref text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  order_count integer NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued',
  due_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);
GRANT SELECT, UPDATE ON public.monthly_invoices TO authenticated;
GRANT ALL ON public.monthly_invoices TO service_role;
ALTER TABLE public.monthly_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view monthly invoices" ON public.monthly_invoices FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'customers',false));
CREATE POLICY "staff update monthly invoices" ON public.monthly_invoices FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'customers',true)) WITH CHECK (public.has_permission(auth.uid(),'customers',true));

-- Buy a prepaid bundle (card payment simulated in-app like the rest of checkout)
CREATE OR REPLACE FUNCTION public.purchase_credit_bundle(_tier text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _pay numeric; _bonus numeric; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _tier = 'starter' THEN _pay := 250; _bonus := 12.50;
  ELSIF _tier = 'professional' THEN _pay := 500; _bonus := 50;
  ELSIF _tier = 'corporate' THEN _pay := 1000; _bonus := 150;
  ELSE RAISE EXCEPTION 'Unknown bundle'; END IF;
  INSERT INTO user_wallets(user_id, balance_eur) VALUES (_uid, _pay + _bonus)
  ON CONFLICT (user_id) DO UPDATE SET balance_eur = user_wallets.balance_eur + _pay + _bonus, updated_at = now()
  RETURNING balance_eur INTO _bal;
  INSERT INTO wallet_transactions(user_id, type, amount_eur, bonus_eur, bundle, balance_after, note)
  VALUES (_uid, 'topup', _pay + _bonus, _bonus, _tier, _bal, initcap(_tier) || ' bundle');
  RETURN _bal;
END $$;

-- Pay a pending order from wallet credit
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

-- Apply for enterprise monthly invoicing
CREATE OR REPLACE FUNCTION public.request_billing_account(_company text, _vat text, _spend numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF length(trim(coalesce(_company,''))) < 2 THEN RAISE EXCEPTION 'Company name required'; END IF;
  INSERT INTO billing_accounts(user_id, company_name, vat_number, expected_monthly_spend)
  VALUES (auth.uid(), left(trim(_company),200), left(_vat,50), _spend)
  ON CONFLICT (user_id) DO UPDATE SET company_name = EXCLUDED.company_name, vat_number = EXCLUDED.vat_number,
    expected_monthly_spend = EXCLUDED.expected_monthly_spend,
    status = CASE WHEN billing_accounts.status = 'rejected' THEN 'pending' ELSE billing_accounts.status END;
END $$;

-- Put a pending order on the monthly account
CREATE OR REPLACE FUNCTION public.pay_order_on_account(_order_id uuid, _po text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _o record; _acc record; _used numeric;
BEGIN
  SELECT * INTO _o FROM orders WHERE id = _order_id FOR UPDATE;
  IF _o IS NULL OR _o.user_id IS DISTINCT FROM _uid THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status <> 'pending' THEN RAISE EXCEPTION 'Order already processed'; END IF;
  SELECT * INTO _acc FROM billing_accounts WHERE user_id = _uid;
  IF _acc IS NULL OR _acc.status <> 'approved' THEN RAISE EXCEPTION 'Monthly invoicing is not approved for this account'; END IF;
  IF _acc.po_required AND length(trim(coalesce(_po,''))) = 0 THEN RAISE EXCEPTION 'A PO reference is required'; END IF;
  SELECT coalesce(sum(total),0) INTO _used FROM orders
   WHERE user_id = _uid AND payment_method = 'invoice' AND monthly_invoice_id IS NULL AND status <> 'cancelled';
  IF _used + _o.total > _acc.monthly_limit_eur THEN RAISE EXCEPTION 'Monthly credit limit reached'; END IF;
  UPDATE orders SET status = 'paid', payment_method = 'invoice', po_reference = nullif(left(trim(coalesce(_po,'')),100),''), updated_at = now() WHERE id = _order_id;
END $$;

-- Staff: bundle all un-invoiced account orders up to period end into one invoice per client
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(_period_start date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _end date := (_period_start + interval '1 month' - interval '1 day')::date; _r record; _inv uuid; _n int := 0;
BEGIN
  IF NOT public.has_permission(auth.uid(),'customers',true) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  FOR _r IN
    SELECT o.user_id, count(*) c, sum(o.subtotal) s, sum(coalesce(o.vat_amount,0)) v, sum(o.total) t, max(b.payment_terms_days) terms
    FROM orders o JOIN billing_accounts b ON b.user_id = o.user_id
    WHERE o.payment_method = 'invoice' AND o.monthly_invoice_id IS NULL AND o.status <> 'cancelled'
      AND o.created_at < (_end + 1)
    GROUP BY o.user_id
  LOOP
    INSERT INTO monthly_invoices(user_id, invoice_ref, period_start, period_end, order_count, subtotal, vat_amount, total, due_date)
    VALUES (_r.user_id, 'INV-' || to_char(_period_start,'YYYYMM') || '-' || upper(substr(_r.user_id::text,1,6)),
            _period_start, _end, _r.c, _r.s, _r.v, _r.t, _end + coalesce(_r.terms,30))
    ON CONFLICT (user_id, period_start) DO NOTHING
    RETURNING id INTO _inv;
    IF _inv IS NOT NULL THEN
      UPDATE orders SET monthly_invoice_id = _inv WHERE user_id = _r.user_id AND payment_method = 'invoice'
        AND monthly_invoice_id IS NULL AND status <> 'cancelled' AND created_at < (_end + 1);
      _n := _n + 1;
    END IF;
  END LOOP;
  RETURN _n;
END $$;

REVOKE EXECUTE ON FUNCTION public.purchase_credit_bundle(text), public.pay_order_with_wallet(uuid), public.request_billing_account(text,text,numeric), public.pay_order_on_account(uuid,text), public.generate_monthly_invoices(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_credit_bundle(text), public.pay_order_with_wallet(uuid), public.request_billing_account(text,text,numeric), public.pay_order_on_account(uuid,text), public.generate_monthly_invoices(date) TO authenticated;