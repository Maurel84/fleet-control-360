/*
# 005 — Finance: quotes, invoices, invoice items, payments, expenses, accidents, incidents, fines, partner vehicles, partner settlements, approvals

## New tables
1. `quotes` — devis générés.
2. `invoices` — factures avec échéance et statut de paiement.
3. `invoice_items` — lignes de facture.
4. `payments` — encaissements (espèces, virement, mobile money, etc.).
5. `expenses` — dépenses par catégorie, liées à un véhicule/mission/agent.
6. `accidents` — sinistres avec workflow déclaration -> clôture.
7. `incidents` — registre des incidents (panne, crevaison, vol, retard...).
8. `fines` — amendes et contraventions.
9. `partner_vehicles` — véhicules partenaires (convention, partage de recettes).
10. `partner_settlements` — reversements aux partenaires.
11. `approvals` — moteur de validation (demande -> responsable -> direction -> finance).

## Security
- All org-scoped via `organization_id` + `user_in_org()`.
- Standard 4 CRUD policies per table.
*/

-- ============================================================
-- QUOTES
-- ============================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  client_id uuid references public.clients(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  subject text,
  issue_date date not null default current_date,
  validity_date date,
  subtotal numeric(14,2) default 0,
  discount numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  total numeric(14,2) default 0,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired','converted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quotes_org on public.quotes(organization_id);

-- ============================================================
-- INVOICES
-- ============================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  client_id uuid not null references public.clients(id) on delete restrict,
  rental_id uuid references public.rentals(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) default 0,
  discount numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  total numeric(14,2) default 0,
  paid_amount numeric(14,2) default 0,
  balance numeric(14,2) default 0,
  status text not null default 'unpaid' check (status in ('draft','unpaid','partial','paid','overdue','canceled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_invoices_org on public.invoices(organization_id);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  total numeric(14,2) default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  invoice_id uuid references public.invoices(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  amount numeric(14,2) not null,
  payment_date timestamptz not null default now(),
  payment_method text not null check (payment_method in ('cash','transfer','check','card','mobile_money','online','credit')),
  account_type text default 'cash' check (account_type in ('cash','bank','mobile_money')),
  notes text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_org on public.payments(organization_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

-- ============================================================
-- EXPENSES
-- ============================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  category text not null check (category in (
    'carburant','entretien','reparation','pieces','assurance','vignette',
    'visite_technique','salaires','primes','peages','parking','lavage',
    'amendes','location_partenaire','frais_mission','autres'
  )),
  description text,
  amount numeric(14,2) not null,
  expense_date date not null default current_date,
  payment_method text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  requested_by text,
  approved_by text,
  justification_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_expenses_org on public.expenses(organization_id);
create index if not exists idx_expenses_vehicle on public.expenses(vehicle_id);
create index if not exists idx_expenses_category on public.expenses(category);

-- ============================================================
-- ACCIDENTS
-- ============================================================
create table if not exists public.accidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  accident_date timestamptz not null,
  location text,
  description text,
  accident_type text,
  severity text default 'minor' check (severity in ('minor','moderate','severe','total_loss')),
  third_parties text,
  injuries text,
  material_damage text,
  photos jsonb,
  police_report_number text,
  insurer text,
  estimated_amount numeric(14,2),
  deductible numeric(12,2),
  responsible text,
  status text not null default 'declared' check (status in ('declared','validated','transmitted','expertise','repair','reimbursed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_accidents_vehicle on public.accidents(vehicle_id);

-- ============================================================
-- INCIDENTS
-- ============================================================
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  incident_type text not null check (incident_type in (
    'panne','crevaison','vol','tentative_vol','perte_document',
    'comportement_chauffeur','retard','probleme_client','probleme_gps','autre'
  )),
  incident_date timestamptz not null default now(),
  description text,
  resolution text,
  status text not null default 'open' check (status in ('open','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_incidents_vehicle on public.incidents(vehicle_id);

-- ============================================================
-- FINES
-- ============================================================
create table if not exists public.fines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  fine_date date not null,
  reason text,
  location text,
  amount numeric(12,2) not null,
  authority text,
  payment_deadline date,
  paid_by text,
  status text not null default 'unpaid' check (status in ('unpaid','paid','contested','salary_deducted')),
  salary_deducted boolean default false,
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fines_vehicle on public.fines(vehicle_id);

-- ============================================================
-- PARTNER VEHICLES (overlay on vehicles table — convention terms)
-- ============================================================
create table if not exists public.partner_vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  partner_name text not null,
  convention_date date,
  revenue_share_pct numeric(5,2),
  fixed_amount numeric(12,2),
  period_start date,
  period_end date,
  total_revenue numeric(14,2) default 0,
  total_expenses numeric(14,2) default 0,
  amount_due numeric(14,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_partner_vehicles_org on public.partner_vehicles(organization_id);

-- ============================================================
-- PARTNER SETTLEMENTS
-- ============================================================
create table if not exists public.partner_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_vehicle_id uuid not null references public.partner_vehicles(id) on delete cascade,
  amount numeric(14,2) not null,
  settlement_date date not null default current_date,
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_partner_settlements_pv on public.partner_settlements(partner_vehicle_id);

-- ============================================================
-- APPROVALS (workflow engine)
-- ============================================================
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('vehicle_exit','expense','maintenance','repair','parts_purchase','discount','cancellation','refund','mission','contract','rental_extension')),
  entity_id uuid,
  requested_by uuid references public.user_profiles(id) on delete set null,
  requested_by_name text,
  amount numeric(14,2),
  current_step int default 1,
  total_steps int default 1,
  steps jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','canceled')),
  decided_by uuid references public.user_profiles(id) on delete set null,
  decided_by_name text,
  decision_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_approvals_org on public.approvals(organization_id);

-- ============================================================
-- RLS + POLICIES
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'quotes','invoices','invoice_items','payments','expenses',
    'accidents','incidents','fines','partner_vehicles','partner_settlements','approvals'
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
  foreach t in array array['quotes','invoices','payments','expenses','accidents','incidents','fines','partner_vehicles','partner_settlements','approvals']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
