-- Reconcile order ICG-2026-6671: API4ALL silently created order #531 / item 1662
-- despite returning a PHP timeout. Link our item to API4ALL ids and queue polling.

UPDATE public.order_items
SET api4all_order_id = '531',
    api4all_item_code = '1662',
    fulfillment_status = 'submitted'
WHERE id = 'e50aff31-86ac-495f-93da-c3f109c4b9dd';

INSERT INTO public.fulfillment_tasks (order_item_id, type, status)
VALUES ('e50aff31-86ac-495f-93da-c3f109c4b9dd', 'poll_status', 'pending');