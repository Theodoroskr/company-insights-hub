
ALTER TABLE public.order_items
  ADD COLUMN verified_at timestamptz DEFAULT NULL,
  ADD COLUMN verified_by text DEFAULT NULL,
  ADD COLUMN verification_note text DEFAULT NULL;
