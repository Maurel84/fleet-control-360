-- ============================================================
-- VEHICLE SALES DEALS TABLE
-- ============================================================

create table if not exists public.sales_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  sale_price numeric(14,2) not null,
  payment_type text not null check (payment_type in ('cash', 'credit', 'leasing', 'installment')),
  down_payment numeric(14,2) not null default 0.0,
  installments_count int check (installments_count >= 0),
  monthly_payment numeric(12,2) not null default 0.0,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'active_installments', 'completed', 'cancelled'
  )),
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexation pour optimiser les performances de requêtes
create index if not exists idx_sales_deals_org on public.sales_deals(organization_id);
create index if not exists idx_sales_deals_vehicle on public.sales_deals(vehicle_id);
create index if not exists idx_sales_deals_client on public.sales_deals(client_id);
create index if not exists idx_sales_deals_status on public.sales_deals(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

alter table public.sales_deals enable row level security;

drop policy if exists "sales_deals_select_own" on public.sales_deals;
create policy "sales_deals_select_own" on public.sales_deals 
  for select to authenticated 
  using (public.user_in_org(organization_id));

drop policy if exists "sales_deals_insert_own" on public.sales_deals;
create policy "sales_deals_insert_own" on public.sales_deals 
  for insert to authenticated 
  with check (public.user_in_org(organization_id));

drop policy if exists "sales_deals_update_own" on public.sales_deals;
create policy "sales_deals_update_own" on public.sales_deals 
  for update to authenticated 
  using (public.user_in_org(organization_id)) 
  with check (public.user_in_org(organization_id));

drop policy if exists "sales_deals_delete_own" on public.sales_deals;
create policy "sales_deals_delete_own" on public.sales_deals 
  for delete to authenticated 
  using (public.user_in_org(organization_id));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Met à jour le champ updated_at
drop trigger if exists trg_sales_deals_touch on public.sales_deals;
create trigger trg_sales_deals_touch before update on public.sales_deals
  for each row execute function public.touch_updated_at();

-- Met à jour le statut du véhicule à 'sold' lors de la validation de la vente
create or replace function public.update_vehicle_on_sale()
returns trigger as $$
begin
  if (NEW.status in ('approved', 'active_installments', 'completed')) then
    update public.vehicles
    set status = 'sold'
    where id = NEW.vehicle_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_update_vehicle_on_sale on public.sales_deals;
create trigger trg_update_vehicle_on_sale
  after insert or update of status on public.sales_deals
  for each row execute function public.update_vehicle_on_sale();
