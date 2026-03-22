
-- Fix: scope search_logs insert to authenticated or anonymous (expected behaviour)
drop policy if exists "Anyone can insert search logs" on public.search_logs;
create policy "Anyone can insert search logs" on public.search_logs
  for insert with check (tenant_id is not null);
