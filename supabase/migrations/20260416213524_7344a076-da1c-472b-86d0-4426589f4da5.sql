ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS screening_addon boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS screening_price_eur numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS fx_rate_to_eur numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.order_items.screening_addon IS 'True if customer added ComplyAdvantage screening (+€45) to this line item';
COMMENT ON COLUMN public.order_items.screening_price_eur IS 'Snapshot of screening add-on price in EUR at time of order';
COMMENT ON COLUMN public.orders.display_currency IS 'Currency the customer saw and was charged in (Stripe). Canonical totals stay in EUR.';
COMMENT ON COLUMN public.orders.fx_rate_to_eur IS 'FX rate snapshot: 1 unit of display_currency = X EUR. Use to reconstruct EUR amount.';