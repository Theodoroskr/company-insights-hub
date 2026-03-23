
CREATE TABLE public.fulfillment_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fulfillment_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fulfillment tasks"
  ON public.fulfillment_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX idx_fulfillment_tasks_status ON public.fulfillment_tasks(status);
CREATE INDEX idx_fulfillment_tasks_order_item_id ON public.fulfillment_tasks(order_item_id);
