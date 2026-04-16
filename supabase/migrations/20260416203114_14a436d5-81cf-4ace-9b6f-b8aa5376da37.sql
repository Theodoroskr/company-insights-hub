ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create order items for own orders" ON public.order_items;
CREATE POLICY "Users can create order items for own orders"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR (
          o.user_id IS NULL
          AND o.guest_email IS NOT NULL
          AND auth.uid() IS NULL
        )
      )
  )
);