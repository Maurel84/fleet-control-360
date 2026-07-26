/*
# 003 — Bookings, rentals, inspections, missions, mission staff, movements

## New tables
1. `bookings` — reservations (request -> validated).
2. `rentals` — full rental contracts with status workflow and pricing.
3. `rental_inspections` — état des lieux départ/retour with photos & checklist.
4. `missions` — escorte/transport/convoyage missions with staff.
5. `mission_staff` — chauffeurs + agents d'escorte per mission.
6. `vehicle_movements` — registre des sorties et retours de véhicules.

## Security
- All org-scoped via `organization_id` + `user_in_org()`.
- Standard 4 CRUD policies per table.
*/

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  destination text,
  daily_rate numeric(12,2),
  km_included int,
  notes text,
  status text not null default 'draft' check (status in (
    'draft','pending','quote_sent','confirmed','converted','canceled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bookings_org on public.bookings(organization_id);
create index if not exists idx_bookings_vehicle on public.bookings(vehicle_id);
create index if not exists idx_bookings_client on public.bookings(client_id);
create index if not exists idx_bookings_status on public.bookings(status);

-- ============================================================
-- RENTALS
-- ============================================================
create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  booking_id uuid references public.bookings(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  driver_id uuid references public.drivers(id) on delete set null,
  agency_departure_id uuid references public.agencies(id) on delete set null,
  agency_return_id uuid references public.agencies(id) on delete set null,
  start_datetime timestamptz not null,
  planned_return_datetime timestamptz not null,
  actual_return_datetime timestamptz,
  destination text,
  days_count int,
  km_included int,
  daily_rate numeric(12,2) not null default 0,
  km_rate numeric(10,2) default 0,
  fuel_provided boolean default true,
  deposit numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  extra_fees numeric(12,2) default 0,
  total_amount numeric(14,2) default 0,
  status text not null default 'draft' check (status in (
    'draft','pending','quote_sent','confirmed','paid','vehicle_delivered',
    'in_progress','extended','late','returned','closed','canceled','dispute'
  )),
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rentals_org on public.rentals(organization_id);
create index if not exists idx_rentals_vehicle on public.rentals(vehicle_id);
create index if not exists idx_rentals_client on public.rentals(client_id);
create index if not exists idx_rentals_status on public.rentals(status);

-- ============================================================
-- RENTAL INSPECTIONS (état des lieux)
-- ============================================================
create table if not exists public.rental_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rental_id uuid not null references public.rentals(id) on delete cascade,
  type text not null check (type in ('departure','return')),
  inspection_datetime timestamptz not null default now(),
  mileage int,
  fuel_level text,
  vehicle_condition text,
  damages text,
  missing_items text,
  accessories text,
  photos jsonb,
  checklist jsonb,
  agent_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rental_inspections_rental on public.rental_inspections(rental_id);

-- ============================================================
-- MISSIONS
-- ============================================================
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  primary_driver_id uuid references public.drivers(id) on delete set null,
  secondary_driver_id uuid references public.drivers(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  mission_type text not null check (mission_type in (
    'vip_escort','personnel_transport','shuttle','airport_transfer','convoyage',
    'close_protection','administrative','logistics','school_transport',
    'tourist_transport','delivery','long_term','other'
  )),
  departure_point text,
  destination text,
  intermediate_stops text,
  start_datetime timestamptz not null,
  planned_end_datetime timestamptz not null,
  actual_end_datetime timestamptz,
  passengers int,
  confidentiality text default 'normal' check (confidentiality in ('normal','confidential','secret')),
  security_level text default 'standard' check (security_level in ('standard','high','critical')),
  instructions text,
  onsite_contact text,
  billed_amount numeric(14,2) default 0,
  estimated_costs numeric(12,2) default 0,
  advance_amount numeric(12,2) default 0,
  status text not null default 'planned' check (status in (
    'planned','confirmed','team_assigned','departed','in_progress','arrived',
    'completed','suspended','canceled','incident'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_missions_org on public.missions(organization_id);
create index if not exists idx_missions_vehicle on public.missions(vehicle_id);
create index if not exists idx_missions_client on public.missions(client_id);
create index if not exists idx_missions_status on public.missions(status);

-- ============================================================
-- MISSION STAFF
-- ============================================================
create table if not exists public.mission_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  name text,
  role text not null check (role in ('driver','co_driver','escort_agent','security','guide','other')),
  is_present boolean default false,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_mission_staff_mission on public.mission_staff(mission_id);

-- ============================================================
-- VEHICLE MOVEMENTS (sorties et retours)
-- ============================================================
create table if not exists public.vehicle_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  movement_type text not null check (movement_type in ('exit','return')),
  rental_id uuid references public.rentals(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  datetime timestamptz not null default now(),
  mileage int,
  fuel_level text,
  vehicle_condition text,
  accessories text,
  damages text,
  missing_items text,
  photos jsonb,
  checklist jsonb,
  authorized_by text,
  controlled_by text,
  decision text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_movements_org on public.vehicle_movements(organization_id);
create index if not exists idx_movements_vehicle on public.vehicle_movements(vehicle_id);

-- ============================================================
-- RLS + POLICIES
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array['bookings','rentals','rental_inspections','missions','mission_staff','vehicle_movements']
  loop
    execute format('alter table public.%1$s enable row level security;', tbl);
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', tbl);
    execute format('create policy "%1$s_select_own" on public.%1$s for select to authenticated using (public.user_in_org(organization_id));', tbl);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', tbl);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert to authenticated with check (public.user_in_org(organization_id));', tbl);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', tbl);
    execute format('create policy "%1$s_update_own" on public.%1$s for update to authenticated using (public.user_in_org(organization_id)) with check (public.user_in_org(organization_id));', tbl);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', tbl);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete to authenticated using (public.user_in_org(organization_id));', tbl);
  end loop;
end$$;

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['bookings','rentals','rental_inspections','missions','mission_staff','vehicle_movements']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
