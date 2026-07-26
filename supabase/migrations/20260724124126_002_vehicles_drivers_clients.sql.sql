/*
# 002 — Vehicles, categories, documents, drivers, driver documents, clients, suppliers

## New tables
1. `vehicle_categories` — catalog of vehicle types per org (berline, SUV, 4x4, etc.).
2. `vehicles` — full fleet records with status, ownership, agency, valuation.
3. `vehicle_documents` — insurance, carte grise, visite technique, vignette, etc.
4. `drivers` — chauffeur records with license, status, agency, salary.
5. `driver_documents` — permis, visite médicale, contrats.
6. `clients` — particuliers, entreprises, administrations, ONG.
7. `suppliers` — garages, assureurs, stations-service, fournisseurs de pièces.

## Security
- All tables carry `organization_id` and are scoped via `user_in_org()`.
- RLS enabled on every table with the standard 4 CRUD policies (select/insert/update/delete).
- `organization_id` has NO database default — the frontend must send it on every insert
  because the client knows the active org; the INSERT policy's WITH CHECK enforces membership.
*/

-- ============================================================
-- VEHICLE CATEGORIES
-- ============================================================
create table if not exists public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists idx_vehicle_categories_org on public.vehicle_categories(organization_id);

-- ============================================================
-- VEHICLES
-- ============================================================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  category_id uuid references public.vehicle_categories(id) on delete set null,
  internal_number text,
  registration text,
  vin text,
  brand text not null,
  model text not null,
  version text,
  category text,
  vehicle_type text,
  color text,
  year_manufactured int,
  first_registration_date date,
  seats int,
  fuel_type text,
  tank_capacity numeric(8,2),
  estimated_consumption numeric(6,2),
  transmission text,
  power_hp int,
  current_mileage int not null default 0,
  ownership_type text not null default 'owned' check (ownership_type in ('owned','partner','leasing')),
  owner_name text,
  purchase_price numeric(14,2),
  purchase_date date,
  estimated_value numeric(14,2),
  monthly_depreciation numeric(12,2),
  status text not null default 'available' check (status in (
    'available','reserved','rented','on_mission','assigned','maintenance','repair',
    'immobilized','accident','seized','out_of_service','sold'
  )),
  availability text not null default 'available' check (availability in ('available','unavailable')),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vehicles_org on public.vehicles(organization_id);
create index if not exists idx_vehicles_agency on public.vehicles(agency_id);
create index if not exists idx_vehicles_status on public.vehicles(status);
create index if not exists idx_vehicles_registration on public.vehicles(registration);

-- ============================================================
-- VEHICLE DOCUMENTS
-- ============================================================
create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check (type in (
    'insurance','carte_grise','visite_technique','vignette','certificat_conformite',
    'licence_transport','autorisation_speciale','document_douanier','controle_technique',
    'certificat_propriete','contrat_leasing','document_gps','autre'
  )),
  document_number text,
  issuer text,
  start_date date,
  expiry_date date,
  cost numeric(12,2),
  status text not null default 'valid' check (status in ('valid','expiring','expired','renewing')),
  file_url text,
  reminder_enabled boolean not null default true,
  responsible text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vehicle_documents_vehicle on public.vehicle_documents(vehicle_id);
create index if not exists idx_vehicle_documents_expiry on public.vehicle_documents(expiry_date);

-- ============================================================
-- DRIVERS
-- ============================================================
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  matricule text,
  first_name text not null,
  last_name text not null,
  photo_url text,
  gender text check (gender in ('M','F')),
  birth_date date,
  phone text,
  email text,
  address text,
  emergency_contact text,
  hire_date date,
  contract_type text,
  status text not null default 'available' check (status in (
    'available','on_mission','resting','absent','suspended','on_leave','unavailable','terminated'
  )),
  license_number text,
  license_category text,
  license_issue_date date,
  license_expiry_date date,
  experience_years int,
  certifications text,
  languages text,
  salary numeric(12,2),
  bonus numeric(12,2),
  rating numeric(3,1) default 5.0,
  sanctions text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drivers_org on public.drivers(organization_id);
create index if not exists idx_drivers_agency on public.drivers(agency_id);
create index if not exists idx_drivers_status on public.drivers(status);

-- ============================================================
-- DRIVER DOCUMENTS
-- ============================================================
create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  type text not null check (type in ('permis','visite_medicale','contrat','piece_identite','certification','autre')),
  document_number text,
  issuer text,
  start_date date,
  expiry_date date,
  file_url text,
  status text not null default 'valid' check (status in ('valid','expiring','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_driver_documents_driver on public.driver_documents(driver_id);

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('individual','company','administration','ngo','partner','agency','event_organizer')),
  name text not null,
  representative text,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_id text,
  trade_register text,
  id_document text,
  credit_limit numeric(14,2) default 0,
  payment_delay_days int default 0,
  risk_level text default 'low' check (risk_level in ('low','medium','high')),
  account_status text default 'active' check (account_status in ('active','suspended','blacklisted')),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_org on public.clients(organization_id);

-- ============================================================
-- SUPPLIERS
-- ============================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('garage','insurer','fuel_station','parts_vendor','gps_provider','partner_agency','car_wash','tow_truck','carrier','subcontractor','other')),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  services text,
  rating numeric(3,1) default 5.0,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_suppliers_org on public.suppliers(organization_id);

-- ============================================================
-- RLS + POLICIES (standard org-scoped CRUD for each table)
-- ============================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'vehicle_categories','vehicles','vehicle_documents',
    'drivers','driver_documents','clients','suppliers'
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
  foreach t in array array['vehicle_categories','vehicles','vehicle_documents','drivers','driver_documents','clients','suppliers']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
