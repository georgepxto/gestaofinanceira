-- Tabela para armazenar Core Web Vitals coletados do frontend.
-- Execute no SQL Editor do Supabase.

create table if not exists public.web_vitals_metrics (
  id uuid primary key default gen_random_uuid(),
  metric text not null check (metric in ('LCP', 'INP', 'CLS')),
  value double precision not null,
  rating text,
  page_path text not null,
  metric_id text,
  target_value double precision,
  status text,
  collected_at timestamptz not null default now(),
  user_agent text,
  referer text,
  origin text,
  created_at timestamptz not null default now()
);

create index if not exists idx_web_vitals_metric_collected_at
  on public.web_vitals_metrics (metric, collected_at desc);

create index if not exists idx_web_vitals_page_path_collected_at
  on public.web_vitals_metrics (page_path, collected_at desc);

alter table public.web_vitals_metrics enable row level security;

-- Leitura apenas para admins.
drop policy if exists "admins can read web vitals" on public.web_vitals_metrics;
create policy "admins can read web vitals"
on public.web_vitals_metrics
for select
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

-- Não permitir insert/update/delete direto de usuários autenticados.
-- Inserção será feita pela Edge Function com service_role.
drop policy if exists "no direct insert web vitals" on public.web_vitals_metrics;
create policy "no direct insert web vitals"
on public.web_vitals_metrics
for insert
with check (false);

drop policy if exists "no direct update web vitals" on public.web_vitals_metrics;
create policy "no direct update web vitals"
on public.web_vitals_metrics
for update
using (false)
with check (false);

drop policy if exists "no direct delete web vitals" on public.web_vitals_metrics;
create policy "no direct delete web vitals"
on public.web_vitals_metrics
for delete
using (false);
