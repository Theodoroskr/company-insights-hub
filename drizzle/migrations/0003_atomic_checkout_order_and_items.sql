CREATE OR REPLACE FUNCTION public.create_checkout_order(_order jsonb, _items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid := coalesce(nullif(_order->>'id','')::uuid, gen_random_uuid());
  _item jsonb;
BEGIN
  IF jsonb_typeof(_order) IS DISTINCT FROM 'object' OR jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid checkout data';
  END IF;
  IF _uid IS NULL AND length(trim(coalesce(_order->>'guest_email',''))) = 0 THEN
    RAISE EXCEPTION 'A delivery email is required for guest checkout';
  END IF;
  IF jsonb_array_length(_items) > 100 THEN RAISE EXCEPTION 'Too many order items'; END IF;
  INSERT INTO public.orders(id, tenant_id, user_id, order_ref, status, subtotal, vat_amount, total, currency, display_currency, fx_rate_to_eur, guest_email, guest_details)
  VALUES (_id, nullif(_order->>'tenant_id','')::uuid, _uid, _order->>'order_ref',
    coalesce(_order->>'status','pending'), (_order->>'subtotal')::numeric,
    coalesce((_order->>'vat_amount')::numeric,0), (_order->>'total')::numeric,
    'EUR', coalesce(_order->>'display_currency','EUR'), coalesce((_order->>'fx_rate_to_eur')::numeric,1),
    CASE WHEN _uid IS NULL THEN trim(_order->>'guest_email') ELSE NULL END,
    CASE WHEN _uid IS NULL THEN _order->'guest_details' ELSE NULL END);
  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.order_items(id, order_id, product_id, company_id, speed, fresh_investigation, unit_price, vat_amount, fulfillment_status, screening_addon, screening_price_eur)
    VALUES (coalesce(nullif(_item->>'id','')::uuid, gen_random_uuid()), _id,
      nullif(_item->>'product_id','')::uuid, nullif(_item->>'company_id','')::uuid,
      coalesce(_item->>'speed','Normal'), coalesce((_item->>'fresh_investigation')::boolean,true),
      (_item->>'unit_price')::numeric, coalesce((_item->>'vat_amount')::numeric,0), 'pending',
      coalesce((_item->>'screening_addon')::boolean,false), coalesce((_item->>'screening_price_eur')::numeric,0));
  END LOOP;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb,jsonb) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.create_checkout_order(jsonb,jsonb) IS 'Atomic checkout persistence. Ownership comes exclusively from auth.uid(); guest order visibility remains restricted. Payment semantics unchanged.';