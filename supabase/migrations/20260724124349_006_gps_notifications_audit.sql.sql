/*
# 006 — GPS devices/positions/geofences, notifications, message templates, audit logs, documents library, settings helpers

## New tables
1. `gps_devices` — traceurs GPS installés sur les véhicules (provider, IMEI, config).
2. `gps_positions` — historique des positions (temps réel via webhook future).
3. `geofences` — zones autorisées/interdites par véhicule ou agence.
4. `notifications` — centre de notifications interne.
5. `message_templates` — modèles de messages (email/SMS/WhatsApp/push).
6. `audit_logs` — journal d'audit de toutes les actions sensibles.
7. `documents` — médiathèque générale (PV, contrats, factures fournisseurs, etc.).

## Security
- All org-scoped via `organization_id` + `user_in_org()`.
- `gps_positions` stores demo data only when `is_demo` = true (clearly identified).
- `audit_logs` is append-only by design: SELECT scoped to org, INSERT allowed for
  org members; UPDATE/DELETE disabled (no policies) to preserve integrity.
*/

-- ============================================================
-- GPS DEVICES
-- ============================================================
create table if not exists public.gps_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  provider text not null,
  imei text,
  device_id text,
  sim_phone text,
  installed_at timestamptz,
  is_active boolean not null default true,
  config jsonb,
  battery_level int,
  last_signal_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gps_devices_vehicle on public.gps_devices(vehicle_id);

-- ============================================================
-- GPS POSITIONS
-- ============================================================
create table if not exists public.gps_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  gps_device_id uuid references public.gps_devices(id) on delete set null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  speed numeric(6,2),
  heading int,
  altitude numeric(8,2),
  engine_state text check (engine_state in ('on','off','idle')),
  battery_level int,
  recorded_at timestamptz not null default now(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_gps_positions_vehicle on public.gps_positions(vehicle_id);
create index if not exists idx_gps_positions_recorded on public.gps_positions(recorded_at);

-- ============================================================
-- GEOFENCES
-- ============================================================
create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  name text not null,
  zone_type text not null check (zone_type in ('allowed','forbidden')),
  polygon jsonb,
  center_lat numeric(10,7),
  center_lng numeric(10,7),
  radius_m int,
  alerts_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_geofences_org on public.geofences(organization_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete cascade,
  type text not null check (type in (
    'insurance_renewal','visite_technique','vignette','permis_renewal','maintenance_due',
    'mileage_reached','low_stock','late_return','late_payment','contract_expiring',
    'speeding','zone_exit','fuel_anomaly','missing_document','vehicle_unavailable',
    'driver_unavailable','accident','breakdown','approval_pending','other'
  )),
  title text not null,
  message text,
  severity text default 'info' check (severity in ('info','warning','critical')),
  link text,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(organization_id, is_read);

-- ============================================================
-- MESSAGE TEMPLATES
-- ============================================================
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check (channel in ('internal','email','sms','whatsapp','push')),
  code text,
  name text not null,
  subject text,
  body text not null,
  variables jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_msg_templates_org on public.message_templates(organization_id);

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.user_profiles(id) on delete set null,
  user_email text,
  action text not null check (action in (
    'login','create','update','archive','delete','validate','financial_change',
    'role_change','permission_change','export_sensitive','view_confidential','other'
  )),
  module text,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_org on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);

-- ============================================================
-- DOCUMENTS (médiathèque)
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  type text not null,
  name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  description text,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  tags text,
  created_at timestamptz not null default now()
);
create index if not exists idx_documents_org on public.documents(organization_id);
create index if not exists idx_documents_entity on public.documents(entity_type, entity_id);

-- ============================================================
-- RLS + POLICIES
-- ============================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'gps_devices','gps_positions','geofences','notifications',
    'message_templates','documents'
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

-- AUDIT LOGS: select + insert only (no update/delete to preserve integrity)
alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated using (public.user_in_org(organization_id));
drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated with check (public.user_in_org(organization_id));

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['gps_devices','geofences','message_templates']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end$$;
