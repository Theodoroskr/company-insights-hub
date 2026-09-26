DELETE FROM public.screening_entity_hits WHERE screening_result_id IN (SELECT id FROM public.screening_results);
DELETE FROM public.screening_results WHERE id IS NOT NULL;