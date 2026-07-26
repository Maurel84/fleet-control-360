-- ============================================================
-- INSPECTIONS (ÉTAT DES LIEUX DE LOCATION)
-- ============================================================
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rental_id uuid not null references public.rentals(id) on delete cascade,
  type text not null check (type in ('check_in', 'check_out')),
  inspector_name text,
  odometer integer not null,
  fuel_level text not null check (fuel_level in ('empty', 'quarter', 'half', 'three_quarters', 'full')),
  cleanliness text not null check (cleanliness in ('clean', 'average', 'dirty')),
  tyres_ok boolean default true,
  spare_wheel_ok boolean default true,
  damages jsonb default '[]'::jsonb,
  notes text,
  signed_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inspections_org on public.inspections(organization_id);
create index if not exists idx_inspections_rental on public.inspections(rental_id);

-- Activer RLS
alter table public.inspections enable row level security;

-- Définir les stratégies RLS
drop policy if exists "inspections_select_own" on public.inspections;
create policy "inspections_select_own" on public.inspections for select to authenticated using (public.user_in_org(organization_id));

drop policy if exists "inspections_insert_own" on public.inspections;
create policy "inspections_insert_own" on public.inspections for insert to authenticated with check (public.user_in_org(organization_id));

drop policy if exists "inspections_update_own" on public.inspections;
create policy "inspections_update_own" on public.inspections for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));

drop policy if exists "inspections_delete_own" on public.inspections;
create policy "inspections_delete_own" on public.inspections for delete to authenticated using (public.user_in_org(organization_id));
