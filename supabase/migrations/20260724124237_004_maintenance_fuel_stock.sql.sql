/*
# 004 — Maintenance plans, maintenance requests, work orders, repairs, fuel entries, tires, spare parts, stock movements

## New tables
1. `maintenance_plans` — préventif planifié par date/km/heure.
2. `maintenance_requests` — demandes d'intervention (corrective).
3. `work_orders` — ordre de travail validé, lié à un garage et un véhicule.
4. `repairs` — détail des réparations effectuées, pièces, main d'œuvre.
5. `fuel_entries` — pleins de carburant avec calcul de consommation.
6. `tires` — suivi pneus (montage/démontage, km parcourus).
7. `spare_parts` — stock de pièces.
8. `stock_movements` — entrées/sorties/transferts de stock.

## Security
- All org-scoped via `organization_id` + `user_in_org()`.
- Standard 4 CRUD policies per table.
*/

-- ============================================================
-- MAINTENANCE PLANS (preventive)
-- ============================================================
create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_type text not null check (maintenance_type in (
    'vidange','filtre_huile','filtre_air','filtre_carburant','freins','pneus',
    'batterie','climatisation','suspension','courroie','embrayage','boite_vitesse',
    'moteur','electricite','carrosserie','lavage','revision','controle_securite','autre'
  )),
  scheduled_date date,
  scheduled_mileage int,
  periodicity_km int,
  periodicity_days int,
  last_performed_date date,
  last_performed_mileage int,
  next_due_date date,
  next_due_mileage int,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','pending_validation','validated','in_progress','completed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_maint_plans_vehicle on public.maintenance_plans(vehicle_id);

-- ============================================================
-- MAINTENANCE REQUESTS (corrective)
-- ============================================================
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  reference text,
  requested_by text,
  issue_type text not null check (issue_type in (
    'vidange','filtre_huile','filtre_air','filtre_carburant','freins','pneus',
    'batterie','climatisation','suspension','courroie','embrayage','boite_vitesse',
    'moteur','electricite','carrosserie','lavage','revision','controle_securite','autre'
  )),
  description text,
  priority text default 'normal' check (priority in ('low','normal','high','critical')),
  estimated_cost numeric(12,2),
  status text not null default 'to_schedule' check (status in (
    'to_schedule','pending_validation','validated','immobilized','in_progress','completed','canceled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_maint_requests_vehicle on public.maintenance_requests(vehicle_id);

-- ============================================================
-- WORK ORDERS
-- ============================================================
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_request_id uuid references public.maintenance_requests(id) on delete set null,
  garage_supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  labor_cost numeric(12,2),
  parts_cost numeric(12,2),
  start_date date,
  end_date date,
  return_to_service_date date,
  status text not null default 'validated' check (status in (
    'validated','immobilized','in_progress','completed','canceled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_work_orders_vehicle on public.work_orders(vehicle_id);

-- ============================================================
-- REPAIRS
-- ============================================================
create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  description text,
  parts_used jsonb,
  labor_hours numeric(6,2),
  labor_cost numeric(12,2),
  parts_cost numeric(12,2),
  total_cost numeric(12,2),
  performed_by text,
  repair_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_repairs_vehicle on public.repairs(vehicle_id);

-- ============================================================
-- FUEL ENTRIES
-- ============================================================
create table if not exists public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  date timestamptz not null default now(),
  station_supplier_id uuid references public.suppliers(id) on delete set null,
  station_name text,
  fuel_type text,
  quantity numeric(8,2) not null,
  price_per_unit numeric(10,2) not null,
  amount numeric(12,2) not null,
  mileage int,
  level_before text,
  level_after text,
  payment_method text,
  fuel_card text,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fuel_vehicle on public.fuel_entries(vehicle_id);
create index if not exists idx_fuel_date on public.fuel_entries(date);

-- ============================================================
-- TIRES
-- ============================================================
create table if not exists public.tires (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  brand text,
  reference text,
  dimensions text,
  serial_number text,
  position text,
  mount_date date,
  mount_mileage int,
  unmount_date date,
  unmount_mileage int,
  condition text default 'good' check (condition in ('good','worn','damaged','replaced')),
  cost numeric(10,2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tires_vehicle on public.tires(vehicle_id);

-- ============================================================
-- SPARE PARTS (stock)
-- ============================================================
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  designation text not null,
  category text,
  brand text,
  compatible_models text,
  quantity int not null default 0,
  min_threshold int default 0,
  location text,
  purchase_price numeric(10,2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  lot_number text,
  warranty text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_spare_parts_org on public.spare_parts(organization_id);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
 create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out','transfer','return','adjustment','defective','scrap')),
  quantity int not null,
  reason text,
  reference text,
  performed_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_movements_part on public.stock_movements(spare_part_id);

-- ============================================================
-- RLS + POLICIES
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'maintenance_plans','maintenance_requests','work_orders','repairs',
    'fuel_entries','tires','spare_parts','stock_movements'
  ]
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
  foreach t in array array['maintenance_plans','maintenance_requests','work_orders','repairs','fuel_entries','tires','spare_parts']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
