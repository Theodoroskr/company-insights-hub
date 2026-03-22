
-- ── TENANTS ──────────────────────────────────────────────────
create table public.tenants (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  domain           text unique not null,
  brand_name       text not null,
  country_code     text,
  logo_url         text,
  favicon_url      text,
  primary_color    text default '#1B3A6B',
  meta_title       text,
  meta_description text,
  footer_disclaimer text,
  is_active        boolean default true,
  created_at       timestamptz default now()
);
alter table public.tenants enable row level security;
create policy "Tenants are publicly readable" on public.tenants for select using (true);

-- ── COUNTRIES ────────────────────────────────────────────────
create table public.countries (
  code               text primary key,
  name               text not null,
  flag_emoji         text,
  region             text,
  is_featured        boolean default false,
  api4all_supported  boolean default true,
  display_order      integer default 999
);
alter table public.countries enable row level security;
create policy "Countries are publicly readable" on public.countries for select using (true);

-- ── PROFILES ─────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  role       text default 'user',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── COMPANIES ────────────────────────────────────────────────
create table public.companies (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid references public.tenants(id),
  icg_code             text unique not null,
  country_code         text not null,
  name                 text not null,
  reg_no               text,
  vat_no               text,
  status               text,
  legal_form           text,
  registered_address   text,
  slug                 text unique,
  raw_source_json      jsonb,
  cached_at            timestamptz default now(),
  meta_title           text,
  meta_description     text
);
create index on public.companies using gin(to_tsvector('english', name));
create index on public.companies (country_code, status);
create index on public.companies (slug);
create index on public.companies (reg_no);
alter table public.companies enable row level security;
create policy "Companies are publicly readable" on public.companies for select using (true);

-- ── PRODUCTS ─────────────────────────────────────────────────
create table public.products (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid references public.tenants(id),
  name                  text not null,
  slug                  text not null,
  api4all_product_code  text,
  type                  text not null,
  description           text,
  what_is_included      text[] default '{}',
  base_price            numeric not null,
  service_fee           numeric default 0,
  vat_on_full_price     boolean default true,
  vat_on_fee_only       boolean default false,
  is_instant            boolean default false,
  delivery_sla_hours    integer default 24,
  available_speeds      jsonb default '[]',
  sample_pdf_url        text,
  product_image_url     text,
  display_order         integer default 0,
  is_active             boolean default true,
  created_at            timestamptz default now()
);
alter table public.products enable row level security;
create policy "Products are publicly readable" on public.products for select using (true);

-- ── ORDERS ───────────────────────────────────────────────────
create table public.orders (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid references public.tenants(id),
  user_id                    uuid references public.profiles(id),
  order_ref                  text unique,
  status                     text default 'pending',
  subtotal                   numeric not null,
  vat_amount                 numeric default 0,
  total                      numeric not null,
  currency                   text default 'EUR',
  stripe_payment_intent_id   text,
  guest_email                text,
  guest_details              jsonb,
  discount_amount            numeric default 0,
  notes                      text,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);
alter table public.orders enable row level security;
create policy "Users can read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can insert own orders" on public.orders for insert with check (auth.uid() = user_id or user_id is null);

-- ── ORDER ITEMS ──────────────────────────────────────────────
create table public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid references public.orders(id),
  product_id            uuid references public.products(id),
  company_id            uuid references public.companies(id),
  speed                 text default 'Normal',
  unit_price            numeric not null,
  vat_amount            numeric default 0,
  fresh_investigation   boolean default true,
  fulfillment_status    text default 'pending',
  api4all_order_id      text,
  api4all_item_code     text,
  sla_deadline          timestamptz,
  created_at            timestamptz default now()
);
alter table public.order_items enable row level security;
create policy "Users can read own order items" on public.order_items
  for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ── GENERATED REPORTS ────────────────────────────────────────
create table public.generated_reports (
  id                    uuid primary key default gen_random_uuid(),
  order_item_id         uuid references public.order_items(id),
  company_id            uuid references public.companies(id),
  report_type           text,
  api4all_raw_json      jsonb,
  pdf_storage_path      text,
  download_token        uuid default gen_random_uuid() unique,
  download_expires_at   timestamptz,
  generated_at          timestamptz default now(),
  version               integer default 1
);
alter table public.generated_reports enable row level security;
create policy "Users can access own reports via order" on public.generated_reports
  for select using (exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.user_id = auth.uid()
  ));

-- ── MONITORING SUBSCRIPTIONS ─────────────────────────────────
create table public.monitoring_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid references public.tenants(id),
  user_id                  uuid references public.profiles(id),
  company_id               uuid references public.companies(id),
  plan                     text default 'basic',
  frequency                text default 'weekly',
  active                   boolean default true,
  stripe_subscription_id   text,
  next_check_at            timestamptz,
  created_at               timestamptz default now()
);
alter table public.monitoring_subscriptions enable row level security;
create policy "Users can read own subscriptions" on public.monitoring_subscriptions
  for select using (auth.uid() = user_id);

-- ── CHANGE EVENTS ────────────────────────────────────────────
create table public.change_events (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid references public.monitoring_subscriptions(id),
  company_id       uuid references public.companies(id),
  severity         text,
  field_changed    text,
  old_value        text,
  new_value        text,
  detected_at      timestamptz default now(),
  notified_at      timestamptz
);
alter table public.change_events enable row level security;
create policy "Users can read own change events" on public.change_events
  for select using (exists (
    select 1 from public.monitoring_subscriptions ms
    where ms.id = subscription_id and ms.user_id = auth.uid()
  ));

-- ── SEARCH LOGS ──────────────────────────────────────────────
create table public.search_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id),
  user_id       uuid references public.profiles(id),
  query         text,
  country_code  text,
  results_count integer,
  created_at    timestamptz default now()
);
alter table public.search_logs enable row level security;
create policy "Anyone can insert search logs" on public.search_logs for insert with check (true);
create policy "Users can read own search logs" on public.search_logs for select using (auth.uid() = user_id);

-- ── AUDIT LOGS ───────────────────────────────────────────────
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id),
  user_id      uuid references public.profiles(id),
  action       text not null,
  entity_type  text,
  entity_id    text,
  payload      jsonb,
  created_at   timestamptz default now()
);
alter table public.audit_logs enable row level security;
create policy "Admins can read audit logs" on public.audit_logs
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));
